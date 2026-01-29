import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Calendar, Briefcase, Building2, CreditCard, Shield, Save, X } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface EmployeeData {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  department?: string;
  designation?: string;
  date_of_joining: string;
  
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  
  // Tax Information
  pan?: string;
  aadhaar?: string;
  
  // Bank Details
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
}

export default function EmployeeProfile() {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [currentUser] = useState(() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      const emp = JSON.parse(session);
      return { id: emp.id };
    }
    return { id: '' };
  });

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      setEmployee(data);
    } catch (error) {
      console.error('Error loading employee data:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase
        .from('employees')
        .update({
          phone: employee.phone,
          date_of_birth: employee.date_of_birth,
          gender: employee.gender,
          marital_status: employee.marital_status,
          address_line1: employee.address_line1,
          address_line2: employee.address_line2,
          city: employee.city,
          state: employee.state,
          postal_code: employee.postal_code,
          country: employee.country,
          pan: employee.pan,
          aadhaar: employee.aadhaar,
          bank_name: employee.bank_name,
          account_number: employee.account_number,
          ifsc_code: employee.ifsc_code,
          account_holder_name: employee.account_holder_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditMode(false);
      await loadEmployeeData();
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 
        (error && typeof error === 'object' && 'message' in error) ? String((error as { message?: string }).message) : 
        JSON.stringify(error);
      setMessage({ type: 'error', text: `Error updating profile: ${errorMessage}` });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof EmployeeData, value: string) => {
    if (employee) {
      setEmployee({ ...employee, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load profile data</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-0">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-lg sm:text-2xl font-bold flex-shrink-0">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                {employee.first_name} {employee.last_name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{employee.designation} • {employee.department}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">ID: {employee.employee_id}</p>
            </div>
          </div>
          <div className="flex gap-2 sm:space-x-3">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 text-sm touch-manipulation"
              >
                <User className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditMode(false);
                    loadEmployeeData();
                    setMessage(null);
                  }}
                  className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-center space-x-2 text-sm touch-manipulation"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 text-sm touch-manipulation"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Read-only fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={employee.first_name}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={employee.last_name}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={employee.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            {/* Editable fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={employee.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={!editMode}
                  placeholder="+91 9876543210"
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={employee.date_of_birth || ''}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  disabled={!editMode}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={employee.gender || ''}
                onChange={(e) => handleChange('gender', e.target.value)}
                disabled={!editMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
              <select
                value={employee.marital_status || ''}
                onChange={(e) => handleChange('marital_status', e.target.value)}
                disabled={!editMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              >
                <option value="">Select Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={employee.date_of_joining}
                  disabled
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Employment Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={employee.department || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input
                type="text"
                value={employee.designation || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Address Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
              <input
                type="text"
                value={employee.address_line1 || ''}
                onChange={(e) => handleChange('address_line1', e.target.value)}
                disabled={!editMode}
                placeholder="Building, Street"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
              <input
                type="text"
                value={employee.address_line2 || ''}
                onChange={(e) => handleChange('address_line2', e.target.value)}
                disabled={!editMode}
                placeholder="Area, Landmark"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={employee.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  disabled={!editMode}
                  placeholder="City"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={employee.state || ''}
                  onChange={(e) => handleChange('state', e.target.value)}
                  disabled={!editMode}
                  placeholder="State"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={employee.postal_code || ''}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  disabled={!editMode}
                  placeholder="PIN Code"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  value={employee.country || ''}
                  onChange={(e) => handleChange('country', e.target.value)}
                  disabled={!editMode}
                  placeholder="Country"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tax & Identity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Tax & Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
              <input
                type="text"
                value={employee.pan || ''}
                onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                disabled={!editMode}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg uppercase ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number</label>
              <input
                type="text"
                value={employee.aadhaar || ''}
                onChange={(e) => handleChange('aadhaar', e.target.value)}
                disabled={!editMode}
                placeholder="XXXX XXXX XXXX"
                maxLength={12}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Bank Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
              <input
                type="text"
                value={employee.bank_name || ''}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                disabled={!editMode}
                placeholder="HDFC Bank"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name</label>
              <input
                type="text"
                value={employee.account_holder_name || ''}
                onChange={(e) => handleChange('account_holder_name', e.target.value)}
                disabled={!editMode}
                placeholder="As per bank records"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
              <input
                type="text"
                value={employee.account_number || ''}
                onChange={(e) => handleChange('account_number', e.target.value)}
                disabled={!editMode}
                placeholder="1234567890"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
              <input
                type="text"
                value={employee.ifsc_code || ''}
                onChange={(e) => handleChange('ifsc_code', e.target.value.toUpperCase())}
                disabled={!editMode}
                placeholder="HDFC0001234"
                maxLength={11}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg uppercase ${editMode ? 'focus:ring-2 focus:ring-primary-500 focus:border-transparent' : 'bg-gray-50 text-gray-500'}`}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

