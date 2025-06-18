import { ContactFormData } from '../config/brevo'

export class EmailService {
  private static readonly API_ENDPOINT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api/send-email'
    : '/api/send-email'

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

  private static generateTextEmail(formData: ContactFormData): string {
    return `
New Contact Form Submission

Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company || 'Not specified'}

Message:
${formData.message}

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