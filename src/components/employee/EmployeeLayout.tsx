import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Clock, FileText, TrendingUp, Menu, X, User, LogOut } from 'lucide-react';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = (() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      const employee = JSON.parse(session);
      return { name: employee.name || 'Employee' };
    }
    return { name: 'Employee' };
  })();

  const handleLogout = () => {
    sessionStorage.removeItem('employee_session');
    navigate('/employee/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/employee', icon: Home },
    { name: 'Leave Management', href: '/employee/leaves', icon: Calendar },
    { name: 'Attendance', href: '/employee/attendance', icon: Clock },
    { name: 'Profile', href: '/employee/profile', icon: User },
    { name: 'Salary Slips', href: '/employee/salary', icon: TrendingUp },
    { name: 'Documents', href: '/employee/documents', icon: FileText },
  ];

  const isActive = (path: string) => {
    if (path === '/employee') {
      return location.pathname === '/employee';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:h-screen md:fixed bg-white border-r border-gray-200">
        <div className="flex flex-col h-full pt-5 pb-4">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 mb-4">
            <Link to="/employee" className="flex flex-col">
              <span className="text-2xl font-bold text-primary-600">KDADKS</span>
              <span className="text-xs text-gray-600">Employee Portal</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link to="/employee" className="flex flex-col" onClick={() => setSidebarOpen(false)}>
              <span className="text-2xl font-bold text-primary-600">KDADKS</span>
              <span className="text-xs text-gray-600">Employee Portal</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Empty div for spacing on desktop */}
            <div className="hidden md:block"></div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm font-medium">{currentUser.name}</span>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

