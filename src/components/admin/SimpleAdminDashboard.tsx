import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Mail, 
  Users, 
  MessageSquare, 
  TrendingUp,
  LogOut,
  Database,
  Receipt,
  CreditCard,
  FileText
} from 'lucide-react'
import { simpleAuth, SimpleUser } from '../../utils/simpleAuth'
import { isSupabaseConfigured } from '../../config/supabase'
import InvoiceManagement from '../invoice/InvoiceManagement'
import { PaymentManagement } from '../payment/PaymentManagement'
import QuoteManagement from '../quote/QuoteManagement'

type ActiveView = 'dashboard' | 'invoices' | 'payments' | 'quotes';

const SimpleAdminDashboard: React.FC = () => {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(true)
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
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
      }, 10000) // 10 seconds

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

  if (activeView === 'invoices') {
    return <InvoiceManagement onBackToDashboard={() => setActiveView('dashboard')} />
  }

  if (activeView === 'payments') {
    return <PaymentManagement onBackToDashboard={() => setActiveView('dashboard')} />
  }

  if (activeView === 'quotes') {
    return <QuoteManagement onBackToDashboard={() => setActiveView('dashboard')} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveView('dashboard' as ActiveView)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    (activeView as string) === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('invoices' as ActiveView)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    (activeView as string) === 'invoices'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Invoices
                </button>
                <button
                  onClick={() => setActiveView('payments' as ActiveView)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    (activeView as string) === 'payments'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payments
                </button>
                <button
                  onClick={() => setActiveView('quotes' as ActiveView)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    (activeView as string) === 'quotes'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Quotes
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.username}</span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                  🎉 Authentication Success! You are now logged in to the admin dashboard.
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Emails</p>
                <p className="text-2xl font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">1</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-2xl font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Growth</p>
                <p className="text-2xl font-semibold text-gray-900">+12%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Dashboard Content</h2>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <Database className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Admin Dashboard</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Your admin dashboard is ready. You can start managing your application from here.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default SimpleAdminDashboard
