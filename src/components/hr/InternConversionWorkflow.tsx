import React, { useState } from 'react';
import { ArrowUpCircle, X, Loader2, AlertTriangle } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import type { Employee, EmploymentType, EmploymentStatus } from '../../types/employee';
import { DEPARTMENTS } from '../../types/employee';

interface InternConversionWorkflowProps {
  employee: Employee;
  onClose: () => void;
  onConverted: (updated: Employee) => void;
  currentAdminName: string;
}

interface ConversionFormData {
  designation: string;
  department: string;
  employment_type: Exclude<EmploymentType, 'intern'>;
  date_of_joining: string;
  employment_status: Extract<EmploymentStatus, 'active' | 'on-leave'>;
  basic_salary: number;
  email: string;
  phone: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  pan_number: string;
  uan_number: string;
}

const today = new Date().toISOString().split('T')[0];

const InternConversionWorkflow: React.FC<InternConversionWorkflowProps> = ({
  employee,
  onClose,
  onConverted,
  currentAdminName,
}) => {
  const [formData, setFormData] = useState<ConversionFormData>({
    designation: employee.designation ?? '',
    department: employee.department ?? '',
    employment_type: 'full-time',
    date_of_joining: today,
    employment_status: 'active',
    basic_salary: employee.basic_salary ?? 0,
    email: employee.email ?? '',
    phone: employee.phone ?? '',
    bank_name: employee.bank_name ?? '',
    bank_account_number: employee.bank_account_number ?? '',
    bank_ifsc_code: employee.bank_ifsc_code ?? '',
    pan_number: employee.pan_number ?? '',
    uan_number: employee.uan_number ?? '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'basic_salary' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const updated = await employeeService.convertInternToEmployee(
        employee.id,
        {
          designation: formData.designation,
          department: formData.department,
          employment_type: formData.employment_type,
          date_of_joining: formData.date_of_joining,
          employment_status: formData.employment_status,
          basic_salary: formData.basic_salary,
          email: formData.email,
          phone: formData.phone || undefined,
          bank_name: formData.bank_name || undefined,
          bank_account_number: formData.bank_account_number || undefined,
          bank_ifsc_code: formData.bank_ifsc_code || undefined,
          pan_number: formData.pan_number || undefined,
          uan_number: formData.uan_number || undefined,
        },
        currentAdminName
      );
      onConverted(updated);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to convert intern. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-gray-900">
              Convert Intern to Employee &mdash; {employee.full_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 mb-6 text-sm text-blue-800">
          <p>
            <span className="font-medium">Current ID:</span>{' '}
            {employee.employee_number}
          </p>
          <p className="mt-1">
            <span className="font-medium">Internship started:</span>{' '}
            {employee.date_of_joining}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-5 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Employment Details */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Employment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map(dept => (
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
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            {/* Date of Joining as Employee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Joining as Employee <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date_of_joining"
                value={formData.date_of_joining}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Employment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Status <span className="text-red-500">*</span>
              </label>
              <select
                name="employment_status"
                value={formData.employment_status}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="on-leave">On Leave</option>
              </select>
            </div>
          </div>

          {/* Compensation */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Compensation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Basic Salary / Monthly CTC <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="basic_salary"
                value={formData.basic_salary}
                onChange={handleChange}
                min={0}
                step={0.01}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Contact */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Banking */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Banking{' '}
            <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                name="bank_ifsc_code"
                value={formData.bank_ifsc_code}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tax */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Tax{' '}
            <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UAN Number
              </label>
              <input
                type="text"
                name="uan_number"
                value={formData.uan_number}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-4 w-4" />
                  Convert to Employee
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InternConversionWorkflow;
