import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  LayoutDashboard,
  Layers,
  Gavel,
  Settings,
  Mail,
  UserCheck,
  Target,
  Compass
} from 'lucide-react'
import { simpleAuth, SimpleUser } from '../../utils/simpleAuth'
import { isSupabaseConfigured, supabase } from '../../config/supabase'
import { invoiceService } from '../../services/invoiceService'
import { quoteService } from '../../services/quoteService'
import { employeeService } from '../../services/employeeService'
import { useCompanyContext } from '../../contexts/CompanyContext'
import CompanySelector from '../ui/CompanySelector'
import InvoiceManagement from '../invoice/InvoiceManagement'
import { PaymentManagement } from '../payment/PaymentManagement'
import QuoteManagement from '../quote/QuoteManagement'
import ContractManagement from '../contract/ContractManagement'
import CustomerManagement from '../customer/CustomerManagement'
import { Customer360Hub } from '../customer/Customer360Hub'
import ProductManagement from '../product/ProductManagement'
import LeadManagement from '../lead/LeadManagement'
import OpportunityManagement from '../lead/OpportunityManagement'
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
import IncomeManagement from './IncomeManagement'
import SubscriptionManagement from './SubscriptionManagement'
import BoardResolutionManagement from '../boardResolution/BoardResolutionManagement'
import InvoiceSettings from './InvoiceSettings'
import CustomerReporting from './reporting/CustomerReporting'
import LeadReporting from './reporting/LeadReporting'
import OpportunityReporting from './reporting/OpportunityReporting'
import SubscriptionReporting from './reporting/SubscriptionReporting'
import QuoteReporting from './reporting/QuoteReporting'
import InvoiceReporting from './reporting/InvoiceReporting'
import HRAttendanceReporting from './reporting/HRAttendanceReporting'
import HRLeaveReporting from './reporting/HRLeaveReporting'
import HRCompensationReporting from './reporting/HRCompensationReporting'
import HRPerformanceReporting from './reporting/HRPerformanceReporting'
import ReportingHub from './reporting/ReportingHub'
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
  customers: {
    total: number;
  };
  leads: {
    total: number;
  };
  subscriptions: {
    total: number;
    active: number;
  };
  salarySlips: number;
  documents: number;
  settlements: number;
}

type ActiveView = 'dashboard' | 'invoices' | 'payments' | 'quotes' | 'contracts' | 'rate-cards' | 'announcements' | 'expenses' | 'income' | 'finance' | 'hr-employees' | 'hr-leave' | 'hr-attendance' | 'hr-settlement' | 'hr-tds-report' | 'hr-performance' | 'hr-compensation' | 'subscriptions' | 'board-resolutions' | 'settings' | 'customers' | 'customer-360' | 'leads' | 'opportunities' | 'products' | 'reporting-hub' | 'reporting-customers' | 'reporting-leads' | 'reporting-opportunities' | 'reporting-subscriptions' | 'reporting-quotes' | 'reporting-invoices' | 'reporting-hr' | 'reporting-hr-attendance' | 'reporting-hr-leave' | 'reporting-hr-compensation' | 'reporting-hr-performance';

// Menu section types
type MenuSection = 'sales' | 'customers' | 'catalog' | 'billing' | 'finance' | 'hr' | 'communication' | 'governance' | 'reporting' | 'configuration';

