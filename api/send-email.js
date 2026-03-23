// Microsoft Graph API email sender - local development proxy
// For local development - this will be used when running on localhost:3001

// Try to import fetch for older Node.js environments
let fetch;
try {
  fetch = require('node-fetch');
} catch {
  fetch = globalThis.fetch;
}

async function getGraphToken(tenantId, clientId, clientSecret) {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token acquisition failed: ${data.error_description || data.error}`);
  return data.access_token;
}

async function sendViaGraph(token, senderEmail, mailPayload) {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mailPayload)
  });
  if (res.status === 202) return { messageId: `graph-${Date.now()}@kdadks.com` };
  let errorBody;
  try { errorBody = await res.json(); } catch { errorBody = { error: { message: res.statusText } }; }
  throw new Error(`Graph sendMail failed: ${errorBody?.error?.message || res.status}`);
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

    // Get Microsoft Graph API credentials from environment
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const senderEmail = process.env.SENDER_EMAIL || 'contact@kdadks.com';
    const { attachments, attachment } = req.body;

    if (!tenantId || !clientId || !clientSecret) {
      console.error('[LOCAL DEV] AZURE_TENANT_ID, AZURE_CLIENT_ID or AZURE_CLIENT_SECRET not set');
      res.status(500).json({ error: 'Email service configuration error - Microsoft Graph API credentials not set' });
      return;
    }

    // Build Graph API message payload
    const message = {
      subject,
      body: { contentType: html ? 'HTML' : 'Text', content: html || text },
      toRecipients: [{ emailAddress: { address: to } }],
      from: { emailAddress: { name: 'KDADKS Service Private Limited', address: senderEmail } }
    };
    const emailRegexSimple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (from && emailRegexSimple.test(from) && from !== senderEmail) {
      message.replyTo = [{ emailAddress: { address: from } }];
    }

    const allAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      attachments.forEach(att => allAttachments.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename || 'attachment.pdf',
        contentType: att.type || 'application/pdf',
        contentBytes: att.content
      }));
    } else if (attachment) {
      allAttachments.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename || 'invoice.pdf',
        contentType: 'application/pdf',
        contentBytes: attachment.content
      });
    }
    if (allAttachments.length > 0) message.attachments = allAttachments;

    console.log('📧 [LOCAL DEV] Sending email via Microsoft Graph API...');
    console.log('To:', to, '| Subject:', subject);

    const token = await getGraphToken(tenantId, clientId, clientSecret);
    const result = await sendViaGraph(token, senderEmail, { message, saveToSentItems: true });

    console.log('✅ [LOCAL DEV] Email sent successfully:', result.messageId);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully via Microsoft Graph API',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ [LOCAL DEV] Email sending failed:', error);

    let errorMessage = 'Failed to send email';
    let statusCode = 500;

    if (error.message && error.message.includes('Token acquisition failed')) {
      errorMessage = 'Microsoft Graph authentication failed - check AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET';
      statusCode = 401;
    } else if (error.message && error.message.includes('Graph sendMail failed')) {
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
