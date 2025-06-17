// EmailJS Configuration
// You need to set up EmailJS account and replace these values with your actual credentials

export const EMAILJS_CONFIG = {
  // Get this from your EmailJS dashboard under "Account" > "API Keys"
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY',
  
  // Get this from your EmailJS dashboard under "Email Services"
  SERVICE_ID: 'YOUR_SERVICE_ID',
  
  // Get this from your EmailJS dashboard under "Email Templates"
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID',
}

// Email template parameters structure
export interface EmailTemplateParams extends Record<string, unknown> {
  to_email: string
  from_name: string
  from_email: string
  company: string
  message: string
  reply_to: string
}