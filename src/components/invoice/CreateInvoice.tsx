import React from 'react';
import { FileText, Package, Plus, Trash, X, Eye, Save } from 'lucide-react';
import type { CreateInvoiceData, CreateInvoiceItemData, Customer, Product, TermsTemplate, CompanySettings } from '../../types/invoice';
import { getTaxLabel, getClassificationCodeLabel } from '../../utils/taxUtils';

interface CreateInvoiceProps {
  invoiceFormData: CreateInvoiceData;
  onFormChange: (field: keyof CreateInvoiceData, value: string | CreateInvoiceItemData[]) => void;
  onItemChange: (index: number, field: keyof CreateInvoiceItemData, value: string | number | undefined) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSaveInvoice: () => void;
  onCloseInvoice: () => void;
  onShowPreview: () => void;
  onTermsChange: (termsContent: string) => void;
  onTermsTemplateSelect: (templateId: string) => void;
  onDefaultProductChange: (productId: string) => void;
  customers: Customer[];
  products: Product[];
  termsTemplates: TermsTemplate[];
  companySettings: CompanySettings[];
  selectedDefaultProduct: string;
  selectedTermsTemplateId: string;
  globalHsnCode: string;
  generatedInvoiceNumber: string;
  modalLoading?: boolean;
  calculateInvoiceTotals: () => { subtotal: number; taxAmount: number; total: number };
  getCurrencyInfo: (customer: Customer | undefined) => { symbol: string; code: string; name: string };
  formatCurrencyAmount: (amount: number, currencyInfo: { symbol: string; code: string }) => string;
  formatAmountInWords: (amount: number, currencyName: string) => string;
}

