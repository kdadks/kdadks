import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  AlertCircle,
  CreditCard,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import type { PaymentGateway, PaymentGatewaySettings as GatewaySettings } from '../../types/payment';

export const PaymentGatewaySettings: React.FC = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPaymentGateways();
      setGateways(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gateways');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGateway = () => {
    setEditingGateway(null);
    setShowModal(true);
  };

  const handleEditGateway = (gateway: PaymentGateway) => {
    setEditingGateway(gateway);
    setShowModal(true);
  };

  const handleDeleteGateway = async (gatewayId: string) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) {
      return;
    }

    try {
      await paymentService.deletePaymentGateway(gatewayId);
      await loadGateways();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete gateway');
    }
  };

  const handleToggleGateway = async (gatewayId: string, isActive: boolean) => {
    try {
      await paymentService.updatePaymentGateway(gatewayId, { is_active: !isActive });
      await loadGateways();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update gateway');
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getProviderIcon = (providerType: string) => {
    switch (providerType) {
      case 'razorpay':
        return <CreditCard className="w-8 h-8 text-blue-600" />;
      case 'stripe':
        return <Globe className="w-8 h-8 text-purple-600" />;
      case 'paypal':
        return <Shield className="w-8 h-8 text-blue-500" />;
      default:
        return <Zap className="w-8 h-8 text-gray-600" />;
    }
  };

  const getProviderDescription = (providerType: string) => {
    switch (providerType) {
      case 'razorpay':
        return 'Popular Indian payment gateway supporting UPI, cards, net banking, and wallets';
      case 'stripe':
        return 'Global payment platform with support for international cards and local payment methods';
      case 'paypal':
        return 'Worldwide payment system supporting PayPal balance, cards, and bank transfers';
      default:
        return 'Custom payment gateway configuration';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading payment gateways...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Gateway Settings</h1>
          <p className="text-gray-600">Configure payment providers and their settings</p>
        </div>
        <button
          onClick={handleCreateGateway}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Gateway</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gateways.map((gateway) => (
          <div
            key={gateway.id}
            className={`bg-white rounded-lg shadow-lg border-2 transition-all ${
              gateway.is_active ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            {/* Gateway Header */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getProviderIcon(gateway.provider_type)}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{gateway.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{gateway.provider_type}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleGateway(gateway.id, gateway.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      gateway.is_active ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        gateway.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-medium ${
                    gateway.is_active ? 'text-green-800' : 'text-gray-500'
                  }`}>
                    {gateway.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {getProviderDescription(gateway.provider_type)}
              </p>

              {/* Gateway Details */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Environment:</span>
                  <span className={`font-medium ${
                    gateway.is_sandbox ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {gateway.is_sandbox ? 'Sandbox' : 'Production'}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Currencies:</span>
                  <span className="font-medium">
                    {gateway.currency_support.slice(0, 3).join(', ')}
                    {gateway.currency_support.length > 3 && ` +${gateway.currency_support.length - 3}`}
                  </span>
                </div>

                {gateway.transaction_fee_percentage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transaction Fee:</span>
                    <span className="font-medium">
                      {gateway.transaction_fee_percentage}%
                      {gateway.transaction_fee_fixed && ` + ${gateway.transaction_fee_fixed}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">
                    {new Date(gateway.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Gateway Actions */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => handleEditGateway(gateway)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
              >
                <Edit className="w-4 h-4" />
                <span>Configure</span>
              </button>
              <button
                onClick={() => handleDeleteGateway(gateway.id)}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}

        {/* Add Gateway Card */}
        <div
          onClick={handleCreateGateway}
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Add Payment Gateway</h3>
          <p className="text-sm text-gray-600">Configure a new payment provider</p>
        </div>
      </div>

      {/* Empty State */}
      {gateways.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Gateways</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first payment gateway</p>
          <button
            onClick={handleCreateGateway}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Add Payment Gateway
          </button>
        </div>
      )}

      {/* Gateway Configuration Modal */}
      {showModal && (
        <GatewayConfigModal
          gateway={editingGateway}
          onClose={() => {
            setShowModal(false);
            setEditingGateway(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingGateway(null);
            loadGateways();
          }}
          showPasswords={showPasswords}
          togglePasswordVisibility={togglePasswordVisibility}
        />
      )}
    </div>
  );
};

// Gateway Configuration Modal Component
interface GatewayConfigModalProps {
  gateway: PaymentGateway | null;
  onClose: () => void;
  onSave: () => void;
  showPasswords: Record<string, boolean>;
  togglePasswordVisibility: (field: string) => void;
}

const GatewayConfigModal: React.FC<GatewayConfigModalProps> = ({
  gateway,
  onClose,
  onSave,
  showPasswords,
  togglePasswordVisibility
}) => {
  const [formData, setFormData] = useState({
    name: gateway?.name || '',
    provider_type: gateway?.provider_type || 'razorpay',
    is_active: gateway?.is_active ?? true,
    is_sandbox: gateway?.is_sandbox ?? true,
    currency_support: gateway?.currency_support || ['INR'],
    transaction_fee_percentage: gateway?.transaction_fee_percentage || 0,
    transaction_fee_fixed: gateway?.transaction_fee_fixed || 0,
    settings: gateway?.settings || {}
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const gatewayData = {
        ...formData,
        currency_support: Array.isArray(formData.currency_support) 
          ? formData.currency_support 
          : String(formData.currency_support).split(',').map((c: string) => c.trim())
      };

      if (gateway) {
        await paymentService.updatePaymentGateway(gateway.id, gatewayData);
      } else {
        await paymentService.createPaymentGateway(gatewayData as Omit<PaymentGateway, 'id' | 'created_at' | 'updated_at'>);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gateway');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
  };

  const renderProviderSettings = () => {
    const { provider_type } = formData;
    const settings = formData.settings as GatewaySettings;

    switch (provider_type) {
      case 'razorpay':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key ID *
              </label>
              <input
                type="text"
                required
                value={settings.key_id || ''}
                onChange={(e) => handleSettingChange('key_id', e.target.value)}
                placeholder="rzp_test_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Secret *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.key_secret ? 'text' : 'password'}
                  required
                  value={settings.key_secret || ''}
                  onChange={(e) => handleSettingChange('key_secret', e.target.value)}
                  placeholder="Enter Razorpay Key Secret"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('key_secret')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                >
                  {showPasswords.key_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret
              </label>
              <div className="relative">
                <input
                  type={showPasswords.webhook_secret ? 'text' : 'password'}
                  value={settings.webhook_secret || ''}
                  onChange={(e) => handleSettingChange('webhook_secret', e.target.value)}
                  placeholder="Webhook secret for signature verification"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('webhook_secret')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                >
                  {showPasswords.webhook_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'stripe':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publishable Key *
              </label>
              <input
                type="text"
                required
                value={settings.publishable_key || ''}
                onChange={(e) => handleSettingChange('publishable_key', e.target.value)}
                placeholder="pk_test_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Key *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.secret_key ? 'text' : 'password'}
                  required
                  value={settings.secret_key || ''}
                  onChange={(e) => handleSettingChange('secret_key', e.target.value)}
                  placeholder="sk_test_..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('secret_key')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                >
                  {showPasswords.secret_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret
              </label>
              <div className="relative">
                <input
                  type={showPasswords.stripe_webhook_secret ? 'text' : 'password'}
                  value={settings.webhook_secret || ''}
                  onChange={(e) => handleSettingChange('webhook_secret', e.target.value)}
                  placeholder="whsec_..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('stripe_webhook_secret')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                >
                  {showPasswords.stripe_webhook_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'paypal':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID *
              </label>
              <input
                type="text"
                required
                value={settings.client_id || ''}
                onChange={(e) => handleSettingChange('client_id', e.target.value)}
                placeholder="PayPal Client ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.client_secret ? 'text' : 'password'}
                  required
                  value={settings.client_secret || ''}
                  onChange={(e) => handleSettingChange('client_secret', e.target.value)}
                  placeholder="PayPal Client Secret"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('client_secret')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                >
                  {showPasswords.client_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook ID
              </label>
              <input
                type="text"
                value={settings.webhook_id || ''}
                onChange={(e) => handleSettingChange('webhook_id', e.target.value)}
                placeholder="PayPal Webhook ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Select a provider type to configure settings</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {gateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-6 max-h-96 overflow-y-auto">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}

              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gateway Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Razorpay India"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Type *
                  </label>
                  <select
                    required
                    value={formData.provider_type}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      provider_type: e.target.value as any,
                      settings: {} // Reset settings when changing provider
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="razorpay">Razorpay</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supported Currencies *
                  </label>
                  <input
                    type="text"
                    required
                    value={Array.isArray(formData.currency_support) 
                      ? formData.currency_support.join(', ') 
                      : formData.currency_support}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      currency_support: e.target.value.split(',').map(c => c.trim())
                    })}
                    placeholder="INR, USD, EUR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated currency codes</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.transaction_fee_percentage}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      transaction_fee_percentage: parseFloat(e.target.value) || 0
                    })}
                    placeholder="2.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fixed Fee
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.transaction_fee_fixed}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      transaction_fee_fixed: parseFloat(e.target.value) || 0
                    })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Toggle Settings */}
              <div className="flex items-center justify-between py-4 border-t border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Environment & Status</h4>
                  <p className="text-sm text-gray-600">Configure gateway activation and environment</p>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_sandbox"
                      checked={formData.is_sandbox}
                      onChange={(e) => setFormData({ ...formData, is_sandbox: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_sandbox" className="text-sm text-gray-700">Sandbox Mode</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
                  </div>
                </div>
              </div>

              {/* Provider-specific Settings */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Provider Configuration</h4>
                {renderProviderSettings()}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{loading ? 'Saving...' : 'Save Gateway'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};