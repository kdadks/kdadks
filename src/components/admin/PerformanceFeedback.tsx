import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  Send, 
  Save,
  X,
  Calendar,
  User,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Award
} from 'lucide-react';
import { performanceFeedbackService, PerformanceFeedback as FeedbackType, PerformanceGoal, CreateFeedbackData } from '../../services/performanceFeedbackService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../ui/ToastProvider';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_number: string;
  designation: string;
  department?: string;
}

type FeedbackTypeOption = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const feedbackTypes: { value: FeedbackTypeOption; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly (YOY)' }
];

const ratingLabels = [
  { value: 1, label: 'Poor', color: 'text-red-500' },
  { value: 2, label: 'Below Average', color: 'text-orange-500' },
  { value: 3, label: 'Average', color: 'text-yellow-500' },
  { value: 4, label: 'Good', color: 'text-blue-500' },
  { value: 5, label: 'Excellent', color: 'text-green-500' }
];

const getRatingLabel = (rating: number) => {
  const label = ratingLabels.find(r => r.value === rating);
  return label || { value: 0, label: 'Not Rated', color: 'text-gray-400' };
};

const RatingStars: React.FC<{ rating: number; onChange?: (rating: number) => void; readonly?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ 
  rating, 
  onChange, 
  readonly = false,
  size = 'md'
}) => {
  const [hovered, setHovered] = useState(0);
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hovered || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      {rating > 0 && (
        <span className={`ml-2 text-sm font-medium ${getRatingLabel(rating).color}`}>
          {getRatingLabel(rating).label}
        </span>
      )}
    </div>
  );
};

