import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Calendar,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Award,
  ChevronRight,
  Send,
  Eye,
  X,
  BarChart3
} from 'lucide-react';
import { performanceFeedbackService, PerformanceFeedback as FeedbackType, PerformanceGoal } from '../../services/performanceFeedbackService';
import { useToast } from '../ui/ToastProvider';

const ratingLabels = [
  { value: 1, label: 'Poor', color: 'text-red-500', bg: 'bg-red-100' },
  { value: 2, label: 'Below Average', color: 'text-orange-500', bg: 'bg-orange-100' },
  { value: 3, label: 'Average', color: 'text-yellow-500', bg: 'bg-yellow-100' },
  { value: 4, label: 'Good', color: 'text-blue-500', bg: 'bg-blue-100' },
  { value: 5, label: 'Excellent', color: 'text-green-500', bg: 'bg-green-100' }
];

const getRatingLabel = (rating: number) => {
  const label = ratingLabels.find(r => r.value === rating);
  return label || { value: 0, label: 'Not Rated', color: 'text-gray-400', bg: 'bg-gray-100' };
};

const RatingStars: React.FC<{ rating: number; size?: 'sm' | 'md' | 'lg' }> = ({ rating, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
      {rating > 0 && (
        <span className={`ml-2 text-sm font-medium ${getRatingLabel(rating).color}`}>
          {getRatingLabel(rating).label}
        </span>
      )}
    </div>
  );
};

