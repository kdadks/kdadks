import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LifeBuoy,
  Plus,
  Receipt,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  X,
  Send,
  Building2,
  RefreshCw,
  LogOut,
  Lock,
  KeyRound,
  ShieldCheck,
  User,
  Settings,
  Shield,
  HelpCircle,
  Star,
} from 'lucide-react';
import { ITSMTicket, ITSMTicketCategory, TicketPriority, TicketStatus } from '../../types/itsm';
import { ITSMTicketService } from '../../services/itsmTicketService';
import { invoiceService } from '../../services/invoiceService';
import { CustomerAuthService } from '../../services/customerAuthService';
import { useCompanyContext } from '../../contexts/CompanyContext';
import { useToast } from '../ui/ToastProvider';
import { CustomerContactModal } from '../customer/CustomerContactModal';
import TicketDetailModal from './TicketDetailModal';
import CustomerResetPasswordModal from './CustomerResetPasswordModal';
import CSATModal from './CSATModal';
import type { Customer, Invoice } from '../../types/invoice';

interface CustomerPortalProps {
  initialTab?: 'tickets' | 'invoices' | 'profile';
}

interface CustomerPortalSession {
  customer_id: string;
  company_name: string;
  customer_code?: string;
  email?: string;
  signed_in_at: string;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ initialTab = 'tickets' }) => {
  const [searchParams] = useSearchParams();
  const { selectedCompany } = useCompanyContext();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'tickets' | 'invoices' | 'profile'>(initialTab);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tickets, setTickets] = useState<ITSMTicket[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [categories, setCategories] = useState<ITSMTicketCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Explicit Authentication State
  const [portalSession, setPortalSession] = useState<CustomerPortalSession | null>(() => {
    const stored = sessionStorage.getItem('customer_portal_session');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Login Form State
  const [loginEmailOrCode, setLoginEmailOrCode] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginSubmitting, setLoginSubmitting] = useState<boolean>(false);

  // Password Reset Modal State
  const resetTokenFromUrl = searchParams.get('token') || '';
  const [showResetModal, setShowResetModal] = useState<boolean>(!!resetTokenFromUrl);

  // Change Password Form State (in Profile Tab)
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  // Contact Modal Reuse
  const [showContactModal, setShowContactModal] = useState<boolean>(false);

  // New Ticket Form Modal State
  const [showNewTicketModal, setShowNewTicketModal] = useState<boolean>(false);
  const [newTicketTitle, setNewTicketTitle] = useState<string>('');
  const [newTicketDesc, setNewTicketDesc] = useState<string>('');
  const [newTicketCategory, setNewTicketCategory] = useState<string>('');
  const [impact, setImpact] = useState<'organization' | 'team' | 'user'>('team');
  const [urgency, setUrgency] = useState<'stopped' | 'degraded' | 'inquiry'>('degraded');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Selected Ticket Workspace Modal
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (portalSession) {
      loadPortalData();
    } else {
      setLoading(false);
    }
  }, [selectedCompany, portalSession]);

  const loadPortalData = async () => {
    if (!portalSession) return;
    try {
      setLoading(true);
      const custData = await invoiceService.getCustomerById(portalSession.customer_id);
      setCustomer(custData);

      if (custData) {
        const [ticketList, invList, catList] = await Promise.all([
          ITSMTicketService.getTickets({ customer_id: custData.id }),
          invoiceService.getInvoices({ customer_id: custData.id }),
          ITSMTicketService.getCategories(selectedCompany?.id),
        ]);
        setTickets(ticketList);
        setInvoices(invList.data || []);
        setCategories(catList);
      }
    } catch (err) {
      showError(`Portal error: ${err instanceof Error ? err.message : 'Failed to load account data'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmailOrCode.trim()) return;

    try {
      setLoginSubmitting(true);
      const loginRes = await CustomerAuthService.login(loginEmailOrCode.trim(), loginPassword);

      if (!loginRes.success || !loginRes.customer) {
        showError(loginRes.message || 'Authentication failed. Please check your credentials.');
        return;
      }

      const matched = loginRes.customer;
      const sessionObj: CustomerPortalSession = {
        customer_id: matched.id,
        company_name: matched.company_name || matched.contact_person || 'Client Account',
        customer_code: matched.customer_code || undefined,
        email: matched.email || undefined,
        signed_in_at: new Date().toISOString(),
      };

      sessionStorage.setItem('customer_portal_session', JSON.stringify(sessionObj));
      setPortalSession(sessionObj);
      showSuccess(`Welcome! Signed in to Customer Portal for ${sessionObj.company_name}.`);

      if (loginRes.mustChangePassword) {
        showSuccess('Please set a new password for your account in Profile & Security settings.');
        setActiveTab('profile');
      }
    } catch (err) {
      showError(`Sign-in error: ${err instanceof Error ? err.message : 'Authentication failed'}`);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleCustomerSignOut = () => {
    sessionStorage.removeItem('customer_portal_session');
    setPortalSession(null);
    setCustomer(null);
    setTickets([]);
    setInvoices([]);
    showSuccess('Signed out of Customer Portal.');
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !newPassword) return;

    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('New password confirmation does not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await CustomerAuthService.changePassword(customer.id, currentPassword, newPassword);
      if (res.success) {
        showSuccess(res.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(res.message);
      }
    } catch (err) {
      showError(`Password update error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setChangingPassword(false);
    }
  };

  // Matrix: Impact x Urgency -> Priority
  const calculatePriority = (): TicketPriority => {
    if (impact === 'organization' && urgency === 'stopped') return 'P1_critical';
    if (impact === 'organization' || urgency === 'stopped') return 'P2_high';
    if (impact === 'user' && urgency === 'inquiry') return 'P4_low';
    return 'P3_medium';
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      setSubmitting(true);
      const calculatedPrio = calculatePriority();
      await ITSMTicketService.createTicket({
        ticket_type: 'incident',
        company_settings_id: selectedCompany?.id,
        customer_id: customer.id,
        category_id: newTicketCategory || undefined,
        title: newTicketTitle.trim(),
        description: newTicketDesc.trim(),
        priority: calculatedPrio,
      });

      showSuccess('Support ticket created successfully!');
      setShowNewTicketModal(false);
      setNewTicketTitle('');
      setNewTicketDesc('');
      await loadPortalData();
    } catch (err) {
      showError(`Failed to create ticket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ====================================================================
  // Render Customer Portal Login Gate if not authenticated
  // ====================================================================
  if (!portalSession) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 p-8 text-white text-center relative">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
              <Building2 className="h-7 w-7 text-indigo-200" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Customer Portal Sign-In</h2>
            <p className="text-xs text-indigo-100 mt-1">
              Sign in to manage support tickets, view account invoices & pay online
            </p>
          </div>

          <form onSubmit={handleCustomerLogin} className="p-8 space-y-5 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                <span>Customer Email or Customer ID <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                value={loginEmailOrCode}
                onChange={(e) => setLoginEmailOrCode(e.target.value)}
                placeholder="e.g. IND-2026-0001 or billing@acme.com"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Access Passcode / Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[11px] text-indigo-600 hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{loginSubmitting ? 'Verifying Account...' : 'Sign In to Customer Portal'}</span>
            </button>

            <div className="pt-2 text-center text-[11px] text-gray-400">
              Need assistance logging in? Contact support at <span className="text-indigo-600">support@kdadks.com</span>
            </div>
          </form>
        </div>

        {/* Reset Password Modal */}
        <CustomerResetPasswordModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          initialToken={resetTokenFromUrl}
        />
      </div>
    );
  }

  // ====================================================================
  // Render Authenticated Customer Portal Workspace
  // ====================================================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 md:p-8">
      {/* Header Banner with Company Name & Assigned Customer Code */}
      <div className="max-w-7xl mx-auto bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-2xl shadow-xl p-6 md:p-8 text-white mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-indigo-300" />
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {customer?.company_name || portalSession.company_name}
              </h1>
            </div>

            {(customer?.customer_code || portalSession.customer_code) && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-indigo-200">Assigned Customer ID:</span>
                <span className="font-mono bg-white/20 px-3 py-1 rounded-full font-bold text-indigo-100 border border-white/30">
                  {customer?.customer_code || portalSession.customer_code}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md border border-white/20 transition flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Manage Contact Persons</span>
            </button>

            <button
              onClick={() => setShowNewTicketModal(true)}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Support Ticket</span>
            </button>

            <button
              onClick={handleCustomerSignOut}
              title="Sign Out of Customer Portal"
              className="px-3.5 py-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-xl text-xs font-semibold border border-red-400/30 transition flex items-center space-x-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Portal Main Body Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'tickets'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <LifeBuoy className="h-4 w-4" />
            <span>Support Tickets ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'invoices'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Invoices & Payments ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Account Profile & Security</span>
          </button>
        </div>

        {/* Tab 1: Support Tickets Listing */}
        {activeTab === 'tickets' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Loading tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <LifeBuoy className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No support tickets submitted yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Have a technical question or issue? Click the button above to submit your support inquiry.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="p-4">Ticket Number</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Submitted</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {t.ticket_number}
                        </td>
                        <td className="p-4 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                          {t.title}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4 flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                            {t.status}
                          </span>
                          {t.csat_survey ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{t.csat_survey.rating}/5</span>
                            </span>
                          ) : (
                            (t.status === 'resolved' || t.status === 'closed') && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                <span>Survey Pending</span>
                              </span>
                            )
                          )}
                        </td>
                        <td className="p-4 text-gray-500">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedTicketId(t.id)}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs font-semibold rounded-lg transition"
                          >
                            View Ticket
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Customer Account Invoices */}
        {activeTab === 'invoices' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {invoices.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No invoices issued</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="p-4 font-mono font-bold text-gray-900 dark:text-white">
                          {inv.invoice_number}
                        </td>
                        <td className="p-4 text-gray-500">{inv.invoice_date}</td>
                        <td className="p-4 text-gray-500">{inv.due_date}</td>
                        <td className="p-4 font-bold text-gray-900 dark:text-white">
                          {inv.total_amount} {inv.original_currency_code || 'INR'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'overdue'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {inv.status !== 'paid' && (
                            <a
                              href={`/payment/checkout/${inv.id}`}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition inline-flex items-center space-x-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Pay Online</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Account Profile & Security Settings */}
        {activeTab === 'profile' && customer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            {/* Account Details Box */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>Account Profile & Billing Information</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-gray-400 block text-[11px]">Official Company Name</span>
                  <div className="font-semibold text-gray-900 dark:text-white">{customer.company_name || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">Assigned Customer Code</span>
                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{customer.customer_code || 'N/A'}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Account Email</span>
                    <div className="font-medium text-gray-800 dark:text-gray-200">{customer.email || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Phone Contact</span>
                    <div className="font-medium text-gray-800 dark:text-gray-200">{customer.phone || 'N/A'}</div>
                  </div>
                </div>

                {customer.gstin && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-gray-400 block text-[11px]">Tax Registration (GSTIN / VAT)</span>
                    <div className="font-mono text-gray-800 dark:text-gray-200">{customer.gstin}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Change Passcode Box */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-600" />
                <span>Security Passcode Settings</span>
              </h3>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Current Password / Security Passcode
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current passcode"
                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    New Security Passcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Passcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new passcode"
                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50"
                  >
                    {changingPassword ? 'Updating Password...' : 'Update Account Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Sub-modal: New Ticket Submission */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Submit New Support Ticket</h3>
              <button onClick={() => setShowNewTicketModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Subject / Summary <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="e.g. Cannot access invoice PDF downloads"
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={newTicketCategory}
                  onChange={(e) => setNewTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Impact</label>
                  <select
                    value={impact}
                    onChange={(e) => setImpact(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="organization">Entire Organization</option>
                    <option value="team">My Department / Team</option>
                    <option value="user">Single User</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="stopped">Work Completely Stopped</option>
                    <option value="degraded">Performance Degraded</option>
                    <option value="inquiry">General Inquiry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description & Steps to Reproduce <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  placeholder="Provide detailed description..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Contact Modal Reuse */}
      <CustomerContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        customer={customer}
        onContactsUpdated={loadPortalData}
      />

      {/* Selected Ticket Viewer Modal */}
      <TicketDetailModal
        isOpen={!!selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        ticketId={selectedTicketId}
        isAgentView={false}
        onTicketUpdated={loadPortalData}
      />

      {/* Reset Password Modal */}
      <CustomerResetPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialToken={resetTokenFromUrl}
      />
    </div>
  );
};

export default CustomerPortal;
