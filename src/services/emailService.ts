import { ContactFormData } from '../config/brevo'
import type { Invoice, Customer, CompanySettings } from '../types/invoice'

export class EmailService {
  private static readonly API_ENDPOINT = '/.netlify/functions/send-email'

  // Enhanced currency symbol mapping for better display
  private static getCurrencySymbol(currencyCode: string): string {
    const symbols: Record<string, string> = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'AUD': 'A$',
      'CAD': 'C$',
      'SGD': 'S$',
      'CHF': 'CHF ',
      'CNY': '¥',
      'KRW': '₩',
      'AED': 'د.إ ',
      'SAR': '﷼ '
    };
    return symbols[currencyCode] || currencyCode + ' ';
  }

  // Format currency amount with proper symbol
  private static formatCurrency(amount: number, currencyCode: string): string {
    const symbol = this.getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toFixed(2)}`;
  }

  static async sendContactEmail(formData: ContactFormData): Promise<void> {
    try {
      const response = await fetch(EmailService.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'kdadks@outlook.com',
          from: formData.email,
          subject: `New Contact Form Submission from ${formData.name}`,
          text: EmailService.generateTextEmail(formData),
          html: EmailService.generateHtmlEmail(formData),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Email sent successfully:', result)
    } catch (error) {
      console.error('Email sending failed:', error)
      throw error
    }
  }

  // Send invoice email with PDF attachment
  static async sendInvoiceEmail(
    invoice: Invoice, 
    customer: Customer, 
    company: CompanySettings, 
    pdfBuffer: string, // Base64 encoded PDF
    isPaidInvoice: boolean = false
  ): Promise<void> {
    try {
      const subject = isPaidInvoice 
        ? `Payment Receipt - Invoice #${invoice.invoice_number} [PAID]`
        : `Invoice #${invoice.invoice_number} from ${company.company_name}`;
      
      const response = await fetch(EmailService.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customer.email,
          from: company.email || 'support@kdadks.com',
          subject,
          text: EmailService.generateInvoiceTextEmail(invoice, customer, company, isPaidInvoice),
          html: EmailService.generateInvoiceHtmlEmail(invoice, customer, company, isPaidInvoice),
          attachments: [{
            filename: `Invoice_${invoice.invoice_number}${isPaidInvoice ? '_PAID' : ''}.pdf`,
            content: pdfBuffer,
            encoding: 'base64',
            type: 'application/pdf'
          }]
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Invoice email sent successfully:', result)
    } catch (error) {
      console.error('Invoice email sending failed:', error)
      throw error
    }
  }

  private static generateInvoiceTextEmail(
    invoice: Invoice, 
    customer: Customer, 
    company: CompanySettings, 
    isPaidInvoice: boolean
  ): string {
    const customerName = customer.company_name || customer.contact_person || 'Valued Customer';
    
    if (isPaidInvoice) {
      return `
Dear ${customerName},

🎉 THANK YOU FOR YOUR PAYMENT! 🎉

We are delighted to confirm that we have received your payment for Invoice #${invoice.invoice_number}.

Payment Details:
- Invoice Number: ${invoice.invoice_number}
- Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
- Amount: ${EmailService.formatCurrency(invoice.total_amount || 0, invoice.original_currency_code || 'INR')}
- Status: PAID ✅

We sincerely appreciate your prompt payment and your continued business with us. Your trust in our services means everything to us.

The attached PDF serves as your official payment receipt. Please keep it for your records.

If you have any questions about this payment or need any assistance, please don't hesitate to contact us.

Thank you once again for choosing ${company.company_name}!

Best regards,
${company.company_name}
${company.email || 'kdadks@outlook.com'}
${company.phone || ''}
${company.address_line1 || ''}${company.address_line2 ? ', ' + company.address_line2 : ''}
${company.city || ''}${company.state ? ', ' + company.state : ''}${company.postal_code ? ' - ' + company.postal_code : ''}
${company.country || 'India'}

---
This is an automated email confirming your payment. Please keep the attached receipt for your records.
      `.trim()
    } else {
      return `
Dear ${customerName},

Thank you for your business! Please find attached Invoice #${invoice.invoice_number}.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
- Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon receipt'}
- Amount: ${EmailService.formatCurrency(invoice.total_amount || 0, invoice.original_currency_code || 'INR')}

Please review the attached invoice and process payment at your earliest convenience.

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
${company.company_name}
${company.email || 'kdadks@outlook.com'}
${company.phone || ''}
${company.address_line1 || ''}${company.address_line2 ? ', ' + company.address_line2 : ''}
${company.city || ''}${company.state ? ', ' + company.state : ''}${company.postal_code ? ' - ' + company.postal_code : ''}
${company.country || 'India'}

---
Invoice generated by ${company.company_name}
      `.trim()
    }
  }

  private static generateInvoiceHtmlEmail(
    invoice: Invoice, 
    customer: Customer, 
    company: CompanySettings, 
    isPaidInvoice: boolean
  ): string {
    const customerName = customer.company_name || customer.contact_person || 'Valued Customer';
    
    if (isPaidInvoice) {
      return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payment Received - Thank You!</title>
    <style>
        body { 
            font-family: Arial, sans-serif !important; 
            line-height: 1.6 !important; 
            color: #1f2937 !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background-color: #f5f5f5 !important;
        }
        .container { 
            max-width: 600px !important; 
            margin: 0 auto !important; 
            padding: 20px !important; 
        }
        .header { 
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important; 
            padding: 30px !important; 
            border-radius: 12px 12px 0 0 !important; 
            text-align: center !important; 
        }
        .header h1 { 
            color: #000000 !important; 
            margin: 0 !important; 
            font-size: 28px !important; 
            font-weight: bold !important; 
            background-color: #ffffff !important;
            padding: 8px 15px !important;
            border-radius: 6px !important;
            display: inline-block !important;
        }
        .header p { 
            color: #000000 !important; 
            margin: 10px 0 0 0 !important; 
            font-size: 16px !important; 
            font-weight: 500 !important; 
            background-color: #ffffff !important;
            padding: 5px 12px !important;
            border-radius: 4px !important;
            display: inline-block !important;
        }
        .thank-you-badge { 
            background: #ffffff !important; 
            color: #16a34a !important; 
            padding: 8px 16px !important; 
            border-radius: 20px !important; 
            display: inline-block !important; 
            margin-top: 15px !important; 
            font-size: 14px !important; 
            font-weight: bold !important; 
            border: 1px solid #16a34a !important; 
        }
        .content { 
            background: #ffffff !important; 
            padding: 30px !important; 
            border: 1px solid #e5e7eb !important; 
            border-radius: 0 0 12px 12px !important;
            color: #1f2937 !important;
        }
        .content h2 {
            color: #1f2937 !important;
        }
        .content p {
            color: #1f2937 !important;
        }
        .payment-details { 
            background: #f0fdf4 !important; 
            border: 2px solid #22c55e !important; 
            border-radius: 8px !important; 
            padding: 20px !important; 
            margin: 20px 0 !important; 
        }
        .payment-details h3 { 
            color: #16a34a !important; 
            margin: 0 0 15px 0 !important; 
            font-size: 18px !important; 
        }
        .detail-row { 
            display: flex !important; 
            justify-content: space-between !important; 
            margin-bottom: 10px !important; 
            padding: 8px 0 !important; 
            border-bottom: 1px solid #dcfce7 !important; 
        }
        .detail-label { 
            font-weight: bold !important; 
            color: #1f2937 !important; 
            font-size: 14px !important; 
        }
        .detail-value { 
            color: #059669 !important; 
            font-weight: bold !important; 
            font-size: 14px !important; 
        }
        .status-paid { 
            background: #22c55e !important; 
            color: #ffffff !important; 
            padding: 6px 12px !important; 
            border-radius: 20px !important; 
            font-size: 12px !important; 
            font-weight: bold !important; 
        }
        .message { 
            background: #f9fafb !important; 
            padding: 20px !important; 
            border-radius: 8px !important; 
            margin: 20px 0 !important;
            color: #1f2937 !important;
        }
        .message p {
            color: #1f2937 !important;
            margin: 0 0 10px 0 !important;
        }
        .footer { 
            margin-top: 30px !important; 
            padding-top: 20px !important; 
            border-top: 2px solid #e5e7eb !important; 
            text-align: center !important; 
            color: #4b5563 !important; 
            font-size: 14px !important; 
        }
        .footer p {
            color: #4b5563 !important;
        }
        .company-info { 
            background: #f8fafc !important; 
            padding: 15px !important; 
            border-radius: 8px !important; 
            margin-top: 20px !important;
            color: #374151 !important;
        }
        .attachment-notice { 
            background: #fef3c7 !important; 
            border: 1px solid #fbbf24 !important; 
            border-radius: 8px !important; 
            padding: 15px !important; 
            margin: 20px 0 !important; 
            text-align: center !important;
            color: #92400e !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Payment Received!</h1>
            <p>Thank you for your payment</p>
            <div class="thank-you-badge" style="color: #16a34a !important; background: #ffffff !important;">Invoice #${invoice.invoice_number} - PAID</div>
        </div>
        
        <div class="content">
            <h2 style="color: #16a34a; margin-top: 0;">Dear ${customerName},</h2>
            
            <p>We are <strong>delighted</strong> to confirm that we have received your payment for Invoice #${invoice.invoice_number}. Thank you for your prompt payment!</p>
            
            <div class="payment-details">
                <h3>💳 Payment Confirmation</h3>
                <div class="detail-row">
                    <span class="detail-label">Invoice Number:</span>
                    <span class="detail-value">#${invoice.invoice_number}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invoice Date:</span>
                    <span class="detail-value">${new Date(invoice.invoice_date).toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Amount Paid:</span>
                    <span class="detail-value" style="font-size: 18px;">${EmailService.formatCurrency(invoice.total_amount || 0, invoice.original_currency_code || 'INR')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Status:</span>
                    <span class="status-paid">✅ PAID</span>
                </div>
            </div>
            
            <div class="message">
                <p><strong>🙏 We sincerely appreciate your prompt payment and your continued business with us.</strong></p>
                <p>Your trust in our services means everything to us, and we look forward to serving you again in the future.</p>
            </div>
            
            <div class="attachment-notice">
                <strong>📎 Receipt Attached</strong><br>
                The attached PDF serves as your official payment receipt. Please keep it for your records.
            </div>
            
            <div class="company-info">
                <strong>${company.company_name}</strong><br>
                ${company.email || 'kdadks@outlook.com'}<br>
                ${company.phone || ''}<br>
                ${company.address_line1 || ''}${company.address_line2 ? '<br>' + company.address_line2 : ''}<br>
                ${company.city || ''}${company.state ? ', ' + company.state : ''}${company.postal_code ? ' - ' + company.postal_code : ''}<br>
                ${typeof company.country === 'object' ? 'India' : (company.country || 'India')}
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing <strong>${company.company_name}</strong>!</p>
            <p style="font-size: 12px; margin-top: 15px;">This is an automated email confirming your payment. Please keep the attached receipt for your records.</p>
        </div>
    </div>
</body>
</html>
      `.trim()
    } else {
      return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice #${invoice.invoice_number}</title>
    <style>
        body { 
            font-family: Arial, sans-serif !important; 
            line-height: 1.6 !important; 
            color: #1f2937 !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background-color: #f5f5f5 !important;
        }
        .container { 
            max-width: 600px !important; 
            margin: 0 auto !important; 
            padding: 20px !important; 
        }
        .header { 
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important; 
            padding: 25px !important; 
            border-radius: 12px 12px 0 0 !important; 
            color: #ffffff !important; 
        }
        .header h1 { 
            margin: 0 !important; 
            font-size: 24px !important; 
            font-weight: bold !important; 
            color: #000000 !important;
            background-color: #ffffff !important;
            padding: 8px 15px !important;
            border-radius: 6px !important;
            display: inline-block !important;
        }
        .header p { 
            margin: 10px 0 0 0 !important; 
            opacity: 0.95 !important; 
            color: #000000 !important;
            font-weight: 500 !important;
            background-color: #ffffff !important;
            padding: 5px 12px !important;
            border-radius: 4px !important;
            display: inline-block !important;
        }
        .content { 
            background: #ffffff !important; 
            padding: 25px !important; 
            border: 1px solid #e5e7eb !important; 
            border-radius: 0 0 12px 12px !important;
            color: #1f2937 !important;
        }
        .content h2 {
            color: #1f2937 !important;
            margin-top: 0 !important;
        }
        .content p {
            color: #1f2937 !important;
        }
        .invoice-details { 
            background: #f8fafc !important; 
            border-radius: 8px !important; 
            padding: 20px !important; 
            margin: 20px 0 !important; 
        }
        .invoice-details h3 {
            margin-top: 0 !important; 
            color: #374151 !important;
        }
        .detail-row { 
            display: flex !important; 
            justify-content: space-between !important; 
            margin-bottom: 8px !important; 
        }
        .detail-label { 
            font-weight: bold !important; 
            color: #374151 !important; 
        }
        .detail-value { 
            color: #1f2937 !important; 
        }
        .amount { 
            font-size: 18px !important; 
            font-weight: bold !important; 
            color: #3b82f6 !important; 
        }
        .company-info {
            background: #f8fafc !important;
            padding: 15px !important;
            border-radius: 8px !important;
            margin-top: 20px !important;
            color: #374151 !important;
        }
        .footer { 
            margin-top: 20px !important; 
            padding-top: 20px !important; 
            border-top: 1px solid #e5e7eb !important; 
            color: #6b7280 !important; 
            font-size: 14px !important; 
        }
        .footer p {
            color: #6b7280 !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 Invoice from ${company.company_name}</h1>
            <p>Invoice #${invoice.invoice_number}</p>
        </div>
        
        <div class="content">
            <h2 style="margin-top: 0;">Dear ${customerName},</h2>
            
            <p>Thank you for your business! Please find attached Invoice #${invoice.invoice_number}.</p>
            
            <div class="invoice-details">
                <h3 style="margin-top: 0; color: #374151;">Invoice Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Invoice Number:</span>
                    <span class="detail-value">#${invoice.invoice_number}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invoice Date:</span>
                    <span class="detail-value">${new Date(invoice.invoice_date).toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Due Date:</span>
                    <span class="detail-value">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon receipt'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Amount:</span>
                    <span class="detail-value amount">${EmailService.formatCurrency(invoice.total_amount || 0, invoice.original_currency_code || 'INR')}</span>
                </div>
            </div>
            
            <p>Please review the attached invoice and process payment at your earliest convenience.</p>
            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <div class="company-info">
                <strong>${company.company_name}</strong><br>
                ${company.email || 'kdadks@outlook.com'}<br>
                ${company.phone || ''}<br>
                ${company.address_line1 || ''}${company.address_line2 ? '<br>' + company.address_line2 : ''}<br>
                ${company.city || ''}${company.state ? ', ' + company.state : ''}${company.postal_code ? ' - ' + company.postal_code : ''}<br>
                ${typeof company.country === 'object' ? 'India' : (company.country || 'India')}
            </div>
        </div>
        
        <div class="footer">
            <p>Invoice generated by <strong>${company.company_name}</strong></p>
        </div>
    </div>
</body>
</html>
      `.trim()
    }
  }

  private static generateTextEmail(formData: ContactFormData): string {
    return `
Contact Form Submission

Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company || 'Not specified'}
Message: ${formData.message}

---
Sent from KDADKS Contact Form
    `.trim()
  }

  private static generateHtmlEmail(formData: ContactFormData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>New Contact Form Submission</title>
    <style>
        body { 
            font-family: Arial, sans-serif !important; 
            line-height: 1.6 !important; 
            color: #1f2937 !important; 
            margin: 0 !important;
            padding: 0 !important;
            background-color: #f5f5f5 !important;
        }
        .container { 
            max-width: 600px !important; 
            margin: 0 auto !important; 
            padding: 20px !important; 
        }
        .header { 
            background-color: #f8f9fa !important; 
            padding: 20px !important; 
            border-radius: 8px !important; 
            margin-bottom: 20px !important; 
        }
        .header h2 {
            margin: 0 !important; 
            color: #007bff !important;
        }
        .content { 
            background-color: #ffffff !important; 
            padding: 20px !important; 
            border: 1px solid #e9ecef !important; 
            border-radius: 8px !important;
            color: #1f2937 !important;
        }
        .field { 
            margin-bottom: 15px !important;
            color: #1f2937 !important;
        }
        .label { 
            font-weight: bold !important; 
            color: #495057 !important; 
        }
        .message { 
            background-color: #f8f9fa !important; 
            padding: 15px !important; 
            border-radius: 4px !important; 
            margin-top: 10px !important;
            color: #1f2937 !important;
        }
        .footer { 
            margin-top: 20px !important; 
            padding-top: 20px !important; 
            border-top: 1px solid #e9ecef !important; 
            font-size: 12px !important; 
            color: #6c757d !important; 
        }
        .footer p {
            color: #6c757d !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0 !important; color: #007bff !important;">New Contact Form Submission</h2>
        </div>
        
        <div class="content">
            <div class="field">
                <span class="label">Name:</span> ${formData.name}
            </div>
            
            <div class="field">
                <span class="label">Email:</span> ${formData.email}
            </div>
            
            <div class="field">
                <span class="label">Company:</span> ${formData.company || 'Not specified'}
            </div>
            
            <div class="field">
                <span class="label">Message:</span>
                <div class="message">${formData.message.replace(/\n/g, '<br>')}</div>
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent from the KDADKS contact form on your website.</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  // Send payment confirmation email
  static async sendPaymentConfirmationEmail(
    customerEmail: string,
    paymentDetails: {
      customerName: string;
      paymentId: string;
      orderId: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      transactionDate: string;
      invoiceId?: string;
    }
  ): Promise<void> {
    try {
      const subject = `Payment Confirmation - KDADKS Service Private Limited`;
      
      const response = await fetch(EmailService.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customerEmail,
          from: 'support@kdadks.com',
          subject,
          text: EmailService.generatePaymentConfirmationTextEmail(paymentDetails),
          html: EmailService.generatePaymentConfirmationHtmlEmail(paymentDetails),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Payment confirmation email sent successfully:', result)
    } catch (error) {
      console.error('Payment confirmation email failed:', error)
      throw error
    }
  }

  // Generate text version of payment confirmation email
  private static generatePaymentConfirmationTextEmail(details: any): string {
    const currencySymbol = this.getCurrencySymbol(details.currency);
    
    return `
Dear ${details.customerName},

We have successfully received your payment. Here are the details:

Payment Details:
- Payment ID: ${details.paymentId}
- Order ID: ${details.orderId}
- Amount: ${currencySymbol}${details.amount.toFixed(2)}
- Payment Method: ${details.paymentMethod.toUpperCase()}
- Transaction Date: ${details.transactionDate}
${details.invoiceId ? `- Invoice ID: ${details.invoiceId}` : ''}

Thank you for choosing KDADKS Service Private Limited.

If you have any questions, please contact us at kdadks@outlook.com or call +91 7982303199.

Best regards,
KDADKS Service Private Limited
Lucknow, India
    `.trim()
  }

  // Generate HTML version of payment confirmation email
  private static generatePaymentConfirmationHtmlEmail(details: any): string {
    const currencySymbol = this.getCurrencySymbol(details.currency);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .success-icon { font-size: 48px; color: #4CAF50; text-align: center; margin-bottom: 20px; }
        .details-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #555; }
        .value { color: #333; }
        .amount { font-size: 18px; font-weight: bold; color: #4CAF50; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Payment Confirmation</h1>
        <p>KDADKS Service Private Limited</p>
    </div>
    
    <div class="content">
        <div class="success-icon">✅</div>
        
        <h2 style="text-align: center; color: #4CAF50;">Payment Successful!</h2>
        
        <p>Dear ${details.customerName},</p>
        
        <p>We have successfully received your payment. Here are the transaction details:</p>
        
        <div class="details-box">
            <div class="detail-row">
                <span class="label">Payment ID:</span>
                <span class="value">${details.paymentId}</span>
            </div>
            <div class="detail-row">
                <span class="label">Order ID:</span>
                <span class="value">${details.orderId}</span>
            </div>
            <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value amount">${currencySymbol}${details.amount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
                <span class="label">Payment Method:</span>
                <span class="value">${details.paymentMethod.toUpperCase()}</span>
            </div>
            <div class="detail-row">
                <span class="label">Transaction Date:</span>
                <span class="value">${details.transactionDate}</span>
            </div>
            ${details.invoiceId ? `
            <div class="detail-row">
                <span class="label">Invoice ID:</span>
                <span class="value">${details.invoiceId}</span>
            </div>
            ` : ''}
        </div>
        
        <p>Thank you for choosing KDADKS Service Private Limited. Your payment has been processed successfully.</p>
        
        <p>If you have any questions about this transaction, please don't hesitate to contact us:</p>
        <ul>
            <li>Email: kdadks@outlook.com</li>
            <li>Phone: +91 7982303199</li>
        </ul>
        
        <div class="footer">
            <p><strong>KDADKS Service Private Limited</strong><br>
            Lucknow, India<br>
            <a href="https://kdadks.com">www.kdadks.com</a></p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }
}