import { ContactFormData } from '../config/brevo'
import type { Invoice, Customer, CompanySettings } from '../types/invoice'

export class EmailService {
  private static getApiEndpoint(): string {
    // Use local email server in development, Netlify function in production
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isDevelopment
      ? 'http://localhost:3002/send-email'  // Local development
      : '/.netlify/functions/send-email';    // Production
  }

  static async sendContactEmail(formData: ContactFormData): Promise<void> {
    try {
      const response = await fetch(EmailService.getApiEndpoint(), {
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
      
      const endpoint = EmailService.getApiEndpoint();
      console.log('🔍 Email Service Debug Info:');
      console.log('- Hostname:', window.location.hostname);
      console.log('- Is Development:', window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      console.log('- Using endpoint:', endpoint);
      console.log('- Customer email:', customer.email);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customer.email,
          from: 'support@kdadks.com', // Use original working production format
          replyTo: 'support@kdadks.com',
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

      console.log('Email API response status:', response.status);
      console.log('Email API endpoint used:', EmailService.getApiEndpoint());

      if (!response.ok) {
        const responseText = await response.text();
        console.error('Email API error response:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || 'Unknown error' };
        }
        
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`)
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
- Amount: ${invoice.original_currency_code === 'INR' ? '₹' : invoice.original_currency_code + ' '}${invoice.total_amount?.toFixed(2)}
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
- Amount: ${invoice.original_currency_code === 'INR' ? '₹' : invoice.original_currency_code + ' '}${invoice.total_amount?.toFixed(2)}

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
                    <span class="detail-value" style="font-size: 18px;">${invoice.original_currency_code === 'INR' ? '₹' : invoice.original_currency_code + ' '}${invoice.total_amount?.toFixed(2)}</span>
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
                    <span class="detail-value amount">${invoice.original_currency_code === 'INR' ? '₹' : invoice.original_currency_code + ' '}${invoice.total_amount?.toFixed(2)}</span>
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
}