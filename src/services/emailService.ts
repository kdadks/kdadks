import { ContactFormData } from '../config/emailConfig'
import type { Invoice, Customer, CompanySettings } from '../types/invoice'

export class EmailService {
  // Get API endpoint based on environment
  private static getApiEndpoint(): string {
    const isProduction = import.meta.env.MODE === 'production' || window.location.hostname !== 'localhost';
    if (isProduction) {
      // Production: Use Netlify Functions
      return '/.netlify/functions/send-email'
    } else {
      // Development: Use local proxy
      return '/api/send-email'
    }
  }

  // Enhanced error handling for API calls
  private static async makeApiCall(url: string, options: RequestInit): Promise<Response> {
    try {
      console.log('🔍 Making API call to:', url);
      console.log('🔍 Environment:', import.meta.env.MODE, 'Production:', import.meta.env.PROD);
      
      const response = await fetch(url, options);
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Check if response is HTML (404 page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('❌ API endpoint returned HTML instead of JSON. This usually means the function is not deployed or the path is incorrect.');
        console.error('Expected JSON but received HTML content type:', contentType);
        
        // Try to get the actual HTML content for debugging
        const text = await response.text();
        console.error('HTML response preview:', text.substring(0, 200) + '...');
        
        throw new Error(`Netlify Function not available. Status: ${response.status}. Check deployment and function configuration.`);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API call failed with status:', response.status, errorText);
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('❌ API call failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to email service. Please check your internet connection.');
      }
      throw error;
    }
  }

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
      const response = await EmailService.makeApiCall(EmailService.getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'contact@kdadks.com',
          from: formData.email,
          customerName: formData.name, // Pass customer name for display
          subject: `New Contact Form Submission from ${formData.name}`,
          text: EmailService.generateTextEmail(formData),
          html: EmailService.generateHtmlEmail(formData),
          recaptchaToken: formData.recaptchaToken,
          recaptchaAction: formData.recaptchaAction || 'contact_form'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('🔍 API Response:', result)
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'Email sending failed')
      }
      
      console.log('✅ Email sent successfully:', result)
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
      
      const response = await EmailService.makeApiCall(EmailService.getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customer.email,
          from: '"KDADKS Service Private Limited" <contact@kdadks.com>',
          customerName: company.company_name, // Pass company name for display
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
      invoiceNumber?: string;
    }
  ): Promise<void> {
    try {
      const subject = `Payment Confirmation - KDADKS Service Private Limited`;
      
      const response = await EmailService.makeApiCall(EmailService.getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customerEmail,
          from: '"KDADKS Service Private Limited" <contact@kdadks.com>',
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
            ${details.invoiceNumber ? `
            <div class="detail-row">
                <span class="label">Invoice Number:</span>
                <span class="value">${details.invoiceNumber}</span>
            </div>
            ` : ''}
        </div>
        
        <p>Thank you for choosing KDADKS Service Private Limited. Your payment has been processed successfully.</p>
        
        <p>If you have any questions about this transaction, please don't hesitate to contact us:</p>
        <ul>
            <li>Email: contact@kdadks.com</li>
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

  // Payment Request Email Method
  // Send salary slip email
  static async sendSalarySlipEmail(params: {
    to: string;
    employeeName: string;
    month: string;
    netSalary: number;
    pdfAttachment: string;
  }): Promise<void> {
    try {
      const subject = `Salary Slip for ${params.month} - KDADKS`;

      const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Salary Slip</h1>
        </div>

        <div class="content">
            <p>Dear ${params.employeeName},</p>

            <p>Please find attached your salary slip for <strong>${params.month}</strong>.</p>

            <p><strong>Net Salary:</strong> ₹${params.netSalary.toLocaleString('en-IN')}</p>

            <p>The attached PDF contains a detailed breakdown of your earnings, deductions, and tax information.</p>

            <p>If you have any questions or notice any discrepancies, please contact the HR department.</p>

            <p>Best regards,<br>
            HR Department<br>
            KDADKS Service Private Limited</p>
        </div>

        <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} KDADKS Service Private Limited. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
      `.trim();

      const textEmail = `
Dear ${params.employeeName},

Please find attached your salary slip for ${params.month}.

Net Salary: ₹${params.netSalary.toLocaleString('en-IN')}

The attached PDF contains a detailed breakdown of your earnings, deductions, and tax information.

If you have any questions or notice any discrepancies, please contact the HR department.

Best regards,
HR Department
KDADKS Service Private Limited
      `.trim();

      const response = await EmailService.makeApiCall(EmailService.getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: params.to,
          from: '"KDADKS HR Department" <contact@kdadks.com>',
          subject,
          text: textEmail,
          html: htmlEmail,
          attachments: [{
            filename: `salary_slip_${params.month.replace(' ', '_')}.pdf`,
            content: params.pdfAttachment.split(',')[1], // Remove data:application/pdf;base64, prefix
            encoding: 'base64'
          }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Salary slip email sent successfully:', result);
    } catch (error) {
      console.error('Failed to send salary slip email:', error);
      throw error;
    }
  }

  static async sendPaymentRequestEmail(
    recipientEmail: string,
    details: {
      customerName: string;
      invoiceNumber: string;
      amount: number;
      currency: string;
      dueDate: string;
      paymentUrl: string;
      paymentRequestId: string;
      gatewayName: string;
    }
  ): Promise<void> {
    try {
      const response = await EmailService.makeApiCall(EmailService.getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          from: '"KDADKS Service Private Limited" <contact@kdadks.com>',
          subject: `Payment Request - Invoice ${details.invoiceNumber} - ${this.formatCurrency(details.amount, details.currency)}`,
          text: this.generatePaymentRequestTextEmail(details),
          html: this.generatePaymentRequestHtmlEmail(details),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Payment request email sent successfully to:', recipientEmail);
    } catch (error) {
      console.error('❌ Failed to send payment request email:', error);
      throw error;
    }
  }

  private static generatePaymentRequestTextEmail(details: {
    customerName: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    dueDate: string;
    paymentUrl: string;
    paymentRequestId: string;
    gatewayName: string;
  }): string {
    return `
Dear ${details.customerName},

You have received a payment request for Invoice ${details.invoiceNumber}.

Payment Details:
- Invoice Number: ${details.invoiceNumber}
- Amount: ${this.formatCurrency(details.amount, details.currency)}
- Due Date: ${details.dueDate}
- Payment Gateway: ${details.gatewayName}
- Payment Request ID: ${details.paymentRequestId}

Click the link below to make your payment securely:
${details.paymentUrl}

This payment request will expire in 72 hours.

If you have any questions, please contact us at contact@kdadks.com or +91 7982303199.

Best regards,
KDADKS Service Private Limited
Lucknow, India
www.kdadks.com
    `.trim();
  }

  private static generatePaymentRequestHtmlEmail(details: {
    customerName: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    dueDate: string;
    paymentUrl: string;
    paymentRequestId: string;
    gatewayName: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Payment Request - ${details.invoiceNumber}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: #374151; margin-bottom: 20px; }
        .invoice-details { background: #f8fafc; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #2563eb; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #4b5563; }
        .detail-value { font-weight: 500; color: #1f2937; }
        .amount { color: #059669; font-weight: 700; font-size: 18px; }
        .payment-button { text-align: center; margin: 35px 0; }
        .payment-button a { display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white !important; text-decoration: none !important; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
        .payment-button a:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); }
        .fallback-url { background: #e0f2fe; border: 1px solid #0277bd; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; }
        .fallback-url h3 { color: #01579b; margin: 0 0 10px 0; }
        .fallback-url .url { background: white; border: 1px solid #ccc; border-radius: 4px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 14px; color: #1976d2; margin: 10px 0; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; color: #92400e; }
        .warning strong { color: #78350f; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 25px; text-align: center; color: #6b7280; font-size: 14px; }
        .contact-info { margin: 15px 0; }
        .contact-info strong { color: #374151; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💳 Payment Request</h1>
            <p>KDADKS Service Private Limited</p>
        </div>
        
        <div class="content">
            <p class="greeting">Dear ${details.customerName},</p>
            
            <p>You have received a payment request for the following invoice:</p>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <span class="detail-label">Invoice Number:</span>
                    <span class="detail-value">${details.invoiceNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Amount:</span>
                    <span class="detail-value amount">${this.formatCurrency(details.amount, details.currency)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Due Date:</span>
                    <span class="detail-value">${details.dueDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Gateway:</span>
                    <span class="detail-value">${details.gatewayName}</span>
                </div>
            </div>
            
            <div class="payment-button">
                <p style="margin-bottom: 20px; color: #374151;">Click the button below to make your payment securely:</p>
                <a href="${details.paymentUrl}" target="_blank">🔒 Pay Securely Online</a>
                <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">Payment powered by ${details.gatewayName}</p>
            </div>
            
            <div class="fallback-url">
                <h3>🔗 Alternative Payment Link</h3>
                <p style="margin: 10px 0;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <div class="url">${details.paymentUrl}</div>
                <p><a href="${details.paymentUrl}" target="_blank" style="color: #1976d2; font-weight: 600;">Click here to pay</a></p>
            </div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This payment request will expire in 72 hours.
            </div>
            
            <p>If you have any questions about this payment request, please don't hesitate to contact us.</p>
            
            <div class="contact-info">
                <strong>Contact Information:</strong><br>
                Email: contact@kdadks.com<br>
                Phone: +91 7982303199
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Payment Request ID:</strong> ${details.paymentRequestId}</p>
            <p><strong>KDADKS Service Private Limited</strong><br>
            Lucknow, India<br>
            <a href="https://kdadks.com" style="color: #2563eb;">www.kdadks.com</a></p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  // Send password expiry reminder email
  static async sendPasswordExpiryReminder(
    employeeEmail: string,
    employeeName: string,
    daysUntilExpiry: number
  ): Promise<void> {
    try {
      const urgency = daysUntilExpiry <= 3;
      const subject = urgency 
        ? `🚨 URGENT: Your Password Expires in ${daysUntilExpiry} Day${daysUntilExpiry === 1 ? '' : 's'}!`
        : `⚠️ Reminder: Your Password Expires in ${daysUntilExpiry} Days`;

      const response = await EmailService.makeApiCall(EmailService.getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: employeeEmail,
          from: '"KDADKS HR Department" <contact@kdadks.com>',
          subject,
          text: EmailService.generatePasswordExpiryTextEmail(employeeName, daysUntilExpiry, urgency),
          html: EmailService.generatePasswordExpiryHtmlEmail(employeeName, daysUntilExpiry, urgency),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Password expiry reminder sent successfully:', result);
    } catch (error) {
      console.error('Failed to send password expiry reminder:', error);
      throw error;
    }
  }

  private static generatePasswordExpiryTextEmail(
    employeeName: string,
    daysUntilExpiry: number,
    urgency: boolean
  ): string {
    return `
Dear ${employeeName},

${urgency ? '🚨 URGENT SECURITY NOTICE' : '⚠️ PASSWORD EXPIRY REMINDER'}

Your password ${daysUntilExpiry === 1 ? 'expires TOMORROW' : `expires in ${daysUntilExpiry} days`}!

For security compliance, all employee passwords must be changed every 90 days. Your password is approaching its expiration date.

WHAT HAPPENS IF YOU DON'T CHANGE IT:
${urgency ? '⚠️ Your account will be LOCKED and you will not be able to access the employee portal until an administrator resets your password.' : '• Your account will be locked after expiry\n• You will lose access to the employee portal\n• An administrator will need to reset your password'}

HOW TO CHANGE YOUR PASSWORD NOW:
1. Go to: https://kdadks.com/employee/login
2. Log in with your current password
3. Click on "Change Password" in your profile
4. Enter your current password
5. Create a new strong password

PASSWORD REQUIREMENTS:
• At least 8 characters long
• Must contain uppercase letters (A-Z)
• Must contain lowercase letters (a-z)
• Must contain numbers (0-9)
• Must contain special characters (!@#$%^&*)

Please change your password immediately to avoid account lockout.

If you need assistance, contact the HR department at contact@kdadks.com or call +91 7982303199.

Best regards,
HR Department
KDADKS Service Private Limited

---
This is an automated security notification. Please do not reply to this email.
    `.trim();
  }

  private static generatePasswordExpiryHtmlEmail(
    employeeName: string,
    daysUntilExpiry: number,
    urgency: boolean
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password Expiry Reminder</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f9fafb; 
            color: #1f2937;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
            background: ${urgency ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #f59e0b, #d97706)'}; 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
        }
        .header .icon { 
            font-size: 48px; 
            margin-bottom: 10px; 
        }
        .content { 
            padding: 40px 30px; 
        }
        .greeting { 
            font-size: 18px; 
            color: #374151; 
            margin-bottom: 20px; 
        }
        .alert-box { 
            background: ${urgency ? '#fee2e2' : '#fef3c7'}; 
            border-left: 4px solid ${urgency ? '#dc2626' : '#f59e0b'}; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 25px 0; 
        }
        .alert-box h2 { 
            margin: 0 0 10px 0; 
            color: ${urgency ? '#991b1b' : '#92400e'}; 
            font-size: 20px; 
        }
        .alert-box p { 
            margin: 0; 
            color: ${urgency ? '#7f1d1d' : '#78350f'}; 
            font-size: 16px; 
            line-height: 1.5;
        }
        .countdown { 
            text-align: center; 
            font-size: 48px; 
            font-weight: bold; 
            color: ${urgency ? '#dc2626' : '#f59e0b'}; 
            margin: 20px 0; 
            padding: 20px; 
            background: ${urgency ? '#fef2f2' : '#fffbeb'}; 
            border-radius: 8px; 
        }
        .instructions { 
            background: #f8fafc; 
            border-radius: 8px; 
            padding: 25px; 
            margin: 25px 0; 
        }
        .instructions h3 { 
            margin: 0 0 15px 0; 
            color: #1f2937; 
            font-size: 18px; 
        }
        .instructions ol { 
            margin: 0; 
            padding-left: 20px; 
            color: #4b5563; 
        }
        .instructions li { 
            margin: 8px 0; 
            line-height: 1.6; 
        }
        .requirements { 
            background: #ecfdf5; 
            border: 1px solid #10b981; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
        }
        .requirements h3 { 
            margin: 0 0 12px 0; 
            color: #065f46; 
            font-size: 16px; 
        }
        .requirements ul { 
            margin: 0; 
            padding-left: 20px; 
            color: #064e3b; 
        }
        .requirements li { 
            margin: 6px 0; 
        }
        .cta-button { 
            text-align: center; 
            margin: 30px 0; 
        }
        .cta-button a { 
            display: inline-block; 
            background: ${urgency ? '#dc2626' : '#2563eb'}; 
            color: white; 
            padding: 15px 40px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px; 
            transition: all 0.3s; 
        }
        .cta-button a:hover { 
            background: ${urgency ? '#b91c1c' : '#1d4ed8'}; 
            transform: translateY(-2px); 
        }
        .warning { 
            background: #fef2f2; 
            border: 2px solid #fca5a5; 
            border-radius: 8px; 
            padding: 15px; 
            margin: 20px 0; 
            color: #991b1b; 
            font-weight: 500; 
        }
        .contact-info { 
            background: #f8fafc; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 25px 0; 
            color: #4b5563; 
        }
        .footer { 
            background: #f9fafb; 
            padding: 25px 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px; 
            border-top: 1px solid #e5e7eb; 
        }
        .footer p { 
            margin: 5px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">${urgency ? '🚨' : '⚠️'}</div>
            <h1>${urgency ? 'URGENT' : ''} Password Expiry Notice</h1>
            <p>Security Compliance Required</p>
        </div>
        
        <div class="content">
            <p class="greeting">Dear ${employeeName},</p>
            
            <div class="alert-box">
                <h2>${urgency ? '🚨 IMMEDIATE ACTION REQUIRED' : '⚠️ Password Expiry Reminder'}</h2>
                <p>Your employee portal password is about to expire. You must change it to maintain access to your account.</p>
            </div>
            
            <div class="countdown">
                ${daysUntilExpiry === 1 ? 'EXPIRES<br>TOMORROW' : `${daysUntilExpiry}<br>DAYS LEFT`}
            </div>
            
            ${urgency ? `
            <div class="warning">
                <strong>⚠️ Warning:</strong> If you don't change your password before it expires, your account will be <strong>LOCKED</strong> and you will not be able to access the employee portal. An administrator will need to manually reset your access.
            </div>
            ` : `
            <p style="color: #4b5563; line-height: 1.6;">
                For security compliance, all employee passwords must be changed every <strong>90 days</strong>. 
                Your current password is approaching its expiration date.
            </p>
            `}
            
            <div class="instructions">
                <h3>📝 How to Change Your Password</h3>
                <ol>
                    <li>Go to the employee portal: <a href="https://kdadks.com/employee/login" style="color: #2563eb;">kdadks.com/employee/login</a></li>
                    <li>Log in with your current credentials</li>
                    <li>Navigate to your profile and click "Change Password"</li>
                    <li>Enter your current password</li>
                    <li>Create a new strong password that meets all requirements</li>
                    <li>Confirm and save your new password</li>
                </ol>
            </div>
            
            <div class="requirements">
                <h3>🔒 Password Requirements</h3>
                <ul>
                    <li>At least <strong>8 characters</strong> long</li>
                    <li>Must contain <strong>uppercase letters</strong> (A-Z)</li>
                    <li>Must contain <strong>lowercase letters</strong> (a-z)</li>
                    <li>Must contain <strong>numbers</strong> (0-9)</li>
                    <li>Must contain <strong>special characters</strong> (!@#$%^&*)</li>
                </ul>
            </div>
            
            <div class="cta-button">
                <a href="https://kdadks.com/employee/login">🔐 Change Password Now</a>
            </div>
            
            <div class="contact-info">
                <strong>Need Help?</strong><br>
                If you have any questions or need assistance changing your password, please contact:<br><br>
                📧 Email: contact@kdadks.com<br>
                📞 Phone: +91 7982303199
            </div>
        </div>
        
        <div class="footer">
            <p><strong>KDADKS Service Private Limited</strong></p>
            <p>This is an automated security notification. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} KDADKS Service Private Limited. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  // Send password reset notification when admin resets employee password
  static async sendPasswordResetNotification(
    employeeEmail: string,
    employeeName: string,
    temporaryPassword: string
  ): Promise<void> {
    try {
      const subject = '🔐 Your Password Has Been Reset - KDADKS';

      const response = await EmailService.makeApiCall(EmailService.getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: employeeEmail,
          from: '"KDADKS HR Department" <contact@kdadks.com>',
          subject,
          text: EmailService.generatePasswordResetTextEmail(employeeName, temporaryPassword),
          html: EmailService.generatePasswordResetHtmlEmail(employeeName, temporaryPassword),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Password reset notification sent successfully:', result);
    } catch (error) {
      console.error('Failed to send password reset notification:', error);
      throw error;
    }
  }

  private static generatePasswordResetTextEmail(
    employeeName: string,
    temporaryPassword: string
  ): string {
    return `
Dear ${employeeName},

Your employee portal password has been reset by an administrator.

TEMPORARY PASSWORD: ${temporaryPassword}

IMPORTANT SECURITY INSTRUCTIONS:
1. This is a temporary password that MUST be changed on first login
2. Do not share this password with anyone
3. You will be required to create a new password immediately upon login

HOW TO LOGIN AND CHANGE YOUR PASSWORD:
1. Go to: https://kdadks.com/employee/login
2. Enter your email and the temporary password above
3. You will be automatically redirected to change your password
4. Create a strong password that meets all requirements

PASSWORD REQUIREMENTS:
• At least 8 characters long
• Must contain uppercase letters (A-Z)
• Must contain lowercase letters (a-z)
• Must contain numbers (0-9)
• Must contain special characters (!@#$%^&*)

If you did not request this password reset or have concerns about your account security, please contact the HR department immediately.

Contact Information:
Email: contact@kdadks.com
Phone: +91 7982303199

Best regards,
HR Department
KDADKS Service Private Limited

---
This is an automated security notification. Please do not reply to this email.
    `.trim();
  }

  private static generatePasswordResetHtmlEmail(
    employeeName: string,
    temporaryPassword: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password Reset Notification</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f9fafb; 
            color: #1f2937;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
            background: linear-gradient(135deg, #2563eb, #1d4ed8); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
        }
        .header .icon { 
            font-size: 48px; 
            margin-bottom: 10px; 
        }
        .content { 
            padding: 40px 30px; 
        }
        .greeting { 
            font-size: 18px; 
            color: #374151; 
            margin-bottom: 20px; 
        }
        .password-box { 
            background: #fef3c7; 
            border: 2px solid #f59e0b; 
            border-radius: 8px; 
            padding: 25px; 
            margin: 25px 0; 
            text-align: center; 
        }
        .password-box h2 { 
            margin: 0 0 15px 0; 
            color: #92400e; 
            font-size: 18px; 
        }
        .password-box .password { 
            font-family: 'Courier New', monospace; 
            font-size: 24px; 
            font-weight: bold; 
            color: #1f2937; 
            background: white; 
            padding: 15px 20px; 
            border-radius: 6px; 
            display: inline-block; 
            letter-spacing: 2px; 
            border: 2px dashed #f59e0b; 
        }
        .security-notice { 
            background: #fee2e2; 
            border-left: 4px solid #dc2626; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 25px 0; 
        }
        .security-notice h3 { 
            margin: 0 0 10px 0; 
            color: #991b1b; 
            font-size: 16px; 
        }
        .security-notice ul { 
            margin: 10px 0 0 0; 
            padding-left: 20px; 
            color: #7f1d1d; 
        }
        .security-notice li { 
            margin: 6px 0; 
        }
        .instructions { 
            background: #f8fafc; 
            border-radius: 8px; 
            padding: 25px; 
            margin: 25px 0; 
        }
        .instructions h3 { 
            margin: 0 0 15px 0; 
            color: #1f2937; 
            font-size: 18px; 
        }
        .instructions ol { 
            margin: 0; 
            padding-left: 20px; 
            color: #4b5563; 
        }
        .instructions li { 
            margin: 8px 0; 
            line-height: 1.6; 
        }
        .requirements { 
            background: #ecfdf5; 
            border: 1px solid #10b981; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
        }
        .requirements h3 { 
            margin: 0 0 12px 0; 
            color: #065f46; 
            font-size: 16px; 
        }
        .requirements ul { 
            margin: 0; 
            padding-left: 20px; 
            color: #064e3b; 
        }
        .requirements li { 
            margin: 6px 0; 
        }
        .cta-button { 
            text-align: center; 
            margin: 30px 0; 
        }
        .cta-button a { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 15px 40px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px; 
        }
        .cta-button a:hover { 
            background: #1d4ed8; 
        }
        .contact-info { 
            background: #f8fafc; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 25px 0; 
            color: #4b5563; 
        }
        .footer { 
            background: #f9fafb; 
            padding: 25px 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px; 
            border-top: 1px solid #e5e7eb; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🔐</div>
            <h1>Password Reset</h1>
            <p>Your password has been reset</p>
        </div>
        
        <div class="content">
            <p class="greeting">Dear ${employeeName},</p>
            
            <p style="color: #4b5563; line-height: 1.6;">
                Your employee portal password has been reset by an administrator. 
                Please use the temporary password below to log in and create a new password.
            </p>
            
            <div class="password-box">
                <h2>🔑 Your Temporary Password</h2>
                <div class="password">${temporaryPassword}</div>
                <p style="margin: 15px 0 0 0; color: #78350f; font-size: 14px;">
                    <strong>⚠️ This password must be changed on first login</strong>
                </p>
            </div>
            
            <div class="security-notice">
                <h3>🛡️ Important Security Instructions</h3>
                <ul>
                    <li><strong>Do not share</strong> this temporary password with anyone</li>
                    <li>You will be <strong>required to change</strong> this password immediately upon login</li>
                    <li>This is a <strong>one-time use</strong> temporary password</li>
                    <li>If you didn't request this reset, contact HR immediately</li>
                </ul>
            </div>
            
            <div class="instructions">
                <h3>📝 How to Login and Change Password</h3>
                <ol>
                    <li>Go to the employee portal: <a href="https://kdadks.com/employee/login" style="color: #2563eb;">kdadks.com/employee/login</a></li>
                    <li>Enter your email address</li>
                    <li>Enter the temporary password shown above</li>
                    <li>You will be automatically redirected to the password change page</li>
                    <li>Create a strong new password that meets all requirements</li>
                    <li>Confirm your new password and save</li>
                </ol>
            </div>
            
            <div class="requirements">
                <h3>🔒 New Password Requirements</h3>
                <ul>
                    <li>At least <strong>8 characters</strong> long</li>
                    <li>Must contain <strong>uppercase letters</strong> (A-Z)</li>
                    <li>Must contain <strong>lowercase letters</strong> (a-z)</li>
                    <li>Must contain <strong>numbers</strong> (0-9)</li>
                    <li>Must contain <strong>special characters</strong> (!@#$%^&*)</li>
                </ul>
            </div>
            
            <div class="cta-button">
                <a href="https://kdadks.com/employee/login">🚀 Login Now</a>
            </div>
            
            <div class="contact-info">
                <strong>Security Concerns?</strong><br>
                If you did not request this password reset or have concerns about your account security, 
                please contact the HR department immediately:<br><br>
                📧 Email: contact@kdadks.com<br>
                📞 Phone: +91 7982303199
            </div>
        </div>
        
        <div class="footer">
            <p><strong>KDADKS Service Private Limited</strong></p>
            <p>This is an automated security notification. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} KDADKS Service Private Limited. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }
}