export const CreateInvoice: React.FC<CreateInvoiceProps> = ({
  invoiceFormData,
  onFormChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSaveInvoice,
  onCloseInvoice,
  onShowPreview,
  onTermsChange,
  onTermsTemplateSelect,
  onDefaultProductChange,
  customers,
  products,
  termsTemplates,
  companySettings,
  selectedDefaultProduct,
  selectedTermsTemplateId,
  globalHsnCode,
  generatedInvoiceNumber,
  modalLoading = false,
  calculateInvoiceTotals,
  getCurrencyInfo,
  formatCurrencyAmount,
  formatAmountInWords
}) => {
  const { subtotal, taxAmount, total } = calculateInvoiceTotals();
  const selectedCustomer = customers.find(c => c.id === invoiceFormData.customer_id);
  const currencyInfo = getCurrencyInfo(selectedCustomer);
  const activeProducts = products.filter(p => p.is_active);

  // Get dynamic tax label based on customer's country
  const taxLabel = getTaxLabel(selectedCustomer);
  const classificationLabel = getClassificationCodeLabel(selectedCustomer);

  console.log('🎯 CreateInvoice - Rendering with data:', {
    items: invoiceFormData.items,
    itemsLength: invoiceFormData.items.length
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create New Invoice</h1>
              <p className="text-slate-600 mt-1">Generate professional invoices for your customers</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onCloseInvoice}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={onShowPreview}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                Show Preview
              </button>
              <button
                onClick={onSaveInvoice}
                disabled={modalLoading || !invoiceFormData.customer_id || !invoiceFormData.items[0]?.item_name || !invoiceFormData.items[0]?.description}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {modalLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center mb-6">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-slate-900">Invoice Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={generatedInvoiceNumber || "Generating..."}
                    disabled
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">Invoice number will be generated automatically</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer *
                  </label>
                  <select
                    value={invoiceFormData.customer_id}
                    onChange={(e) => onFormChange('customer_id', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.filter(customer => customer.is_active !== false).map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.company_name || customer.contact_person}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceFormData.invoice_date}
                    onChange={(e) => onFormChange('invoice_date', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invoiceFormData.due_date}
                    onChange={(e) => onFormChange('due_date', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Product Selection */}
              {activeProducts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Product/Service
                  </label>
                  <select
                    value={selectedDefaultProduct}
                    onChange={(e) => onDefaultProductChange(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Choose a product to add quickly</option>
                    {activeProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Select to auto-fill item details</p>
                </div>
              )}
            </div>

            {/* Line Items Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-slate-900">Line Items</h3>
                </div>
                <button
                  onClick={onAddItem}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {invoiceFormData.items.map((item, index) => {
                  const lineSubtotal = item.quantity * item.unit_price;
                  const lineTaxAmount = (lineSubtotal * item.tax_rate) / 100;
                  const lineTotal = lineSubtotal + lineTaxAmount;
                  
                  return (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Item Name */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Item Name *
                          </label>
                          <input
                            type="text"
                            placeholder="Enter item name"
                            value={item.item_name}
                            onChange={(e) => onItemChange(index, 'item_name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            required
                          />
                        </div>
                        
                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                          />
                        </div>
                        
                        {/* Unit */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Unit
                          </label>
                          <input
                            type="text"
                            placeholder="pcs"
                            value={item.unit}
                            onChange={(e) => onItemChange(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                          />
                        </div>
                        
                        {/* Unit Price */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Rate ({currencyInfo.symbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                          />
                        </div>
                      </div>
                      
                      {/* Description and HSN Code */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description *
                          </label>
                          <textarea
                            placeholder="Enter item description"
                            value={item.description}
                            onChange={(e) => onItemChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            rows={2}
                            required
                          />
                        </div>
                        
                        {/* Classification Code */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {classificationLabel}
                          </label>
                          <input
                            type="text"
                            value={globalHsnCode || item.hsn_code || ''}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                            placeholder={classificationLabel}
                            readOnly
                          />
                        </div>
                      </div>
                      
                      {/* Tax Rate and Total */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              {taxLabel} (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.tax_rate}
                              onChange={(e) => onItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                              className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            />
                          </div>
                          {invoiceFormData.items.length > 1 && (
                            <button
                              onClick={() => onRemoveItem(index)}
                              className="mt-6 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="space-y-1">
                            <div className="text-xs text-slate-600">
                              {item.quantity} × {formatCurrencyAmount(item.unit_price, currencyInfo)} = {formatCurrencyAmount(lineSubtotal, currencyInfo)}
                            </div>
                            <div className="text-xs text-slate-600">
                              {taxLabel} ({item.tax_rate}%): {formatCurrencyAmount(lineTaxAmount, currencyInfo)}
                            </div>
                            <div className="text-sm font-medium text-slate-700 border-t border-slate-300 pt-1">
                              Total: <span className="text-lg font-semibold text-slate-900">{formatCurrencyAmount(lineTotal, currencyInfo)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes and Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={invoiceFormData.notes}
                  onChange={(e) => onFormChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  placeholder="Any additional notes for the customer..."
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Terms & Conditions
                </label>
                {termsTemplates.length > 0 && (
                  <div className="mb-3">
                    <select
                      value={selectedTermsTemplateId}
                      onChange={(e) => onTermsTemplateSelect(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      {termsTemplates
                        .filter(template => template.category === 'general' || template.category === 'payment')
                        .map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <textarea
                  value={invoiceFormData.terms_conditions}
                  onChange={(e) => onTermsChange(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  placeholder="Enter terms and conditions..."
                />
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Summary</h3>
              
              {selectedCustomer && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">Bill To:</h4>
                  <p className="text-sm text-slate-600">
                    {selectedCustomer.company_name || selectedCustomer.contact_person}
                  </p>
                  {selectedCustomer.email && (
                    <p className="text-sm text-slate-600">{selectedCustomer.email}</p>
                  )}
                  {selectedCustomer.city && selectedCustomer.state && (
                    <p className="text-sm text-slate-600">
                      {selectedCustomer.city}, {selectedCustomer.state}
                    </p>
                  )}
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrencyAmount(subtotal, currencyInfo)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{taxLabel}:</span>
                  <span className="font-medium">{formatCurrencyAmount(taxAmount, currencyInfo)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-slate-900">Total:</span>
                    <span className="text-blue-600">{formatCurrencyAmount(total, currencyInfo)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 italic">
                    {formatAmountInWords(total, currencyInfo.name)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