const PerformanceFeedback: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [feedbacks, setFeedbacks] = useState<FeedbackType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Filters
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Form state
  const [formData, setFormData] = useState<CreateFeedbackData>({
    employee_id: '',
    feedback_type: 'monthly',
    period_start: '',
    period_end: '',
    overall_rating: 0,
    quality_of_work: 0,
    productivity: 0,
    punctuality: 0,
    teamwork: 0,
    communication: 0,
    initiative: 0,
    strengths: '',
    areas_for_improvement: '',
    goals_for_next_period: '',
    manager_comments: '',
    status: 'draft'
  });

  // Goals state
  const [goals, setGoals] = useState<Partial<PerformanceGoal>[]>([]);
  const [newGoal, setNewGoal] = useState<{ goal_title: string; goal_description: string; target_date: string; priority: 'low' | 'medium' | 'high' }>({ goal_title: '', goal_description: '', target_date: '', priority: 'medium' });

  useEffect(() => {
    loadData();
  }, [filterEmployee, filterType, filterStatus, filterYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedbackData, employeeData] = await Promise.all([
        performanceFeedbackService.getFeedback({
          employee_id: filterEmployee || undefined,
          feedback_type: filterType || undefined,
          status: filterStatus || undefined,
          year: filterYear
        }),
        employeeService.getEmployees()
      ]);
      setFeedbacks(feedbackData);
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      feedback_type: 'monthly',
      period_start: '',
      period_end: '',
      overall_rating: 0,
      quality_of_work: 0,
      productivity: 0,
      punctuality: 0,
      teamwork: 0,
      communication: 0,
      initiative: 0,
      strengths: '',
      areas_for_improvement: '',
      goals_for_next_period: '',
      manager_comments: '',
      status: 'draft'
    });
    setGoals([]);
    setNewGoal({ goal_title: '', goal_description: '', target_date: '', priority: 'medium' });
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setSelectedFeedback(null);
    setShowModal(true);
  };

  const openEditModal = async (feedback: FeedbackType) => {
    const fullFeedback = await performanceFeedbackService.getFeedbackById(feedback.id);
    if (fullFeedback) {
      setFormData({
        employee_id: fullFeedback.employee_id,
        feedback_type: fullFeedback.feedback_type,
        period_start: fullFeedback.period_start,
        period_end: fullFeedback.period_end,
        overall_rating: fullFeedback.overall_rating,
        quality_of_work: fullFeedback.quality_of_work || 0,
        productivity: fullFeedback.productivity || 0,
        punctuality: fullFeedback.punctuality || 0,
        teamwork: fullFeedback.teamwork || 0,
        communication: fullFeedback.communication || 0,
        initiative: fullFeedback.initiative || 0,
        strengths: fullFeedback.strengths || '',
        areas_for_improvement: fullFeedback.areas_for_improvement || '',
        goals_for_next_period: fullFeedback.goals_for_next_period || '',
        manager_comments: fullFeedback.manager_comments || '',
        status: fullFeedback.status === 'acknowledged' ? 'published' : fullFeedback.status
      });
      setGoals(fullFeedback.goals || []);
      setSelectedFeedback(fullFeedback);
      setModalMode('edit');
      setShowModal(true);
    }
  };

  const openViewModal = async (feedback: FeedbackType) => {
    const fullFeedback = await performanceFeedbackService.getFeedbackById(feedback.id);
    if (fullFeedback) {
      setSelectedFeedback(fullFeedback);
      setModalMode('view');
      setShowModal(true);
    }
  };

  const handleSubmit = async (publish: boolean = false) => {
    try {
      const submitData = {
        ...formData,
        status: publish ? 'published' as const : 'draft' as const
      };

      if (modalMode === 'create') {
        const created = await performanceFeedbackService.createFeedback(submitData);
        
        // Add goals if any
        for (const goal of goals) {
          if (goal.goal_title) {
            await performanceFeedbackService.addGoal(created.id, goal);
          }
        }
      } else if (modalMode === 'edit' && selectedFeedback) {
        await performanceFeedbackService.updateFeedback(selectedFeedback.id, submitData);
        
        // Handle goals updates would go here
        // For simplicity, we're not handling complex goal updates in this example
      }

      setShowModal(false);
      loadData();
      showSuccess('Feedback saved successfully');
    } catch (error) {
      console.error('Error saving feedback:', error);
      showError('Error saving feedback. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      try {
        await performanceFeedbackService.deleteFeedback(id);
        loadData();
      } catch (error) {
        console.error('Error deleting feedback:', error);
      }
    }
  };

  const addGoal = () => {
    if (newGoal.goal_title) {
      setGoals([...goals, { ...newGoal }]);
      setNewGoal({ goal_title: '', goal_description: '', target_date: '', priority: 'medium' });
    }
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Draft</span>;
      case 'published':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Published</span>;
      case 'acknowledged':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Acknowledged</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      weekly: 'bg-purple-100 text-purple-700',
      monthly: 'bg-indigo-100 text-indigo-700',
      quarterly: 'bg-cyan-100 text-cyan-700',
      yearly: 'bg-amber-100 text-amber-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Generate years for filter
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600" />
            Performance Feedback
          </h1>
          <p className="text-gray-600 mt-1">Manage employee performance reviews and feedback</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Feedback</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_number})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              {feedbackTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Feedbacks</p>
              <p className="text-xl font-bold text-gray-900">{feedbacks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Drafts</p>
              <p className="text-xl font-bold text-gray-900">{feedbacks.filter(f => f.status === 'draft').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-xl font-bold text-gray-900">{feedbacks.filter(f => f.status === 'published').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Acknowledged</p>
              <p className="text-xl font-bold text-gray-900">{feedbacks.filter(f => f.status === 'acknowledged').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
            <p className="text-gray-600 mb-4">Start by creating a new performance feedback</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5" />
              Create Feedback
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {feedbacks.map((feedback) => (
                    <React.Fragment key={feedback.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-700 font-medium">
                                {feedback.employees?.first_name?.[0]}{feedback.employees?.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{feedback.employees?.full_name}</p>
                              <p className="text-sm text-gray-500">{feedback.employees?.designation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getTypeBadge(feedback.feedback_type)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p>{formatDate(feedback.period_start)}</p>
                            <p className="text-gray-500">to {formatDate(feedback.period_end)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <RatingStars rating={feedback.overall_rating} readonly size="sm" />
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(feedback.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExpandedRow(expandedRow === feedback.id ? null : feedback.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                              title="Expand"
                            >
                              {expandedRow === feedback.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => openViewModal(feedback)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {feedback.status !== 'acknowledged' && (
                              <button
                                onClick={() => openEditModal(feedback)}
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {feedback.status === 'draft' && (
                              <button
                                onClick={() => handleDelete(feedback.id)}
                                className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRow === feedback.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Quality of Work</p>
                                <RatingStars rating={feedback.quality_of_work || 0} readonly size="sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Productivity</p>
                                <RatingStars rating={feedback.productivity || 0} readonly size="sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Punctuality</p>
                                <RatingStars rating={feedback.punctuality || 0} readonly size="sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Teamwork</p>
                                <RatingStars rating={feedback.teamwork || 0} readonly size="sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Communication</p>
                                <RatingStars rating={feedback.communication || 0} readonly size="sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Initiative</p>
                                <RatingStars rating={feedback.initiative || 0} readonly size="sm" />
                              </div>
                            </div>
                            {feedback.manager_comments && (
                              <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700">Manager Comments</p>
                                <p className="text-sm text-gray-600 mt-1">{feedback.manager_comments}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-700 font-medium">
                          {feedback.employees?.first_name?.[0]}{feedback.employees?.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{feedback.employees?.full_name}</p>
                        <p className="text-sm text-gray-500">{feedback.employees?.designation}</p>
                      </div>
                    </div>
                    {getStatusBadge(feedback.status)}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(feedback.feedback_type)}
                      <span className="text-gray-500">
                        {formatDate(feedback.period_start)} - {formatDate(feedback.period_end)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <RatingStars rating={feedback.overall_rating} readonly size="sm" />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openViewModal(feedback)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {feedback.status !== 'acknowledged' && (
                        <button
                          onClick={() => openEditModal(feedback)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {feedback.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(feedback.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && modalMode !== 'view' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Create Performance Feedback' : 'Edit Performance Feedback'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    disabled={modalMode === 'edit'}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type *</label>
                  <select
                    value={formData.feedback_type}
                    onChange={(e) => setFormData({ ...formData, feedback_type: e.target.value as FeedbackTypeOption })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {feedbackTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Ratings */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Performance Ratings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-full bg-indigo-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating *</label>
                    <RatingStars 
                      rating={formData.overall_rating} 
                      onChange={(rating) => setFormData({ ...formData, overall_rating: rating })}
                      size="lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality of Work</label>
                    <RatingStars 
                      rating={formData.quality_of_work || 0} 
                      onChange={(rating) => setFormData({ ...formData, quality_of_work: rating })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Productivity</label>
                    <RatingStars 
                      rating={formData.productivity || 0} 
                      onChange={(rating) => setFormData({ ...formData, productivity: rating })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Punctuality</label>
                    <RatingStars 
                      rating={formData.punctuality || 0} 
                      onChange={(rating) => setFormData({ ...formData, punctuality: rating })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teamwork</label>
                    <RatingStars 
                      rating={formData.teamwork || 0} 
                      onChange={(rating) => setFormData({ ...formData, teamwork: rating })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Communication</label>
                    <RatingStars 
                      rating={formData.communication || 0} 
                      onChange={(rating) => setFormData({ ...formData, communication: rating })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Initiative</label>
                    <RatingStars 
                      rating={formData.initiative || 0} 
                      onChange={(rating) => setFormData({ ...formData, initiative: rating })}
                    />
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  Feedback Details
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label>
                  <textarea
                    value={formData.strengths}
                    onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="What are the employee's key strengths?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Areas for Improvement</label>
                  <textarea
                    value={formData.areas_for_improvement}
                    onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="What areas need improvement?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goals for Next Period</label>
                  <textarea
                    value={formData.goals_for_next_period}
                    onChange={(e) => setFormData({ ...formData, goals_for_next_period: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="What should the employee focus on next?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Comments</label>
                  <textarea
                    value={formData.manager_comments}
                    onChange={(e) => setFormData({ ...formData, manager_comments: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Additional comments from manager..."
                  />
                </div>
              </div>

              {/* Goals Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  Performance Goals
                </h3>
                
                {/* Add Goal Form */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Goal title"
                        value={newGoal.goal_title}
                        onChange={(e) => setNewGoal({ ...newGoal, goal_title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        placeholder="Target date"
                        value={newGoal.target_date}
                        onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newGoal.priority}
                        onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value as 'low' | 'medium' | 'high' })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <button
                        type="button"
                        onClick={addGoal}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Goals List */}
                {goals.length > 0 && (
                  <div className="space-y-2">
                    {goals.map((goal, index) => (
                      <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Target className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{goal.goal_title}</span>
                          {goal.target_date && (
                            <span className="text-sm text-gray-500">Due: {formatDate(goal.target_date)}</span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                            goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {goal.priority}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGoal(index)}
                          className="p-1 hover:bg-red-50 rounded text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50"
              >
                <Save className="w-4 h-4" />
                Save as Draft
              </button>
              <button
                onClick={() => handleSubmit(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                disabled={!formData.employee_id || !formData.period_start || !formData.period_end || formData.overall_rating === 0}
              >
                <Send className="w-4 h-4" />
                Publish Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showModal && modalMode === 'view' && selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Performance Feedback Details</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-indigo-700 font-medium">
                    {selectedFeedback.employees?.first_name?.[0]}{selectedFeedback.employees?.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedFeedback.employees?.full_name}</h3>
                  <p className="text-gray-600">{selectedFeedback.employees?.designation} • {selectedFeedback.employees?.department}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeBadge(selectedFeedback.feedback_type)}
                    {getStatusBadge(selectedFeedback.status)}
                  </div>
                </div>
              </div>

              {/* Period */}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5" />
                <span>Review Period: {formatDate(selectedFeedback.period_start)} - {formatDate(selectedFeedback.period_end)}</span>
              </div>

              {/* Overall Rating */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Overall Rating</h4>
                <RatingStars rating={selectedFeedback.overall_rating} readonly size="lg" />
              </div>

              {/* Detailed Ratings */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Quality of Work', value: selectedFeedback.quality_of_work },
                  { label: 'Productivity', value: selectedFeedback.productivity },
                  { label: 'Punctuality', value: selectedFeedback.punctuality },
                  { label: 'Teamwork', value: selectedFeedback.teamwork },
                  { label: 'Communication', value: selectedFeedback.communication },
                  { label: 'Initiative', value: selectedFeedback.initiative }
                ].map((rating, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">{rating.label}</p>
                    <RatingStars rating={rating.value || 0} readonly size="sm" />
                  </div>
                ))}
              </div>

              {/* Comments Sections */}
              {selectedFeedback.strengths && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Strengths
                  </h4>
                  <p className="text-gray-600 bg-green-50 rounded-lg p-3">{selectedFeedback.strengths}</p>
                </div>
              )}

              {selectedFeedback.areas_for_improvement && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Areas for Improvement
                  </h4>
                  <p className="text-gray-600 bg-orange-50 rounded-lg p-3">{selectedFeedback.areas_for_improvement}</p>
                </div>
              )}

              {selectedFeedback.goals_for_next_period && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    Goals for Next Period
                  </h4>
                  <p className="text-gray-600 bg-blue-50 rounded-lg p-3">{selectedFeedback.goals_for_next_period}</p>
                </div>
              )}

              {selectedFeedback.manager_comments && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    Manager Comments
                  </h4>
                  <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{selectedFeedback.manager_comments}</p>
                </div>
              )}

              {selectedFeedback.employee_comments && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-500" />
                    Employee Response
                  </h4>
                  <p className="text-gray-600 bg-purple-50 rounded-lg p-3">{selectedFeedback.employee_comments}</p>
                </div>
              )}

              {/* Goals */}
              {selectedFeedback.goals && selectedFeedback.goals.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" />
                    Performance Goals
                  </h4>
                  <div className="space-y-2">
                    {selectedFeedback.goals.map((goal) => (
                      <div key={goal.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle className={`w-5 h-5 ${goal.status === 'completed' ? 'text-green-500' : 'text-gray-300'}`} />
                          <div>
                            <p className="font-medium">{goal.goal_title}</p>
                            {goal.target_date && (
                              <p className="text-sm text-gray-500">Due: {formatDate(goal.target_date)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                            goal.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            goal.status === 'not_achieved' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {goal.status.replace('_', ' ')}
                          </span>
                          {goal.completion_percentage > 0 && (
                            <span className="text-sm text-gray-500">{goal.completion_percentage}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acknowledgment Info */}
              {selectedFeedback.acknowledged && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Acknowledged by Employee</p>
                    {selectedFeedback.acknowledged_at && (
                      <p className="text-sm text-green-600">
                        on {new Date(selectedFeedback.acknowledged_at).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceFeedback;
