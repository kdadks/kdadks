import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  Database,
  Receipt,
  CreditCard,
  FileText,
  Briefcase,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Plus,
  Users,
  TrendingUp,
  RefreshCw,
  Eye,
  Edit,
  FileCheck,
  DollarSign,
  Calculator,
  Bell,
  Award,
  Wallet,
  BarChart3,
  Banknote,
  LayoutDashboard
} from 'lucide-react'
import { simpleAuth, SimpleUser } from '../../utils/simpleAuth'
import { isSupabaseConfigured, supabase } from '../../config/supabase'
import { invoiceService } from '../../services/invoiceService'
import { quoteService } from '../../services/quoteService'
import { employeeService } from '../../services/employeeService'
import InvoiceManagement from '../invoice/InvoiceManagement'
import { PaymentManagement } from '../payment/PaymentManagement'
import QuoteManagement from '../quote/QuoteManagement'
import ContractManagement from '../contract/ContractManagement'
import EmploymentDocuments from '../hr/EmploymentDocuments'
import LeaveManagement from '../hr/LeaveManagement'
import AttendanceManagement from '../hr/AttendanceManagement'
import FullFinalSettlement from '../hr/FullFinalSettlement'
import TDSReport from '../hr/TDSReport'
import RateCardManagement from './RateCardManagement'
import { Announcements } from './Announcements'
import PerformanceFeedback from './PerformanceFeedback'
import CompensationManagement from './CompensationManagement'
import ExpenseManagement from './ExpenseManagement'
import FinanceManagement from './FinanceManagement'
import type { InvoiceStats } from '../../types/invoice'
import type { QuoteStats } from '../../types/quote'

interface DashboardStats {
  invoices: InvoiceStats | null;
  quotes: QuoteStats | null;
  contracts: {
    total: number;
    active: number;
  };
  employees: {
    total: number;
    active: number;
  };
  payments: {
    total: number;
    totalAmount: number;
  };
  salarySlips: number;
  documents: number;
  settlements: number;
}

type ActiveView = 'dashboard' | 'invoices' | 'payments' | 'quotes' | 'contracts' | 'rate-cards' | 'announcements' | 'expenses' | 'finance' | 'hr-employees' | 'hr-leave' | 'hr-attendance' | 'hr-settlement' | 'hr-tds-report' | 'hr-performance' | 'hr-compensation';

// Menu section types
type MenuSection = 'sales' | 'finance' | 'hr' | 'communication';

