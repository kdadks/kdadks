import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Bell,
  Users,
  UserCheck,
  AlertCircle,
  Calendar,
  X
} from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../ui/ToastProvider';
import type {
  Announcement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementPriority,
  TargetAudience
} from '../../types/announcement';
import type { Employee } from '../../types/employee';

export const Announcements: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState<CreateAnnouncementInput>({
    title: '',
    message: '',
    priority: 'normal',
    target_audience: 'all',
    is_pinned: false,
    show_on_dashboard: true
  });

  useEffect(() => {
    loadData();
    loadEmployees();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await announcementService.getAllAnnouncements({
        is_active: filterActive,
        include_expired: false
      });
      setAnnouncements(data);
    } catch (err) {
      console.error('Error loading announcements:', err);
      showError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data.filter((emp: Employee) => emp.employment_status === 'active'));
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.message) {
        showError('Please fill in all required fields');
        return;
      }

      await announcementService.createAnnouncement(formData);
      showSuccess('Announcement created successfully');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error creating announcement:', err);
      showError('Failed to create announcement');
    }
  };

  const handleUpdate = async () => {
    try {
      if (!editingAnnouncement) return;

      await announcementService.updateAnnouncement(editingAnnouncement.id, formData as UpdateAnnouncementInput);
      showSuccess('Announcement updated successfully');
      setShowEditModal(false);
      setEditingAnnouncement(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error updating announcement:', err);
      showError('Failed to update announcement');
    }
  };

  const handleDelete = async () => {
    try {
      if (!deletingAnnouncement) return;

      await announcementService.deleteAnnouncement(deletingAnnouncement.id);
      showSuccess('Announcement deleted successfully');
      setShowDeleteModal(false);
      setDeletingAnnouncement(null);
      loadData();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      showError('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await announcementService.toggleActive(announcement.id);
      showSuccess(`Announcement ${announcement.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (err) {
      console.error('Error toggling active status:', err);
      showError('Failed to update announcement');
    }
  };

  const handleTogglePinned = async (announcement: Announcement) => {
    try {
      await announcementService.togglePinned(announcement.id);
      showSuccess(`Announcement ${announcement.is_pinned ? 'unpinned' : 'pinned'}`);
      loadData();
    } catch (err) {
      console.error('Error toggling pinned status:', err);
      showError('Failed to update announcement');
    }
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      target_audience: announcement.target_audience,
      target_employee_ids: announcement.target_employee_ids,
      start_date: announcement.start_date,
      end_date: announcement.end_date,
      is_pinned: announcement.is_pinned,
      show_on_dashboard: announcement.show_on_dashboard
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      priority: 'normal',
      target_audience: 'all',
      is_pinned: false,
      show_on_dashboard: true
    });
  };

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTargetIcon = (target: TargetAudience) => {
    switch (target) {
      case 'all': return <Users className="w-4 h-4" />;
      case 'specific': return <UserCheck className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bell className="w-8 h-8 mr-3 text-primary-600" />
            Announcements
          </h1>
          <p className="text-gray-600 mt-1">Broadcast messages to employees</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Announcement
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <select
            value={filterActive === undefined ? 'all' : filterActive ? 'active' : 'inactive'}
            onChange={(e) => setFilterActive(
              e.target.value === 'all' ? undefined : e.target.value === 'active'
            )}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No announcements found</p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-white rounded-lg shadow p-6 ${
                announcement.is_pinned ? 'border-l-4 border-primary-600' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {announcement.is_pinned && (
                      <Pin className="w-5 h-5 text-primary-600" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority.toUpperCase()}
                    </span>
                    <div className="flex items-center text-sm text-gray-600">
                      {getTargetIcon(announcement.target_audience)}
                      <span className="ml-1">
                        {announcement.target_audience === 'all' ? 'All Employees' : 'Specific Employees'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{announcement.message}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(announcement.start_date).toLocaleDateString()}
                      {announcement.end_date && (
                        <span> - {new Date(announcement.end_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    {!announcement.is_active && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleTogglePinned(announcement)}
                    className={`p-2 rounded hover:bg-gray-100 ${
                      announcement.is_pinned ? 'text-primary-600' : 'text-gray-400'
                    }`}
                    title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    {announcement.is_pinned ? (
                      <PinOff className="w-5 h-5" />
                    ) : (
                      <Pin className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleActive(announcement)}
                    className={`p-2 rounded hover:bg-gray-100 ${
                      announcement.is_active ? 'text-green-600' : 'text-gray-400'
                    }`}
                    title={announcement.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {announcement.is_active ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(announcement)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingAnnouncement(announcement);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {showEditModal ? 'Edit Announcement' : 'Create New Announcement'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingAnnouncement(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter announcement message"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as AnnouncementPriority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as TargetAudience })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">All Employees</option>
                    <option value="specific">Specific Employees</option>
                  </select>
                </div>
              </div>

              {formData.target_audience === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Employees</label>
                  <select
                    multiple
                    value={formData.target_employee_ids || []}
                    onChange={(e) => setFormData({
                      ...formData,
                      target_employee_ids: Array.from(e.target.selectedOptions, option => option.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} - {emp.employee_number}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date?.slice(0, 16) || ''}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.end_date?.slice(0, 16) || ''}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Pin to top</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.show_on_dashboard}
                    onChange={(e) => setFormData({ ...formData, show_on_dashboard: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Show on employee dashboard</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingAnnouncement(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                {showEditModal ? 'Update' : 'Create'} Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold">Delete Announcement</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deletingAnnouncement.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingAnnouncement(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
