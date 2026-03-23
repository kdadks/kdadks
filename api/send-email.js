// Resend email sender - local development proxy
// For local development - this will be used when running on localhost:3001

// Try to import fetch for older Node.js environments
let fetch;
try {
  fetch = require('node-fetch');
} catch {
  fetch = globalThis.fetch;
}

async function sendViaResend(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend failed: ${data.message || data.name || res.status}`);
  return { messageId: data.id };
}

module.exports = async (req, res) => {
  // Enable CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'CORS preflight check' });
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { to, from, subject, text, html } = req.body;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      res.status(400).json({ 
        error: 'Missing required fields: to, subject, and text/html are required' 
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      res.status(400).json({ 
        error: 'Invalid email address format' 
      });
      return;
    }

    // Get Resend API credentials from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'contact@kdadks.com';
    const { attachments, attachment } = req.body;

    if (!resendApiKey) {
      console.error('[LOCAL DEV] RESEND_API_KEY not set');
      res.status(500).json({ error: 'Email service configuration error - RESEND_API_KEY not set' });
      return;
    }

    // Build Resend payload
    const payload = {
      from: `KDADKS Service Private Limited <${senderEmail}>`,
      to: [to],
      bcc: [senderEmail],
      subject,
      ...(html ? { html } : { text })
    };

    const emailRegexSimple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (from && emailRegexSimple.test(from) && from !== senderEmail) {
      payload.reply_to = from;
    }

    const allAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      attachments.forEach(att => allAttachments.push({
        filename: att.filename || 'attachment.pdf',
        content: att.content,
        content_type: att.type || 'application/pdf'
      }));
    } else if (attachment) {
      allAttachments.push({
        filename: attachment.filename || 'invoice.pdf',
        content: attachment.content,
        content_type: 'application/pdf'
      });
    }
    if (allAttachments.length > 0) payload.attachments = allAttachments;

    console.log('📧 [LOCAL DEV] Sending email via Resend...');
    console.log('To:', to, '| Subject:', subject);

    const result = await sendViaResend(resendApiKey, payload);

    console.log('✅ [LOCAL DEV] Email sent successfully:', result.messageId);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully via Resend',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ [LOCAL DEV] Email sending failed:', error);

    let errorMessage = 'Failed to send email';
    let statusCode = 500;

    if (error.message && error.message.includes('Resend failed')) {
      errorMessage = error.message;
      statusCode = 502;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
