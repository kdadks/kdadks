import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Mail, 
  Calendar
} from 'lucide-react';
import type { Invoice } from '../../types/invoice';

interface InvoiceGeneratorProps {
  invoice?: Invoice;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ 
  invoice 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      // PDF generation logic would go here
      console.log('Generating PDF for invoice:', invoice?.invoice_number);
      
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // This would trigger the actual PDF download
      console.log('PDF generated successfully');
      
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmailInvoice = async () => {
    try {
      console.log('Sending invoice via email:', invoice?.invoice_number);
      // Email sending logic would go here
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoice Selected</h3>
        <p className="text-gray-500">Select an invoice to generate PDF or email.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Invoice Generator</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handleEmailInvoice}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </button>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">From</h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{invoice.company_settings?.company_name}</p>
              <p>
                {invoice.company_settings?.address_line1}
                {invoice.company_settings?.address_line2 && <>, {invoice.company_settings.address_line2}</>}
              </p>
              <p>{invoice.company_settings?.city}, {invoice.company_settings?.state} {invoice.company_settings?.postal_code}</p>
              <p>{invoice.company_settings?.email}</p>
              <p>{invoice.company_settings?.phone}</p>
              {invoice.company_settings?.website && <p>{invoice.company_settings.website}</p>}
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">To</h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{invoice.customer?.company_name || invoice.customer?.contact_person}</p>
              <p>
                {invoice.customer?.address_line1}
                {invoice.customer?.address_line2 && <>, {invoice.customer.address_line2}</>}
              </p>
              <p>{invoice.customer?.city}, {invoice.customer?.state} {invoice.customer?.postal_code}</p>
              <p>{invoice.customer?.email}</p>
              <p>{invoice.customer?.phone}</p>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center mb-2">
              <FileText className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Invoice Number:</span>
            </div>
            <p className="text-lg font-semibold">{invoice.invoice_number}</p>
          </div>
          
          <div>
            <div className="flex items-center mb-2">
              <Calendar className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Invoice Date:</span>
            </div>
            <p className="text-lg">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.invoice_items?.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm text-gray-900">₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Tax:</span>
              <span className="text-sm text-gray-900">₹{invoice.tax_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-gray-200">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-lg font-semibold text-gray-900">₹{invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Notes:</h4>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Terms */}
        {invoice.terms_conditions && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Terms & Conditions:</h4>
            <p className="text-sm text-gray-600">{invoice.terms_conditions}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceGenerator;