const EmployeePerformanceFeedback: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [feedbacks, setFeedbacks] = useState<FeedbackType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [acknowledgeComment, setAcknowledgeComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalFeedbacks: 0,
    latestRating: 0,
    pendingCount: 0,
    ratingTrend: [] as { rating: number; type: string; date: string }[]
  });

  // Get employee ID from session storage
  const employeeId = (() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      try {
        const employee = JSON.parse(session);
        return employee.id || '';
      } catch {
        return '';
      }
    }
    return '';
  })();

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedbackData, statsData, pendingCount] = await Promise.all([
        performanceFeedbackService.getEmployeeFeedback(employeeId),
        performanceFeedbackService.getEmployeeFeedbackStats(employeeId),
        performanceFeedbackService.getPendingAcknowledgmentsCount(employeeId)
      ]);
      setFeedbacks(feedbackData);
      setStats({ ...statsData, pendingCount });
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFeedbackDetails = async (feedback: FeedbackType) => {
    try {
      const fullFeedback = await performanceFeedbackService.getFeedbackById(feedback.id);
      setSelectedFeedback(fullFeedback);
      setAcknowledgeComment(fullFeedback?.employee_comments || '');
      setShowModal(true);
    } catch (error) {
      console.error('Error loading feedback details:', error);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedFeedback) return;
    
    setSubmitting(true);
    try {
      await performanceFeedbackService.acknowledgeFeedback(selectedFeedback.id, acknowledgeComment);
      setShowModal(false);
      loadData();
      showSuccess('Feedback acknowledged successfully');
    } catch (error) {
      console.error('Error acknowledging feedback:', error);
      showError('Failed to acknowledge feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const getStatusBadge = (status: string, acknowledged: boolean) => {
    if (status === 'acknowledged' || acknowledged) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Acknowledged</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
      <Clock className="w-3 h-3" /> Pending Review
    </span>;
  };

  if (!employeeId) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Error</h2>
        <p className="text-gray-600">Please log in again to view your performance feedback.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-7 h-7 text-indigo-600" />
          My Performance Feedback
        </h1>
        <p className="text-gray-600 mt-1">View your performance reviews and feedback from management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Rating</p>
              <p className="text-xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Latest</p>
              <p className="text-xl font-bold text-gray-900">{stats.latestRating}/5</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reviews</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalFeedbacks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.pendingCount > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              <Clock className={`w-5 h-5 ${stats.pendingCount > 0 ? 'text-yellow-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className={`text-xl font-bold ${stats.pendingCount > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                {stats.pendingCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Acknowledgments Alert */}
      {stats.pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-800">Action Required</h3>
            <p className="text-sm text-yellow-700">
              You have {stats.pendingCount} performance review{stats.pendingCount > 1 ? 's' : ''} pending acknowledgment.
              Please review and acknowledge them.
            </p>
          </div>
        </div>
      )}

      {/* Rating Trend Chart (Simple) */}
      {stats.ratingTrend.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Rating Trend
          </h3>
          <div className="flex items-end gap-2 h-24">
            {stats.ratingTrend.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className={`w-full rounded-t-lg ${getRatingLabel(item.rating).bg}`}
                  style={{ height: `${(item.rating / 5) * 100}%` }}
                />
                <span className="text-xs text-gray-500 mt-1">{item.rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900">Feedback History</h3>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback yet</h3>
            <p className="text-gray-600">Your performance feedback will appear here once published by management.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {feedbacks.map((feedback) => (
              <div 
                key={feedback.id} 
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => openFeedbackDetails(feedback)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {getTypeBadge(feedback.feedback_type)}
                      {getStatusBadge(feedback.status, feedback.acknowledged)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(feedback.period_start)} - {formatDate(feedback.period_end)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <RatingStars rating={feedback.overall_rating} size="sm" />
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                
                {/* Preview of comments on mobile */}
                {feedback.manager_comments && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2 md:hidden">
                    "{feedback.manager_comments}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {showModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Performance Review</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getTypeBadge(selectedFeedback.feedback_type)}
                  {getStatusBadge(selectedFeedback.status, selectedFeedback.acknowledged)}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Period */}
              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-3">
                <Calendar className="w-5 h-5" />
                <span>Review Period: {formatDate(selectedFeedback.period_start)} - {formatDate(selectedFeedback.period_end)}</span>
              </div>

              {/* Overall Rating */}
              <div className={`rounded-lg p-4 ${getRatingLabel(selectedFeedback.overall_rating).bg}`}>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Overall Rating</h4>
                <RatingStars rating={selectedFeedback.overall_rating} size="lg" />
              </div>

              {/* Detailed Ratings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Detailed Ratings</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Quality of Work', value: selectedFeedback.quality_of_work },
                    { label: 'Productivity', value: selectedFeedback.productivity },
                    { label: 'Punctuality', value: selectedFeedback.punctuality },
                    { label: 'Teamwork', value: selectedFeedback.teamwork },
                    { label: 'Communication', value: selectedFeedback.communication },
                    { label: 'Initiative', value: selectedFeedback.initiative }
                  ].map((rating, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">{rating.label}</p>
                      <RatingStars rating={rating.value || 0} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              {selectedFeedback.strengths && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Your Strengths
                  </h4>
                  <p className="text-gray-700 bg-green-50 rounded-lg p-3">{selectedFeedback.strengths}</p>
                </div>
              )}

              {/* Areas for Improvement */}
              {selectedFeedback.areas_for_improvement && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Areas for Improvement
                  </h4>
                  <p className="text-gray-700 bg-orange-50 rounded-lg p-3">{selectedFeedback.areas_for_improvement}</p>
                </div>
              )}

              {/* Goals */}
              {selectedFeedback.goals_for_next_period && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    Goals for Next Period
                  </h4>
                  <p className="text-gray-700 bg-blue-50 rounded-lg p-3">{selectedFeedback.goals_for_next_period}</p>
                </div>
              )}

              {/* Manager Comments */}
              {selectedFeedback.manager_comments && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    Manager Comments
                  </h4>
                  <p className="text-gray-700 bg-indigo-50 rounded-lg p-3">{selectedFeedback.manager_comments}</p>
                </div>
              )}

              {/* Performance Goals */}
              {selectedFeedback.goals && selectedFeedback.goals.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" />
                    Performance Goals
                  </h4>
                  <div className="space-y-2">
                    {selectedFeedback.goals.map((goal) => (
                      <div key={goal.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                              goal.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                            }`} />
                            <div>
                              <p className="font-medium text-gray-900">{goal.goal_title}</p>
                              {goal.goal_description && (
                                <p className="text-sm text-gray-600 mt-1">{goal.goal_description}</p>
                              )}
                              {goal.target_date && (
                                <p className="text-xs text-gray-500 mt-1">Due: {formatDate(goal.target_date)}</p>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                            goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                            goal.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            goal.status === 'not_achieved' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {goal.status.replace('_', ' ')}
                          </span>
                        </div>
                        {goal.completion_percentage > 0 && goal.status !== 'completed' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{goal.completion_percentage}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${goal.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Already Acknowledged */}
              {selectedFeedback.acknowledged && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
                    <CheckCircle className="w-5 h-5" />
                    Acknowledged
                  </div>
                  {selectedFeedback.acknowledged_at && (
                    <p className="text-sm text-green-700">
                      on {new Date(selectedFeedback.acknowledged_at).toLocaleString('en-IN')}
                    </p>
                  )}
                  {selectedFeedback.employee_comments && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-sm font-medium text-green-800">Your Comments:</p>
                      <p className="text-sm text-green-700 mt-1">{selectedFeedback.employee_comments}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Acknowledge Form - Only show if not yet acknowledged */}
              {!selectedFeedback.acknowledged && selectedFeedback.status === 'published' && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Acknowledge This Feedback</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Please review the feedback above and add any comments or responses before acknowledging.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Comments (Optional)
                      </label>
                      <textarea
                        value={acknowledgeComment}
                        onChange={(e) => setAcknowledgeComment(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Share your thoughts or response to this feedback..."
                      />
                    </div>
                    <button
                      onClick={handleAcknowledge}
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Acknowledge Feedback
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer for acknowledged feedback */}
            {(selectedFeedback.acknowledged || selectedFeedback.status === 'acknowledged') && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 md:px-6 py-4 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePerformanceFeedback;
