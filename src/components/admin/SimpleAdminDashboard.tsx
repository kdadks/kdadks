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
  Building2,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import { simpleAuth, SimpleUser } from '../../utils/simpleAuth'
import { isSupabaseConfigured } from '../../config/supabase'
import InvoiceManagement from '../invoice/InvoiceManagement'
import { PaymentManagement } from '../payment/PaymentManagement'
import QuoteManagement from '../quote/QuoteManagement'
import EmploymentDocuments from '../hr/EmploymentDocuments'
import LeaveManagement from '../hr/LeaveManagement'
import AttendanceManagement from '../hr/AttendanceManagement'
import OrganizationSettings from '../settings/OrganizationSettings'

type ActiveView = 'dashboard' | 'invoices' | 'payments' | 'quotes' | 'hr-employees' | 'hr-leave' | 'hr-attendance' | 'hr-organization';

const SimpleAdminDashboard: React.FC = () => {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(true)
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [hrMenuOpen, setHrMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

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

  // Auto-hide success message after 10 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false)
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [showSuccessMessage])

  // Auto-open HR menu if an HR view is active
  useEffect(() => {
    if (activeView.startsWith('hr-')) {
      setHrMenuOpen(true)
    }
  }, [activeView])

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

  // Render different views based on activeView
  const renderView = () => {
    switch (activeView) {
      case 'invoices':
        return <InvoiceManagement onBackToDashboard={() => setActiveView('dashboard')} />;
      case 'payments':
        return <PaymentManagement onBackToDashboard={() => setActiveView('dashboard')} />;
      case 'quotes':
        return <QuoteManagement onBackToDashboard={() => setActiveView('dashboard')} />;
      case 'hr-employees':
        return <EmploymentDocuments onBackToDashboard={() => setActiveView('dashboard')} />;
      case 'hr-leave':
        return <LeaveManagement onBackToDashboard={() => setActiveView('dashboard')} />;
      case 'hr-attendance':
        return <AttendanceManagement onBackToDashboard={() => setActiveView('dashboard')} />;
      case 'hr-organization':
        return <OrganizationSettings onBackToDashboard={() => setActiveView('dashboard')} />;
      case 'dashboard':
      default:
        return null;
    }
  };

  // If not on dashboard, render the specific view
  const viewComponent = renderView();
  if (viewComponent) {
    return viewComponent;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {sidebarOpen && <h1 className="text-lg font-semibold text-gray-900">Admin Portal</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {/* Dashboard */}
            <li>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Database className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-3">Dashboard</span>}
              </button>
            </li>

            {/* Invoices */}
            <li>
              <button
                onClick={() => setActiveView('invoices')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
                onClick={() => setActiveView('payments')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'payments'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-3">Payments</span>}
              </button>
            </li>

            {/* Quotes */}
            <li>
              <button
                onClick={() => setActiveView('quotes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'quotes'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-3">Quotes</span>}
              </button>
            </li>

            {/* HR Menu (Collapsible) */}
            <li>
              <button
                onClick={() => setHrMenuOpen(!hrMenuOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView.startsWith('hr-')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <Briefcase className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="ml-3">HR Management</span>}
                </div>
                {sidebarOpen && (
                  hrMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* HR Submenu */}
              {sidebarOpen && hrMenuOpen && (
                <ul className="mt-1 ml-4 space-y-1">
                  <li>
                    <button
                      onClick={() => setActiveView('hr-employees')}
                      className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                        activeView === 'hr-employees'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 flex-shrink-0" />
                      <span className="ml-3">Employees & Docs</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveView('hr-leave')}
                      className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                        activeView === 'hr-leave'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="ml-3">Leave Management</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveView('hr-attendance')}
                      className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                        activeView === 'hr-attendance'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span className="ml-3">Attendance</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveView('hr-organization')}
                      className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                        activeView === 'hr-organization'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <span className="ml-3">Organization</span>
                    </button>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-4">
          {sidebarOpen && (
            <div className="mb-3">
              <p className="text-xs text-gray-500">Logged in as:</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeView === 'dashboard' && 'Dashboard'}
            {activeView === 'invoices' && 'Invoices'}
            {activeView === 'payments' && 'Payments'}
            {activeView === 'quotes' && 'Quotes'}
            {activeView === 'hr-employees' && 'HR - Employees & Documents'}
            {activeView === 'hr-leave' && 'HR - Leave Management'}
            {activeView === 'hr-attendance' && 'HR - Attendance'}
            {activeView === 'hr-organization' && 'HR - Organization Settings'}
          </h2>
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

          {/* Dashboard Overview */}
          {activeView === 'dashboard' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Dashboard Cards */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Invoices</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">-</p>
                    </div>
                    <Receipt className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Payments</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">-</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Quotes</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">-</p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Employees</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">-</p>
                    </div>
                    <Briefcase className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Welcome Message */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Admin Dashboard</h3>
                <p className="text-gray-600">
                  Use the sidebar navigation to manage invoices, payments, quotes, and HR operations.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default SimpleAdminDashboard
