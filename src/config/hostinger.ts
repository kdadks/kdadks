// Hostinger SMTP Configuration
export const HOSTINGER_CONFIG = {
  SMTP_SERVER: 'smtp.hostinger.com',
  PORT: 465,
  IMAP_SERVER: 'imap.hostinger.com',
  IMAP_PORT: 993,
  POP_SERVER: 'pop.hostinger.com',
  POP_PORT: 995,
  // Note: Credentials should be set via environment variables for security
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  USERNAME: (import.meta as any).env?.VITE_HOSTINGER_SMTP_USER || '',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PASSWORD: (import.meta as any).env?.VITE_HOSTINGER_SMTP_PASSWORD || '',
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
  recaptchaToken?: string
  recaptchaAction?: string
}