const SimpleAdminDashboard: React.FC = () => {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Collapsible menu sections - all open by default
  const [openSections, setOpenSections] = useState<Record<MenuSection, boolean>>({
    sales: true,
    customers: true,
    catalog: true,
    billing: true,
    finance: true,
    hr: true,
    communication: true,
    governance: true,
    reporting: true,
    configuration: true
  })
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    invoices: null,
    quotes: null,
    contracts: { total: 0, active: 0 },
    employees: { total: 0, active: 0 },
    payments: { total: 0, totalAmount: 0 },
    customers: { total: 0 },
    leads: { total: 0 },
    subscriptions: { total: 0, active: 0 },
    salarySlips: 0,
    documents: 0,
    settlements: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const { companies, selectedCompany, selectCompany, refreshCompanies } = useCompanyContext()

  const currencySymbol = selectedCompany?.country?.currency_symbol || (
    selectedCompany?.country_id === 'IE' || selectedCompany?.country?.code === 'IE' || selectedCompany?.country?.code === 'IRL' ? '€' :
    selectedCompany?.country_id === 'US' || selectedCompany?.country?.code === 'US' || selectedCompany?.country?.code === 'USA' ? '$' :
    selectedCompany?.country_id === 'GB' || selectedCompany?.country_id === 'UK' || selectedCompany?.country?.code === 'GB' ? '£' : '₹'
  )
  const navigate = useNavigate()
  const location = useLocation()
  const pathToView: Record<string, ActiveView> = {
    '/admin': 'dashboard',
    '/admin/invoices': 'invoices',
    '/admin/payments': 'payments',
    '/admin/quotes': 'quotes',
    '/admin/contracts': 'contracts',
    '/admin/rate-cards': 'rate-cards',
    '/admin/announcements': 'announcements',
    '/admin/expenses': 'expenses',
    '/admin/income': 'income',
    '/admin/finance': 'finance',
    '/admin/hr/employees': 'hr-employees',
    '/admin/hr/leave': 'hr-leave',
    '/admin/hr/attendance': 'hr-attendance',
    '/admin/hr/settlement': 'hr-settlement',
    '/admin/hr/tds-report': 'hr-tds-report',
    '/admin/hr/performance': 'hr-performance',
    '/admin/hr/compensation': 'hr-compensation',
    '/admin/subscriptions': 'subscriptions',
    '/admin/board-resolutions': 'board-resolutions',
    '/admin/settings': 'settings',
    '/admin/customers': 'customers',
    '/admin/customer-360': 'customer-360',
    '/admin/leads': 'leads',
    '/admin/opportunities': 'opportunities',
    '/admin/products': 'products',
    '/admin/reporting': 'reporting-hub',
    '/admin/reporting/hub': 'reporting-hub',
    '/admin/reporting/customers': 'reporting-customers',
    '/admin/reporting/leads': 'reporting-leads',
    '/admin/reporting/opportunities': 'reporting-opportunities',
    '/admin/reporting/subscriptions': 'reporting-subscriptions',
    '/admin/reporting/quotes': 'reporting-quotes',
    '/admin/reporting/invoices': 'reporting-invoices',
    '/admin/reporting/hr': 'reporting-hr',
    '/admin/reporting/hr/attendance': 'reporting-hr-attendance',
    '/admin/reporting/hr/leave': 'reporting-hr-leave',
    '/admin/reporting/hr/compensation': 'reporting-hr-compensation',
    '/admin/reporting/hr/performance': 'reporting-hr-performance',
  }
  const activeView: ActiveView = pathToView[location.pathname] ?? 'dashboard'

  // Toggle menu section
  const toggleSection = (section: MenuSection) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const [reportingSubOpen, setReportingSubOpen] = useState<Record<string, boolean>>({
    hr: true
  })

  const toggleReportingSub = (id: string) => {
    setReportingSubOpen(prev => ({ ...prev, [id]: !prev[id] }))
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
        if (companies.length === 0) {
          refreshCompanies()
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        navigate('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [navigate, companies.length, refreshCompanies])

  // Load dashboard stats when on dashboard view
  const loadDashboardStats = async () => {
    try {
      setStatsLoading(true)
      const companyId = selectedCompany?.id
      
      // Fetch all stats in parallel
      const [
        invoiceStats,
        quoteStats,
        contractsResult,
        employeesResult,
        paymentsResult,
        salarySlipsResult,
        documentsResult,
        settlementsResult,
        customersResult,
        leadsResult,
        subscriptionsResult
      ] = await Promise.all([
        invoiceService.getInvoiceStats(companyId).catch(() => null),
        quoteService.getQuoteStats(companyId).catch(() => null),
        (async () => {
          try {
            let q = supabase.from('contracts').select('id, status')
            if (companyId) q = q.eq('company_settings_id', companyId)
            const { data } = await q
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
            let q = supabase.from('employees').select('id, employment_status')
            if (companyId) q = q.or(`company_settings_id.eq.${companyId},company_settings_id.is.null`)
            const { data } = await q
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
            const { data } = await supabase
              .from('payments')
              .select('id, amount, invoices!inner(company_settings_id)')

            const filteredPayments = companyId
              ? (data || []).filter((p: any) => p.invoices?.company_settings_id === companyId)
              : (data || [])

            return {
              total: filteredPayments.length,
              totalAmount: filteredPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
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
        })(),
        (async () => {
          try {
            let q = supabase.from('customers').select('id', { count: 'exact', head: true })
            if (companyId) q = q.or(`company_settings_id.eq.${companyId},company_settings_id.is.null`)
            const { count } = await q
            return { total: count || 0 }
          } catch {
            return { total: 0 }
          }
        })(),
        (async () => {
          try {
            let q = supabase.from('leads').select('id', { count: 'exact', head: true })
            if (companyId) q = q.eq('company_settings_id', companyId)
            const { count } = await q
            return { total: count || 0 }
          } catch {
            return { total: 0 }
          }
        })(),
        (async () => {
          try {
            let q = supabase.from('subscriptions').select('id, status')
            if (companyId) q = q.eq('company_settings_id', companyId)
            const { data } = await q
            return {
              total: data?.length || 0,
              active: data?.filter(s => s.status === 'active' || s.status === 'ACTIVE').length || 0
            }
          } catch {
            return { total: 0, active: 0 }
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
        settlements: settlementsResult,
        customers: customersResult,
        leads: leadsResult,
        subscriptions: subscriptionsResult
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
  }, [activeView, user, selectedCompany?.id])

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
      case 'reporting-hub':
        return <ReportingHub />;
      case 'reporting-invoices':
        return <InvoiceReporting />;
      case 'payments':
        return <PaymentManagement />;
      case 'quotes':
        return <QuoteManagement />;
      case 'reporting-quotes':
        return <QuoteReporting />;
      case 'contracts':
        return <ContractManagement />;
      case 'rate-cards':
        return <RateCardManagement />;
      case 'announcements':
        return <Announcements />;
      case 'expenses':
        return <ExpenseManagement />;
      case 'income':
        return <IncomeManagement />;
      case 'finance':
        return <FinanceManagement />;
      case 'hr-employees':
        return <EmploymentDocuments />;
      case 'hr-leave':
        return <LeaveManagement currentUserId={user?.id} />;
      case 'reporting-hr-leave':
        return <HRLeaveReporting />;
      case 'hr-settlement':
        return <FullFinalSettlement />;
      case 'hr-tds-report':
        return <TDSReport />;
      case 'hr-attendance':
        return <AttendanceManagement />;
      case 'reporting-hr':
      case 'reporting-hr-attendance':
        return <HRAttendanceReporting />;
      case 'hr-performance':
        return <PerformanceFeedback />;
      case 'reporting-hr-performance':
        return <HRPerformanceReporting />;
      case 'hr-compensation':
        return <CompensationManagement />;
      case 'reporting-hr-compensation':
        return <HRCompensationReporting />;
      case 'subscriptions':
        return <SubscriptionManagement />;
      case 'reporting-subscriptions':
        return <SubscriptionReporting />;
      case 'board-resolutions':
        return <BoardResolutionManagement />;
      case 'settings':
        return <InvoiceSettings />;
      case 'customers':
        return <CustomerManagement />;
      case 'customer-360':
        return <Customer360Hub />;
      case 'reporting-customers':
        return <CustomerReporting />;
      case 'leads':
        return <LeadManagement />;
      case 'reporting-leads':
        return <LeadReporting />;
      case 'opportunities':
        return <OpportunityManagement />;
      case 'reporting-opportunities':
        return <OpportunityReporting />;
      case 'products':
        return <ProductManagement />;
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
                onClick={() => navigate('/admin')}
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

              {/* Section: Sales */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('sales')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Sales</span>
                  {openSections.sales ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Sales Items */}
            {(openSections.sales || !sidebarOpen) && (
              <>
                {/* Leads */}
                <li>
                  <button
                    onClick={() => navigate('/admin/leads')}
                    title={!sidebarOpen ? 'Leads' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'leads'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Mail className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Leads</span>}
                  </button>
                </li>

                {/* Opportunities */}
                <li>
                  <button
                    onClick={() => navigate('/admin/opportunities')}
                    title={!sidebarOpen ? 'Opportunities' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'opportunities'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Opportunities</span>}
                  </button>
                </li>

                {/* Quotes */}
                <li>
                  <button
                    onClick={() => navigate('/admin/quotes')}
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

                {/* Contracts */}
                <li>
                  <button
                    onClick={() => navigate('/admin/contracts')}
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
              </>
            )}

            {/* Section: Customers */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('customers')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Customers</span>
                  {openSections.customers ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Customers Items */}
            {(openSections.customers || !sidebarOpen) && (
              <>
                {/* Customers */}
                <li>
                  <button
                    onClick={() => navigate('/admin/customers')}
                    title={!sidebarOpen ? 'Customers' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'customers'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Customers</span>}
                  </button>
                </li>

                {/* Customer 360 Hub */}
                <li>
                  <button
                    onClick={() => navigate('/admin/customer-360')}
                    title={!sidebarOpen ? 'Customer 360° Hub' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'customer-360'
                        ? 'bg-orange-100 text-orange-800 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Compass className="w-5 h-5 flex-shrink-0 text-orange-600" />
                    {sidebarOpen && <span className="ml-3">Customer 360 Hub</span>}
                  </button>
                </li>
              </>
            )}

            {/* Section: Catalog & Pricing */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('catalog')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Catalog & Pricing</span>
                  {openSections.catalog ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Catalog & Pricing Items */}
            {(openSections.catalog || !sidebarOpen) && (
              <>
                {/* Products */}
                <li>
                  <button
                    onClick={() => navigate('/admin/products')}
                    title={!sidebarOpen ? 'Products' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'products'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Layers className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Products</span>}
                  </button>
                </li>

                {/* Rate Cards */}
                <li>
                  <button
                    onClick={() => navigate('/admin/rate-cards')}
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
              </>
            )}

            {/* Section: Billing & Revenue */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('billing')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Billing & Revenue</span>
                  {openSections.billing ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Billing & Revenue Items */}
            {(openSections.billing || !sidebarOpen) && (
              <>
                {/* Subscriptions */}
                <li>
                  <button
                    onClick={() => navigate('/admin/subscriptions')}
                    title={!sidebarOpen ? 'Subscriptions' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'subscriptions'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <RefreshCw className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Subscriptions</span>}
                  </button>
                </li>

                {/* Invoices */}
                <li>
                  <button
                    onClick={() => navigate('/admin/invoices')}
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

                {/* Payments */}
                <li>
                  <button
                    onClick={() => navigate('/admin/payments')}
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

            {/* Section: Finance */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('finance')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Finance</span>
                  {openSections.finance ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Finance Items */}
            {(openSections.finance || !sidebarOpen) && (
              <>
                {/* Finance Reports */}
                <li>
                  <button
                    onClick={() => navigate('/admin/finance')}
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

                {/* Income */}
                <li>
                  <button
                    onClick={() => navigate('/admin/income')}
                    title={!sidebarOpen ? 'Income' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'income'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Income</span>}
                  </button>
                </li>

                {/* Expenses */}
                <li>
                  <button
                    onClick={() => navigate('/admin/expenses')}
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
                    onClick={() => navigate('/admin/hr/employees')}
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
                    onClick={() => navigate('/admin/hr/attendance')}
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
                    onClick={() => navigate('/admin/hr/leave')}
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
                    onClick={() => navigate('/admin/hr/compensation')}
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

                {/* Reviews & Feedback */}
                <li>
                  <button
                    onClick={() => navigate('/admin/hr/performance')}
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

                {/* Settlement */}
                <li>
                  <button
                    onClick={() => navigate('/admin/hr/settlement')}
                    title={!sidebarOpen ? 'Settlement' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'hr-settlement'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Settlement</span>}
                  </button>
                </li>

                {/* TDS Report */}
                <li>
                  <button
                    onClick={() => navigate('/admin/hr/tds-report')}
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
                    onClick={() => navigate('/admin/announcements')}
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

            {/* Section: Governance */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('governance')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Governance</span>
                  {openSections.governance ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Governance Items */}
            {(openSections.governance || !sidebarOpen) && (
              <>
                {/* Board Resolutions */}
                <li>
                  <button
                    onClick={() => navigate('/admin/board-resolutions')}
                    title={!sidebarOpen ? 'Board Resolutions' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'board-resolutions'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Gavel className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Board Resolutions</span>}
                  </button>
                </li>
              </>
            )}

            {/* Section: Reporting & Analytics */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('reporting')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Reporting & Analytics</span>
                  {openSections.reporting ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Reporting & Analytics Items */}
            {(openSections.reporting || !sidebarOpen) && (
              <>
                {/* Reporting Hub */}
                <li>
                  <button
                    onClick={() => navigate('/admin/reporting/hub')}
                    title={!sidebarOpen ? 'Reporting Hub' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'reporting-hub'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BarChart3 className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Reporting Hub</span>}
                  </button>
                </li>

                {/* Customer Reporting */}
                <li>
                  <button
                    onClick={() => navigate('/admin/reporting/customers')}
                    title={!sidebarOpen ? 'Customer Reporting' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'reporting-customers'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Customer Reporting</span>}
                  </button>
                </li>

                {/* Lead Reporting */}
                <li>
                  <button
                    onClick={() => navigate('/admin/reporting/leads')}
                    title={!sidebarOpen ? 'Lead Reporting' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'reporting-leads'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Mail className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Lead Reporting</span>}
                  </button>
                </li>

                {/* Opportunity Reporting */}
                <li>
                  <button
                    onClick={() => navigate('/admin/reporting/opportunities')}
                    title={!sidebarOpen ? 'Opportunity Reporting' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'reporting-opportunities'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Target className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Opportunity Reporting</span>}
                  </button>
                </li>

                {/* Subscription Reporting */}
                <li>
                  <button
                    onClick={() => navigate('/admin/reporting/subscriptions')}
                    title={!sidebarOpen ? 'Subscription Reporting' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'reporting-subscriptions'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Wallet className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Subscription Reporting</span>}
                  </button>
                </li>

                {/* Quote Reporting */}
                <li>
                  <button
                    onClick={() => navigate('/admin/reporting/quotes')}
                    title={!sidebarOpen ? 'Quote Reporting' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'reporting-quotes'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Quote Reporting</span>}
                  </button>
                </li>

                {/* Invoice Reporting */}
                <li>
                  <button
                    onClick={() => navigate('/admin/reporting/invoices')}
                    title={!sidebarOpen ? 'Invoice Reporting' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'reporting-invoices'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Receipt className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Invoice Reporting</span>}
                  </button>
                </li>

                {/* HR Reporting */}
                <li>
                  {sidebarOpen ? (
                    <button
                      onClick={() => toggleReportingSub('hr')}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeView.startsWith('reporting-hr')
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex items-center">
                        <UserCheck className="w-5 h-5 flex-shrink-0" />
                        <span className="ml-3">HR Reporting</span>
                      </span>
                      {reportingSubOpen['hr'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/admin/reporting/hr')}
                      title="HR Reporting"
                      className={`w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeView.startsWith('reporting-hr')
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <UserCheck className="w-5 h-5 flex-shrink-0" />
                    </button>
                  )}
                  {(reportingSubOpen['hr'] || !sidebarOpen) && (
                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                      <li>
                        <button
                          onClick={() => navigate('/admin/reporting/hr/attendance')}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeView === 'reporting-hr-attendance'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Employee Attendance
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => navigate('/admin/reporting/hr/leave')}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeView === 'reporting-hr-leave'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Leave
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => navigate('/admin/reporting/hr/compensation')}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeView === 'reporting-hr-compensation'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Compensation
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => navigate('/admin/reporting/hr/performance')}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeView === 'reporting-hr-performance'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Review & Feedback
                        </button>
                      </li>
                    </ul>
                  )}
                </li>
              </>
            )}

            {/* Section: Configuration */}
            <li className="pt-3">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection('configuration')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md transition-colors"
                >
                  <span>Settings</span>
                  {openSections.configuration ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <hr className="border-gray-200 my-2" />
              )}
            </li>

            {/* Settings Items */}
            {(openSections.configuration || !sidebarOpen) && (
              <>
                {/* Settings */}
                <li>
                  <button
                    onClick={() => navigate('/admin/settings')}
                    title={!sidebarOpen ? 'Settings' : undefined}
                    className={`w-full flex items-center ${!sidebarOpen ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeView === 'settings'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">Settings</span>}
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
         {/* Top Header */}
         <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
           <h2 className="text-xl font-semibold text-gray-900 capitalize">
             {activeView === 'dashboard' ? 'Dashboard' : 
              activeView.startsWith('reporting-') ? activeView.replace('reporting-', '').replace(/-/g, ' ') :
              activeView.replace(/-/g, ' ')}
           </h2>
          <div className="flex items-center gap-3">
            <CompanySelector
              companies={companies}
              selectedId={selectedCompany?.id ?? null}
              onChange={selectCompany}
            />
          </div>
        </header>

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

              {/* Overview Section 1: Sales & Customer Operations */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Sales & Customer Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Leads Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/leads')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Leads & Pipeline</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : dashboardStats.leads.total}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">Active CRM Prospects</p>
                      </div>
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  {/* Quotes Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/quotes')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Quotes & Proposals</p>
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

                  {/* Customer 360 Hub Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
                    onClick={() => navigate('/admin/customer-360')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Customers & 360° Hub</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : dashboardStats.customers.total}
                        </p>
                        <p className="text-xs text-orange-600 mt-1 font-medium">Single Pane Overview</p>
                      </div>
                      <Compass className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>

                  {/* Contracts Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/contracts')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Client Contracts</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : dashboardStats.contracts.total}
                        </p>
                        <p className="text-xs text-cyan-600 mt-1">
                          {dashboardStats.contracts.active} Active Contracts
                        </p>
                      </div>
                      <FileCheck className="w-8 h-8 text-cyan-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Overview Section 2: Catalog, Billing & Revenue */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Billing & Revenue</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Invoices Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/invoices')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Invoices</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : (dashboardStats.invoices?.total_invoices || 0)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {dashboardStats.invoices?.paid_invoices || 0} Paid Invoices
                        </p>
                      </div>
                      <Receipt className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  {/* Payments Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/payments')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Payments Collection</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : dashboardStats.payments.total}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {currencySymbol}{(dashboardStats.payments.totalAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      <CreditCard className="w-8 h-8 text-green-600" />
                    </div>
                  </div>

                  {/* Subscriptions Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/subscriptions')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Subscriptions</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : dashboardStats.subscriptions.total}
                        </p>
                        <p className="text-xs text-indigo-600 mt-1">
                          {dashboardStats.subscriptions.active} Active Recurring
                        </p>
                      </div>
                      <RefreshCw className="w-8 h-8 text-indigo-600" />
                    </div>
                  </div>

                  {/* Revenue Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/finance')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {currencySymbol}{statsLoading ? '...' : ((dashboardStats.invoices?.total_revenue || 0).toLocaleString())}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Pending: {currencySymbol}{(dashboardStats.invoices?.pending_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Overview Section 3: Finance, HR & Operations */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">HR & Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Employees Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/hr/employees')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Employees</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : dashboardStats.employees.total}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {dashboardStats.employees.active} Active Staff
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>

                  {/* Documents Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/hr/employees')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">HR Documents</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : dashboardStats.documents}
                        </p>
                        <p className="text-xs text-indigo-600 mt-1">Employment Records</p>
                      </div>
                      <FileCheck className="w-8 h-8 text-indigo-600" />
                    </div>
                  </div>

                  {/* Salary Slips Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/hr/employees')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Salary Slips</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {statsLoading ? '...' : dashboardStats.salarySlips}
                        </p>
                        <p className="text-xs text-teal-600 mt-1">Payroll Records</p>
                      </div>
                      <Banknote className="w-8 h-8 text-teal-600" />
                    </div>
                  </div>

                  {/* Finance Reports Card */}
                  <div 
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/finance')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Finance Reports</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">Overview</p>
                        <p className="text-xs text-emerald-600 mt-1">Income & Expenses</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions & Shortcuts</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {/* Customer 360 Hub */}
                  <button
                    onClick={() => navigate('/admin/customer-360')}
                    className="flex flex-col items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                      <Compass className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-xs font-medium text-orange-700 text-center">Customer 360</span>
                  </button>

                  {/* Leads */}
                  <button
                    onClick={() => navigate('/admin/leads')}
                    className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-blue-700 text-center">Leads</span>
                  </button>

                  {/* Create Invoice */}
                  <button
                    onClick={() => navigate('/admin/invoices')}
                    className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                      <Receipt className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-blue-700 text-center">New Invoice</span>
                  </button>

                  {/* Create Quote */}
                  <button
                    onClick={() => navigate('/admin/quotes')}
                    className="flex flex-col items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-purple-700 text-center">New Quote</span>
                  </button>

                  {/* Create Contract */}
                  <button
                    onClick={() => navigate('/admin/contracts')}
                    className="flex flex-col items-center p-3 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-cyan-100 rounded-full flex items-center justify-center mb-2">
                      <FileCheck className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="text-xs font-medium text-cyan-700 text-center">New Contract</span>
                  </button>

                  {/* Subscriptions */}
                  <button
                    onClick={() => navigate('/admin/subscriptions')}
                    className="flex flex-col items-center p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                      <RefreshCw className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-xs font-medium text-indigo-700 text-center">Subscriptions</span>
                  </button>

                  {/* Add Employee */}
                  <button
                    onClick={() => navigate('/admin/hr/employees')}
                    className="flex flex-col items-center p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                      <Plus className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium text-emerald-700 text-center">Add Employee</span>
                  </button>

                  {/* Finance Reports */}
                  <button
                    onClick={() => navigate('/admin/finance')}
                    className="flex flex-col items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center mb-2">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-700 text-center">Finance Reports</span>
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