const SimpleAdminDashboard: React.FC = () => {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(true)
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Collapsible menu sections - all open by default
  const [openSections, setOpenSections] = useState<Record<MenuSection, boolean>>({
    sales: true,
    finance: true,
    hr: true,
    communication: true
  })
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    invoices: null,
    quotes: null,
    contracts: { total: 0, active: 0 },
    employees: { total: 0, active: 0 },
    payments: { total: 0, totalAmount: 0 },
    salarySlips: 0,
    documents: 0,
    settlements: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const navigate = useNavigate()

  // Toggle menu section
  const toggleSection = (section: MenuSection) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // If Supabase is not configured, redirect to login with message
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <Database className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Database Not Configured
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                The admin portal requires database configuration to function properly.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthenticated = await simpleAuth.isAuthenticated()

        if (!isAuthenticated) {
          console.log('Not authenticated, redirecting to login')
          navigate('/admin/login')
          return
        }

        const currentUser = await simpleAuth.getCurrentUser()
        console.log('Current user:', currentUser)
        setUser(currentUser)
      } catch (error) {
        console.error('Auth check failed:', error)
        navigate('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [navigate])

  // Load dashboard stats when on dashboard view
  const loadDashboardStats = async () => {
    try {
      setStatsLoading(true)
      
      // Fetch all stats in parallel
      const [invoiceStats, quoteStats, contractsResult, employeesResult, paymentsResult, salarySlipsResult, documentsResult, settlementsResult] = await Promise.all([
        invoiceService.getInvoiceStats().catch(() => null),
        quoteService.getQuoteStats().catch(() => null),
        (async () => {
          try {
            const { data } = await supabase.from('contracts').select('id, status')
            return {
              total: data?.length || 0,
              active: data?.filter(c => c.status === 'active').length || 0
            }
          } catch {
            return { total: 0, active: 0 }
          }
        })(),
        (async () => {
          try {
            const { data } = await supabase.from('employees').select('id, employment_status')
            return {
              total: data?.length || 0,
              active: data?.filter(e => e.employment_status === 'active').length || 0
            }
          } catch {
            return { total: 0, active: 0 }
          }
        })(),
        (async () => {
          try {
            const { data } = await supabase.from('payments').select('id, amount')
            return {
              total: data?.length || 0,
              totalAmount: data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
            }
          } catch {
            return { total: 0, totalAmount: 0 }
          }
        })(),
        (async () => {
          try {
            const { count } = await supabase.from('salary_slips').select('id', { count: 'exact', head: true })
            return count || 0
          } catch {
            return 0
          }
        })(),
        (async () => {
          try {
            const { count } = await supabase.from('employment_documents').select('id', { count: 'exact', head: true })
            return count || 0
          } catch {
            return 0
          }
        })(),
        (async () => {
          try {
            const { count } = await supabase.from('full_final_settlements').select('id', { count: 'exact', head: true })
            return count || 0
          } catch {
            return 0
          }
        })()
      ])

      setDashboardStats({
        invoices: invoiceStats,
        quotes: quoteStats,
        contracts: contractsResult,
        employees: employeesResult,
        payments: paymentsResult,
        salarySlips: salarySlipsResult,
        documents: documentsResult,
        settlements: settlementsResult
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    if (activeView === 'dashboard' && user) {
      loadDashboardStats()
    }
  }, [activeView, user])

  // Auto-hide success message after 10 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false)
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [showSuccessMessage])

  const handleLogout = async () => {
    try {
      await simpleAuth.logout()
      navigate('/admin/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Render main content based on activeView
  const renderMainContent = () => {
    switch (activeView) {
      case 'invoices':
        return <InvoiceManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'quotes':
        return <QuoteManagement />;
      case 'contracts':
        return <ContractManagement />;
      case 'rate-cards':
        return <RateCardManagement />;
      case 'announcements':
        return <Announcements />;
      case 'expenses':
        return <ExpenseManagement />;
      case 'finance':
        return <FinanceManagement />;
      case 'hr-employees':
        return <EmploymentDocuments />;
      case 'hr-leave':
        return <LeaveManagement currentUserId={user?.id} />;
      case 'hr-settlement':
        return <FullFinalSettlement />;
      case 'hr-tds-report':
        return <TDSReport />;
      case 'hr-attendance':
        return <AttendanceManagement />;
      case 'hr-performance':
        return <PerformanceFeedback />;
      case 'hr-compensation':
        return <CompensationManagement />;
      case 'dashboard':
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col h-screen sticky top-0`}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
          {sidebarOpen && <h1 className="text-lg font-semibold text-gray-900">Admin Portal</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto min-h-0">
          <ul className="space-y-1 px-2">
            {/* Dashboard */}
            <li>
              <button
                onClick={() => setActiveView('dashboard')}
                title={!sidebarOpen ? 'Dashboard' : undefined}
                className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-3">Dashboard</span>}
              </button>
            </li>

            {/* Section: Sales & Revenue */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('sales')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Sales & Revenue</span>
                  {openSections.sales ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Sales & Revenue Items */}
            {(openSections.sales || !sidebarOpen) && (
              <>
                {/* Invoices */}
                <li>
                  <button
                    onClick={() => setActiveView('invoices')}
                    title={!sidebarOpen ? 'Invoices' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'invoices'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Receipt className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Invoices</span>}
                  </button>
                </li>

                {/* Quotes */}
                <li>
                  <button
                    onClick={() => setActiveView('quotes')}
                    title={!sidebarOpen ? 'Quotes' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'quotes'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Quotes</span>}
                  </button>
                </li>

                {/* Rate Cards */}
                <li>
                  <button
                    onClick={() => setActiveView('rate-cards')}
                    title={!sidebarOpen ? 'Rate Cards' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'rate-cards'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Calculator className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Rate Cards</span>}
                  </button>
                </li>

                {/* Contracts */}
                <li>
                  <button
                    onClick={() => setActiveView('contracts')}
                    title={!sidebarOpen ? 'Contracts' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'contracts'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileCheck className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Contracts</span>}
                  </button>
                </li>

                {/* Payments */}
                <li>
                  <button
                    onClick={() => setActiveView('payments')}
                    title={!sidebarOpen ? 'Payments' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'payments'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Payments</span>}
                  </button>
                </li>
              </>
            )}

            {/* Section: Finance & Accounting */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('finance')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Finance & Accounting</span>
                  {openSections.finance ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Finance & Accounting Items */}
            {(openSections.finance || !sidebarOpen) && (
              <>
                {/* Finance */}
                <li>
                  <button
                    onClick={() => setActiveView('finance')}
                    title={!sidebarOpen ? 'Finance Reports' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'finance'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BarChart3 className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Finance Reports</span>}
                  </button>
                </li>

                {/* Expenses */}
                <li>
                  <button
                    onClick={() => setActiveView('expenses')}
                    title={!sidebarOpen ? 'Expenses' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'expenses'
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Wallet className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Expenses</span>}
                  </button>
                </li>
              </>
            )}

            {/* Section: HR & Operations */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('hr')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>HR & Operations</span>
                  {openSections.hr ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* HR & Operations Items */}
            {(openSections.hr || !sidebarOpen) && (
              <>
                {/* Employees & Docs */}
                <li>
                  <button
                    onClick={() => setActiveView('hr-employees')}
                    title={!sidebarOpen ? 'Employees & Docs' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'hr-employees'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Employees & Docs</span>}
                  </button>
                </li>

                {/* Attendance */}
                <li>
                  <button
                    onClick={() => setActiveView('hr-attendance')}
                    title={!sidebarOpen ? 'Attendance' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'hr-attendance'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Clock className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Attendance</span>}
                  </button>
                </li>

                {/* Leave Management */}
                <li>
                  <button
                    onClick={() => setActiveView('hr-leave')}
                    title={!sidebarOpen ? 'Leave Management' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'hr-leave'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Calendar className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Leave Management</span>}
                  </button>
                </li>

                {/* Compensation */}
                <li>
                  <button
                    onClick={() => setActiveView('hr-compensation')}
                    title={!sidebarOpen ? 'Compensation' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'hr-compensation'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Banknote className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Compensation</span>}
                  </button>
                </li>

                {/* TDS Report */}
                <li>
                  <button
                    onClick={() => setActiveView('hr-tds-report')}
                    title={!sidebarOpen ? 'TDS Report' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'hr-tds-report'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">TDS Report</span>}
                  </button>
                </li>

                {/* F&F Settlement */}
                <li>
                  <button
                    onClick={() => setActiveView('hr-settlement')}
                    title={!sidebarOpen ? 'F&F Settlement' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'hr-settlement'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">F&F Settlement</span>}
                  </button>
                </li>

                {/* Performance */}
                <li>
                  <button
                    onClick={() => setActiveView('hr-performance')}
                    title={!sidebarOpen ? 'Reviews & Feedback' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'hr-performance'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Award className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Reviews & Feedback</span>}
                  </button>
                </li>
              </>
            )}

            {/* Section: Communication */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('communication')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Communication</span>
                  {openSections.communication ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Communication Items */}
            {(openSections.communication || !sidebarOpen) && (
              <>
                {/* Announcements */}
                <li>
                  <button
                    onClick={() => setActiveView('announcements')}
                    title={!sidebarOpen ? 'Announcements' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'announcements'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Bell className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Announcements</span>}
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          {sidebarOpen && (
            <div className="mb-3">
              <p className="text-xs text-gray-500">Logged in as:</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Logout' : undefined}
            className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 text-red-600" />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Header - only show title on dashboard */}
        {activeView === 'dashboard' && (
          <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-6">
            <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
          </header>
        )}

        {/* Main Content Area */}
        <main className="p-6">
          {/* Success Message */}
          {showSuccessMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 transition-all duration-500 ease-in-out">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Authentication Success! You are now logged in to the admin dashboard.
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Logged in as: <strong>{user.email}</strong>
                  </p>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <button
                    onClick={() => setShowSuccessMessage(false)}
                    className="inline-flex text-green-400 hover:text-green-600 focus:outline-none focus:text-green-600 transition-colors duration-200"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Overview or Other Views */}
          {activeView === 'dashboard' ? (
            <div>
              {/* Refresh Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={loadDashboardStats}
                  disabled={statsLoading}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                  Refresh Stats
                </button>
              </div>

              {/* Main Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Invoices Card */}
                <div 
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveView('invoices')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Invoices</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {statsLoading ? '...' : (dashboardStats.invoices?.total_invoices || 0)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {dashboardStats.invoices?.paid_invoices || 0} Paid
                      </p>
                    </div>
                    <Receipt className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                {/* Payments Card */}
                <div 
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveView('payments')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Payments</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {statsLoading ? '...' : dashboardStats.payments.total}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ₹{(dashboardStats.payments.totalAmount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                {/* Quotes Card */}
                <div 
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveView('quotes')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Quotes</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {statsLoading ? '...' : (dashboardStats.quotes?.total_quotes || 0)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {dashboardStats.quotes?.accepted_quotes || 0} Accepted
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                {/* Employees Card */}
                <div 
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveView('hr-employees')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Employees</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {statsLoading ? '...' : dashboardStats.employees.total}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {dashboardStats.employees.active} Active
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Secondary Stats - HR Documents, Salary Slips, Contracts & Revenue */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Contracts Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Contracts</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {statsLoading ? '...' : dashboardStats.contracts.total}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {dashboardStats.contracts.active} Active
                      </p>
                    </div>
                    <FileCheck className="w-8 h-8 text-cyan-600" />
                  </div>
                  <button
                    onClick={() => setActiveView('contracts')}
                    className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-cyan-600 bg-cyan-50 rounded-md hover:bg-cyan-100"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Contracts
                  </button>
                </div>

                {/* Documents Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">HR Documents</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {statsLoading ? '...' : dashboardStats.documents}
                      </p>
                    </div>
                    <FileCheck className="w-8 h-8 text-indigo-600" />
                  </div>
                  <button
                    onClick={() => setActiveView('hr-employees')}
                    className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Documents
                  </button>
                </div>

                {/* Salary Slips Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Salary Slips</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {statsLoading ? '...' : dashboardStats.salarySlips}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-teal-600" />
                  </div>
                  <button
                    onClick={() => setActiveView('hr-employees')}
                    className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-md hover:bg-teal-100"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Salary Slips
                  </button>
                </div>

                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        ₹{statsLoading ? '...' : ((dashboardStats.invoices?.total_revenue_inr || dashboardStats.invoices?.total_revenue || 0) / 100000).toFixed(1)}L
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Pending: ₹{((dashboardStats.invoices?.pending_amount_inr || dashboardStats.invoices?.pending_amount || 0) / 100000).toFixed(1)}L
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-600" />
                  </div>
                  <button
                    onClick={() => setActiveView('invoices')}
                    className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>
                </div>
              </div>

              {/* Quick Actions Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {/* Add Employee */}
                  <button
                    onClick={() => setActiveView('hr-employees')}
                    className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                      <Plus className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium text-orange-700">Add Employee</span>
                  </button>

                  {/* Create Invoice */}
                  <button
                    onClick={() => setActiveView('invoices')}
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                      <Receipt className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-blue-700">New Invoice</span>
                  </button>

                  {/* Create Quote */}
                  <button
                    onClick={() => setActiveView('quotes')}
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-purple-700">New Quote</span>
                  </button>

                  {/* Create Contract */}
                  <button
                    onClick={() => setActiveView('contracts')}
                    className="flex flex-col items-center p-4 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center mb-2">
                      <FileCheck className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="text-sm font-medium text-cyan-700">New Contract</span>
                  </button>

                  {/* Generate Document */}
                  <button
                    onClick={() => setActiveView('hr-employees')}
                    className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                      <FileCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-indigo-700">Gen. Document</span>
                  </button>

                  {/* Generate Salary Slip */}
                  <button
                    onClick={() => setActiveView('hr-employees')}
                    className="flex flex-col items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mb-2">
                      <DollarSign className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="text-sm font-medium text-teal-700">Gen. Salary Slip</span>
                  </button>

                  {/* Mark Attendance */}
                  <button
                    onClick={() => setActiveView('hr-attendance')}
                    className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-green-700">Attendance</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity / Welcome Message */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Admin Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  Use the sidebar navigation or quick actions above to manage invoices, payments, quotes, and HR operations.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Invoice Status Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Draft:</span>
                        <span className="font-medium">{dashboardStats.invoices?.draft_invoices || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sent:</span>
                        <span className="font-medium">{dashboardStats.invoices?.sent_invoices || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overdue:</span>
                        <span className="font-medium text-red-600">{dashboardStats.invoices?.overdue_invoices || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">Quote Status Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending:</span>
                        <span className="font-medium">{(dashboardStats.quotes?.draft_quotes || 0) + (dashboardStats.quotes?.sent_quotes || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Accepted:</span>
                        <span className="font-medium text-green-600">{dashboardStats.quotes?.accepted_quotes || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Converted:</span>
                        <span className="font-medium">{dashboardStats.quotes?.converted_quotes || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {renderMainContent()}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default SimpleAdminDashboard
