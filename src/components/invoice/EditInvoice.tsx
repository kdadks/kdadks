import React from 'react';
import { FileText, Package, Plus, Trash } from 'lucide-react';
import type { CreateInvoiceData, CreateInvoiceItemData, Customer, Product, TermsTemplate, CompanySettings, Invoice } from '../../types/invoice';
import { getTaxLabel, getClassificationCodeLabel } from '../../utils/taxUtils';
import { ExchangeRateDisplay } from '../ui/ExchangeRateDisplay';

interface EditInvoiceProps {
  selectedInvoice: Invoice;
  invoiceFormData: CreateInvoiceData;
  onFormChange: (field: keyof CreateInvoiceData, value: string | CreateInvoiceItemData[]) => void;
  onItemChange: (index: number, field: keyof CreateInvoiceItemData, value: string | number | undefined) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSaveInvoice: () => void;
  onCloseInvoice: () => void;
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
  modalLoading?: boolean;
  calculateInvoiceTotals: () => { subtotal: number; taxAmount: number; total: number };
  getCurrencyInfo: (customer: Customer | undefined) => { symbol: string; code: string; name: string };
  formatCurrencyAmount: (amount: number, currencyInfo: { symbol: string; code: string }) => string;
  formatAmountInWords: (amount: number, currencyName: string) => string;
  getStatusColor: (status: string) => string;
}

export const EditInvoice: React.FC<EditInvoiceProps> = ({
  selectedInvoice,
  invoiceFormData,
  onFormChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSaveInvoice,
  onCloseInvoice,
  onTermsChange,
  onTermsTemplateSelect,
  // onDefaultProductChange: _onDefaultProductChange, // Unused for now
  customers,
  products,
  termsTemplates,
  // companySettings: _companySettings, // Unused for now
  // selectedDefaultProduct: _selectedDefaultProduct, // Unused for now
  selectedTermsTemplateId,
  globalHsnCode,
  modalLoading,
  calculateInvoiceTotals,
  getCurrencyInfo,
  formatCurrencyAmount,
  formatAmountInWords,
  getStatusColor
}) => {
  const { subtotal, taxAmount, total } = calculateInvoiceTotals();
  const selectedCustomer = customers.find(c => c.id === invoiceFormData.customer_id);
  const currencyInfo = getCurrencyInfo(selectedCustomer);
  // const _activeProducts = products.filter(p => p.is_active); // Unused for now

  // Get dynamic tax label based on customer's country
  const taxLabel = getTaxLabel(selectedCustomer);
  const classificationLabel = getClassificationCodeLabel(selectedCustomer);

  console.log('✏️ EditInvoice - Rendering with data:', {
    selectedInvoice: {
      id: selectedInvoice.id,
      invoice_number: selectedInvoice.invoice_number,
      status: selectedInvoice.status
    },
    invoiceFormData,
    items: invoiceFormData.items,
    itemsLength: invoiceFormData.items.length
  });

  // Debug each item individually
  invoiceFormData.items.forEach((item, index) => {
    console.log(`✏️ Edit Item ${index + 1}:`, {
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      hsn_code: item.hsn_code
    });
  });

  // Enhanced debugging helpers
  const handleFormChange = (field: keyof CreateInvoiceData, value: string | CreateInvoiceItemData[]) => {
    console.log('🔧 EditInvoice Form Change:', {
      field,
      value,
      currentInvoiceData: invoiceFormData,
      selectedInvoice: selectedInvoice.invoice_number
    });
    onFormChange(field, value);
  };

  const handleItemChange = (index: number, field: keyof CreateInvoiceItemData, value: string | number | undefined) => {
    console.log(`🔧 EditInvoice Item Change [${index}]:`, {
      field,
      value,
      currentItem: invoiceFormData.items[index],
      selectedInvoice: selectedInvoice.invoice_number
    });
    onItemChange(index, field, value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Edit Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Edit Invoice</h1>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="font-medium">Invoice Number:</span>
                  <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-gray-800 font-mono">
                    {selectedInvoice.invoice_number}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium">Current Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedInvoice.status)}`}>
                    {selectedInvoice.status.toUpperCase()}
                  </span>
                </div>
              </div>
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
                    value={selectedInvoice.invoice_number}
                    disabled
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer *
                  </label>
                  <select
                    value={invoiceFormData.customer_id}
                    onChange={(e) => handleFormChange('customer_id', e.target.value)}
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
                    onChange={(e) => handleFormChange('invoice_date', e.target.value)}
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

              {/* Product Selection - Show existing product if any line item has product_id */}
              {(() => {
                // Find the first line item that has a product_id
                const itemWithProduct = invoiceFormData.items.find(item => item.product_id);
                const linkedProduct = itemWithProduct ? products.find(p => p.id === itemWithProduct.product_id) : null;
                
                if (linkedProduct) {
                  // Show simple readonly field with just the product name
                  return (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Product/Service
                      </label>
                      <input
                        type="text"
                        value={linkedProduct.name}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                        readOnly
                        disabled
                      />
                    </div>
                  );
                }
                return null;
              })()}
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
                {invoiceFormData.items.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No line items found. Click "Add Item" to add line items.</p>
                  </div>
                ) : (
                  invoiceFormData.items.map((item, index) => {
                    console.log(`🔍 Rendering edit item ${index}:`, item);
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
                              onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
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
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
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
                              onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
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
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                              rows={2}
                              required
                            />
                          </div>
                          
                          {/* HSN Code */}
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
                                onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
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
                  })
                )}
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

            {/* Exchange Rate Display for Non-INR Customers */}
            <ExchangeRateDisplay selectedCustomer={selectedCustomer} showUpdateButton={false} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onCloseInvoice}
            disabled={modalLoading}
            className="px-6 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('🔄 Edit Invoice - Save Button Clicked');
              onSaveInvoice();
            }}
            disabled={modalLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {modalLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              'Update Invoice'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditInvoice;
