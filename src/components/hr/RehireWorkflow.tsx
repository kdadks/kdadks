import React, { useState } from 'react';
import { UserCheck, X, Loader2, AlertTriangle } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import type { Employee } from '../../types/employee';
import { DEPARTMENTS } from '../../types/employee';

interface RehireWorkflowProps {
  employee: Employee;
  onClose: () => void;
  onRehired: (updated: Employee) => void;
  currentAdminName: string;
}

const RehireWorkflow: React.FC<RehireWorkflowProps> = ({
  employee,
  onClose,
  onRehired,
  currentAdminName,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [newJoiningDate, setNewJoiningDate] = useState(today);
  const [designation, setDesignation] = useState(employee.designation || '');
  const [department, setDepartment] = useState(
    employee.department || DEPARTMENTS[0]
  );
  const [employmentType, setEmploymentType] = useState<'full-time' | 'part-time' | 'contract'>(
    employee.employment_type === 'intern' ? 'full-time' : (employee.employment_type as 'full-time' | 'part-time' | 'contract')
  );
  const [basicSalary, setBasicSalary] = useState(employee.basic_salary || 0);
  const [rehireRemarks, setRehireRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newJoiningDate) {
      setError('New joining date is required.');
      return;
    }
    if (!designation.trim()) {
      setError('Designation is required.');
      return;
    }
    if (!department) {
      setError('Department is required.');
      return;
    }
    if (!basicSalary || basicSalary <= 0) {
      setError('Basic salary must be a positive number.');
      return;
    }

    setLoading(true);
    try {
      const changeSummaryParts = [
        `Employee rehired by ${currentAdminName}.`,
        `New joining date: ${newJoiningDate}.`,
      ];
      if (rehireRemarks.trim()) {
        changeSummaryParts.push(`Remarks: ${rehireRemarks.trim()}`);
      }

      const updated = await employeeService.rehireEmployee(employee.id, {
        new_joining_date: newJoiningDate,
        designation: designation.trim(),
        department,
        employment_type: employmentType,
        basic_salary: basicSalary,
        rehired_by_name: currentAdminName,
      });

      onRehired(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to rehire employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel =
    employee.employment_status === 'resigned' ? 'Resigned' : 'Terminated';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Rehire Employee &mdash; {employee.full_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-only info banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-5 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-1 text-amber-800">
              <p>
                <span className="font-medium">Employee ID:</span>{' '}
                {employee.employee_number}{' '}
                <span className="text-amber-600">(retained — same ID)</span>
              </p>
              <p>
                <span className="font-medium">Previous status:</span>{' '}
                {statusLabel}
              </p>
              {employee.date_of_leaving && (
                <p>
                  <span className="font-medium">Previous leaving date:</span>{' '}
                  {employee.date_of_leaving}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Inline error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Joining Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Joining Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newJoiningDate}
              onChange={(e) => setNewJoiningDate(e.target.value)}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Designation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
              disabled={loading}
              placeholder="e.g. Senior Software Engineer"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employment Type <span className="text-red-500">*</span>
            </label>
            <select
              value={employmentType}
              onChange={(e) =>
                setEmploymentType(e.target.value as 'full-time' | 'part-time' | 'contract')
              }
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="full-time">Full-Time</option>
              <option value="part-time">Part-Time</option>
              <option value="contract">Contract</option>
            </select>
          </div>

          {/* Basic Salary / Monthly CTC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Basic Salary / Monthly CTC <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={basicSalary}
              onChange={(e) => setBasicSalary(Number(e.target.value))}
              required
              min={1}
              disabled={loading}
              placeholder="e.g. 50000"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Rehire Remarks (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rehire Remarks{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={rehireRemarks}
              onChange={(e) => setRehireRemarks(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder="Add any notes about this rehire decision..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Confirm Rehire
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RehireWorkflow;
