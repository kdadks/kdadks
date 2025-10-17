import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Download,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BarChart3,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  LogOut,
  Settings,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { supabase } from '../../config/supabase';
import { simpleAuth } from '../../utils/simpleAuth';
import { useToast } from '../ui/ToastProvider';
import type { 
  PaymentRequest, 
  PaymentGateway, 
  PaymentFilters,
  PaymentAnalytics,
  CreatePaymentRequestData 
} from '../../types/payment';

interface PaymentManagementProps {
  invoices?: any[]; // Optional prop to integrate with existing invoice system
  onBackToDashboard?: () => void; // Optional callback to return to main dashboard
}

const PaymentManagement: React.FC<PaymentManagementProps> = ({ 
  invoices = [], 
  onBackToDashboard 
}) => {
  // State management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'analytics' | 'settings'>('dashboard');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Toast notifications
  const { showSuccess, showError, showWarning } = useToast();
  
  // Filters and pagination
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage] = useState(1);
  const [perPage] = useState(20);

  // Authentication check
  useEffect(() => {
    const initializeAuth = async () => {
      setIsAuthenticating(true);
      try {
        const user = await simpleAuth.getCurrentUser();
        console.log('Current auth user:', user);
        
        if (user) {
          setCurrentUser(user);
          console.log('User authenticated successfully');
        } else {
          console.log('No authenticated user found');
          setError('Authentication required. Please log in to access payment management.');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setError('Authentication failed. Please log in again.');
      } finally {
        setIsAuthenticating(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Load data only after authentication is verified
  useEffect(() => {
    if (authInitialized && currentUser) {
      loadData();
    }
  }, [authInitialized, currentUser]);

  useEffect(() => {
    if (activeTab === 'requests') {
      loadPaymentRequests();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, filters, currentPage]);

  // Data loading functions
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      const [gatewaysData] = await Promise.all([
        paymentService.getPaymentGateways() // Load all gateways, not just active ones
      ]);
      setGateways(gatewaysData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentRequests = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      }
      setError(null); // Clear any previous errors
      const response = await paymentService.getPaymentRequests(filters, currentPage, perPage);
      setPaymentRequests(response.data);
      
      if (isManualRefresh) {
        showSuccess('Payment requests refreshed successfully!');
      }
    } catch (err) {
      console.error('Failed to load payment requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment requests');
      if (isManualRefresh) {
        showError('Failed to refresh payment requests. Please try again.');
      }
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await paymentService.getPaymentAnalytics({
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateTo: new Date().toISOString()
      });
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    }
  };

  // Payment request creation
  const handleCreatePaymentRequest = async (data: CreatePaymentRequestData) => {
    try {
      console.log('Starting payment request creation:', data);
      
      // Check authentication first
      const isAuthenticated = await checkAuthentication();
      if (!isAuthenticated) {
        console.log('Authentication failed');
        return;
      }

      // Get active payment gateways to ensure we have a gateway_id
      const activeGateways = await paymentService.getActivePaymentGateways();
      if (activeGateways.length === 0) {
        showError('No active payment gateways available. Please configure a payment gateway first.');
        return;
      }

      // Use the first active gateway
      const primaryGateway = activeGateways[0];

      // Enhanced payment request data with all required fields
      const enhancedData = {
        ...data,
        gateway_id: primaryGateway.id, // Ensure gateway_id is set
        description: data.description || 'Payment Request', // Ensure description is set
        customer_phone: data.customer_phone || undefined, // Include phone if provided
        metadata: {
          created_via: 'payment_management',
          gateway_name: primaryGateway.name,
          ...(data.metadata || {})
        }
      };

      console.log('Creating payment request with enhanced data:', enhancedData);
      const request = await paymentService.createPaymentRequest(enhancedData);
      console.log('Payment request created:', request);
      
      // Send email notification if customer email is provided
      if (data.customer_email) {
        console.log('Customer email provided, proceeding with email notification');
        try {
          console.log('Creating payment link...');
          // Create and send payment link
          const paymentLink = await paymentService.createPaymentLink(request.id, 'email', {
            payment_request_id: request.id,
            link_type: 'email',
            recipient_email: data.customer_email,
            send_immediately: true
          });
          console.log('Payment link created:', paymentLink);

          // Use the checkout URL from the payment link instead of manually generating it
          const paymentUrl = paymentLink.checkout_url;
          console.log('Payment URL from service:', paymentUrl);
          
          // DEBUG: Test if payment URL is accessible
          console.group('🔗 PAYMENT URL ACCESSIBILITY TEST');
          console.log('Payment URL:', paymentUrl);
          console.log('Click this to test:', paymentUrl);
          console.log('Link token:', paymentLink.link_token);
          console.log('Checkout URL from service:', paymentLink.checkout_url);
          console.groupEnd();
          
          // Debug: Log what the email content will contain
          console.log('Payment URL that will be in email:', paymentUrl);
          console.log('URL should replace ${paymentUrl} in template');

          // Create HTML email template with proper variable interpolation
          const emailHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <div style="background: #2563eb; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Request</h2>
        </div>
        
        <!-- Body -->
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear ${data.customer_name || 'Valued Customer'},</p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">You have received a new payment request from KDADKS Service Private Limited:</p>
            
            <!-- Payment Details Card -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Description:</strong></td>
                        <td style="color: #111827; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.description || 'Payment Request'}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
                        <td style="color: #111827; font-size: 18px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(data.amount, data.currency)}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;"><strong>Request ID:</strong></td>
                        <td style="color: #111827; font-size: 14px; padding: 8px 0; text-align: right; font-family: monospace;">${request.id}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Payment Button with Maximum Email Client Compatibility -->
            <div style="text-align: center; margin: 30px 0;">
                <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                    <tr>
                        <td align="center" style="border-radius: 8px; background-color: #2563eb; padding: 0;">
                            <a href="${paymentUrl}" 
                               target="_blank" 
                               style="font-size: 16px; 
                                      font-family: Arial, Helvetica, sans-serif; 
                                      color: #ffffff !important; 
                                      text-decoration: none !important; 
                                      border-radius: 8px; 
                                      padding: 15px 30px; 
                                      border: none;
                                      display: inline-block; 
                                      font-weight: bold;
                                      background-color: #2563eb;
                                      line-height: 20px;">
                                💳 Pay Securely Online
                            </a>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Fallback URL Section -->
            <div style="background: #e0f2fe; border: 1px solid #0277bd; border-radius: 6px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="color: #01579b; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">
                    🔗 Alternative Payment Link
                </p>
                <p style="color: #424242; font-size: 14px; margin: 0 0 15px 0;">
                    If the button above doesn't work, copy and paste this link into your browser:
                </p>
                <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 14px; color: #1976d2;">
                    ${paymentUrl}
                </div>
                <p style="margin: 10px 0 0 0;">
                    <a href="${paymentUrl}" target="_blank" style="color: #1976d2; font-weight: 600; text-decoration: underline;">Click here to pay</a>
                </p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Please complete your payment at your earliest convenience. If you have any questions, please contact us.</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                KDADKS Service Private Limited<br>
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>`;

          // CRITICAL DEBUG: Check if template interpolation actually worked
          console.group('🔍 EMAIL TEMPLATE DEBUG ANALYSIS');
          console.log('📝 Payment URL Variable:', paymentUrl);
          console.log('🔗 URL Length:', paymentUrl ? paymentUrl.length : 'UNDEFINED');
          console.log('✅ Template contains actual URL:', emailHtmlTemplate.includes(paymentUrl));
          console.log('❌ Template contains literal ${paymentUrl}:', emailHtmlTemplate.includes('${paymentUrl}'));
          
          // Extract and show the actual button HTML
          const buttonStart = emailHtmlTemplate.indexOf('<a href=');
          const buttonEnd = emailHtmlTemplate.indexOf('</a>', buttonStart) + 4;
          const buttonHtml = emailHtmlTemplate.substring(buttonStart, buttonEnd);
          console.log('🔘 ACTUAL BUTTON HTML:');
          console.log(buttonHtml);
          
          // Show fallback section
          const fallbackStart = emailHtmlTemplate.indexOf('<!-- Fallback URL Section -->');
          const fallbackEnd = emailHtmlTemplate.indexOf('</div>', fallbackStart + 200) + 6;
          const fallbackHtml = emailHtmlTemplate.substring(fallbackStart, fallbackEnd);
          console.log('🔄 ACTUAL FALLBACK SECTION:');
          console.log(fallbackHtml);
          
          console.groupEnd();

          // ADDITIONAL DEBUG: Log the actual email body being sent
          console.group('📧 EMAIL BODY BEING SENT TO SERVER');
          console.log('Email recipient:', data.customer_email);
          console.log('Email subject:', `Payment Request from KDADKS Service - ${formatCurrency(data.amount, data.currency)}`);
          console.log('HTML body length:', emailHtmlTemplate.length);
          const textBody = `Dear ${data.customer_name || 'Valued Customer'},

You have a new payment request for ${formatCurrency(data.amount, data.currency)}.

Description: ${data.description || 'Payment Request'}
Amount: ${formatCurrency(data.amount, data.currency)}
Request ID: ${request.id}

To complete your payment, please visit: ${paymentUrl}

Please complete your payment at your earliest convenience.

Best regards,
KDADKS Service Private Limited`;
          console.log('Text body contains URL:', textBody.includes(paymentUrl));
          console.groupEnd();

          // Send payment request email
          const emailResponse = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: data.customer_email,
              from: '"KDADKS Service Private Limited" <support@kdadks.com>',
              subject: `Payment Request from KDADKS Service - ${formatCurrency(data.amount, data.currency)}`,
              text: `Dear ${data.customer_name || 'Valued Customer'},

You have a new payment request for ${formatCurrency(data.amount, data.currency)}.

Description: ${data.description || 'Payment Request'}
Amount: ${formatCurrency(data.amount, data.currency)}
Request ID: ${request.id}

To complete your payment, please visit: ${paymentUrl}

Please complete your payment at your earliest convenience.

Best regards,
KDADKS Service Private Limited`,
              html: emailHtmlTemplate
            }),
          });

          console.log('Email response status:', emailResponse.status);
          console.log('Email response headers:', Object.fromEntries(emailResponse.headers.entries()));
          
          // Debug: Check if paymentUrl is properly interpolated
          console.log('Payment URL in email:', paymentUrl);
          console.log('Template check - paymentUrl should be:', `${window.location.origin}/payment/${paymentLink.link_token}`);

          // Check if email was sent successfully
          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('Email sending failed:', {
              status: emailResponse.status,
              statusText: emailResponse.statusText,
              body: errorText
            });
            
            // Development mode: Show a helpful message instead of failing
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              console.group('🚀 DEVELOPMENT MODE INFO');
              console.log('✅ Email template ready with payment URL:', paymentUrl);
              console.log('📧 Email would be sent to:', data.customer_email);
              console.log('🔗 Test this payment URL directly:', paymentUrl);
              console.log('📝 In production, this email will be sent via Netlify functions');
              console.groupEnd();
              
              showSuccess(`Payment request created! Development mode - test URL: ${paymentUrl}`);
            } else {
              throw new Error(`Email sending failed: ${emailResponse.status} - ${errorText}`);
            }
          } else {
            const emailResult = await emailResponse.json();
            console.log('📧 Email sent successfully:', emailResult);
            
            // Display server-side debugging information
            if (emailResult.debug) {
              console.group('🔧 SERVER-SIDE EMAIL ANALYSIS');
              console.log('❌ Has literal placeholder:', emailResult.debug.hasLiteralPlaceholder);
              console.log('✅ Has HTTP URLs:', emailResult.debug.hasHttpUrls);
              console.log('🔘 Button HTML from server:', emailResult.debug.buttonHtml);
              console.log('🔄 Fallback HTML from server:', emailResult.debug.fallbackHtml);
              console.groupEnd();
              
              // Alert user if there's a template interpolation issue
              if (emailResult.debug.hasLiteralPlaceholder) {
                console.error('🚨 CRITICAL: Email contains ${paymentUrl} literal text - button will not work!');
                showError('Email sent but payment button may not work. Please check console for details.');
              } else if (!emailResult.debug.hasHttpUrls) {
                console.warn('⚠️ WARNING: No HTTP URLs found in email - links may be missing');
                showWarning('Email sent but payment links may be missing. Please verify manually.');
              } else {
                console.log('✅ Email template interpolation appears successful');
                showSuccess('Payment request created and email sent successfully with working payment links!');
              }
            } else {
              showSuccess('Payment request created and email sent successfully!');
            }
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
          
          if (errorMessage.includes('Email service configuration error')) {
            showError('Email service not configured. Please check environment variables.');
          } else if (errorMessage.includes('HOSTINGER_SMTP')) {
            showError('Email service authentication failed. Please check Hostinger SMTP credentials.');
          } else {
            showWarning(`Payment request created but email sending failed: ${errorMessage}. Please resend manually.`);
          }
        }
      } else {
        showSuccess('Payment request created successfully!');
      }
      
      setShowCreateModal(false);
      loadPaymentRequests(true); // Refresh with success message
    } catch (err) {
      console.error('Failed to create payment request:', err);
      showError(err instanceof Error ? err.message : 'Failed to create payment request');
    }
  };

  // Handle resending payment request
  const handleResendPaymentRequest = async (request: PaymentRequest) => {
    try {
      if (!request.customer_email) {
        showError('Cannot resend: No customer email found for this payment request.');
        return;
      }

      // Get the payment links for this request
      const paymentLinks = await paymentService.getPaymentLinksByRequest(request.id);

      let paymentUrl = '';
      if (paymentLinks.length > 0) {
        // Use existing payment link
        const existingLink = paymentLinks[0];
        paymentUrl = existingLink.checkout_url || `${window.location.origin}/payment/${existingLink.link_token}`;
      } else {
        // Create new payment link
        const paymentLink = await paymentService.createPaymentLink(request.id, 'email', {
          payment_request_id: request.id,
          link_type: 'email',
          recipient_email: request.customer_email,
          send_immediately: false
        });
        paymentUrl = paymentLink.checkout_url || `${window.location.origin}/payment/${paymentLink.link_token}`;
      }

      // Send email using the same template as create
      const emailHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Request Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <div style="background: #2563eb; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Request Reminder</h2>
        </div>
        
        <!-- Body -->
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear ${request.customer_name || 'Valued Customer'},</p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">This is a friendly reminder for your pending payment request from KDADKS Service Private Limited:</p>
            
            <!-- Payment Details Card -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Description:</strong></td>
                        <td style="color: #111827; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${request.description || 'Payment Request'}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
                        <td style="color: #111827; font-size: 18px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(request.amount, request.currency)}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;"><strong>Request ID:</strong></td>
                        <td style="color: #111827; font-size: 14px; padding: 8px 0; text-align: right; font-family: monospace;">${request.id}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Payment Button -->
            <div style="text-align: center; margin: 30px 0;">
                <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                    <tr>
                        <td align="center" style="border-radius: 8px; background-color: #2563eb; padding: 0;">
                            <a href="${paymentUrl}" 
                               target="_blank" 
                               style="font-size: 16px; 
                                      font-family: Arial, Helvetica, sans-serif; 
                                      color: #ffffff !important; 
                                      text-decoration: none !important; 
                                      border-radius: 8px; 
                                      padding: 15px 30px; 
                                      border: none;
                                      display: inline-block; 
                                      font-weight: bold;
                                      background-color: #2563eb;
                                      line-height: 20px;">
                                💳 Pay Now
                            </a>
                        </td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Please complete your payment at your earliest convenience. If you have any questions, please contact us.</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                KDADKS Service Private Limited<br>
                This is an automated reminder. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>`;

      // Send reminder email
      const emailResponse = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: request.customer_email,
          from: '"KDADKS Service Private Limited" <support@kdadks.com>',
          subject: `Payment Reminder - ${formatCurrency(request.amount, request.currency)}`,
          text: `Dear ${request.customer_name || 'Valued Customer'},

This is a reminder for your pending payment request: ${formatCurrency(request.amount, request.currency)}

Description: ${request.description || 'Payment Request'}
Request ID: ${request.id}

To complete your payment, please visit: ${paymentUrl}

Best regards,
KDADKS Service Private Limited`,
          html: emailHtmlTemplate
        }),
      });

      if (!emailResponse.ok) {
        throw new Error(`Email sending failed: ${emailResponse.status}`);
      }

      showSuccess(`Payment request reminder sent to ${request.customer_email}`);
    } catch (err) {
      console.error('Failed to resend payment request:', err);
      showError(err instanceof Error ? err.message : 'Failed to resend payment request');
    }
  };

  // Handle export to Excel
  const handleExportToExcel = () => {
    try {
      // Use filtered results if there's a search term, otherwise use all results
      const dataToExport = searchTerm.trim() ? filteredPaymentRequests : paymentRequests;
      
      if (dataToExport.length === 0) {
        showError('No payment requests to export');
        return;
      }

      // Prepare data for export
      const exportData = dataToExport.map(request => ({
        'Request ID': request.id,
        'Customer Name': request.customer_name || 'N/A',
        'Customer Email': request.customer_email || 'N/A',
        'Customer Phone': request.customer_phone || 'N/A',
        'Amount': request.amount,
        'Currency': request.currency,
        'Description': request.description || 'N/A',
        'Status': request.status.toUpperCase(),
        'Created Date': new Date(request.created_at).toLocaleDateString(),
        'Created Time': new Date(request.created_at).toLocaleTimeString(),
        'Expires At': request.expires_at ? new Date(request.expires_at).toLocaleString() : 'No Expiry',
        'Metadata': request.metadata ? JSON.stringify(request.metadata) : 'N/A'
      }));

      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns
      const cols = [
        { wch: 10 }, // Request ID
        { wch: 20 }, // Customer Name
        { wch: 25 }, // Customer Email
        { wch: 15 }, // Customer Phone
        { wch: 12 }, // Amount
        { wch: 8 },  // Currency
        { wch: 30 }, // Description
        { wch: 10 }, // Status
        { wch: 12 }, // Created Date
        { wch: 12 }, // Created Time
        { wch: 18 }, // Expires At
        { wch: 20 }  // Metadata
      ];
      ws['!cols'] = cols;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Payment Requests');
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const isFiltered = searchTerm.trim() ? '-filtered' : '';
      const filename = `payment-requests${isFiltered}-${dateStr}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, filename);
      
      showSuccess(`Payment requests exported to ${filename}`);
    } catch (err) {
      console.error('Export failed:', err);
      showError('Failed to export payment requests');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await simpleAuth.logout();
      // Always redirect to login page after logout, don't use onBackToDashboard
      window.location.href = '/admin/login';
    } catch (err) {
      console.error('Logout failed:', err);
      showError('Logout failed. Please try again.');
    }
  };

  // Handle manual refresh of payment requests
  const handleRefreshPaymentRequests = () => {
    loadPaymentRequests(true);
  };

  // Filter payment requests based on search term
  const filteredPaymentRequests = paymentRequests.filter(request => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      request.customer_email?.toLowerCase().includes(searchLower) ||
      request.customer_name?.toLowerCase().includes(searchLower) ||
      request.customer_phone?.toLowerCase().includes(searchLower) ||
      request.description?.toLowerCase().includes(searchLower) ||
      request.id.toLowerCase().includes(searchLower) ||
      request.status.toLowerCase().includes(searchLower) ||
      request.currency.toLowerCase().includes(searchLower) ||
      request.amount.toString().includes(searchTerm)
    );
  });

  // Helper function to check authentication
  const checkAuthentication = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Authentication required. Please log in to access payment management.');
        return false;
      }
      return true;
    } catch (err) {
      setError('Authentication check failed. Please try logging in again.');
      return false;
    }
  };

  // Helper function to get customer name from payment request
  const getCustomerName = (request: any): string => {
    // First try direct customer_name field
    if (request.customer_name) {
      return request.customer_name;
    }
    
    // Then try nested invoice->customer->name structure
    if (request.invoice && typeof request.invoice === 'object') {
      const invoice = request.invoice;
      if (invoice.customer && typeof invoice.customer === 'object' && invoice.customer.name) {
        return invoice.customer.name;
      }
    }
    
    return 'Unknown';
  };

  // Utility functions
  const formatCurrency = (amount: number, currency: string) => {
    // Enhanced currency symbol mapping
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
    
    const symbol = symbols[currency] || currency + ' ';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const getStatusIcon = (status: PaymentRequest['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'processing':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PaymentRequest['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show authentication loading
  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Authenticating...</span>
      </div>
    );
  }

  // Show authentication error
  if (authInitialized && !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-2">Authentication Required</div>
          <p className="text-gray-600 mb-4">Please log in to access payment management.</p>
          <button
            onClick={() => window.location.href = '/admin/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading payment data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">Payment Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <span className="text-sm text-gray-600">
                  Welcome, {currentUser.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { key: 'requests', label: 'Payment Requests', icon: CreditCard },
              { key: 'analytics', label: 'Analytics', icon: TrendingUp },
              { key: 'settings', label: 'Gateway Settings', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Gateways</p>
                    <p className="text-3xl font-bold text-gray-900">{gateways.filter(g => g.is_active).length}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-3xl font-bold text-gray-900">₹0</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-3xl font-bold text-gray-900">0%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Available Payment Gateways */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Available Payment Gateways</h2>
                <span className="text-sm text-gray-500">Total: {gateways.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gateways.map((gateway) => (
                  <div key={gateway.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 capitalize">{gateway.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        gateway.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {gateway.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 capitalize mb-2">{gateway.provider_type}</p>
                    <div className="text-xs text-gray-500">
                      Supports: {gateway.currency_support.join(', ')}
                    </div>
                    {gateway.transaction_fee_percentage && (
                      <div className="text-xs text-gray-500 mt-1">
                        Fee: {gateway.transaction_fee_percentage}%
                        {gateway.transaction_fee_fixed && ` + ${gateway.transaction_fee_fixed}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {gateways.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No payment gateways configured</p>
                  <p className="text-sm">Add payment gateways to start accepting payments</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-3 p-4 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-6 h-6 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Create Payment Request</p>
                    <p className="text-sm text-gray-600">Send payment link to customer</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('requests')}
                  className="flex items-center space-x-3 p-4 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Search className="w-6 h-6 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">View All Requests</p>
                    <p className="text-sm text-gray-600">Track payment status</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by email, name, phone, description, ID, status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="expired">Expired</option>
                  </select>
                  
                  <select
                    value={filters.currency || ''}
                    onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Currencies</option>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Request
                  </button>
                  
                  <button 
                    onClick={handleRefreshPaymentRequests}
                    disabled={refreshing}
                    className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  
                  <button 
                    onClick={handleExportToExcel}
                    className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Requests List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Payment Requests</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchTerm.trim() ? (
                      <>Showing {filteredPaymentRequests.length} of {paymentRequests.length} requests</>
                    ) : (
                      <>{paymentRequests.length} total requests</>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPaymentRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getCustomerName(request)}
                            </div>
                            <div className="text-sm text-gray-500">{request.customer_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(request.amount, request.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(request.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {request.status === 'pending' && (
                            <button 
                              onClick={() => handleResendPaymentRequest(request)}
                              className="text-green-600 hover:text-green-900"
                              title="Resend payment request email"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {paymentRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No payment requests found</p>
                    <p className="text-sm">Create your first payment request to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.total_amount, 'INR')}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.success_rate.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.total_count}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.average_amount, 'INR')}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Gateway Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Gateway Performance</h2>
              <div className="space-y-4">
                {Object.entries(analytics.gateway_breakdown).map(([gateway, stats]) => (
                  <div key={gateway} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{gateway}</h3>
                      <p className="text-sm text-gray-600">
                        {stats.count} transactions • {formatCurrency(stats.amount, 'INR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">{stats.success_rate.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">Success Rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gateway Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Payment Gateway Configuration</h2>
                <button
                  onClick={() => setShowGatewayModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Gateway
                </button>
              </div>

              {/* Configured Gateways */}
              <div className="space-y-4">
                {gateways.map((gateway) => (
                  <div key={gateway.id} className="border border-slate-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 capitalize">{gateway.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{gateway.provider_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          gateway.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {gateway.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button 
                          onClick={() => {
                            setSelectedGateway(gateway);
                            setShowConfigModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Supported Currencies:</span>
                        <p className="font-medium">{gateway.currency_support.join(', ')}</p>
                      </div>
                      {gateway.transaction_fee_percentage && (
                        <div>
                          <span className="text-gray-600">Transaction Fee:</span>
                          <p className="font-medium">
                            {gateway.transaction_fee_percentage}%
                            {gateway.transaction_fee_fixed && ` + ${gateway.transaction_fee_fixed}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {gateways.length === 0 && (
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Gateways</h3>
                    <p className="text-gray-600 mb-6">Configure payment gateways to start accepting payments online.</p>
                    <button
                      onClick={() => setShowGatewayModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Gateway
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Gateway Help */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Need Help Setting Up Gateways?</h3>
              <p className="text-blue-800 mb-4">
                Payment gateways allow you to accept online payments from customers. Popular options include Razorpay, Stripe, and PayPal.
              </p>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• <strong>Razorpay:</strong> Popular in India, supports UPI, cards, wallets, and net banking</p>
                <p>• <strong>Stripe:</strong> Global payment processor with excellent developer tools</p>
                <p>• <strong>PayPal:</strong> Widely trusted international payment solution</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Payment Request Modal */}
      {showCreateModal && (
        <CreatePaymentRequestModal
          gateways={gateways}
          invoices={invoices}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePaymentRequest}
        />
      )}

      {/* Payment Details Modal */}
      {showDetailsModal && selectedRequest && (
        <PaymentDetailsModal
          request={selectedRequest}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {/* Gateway Configuration Modal */}
      {showConfigModal && selectedGateway && (
        <GatewayConfigModal
          gateway={selectedGateway}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedGateway(null);
          }}
          onSave={(updatedGateway) => {
            // Update gateway in the list
            setGateways(prev => prev.map(g => 
              g.id === updatedGateway.id ? updatedGateway : g
            ));
            setShowConfigModal(false);
            setSelectedGateway(null);
          }}
        />
      )}

      {/* Add Gateway Modal */}
      {showGatewayModal && (
        <AddGatewayModal
          onClose={() => setShowGatewayModal(false)}
          onSave={(newGateway) => {
            setGateways(prev => [...prev, newGateway]);
            setShowGatewayModal(false);
          }}
        />
      )}
    </div>
  );
};

// Modal Components (simplified for brevity)
interface CreatePaymentRequestModalProps {
  gateways: PaymentGateway[];
  invoices: any[];
  onClose: () => void;
  onSubmit: (data: CreatePaymentRequestData) => void;
}

const CreatePaymentRequestModal: React.FC<CreatePaymentRequestModalProps> = ({
  gateways: _gateways,
  invoices: _invoices,
  onClose,
  onSubmit
}) => {
  // Note: _gateways and _invoices are prefixed with _ to indicate they're intentionally unused for now
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreatePaymentRequestData>({
    amount: 0,
    currency: 'INR',
    description: '',
    customer_email: '',
    customer_name: '',
    customer_phone: '',
    expires_in_hours: 24
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // onSubmit should handle closing the modal on success
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit} className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Payment Request</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Email</label>
                <input
                  type="email"
                  required
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.customer_phone || ''}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSubmitting ? 'Creating...' : 'Create & Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface PaymentDetailsModalProps {
  request: PaymentRequest;
  onClose: () => void;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ request, onClose }) => {
  // Helper function to get customer name
  const getCustomerName = (req: any): string => {
    if (req.customer_name) return req.customer_name;
    if (req.invoice?.customer?.name) return req.invoice.customer.name;
    return 'Unknown';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Request Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: request.currency
                  }).format(request.amount)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p>{getCustomerName(request)}</p>
                <p className="text-sm text-gray-600">{request.customer_email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="capitalize">{request.status}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p>{request.description || 'No description'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p>{new Date(request.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Gateway Configuration Modal
interface GatewayConfigModalProps {
  gateway: PaymentGateway;
  onClose: () => void;
  onSave: (gateway: PaymentGateway) => void;
}

const GatewayConfigModal: React.FC<GatewayConfigModalProps> = ({ gateway, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: gateway.name,
    is_active: gateway.is_active,
    is_sandbox: gateway.is_sandbox,
    transaction_fee_percentage: gateway.transaction_fee_percentage || 0,
    transaction_fee_fixed: gateway.transaction_fee_fixed || 0,
    currency_support: gateway.currency_support.join(', '),
    api_key: gateway.settings?.api_key || '',
    secret_key: gateway.settings?.secret_key || '',
    webhook_secret: gateway.settings?.webhook_secret || ''
  });

  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedData = {
        ...gateway,
        name: formData.name,
        is_active: formData.is_active,
        is_sandbox: formData.is_sandbox,
        transaction_fee_percentage: formData.transaction_fee_percentage,
        transaction_fee_fixed: formData.transaction_fee_fixed,
        currency_support: formData.currency_support.split(',').map(c => c.trim()),
        settings: {
          ...gateway.settings,
          api_key: formData.api_key,
          secret_key: formData.secret_key,
          webhook_secret: formData.webhook_secret
        }
      };

      // TODO: Implement paymentService.updatePaymentGateway
      await paymentService.updatePaymentGateway(gateway.id, updatedData);
      onSave(updatedData);
      showSuccess('Gateway configuration updated successfully!');
    } catch (error) {
      console.error('Failed to update gateway:', error);
      showError('Failed to update gateway. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Configure {gateway.name}</h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_sandbox}
                    onChange={(e) => setFormData({ ...formData, is_sandbox: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sandbox Mode</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gateway Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supported Currencies</label>
                <input
                  type="text"
                  placeholder="INR, USD, EUR"
                  value={formData.currency_support}
                  onChange={(e) => setFormData({ ...formData, currency_support: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.transaction_fee_percentage}
                  onChange={(e) => setFormData({ ...formData, transaction_fee_percentage: parseFloat(e.target.value) || 0 })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Fee</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.transaction_fee_fixed}
                  onChange={(e) => setFormData({ ...formData, transaction_fee_fixed: parseFloat(e.target.value) || 0 })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                <div className="relative">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    value={formData.secret_key}
                    onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? "text" : "password"}
                    value={formData.webhook_secret}
                    onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Add Gateway Modal (Simplified for now)
interface AddGatewayModalProps {
  onClose: () => void;
  onSave: (gateway: PaymentGateway) => void;
}

const AddGatewayModal: React.FC<AddGatewayModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    provider_type: 'razorpay' as 'razorpay' | 'stripe' | 'paypal' | 'other',
    is_active: true,
    is_sandbox: true,
    transaction_fee_percentage: 2.5,
    transaction_fee_fixed: 0,
    currency_support: 'INR, USD',
    api_key: '',
    secret_key: '',
    webhook_secret: ''
  });

  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const gatewayData = {
        name: formData.name,
        provider_type: formData.provider_type,
        is_active: formData.is_active,
        is_sandbox: formData.is_sandbox,
        transaction_fee_percentage: formData.transaction_fee_percentage,
        transaction_fee_fixed: formData.transaction_fee_fixed,
        currency_support: formData.currency_support.split(',').map(c => c.trim()),
        settings: {
          api_key: formData.api_key,
          secret_key: formData.secret_key,
          webhook_secret: formData.webhook_secret
        }
      };

      const newGateway = await paymentService.createPaymentGateway(gatewayData);
      onSave(newGateway);
      showSuccess('Gateway created successfully!');
    } catch (error) {
      console.error('Failed to create gateway:', error);
      showError('Failed to create gateway. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit} className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Add Payment Gateway</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gateway Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider Type</label>
                <select
                  value={formData.provider_type}
                  onChange={(e) => setFormData({ ...formData, provider_type: e.target.value as any })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supported Currencies</label>
                <input
                  type="text"
                  placeholder="INR, USD, EUR"
                  required
                  value={formData.currency_support}
                  onChange={(e) => setFormData({ ...formData, currency_support: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_sandbox}
                    onChange={(e) => setFormData({ ...formData, is_sandbox: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sandbox Mode</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.transaction_fee_percentage}
                  onChange={(e) => setFormData({ ...formData, transaction_fee_percentage: parseFloat(e.target.value) || 0 })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Fee</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.transaction_fee_fixed}
                  onChange={(e) => setFormData({ ...formData, transaction_fee_fixed: parseFloat(e.target.value) || 0 })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                <div className="relative">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    value={formData.secret_key}
                    onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? "text" : "password"}
                    value={formData.webhook_secret}
                    onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Gateway'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export { PaymentManagement };
export default PaymentManagement;
