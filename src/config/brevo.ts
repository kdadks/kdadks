// Brevo SMTP Configuration
export const BREVO_CONFIG = {
  SMTP_SERVER: 'smtp-relay.brevo.com',
  PORT: 587,
  USERNAME: '900018001@smtp-brevo.com',
  // Note: Password should be set via environment variable for security
  // For development, you can set it directly, but use env vars in production
  PASSWORD: process.env.BREVO_PASSWORD || '', // Set this in your environment
}

export interface EmailData {
  to: string
  from: string
  subject: string
  text: string
  html?: string
}

export interface ContactFormData {
  name: string
  email: string
  company?: string
  message: string
}