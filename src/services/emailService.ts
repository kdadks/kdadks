import { ContactFormData } from '../config/brevo'
import type { Invoice, Customer, CompanySettings } from '../types/invoice'

export class EmailService {
  private static readonly API_ENDPOINT = '/.netlify/functions/send-email'

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
          from: company.email || 'kdadks@outlook.com',
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
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
        .header p { color: #f0fdf4; margin: 10px 0 0 0; font-size: 16px; font-weight: 500; }
        .thank-you-badge { background: rgba(255,255,255,0.25); color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 15px; font-size: 14px; font-weight: bold; border: 1px solid rgba(255,255,255,0.3); }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px; }
        .payment-details { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .payment-details h3 { color: #16a34a; margin: 0 0 15px 0; font-size: 18px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #dcfce7; }
        .detail-label { font-weight: bold; color: #1f2937; font-size: 14px; }
        .detail-value { color: #059669; font-weight: bold; font-size: 14px; }
        .status-paid { background: #22c55e; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .message { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #4b5563; font-size: 14px; }
        .company-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .attachment-notice { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Payment Received!</h1>
            <p>Thank you for your payment</p>
            <div class="thank-you-badge">Invoice #${invoice.invoice_number} - PAID</div>
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
                ${company.address_line1 || ''}${company.address_line2 ? ', ' + company.address_line2 : ''}
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
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 25px; border-radius: 12px 12px 0 0; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { background: #ffffff; padding: 25px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px; }
        .invoice-details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .detail-label { font-weight: bold; color: #374151; }
        .detail-value { color: #1f2937; }
        .amount { font-size: 18px; font-weight: bold; color: #3b82f6; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
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
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <strong>${company.company_name}</strong><br>
                ${company.email || 'kdadks@outlook.com'}<br>
                ${company.phone || ''}
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
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #495057; }
        .message { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 10px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0; color: #007bff;">New Contact Form Submission</h2>
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