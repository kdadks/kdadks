import React, { useState, useEffect } from 'react';
import { Save, Building2, FileText, Phone, Mail, MapPin, CreditCard, Image as ImageIcon } from 'lucide-react';
import { organizationDetailsService } from '../../services/organizationDetailsService';
import { useToast } from '../ui/ToastProvider';
import type { OrganizationDetails, UpdateOrganizationDetailsDto } from '../../types/payroll';

const OrganizationSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);
  const [formData, setFormData] = useState<Partial<UpdateOrganizationDetailsDto>>({});
  const { showToast } = useToast();

  useEffect(() => {
    loadOrganizationDetails();
  }, []);

  const loadOrganizationDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await organizationDetailsService.getPrimaryOrganization();

      if (error) throw error;

      if (data) {
        setOrganization(data);
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading organization details:', error);
      showToast('Failed to load organization details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (organization?.id) {
        // Update existing
        const { error } = await organizationDetailsService.update(organization.id, formData);
        if (error) throw error;
        showToast('Organization details updated successfully', 'success');
      } else {
        // Create new
        const { error } = await organizationDetailsService.create(formData as any);
        if (error) throw error;
        showToast('Organization details created successfully', 'success');
      }

      await loadOrganizationDetails();
    } catch (error) {
      console.error('Error saving organization details:', error);
      showToast('Failed to save organization details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;

      if (organization?.id) {
        try {
          const { error } = await organizationDetailsService.updateLogo(organization.id, base64);
          if (error) throw error;
          showToast('Logo uploaded successfully', 'success');
          await loadOrganizationDetails();
        } catch (error) {
          console.error('Error uploading logo:', error);
          showToast('Failed to upload logo', 'error');
        }
      } else {
        setFormData({ ...formData, logo_image_data: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600">Manage your organization details for statutory compliance and documents</p>
        </div>

        <div className="space-y-6">
          {/* Organization Identity */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Building2 className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Organization Identity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.organization_name || ''}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  value={formData.legal_entity_name || ''}
                  onChange={(e) => setFormData({ ...formData, legal_entity_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Type
                </label>
                <select
                  value={formData.organization_type || ''}
                  onChange={(e) => setFormData({ ...formData, organization_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Public Limited">Public Limited</option>
                  <option value="Partnership">Partnership</option>
                  <option value="LLP">LLP</option>
                  <option value="Sole Proprietor">Sole Proprietor</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center space-x-4">
                  {formData.logo_image_data && (
                    <img
                      src={formData.logo_image_data}
                      alt="Company Logo"
                      className="h-12 w-12 object-contain border rounded"
                    />
                  )}
                  <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100 flex items-center">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Registration */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Tax Registration Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN *
                </label>
                <input
                  type="text"
                  value={formData.pan || ''}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TAN *
                </label>
                <input
                  type="text"
                  value={formData.tan || ''}
                  onChange={(e) => setFormData({ ...formData, tan: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ABCD12345E"
                  maxLength={10}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Registration Number
                </label>
                <input
                  type="text"
                  value={formData.gst_registration_number || ''}
                  onChange={(e) => setFormData({ ...formData, gst_registration_number: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CIN
                </label>
                <input
                  type="text"
                  value={formData.cin || ''}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="U12345MH2020PTC123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LLPIN
                </label>
                <input
                  type="text"
                  value={formData.llpin || ''}
                  onChange={(e) => setFormData({ ...formData, llpin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Statutory Compliance */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Statutory Compliance</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PF Establishment Code
                </label>
                <input
                  type="text"
                  value={formData.pf_establishment_code || ''}
                  onChange={(e) => setFormData({ ...formData, pf_establishment_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ESI Establishment Code
                </label>
                <input
                  type="text"
                  value={formData.esi_establishment_code || ''}
                  onChange={(e) => setFormData({ ...formData, esi_establishment_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Tax State
                </label>
                <input
                  type="text"
                  value={formData.professional_tax_state || ''}
                  onChange={(e) => setFormData({ ...formData, professional_tax_state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PT Registration Number
                </label>
                <input
                  type="text"
                  value={formData.professional_tax_registration_number || ''}
                  onChange={(e) => setFormData({ ...formData, professional_tax_registration_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Phone className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Contact Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Phone
                </label>
                <input
                  type="tel"
                  value={formData.primary_phone || ''}
                  onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Email
                </label>
                <input
                  type="email"
                  value={formData.primary_email || ''}
                  onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Contact Person
                </label>
                <input
                  type="text"
                  value={formData.hr_contact_person_name || ''}
                  onChange={(e) => setFormData({ ...formData, hr_contact_person_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Contact Email
                </label>
                <input
                  type="email"
                  value={formData.hr_contact_person_email || ''}
                  onChange={(e) => setFormData({ ...formData, hr_contact_person_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Registered Address */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Registered Address</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.registered_address_line1 || ''}
                  onChange={(e) => setFormData({ ...formData, registered_address_line1: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.registered_address_line2 || ''}
                  onChange={(e) => setFormData({ ...formData, registered_address_line2: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.registered_city || ''}
                    onChange={(e) => setFormData({ ...formData, registered_city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.registered_state || ''}
                    onChange={(e) => setFormData({ ...formData, registered_state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.registered_postal_code || ''}
                    onChange={(e) => setFormData({ ...formData, registered_postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center mb-4">
              <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Bank Account Details (Payroll)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.bank_account_number || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.ifsc_code || ''}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="SBIN0001234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={formData.bank_branch_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_branch_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Organization Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
