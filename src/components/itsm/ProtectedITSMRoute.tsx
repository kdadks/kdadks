import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Lock } from 'lucide-react';
import { simpleAuth, SimpleUser } from '../../utils/simpleAuth';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import ITSMAgentLogin from './ITSMAgentLogin';

interface ProtectedITSMRouteProps {
  children: React.ReactNode;
}

export const ProtectedITSMRoute: React.FC<ProtectedITSMRouteProps> = ({ children }) => {
  const location = useLocation();
  const { can, isSuperAdmin, currentRole } = useRolePermissions();

  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [agentSession, setAgentSession] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, [location.pathname]);

  const checkAuth = async () => {
    try {
      setLoading(true);

      // Check explicit ITSM agent session
      const storedAgentSession = sessionStorage.getItem('itsm_agent_session');
      if (storedAgentSession) {
        try {
          const parsed = JSON.parse(storedAgentSession);
          setAgentSession(parsed);
        } catch (e) {
          setAgentSession(null);
        }
      } else {
        setAgentSession(null);
      }

      const isAuth = await simpleAuth.isAuthenticated();
      if (isAuth) {
        const u = await simpleAuth.getCurrentUser();
        setUser(u);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('ProtectedITSMRoute auth check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Verifying Service Desk Staff Authentication...</p>
        </div>
      </div>
    );
  }

  // 1. If not logged in or no explicit ITSM agent session -> Present ITSM Agent Login Screen
  if (!agentSession && !user) {
    return <ITSMAgentLogin onSuccess={checkAuth} />;
  }

  // 2. Authenticated but lacks 'itsm_tickets' module permission
  const hasItsmPermission = can('itsm_tickets', 'view') || isSuperAdmin || !!agentSession;
  if (!hasItsmPermission) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-red-100 dark:border-red-900/50 text-center space-y-5">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">ITSM Access Restricted</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Your logged-in user account (<span className="font-semibold text-gray-800 dark:text-gray-200">{user?.email}</span>) with assigned role (<span className="font-bold text-indigo-600 dark:text-indigo-400">{currentRole?.name || 'Assigned Role'}</span>) does not have access permission for the <strong className="text-gray-900 dark:text-white">Service Desk / ITSM Tickets</strong> module.
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-left border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="font-bold text-gray-800 dark:text-gray-200">How to gain access:</div>
            <p>1. Contact your Super Administrator (admin@kdadks.com).</p>
            <p>2. Ask them to assign the <strong className="text-indigo-600">Service Desk / ITSM</strong> module permission to your role under <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">/admin/roles</code>.</p>
          </div>

          <div className="pt-2">
            <a
              href="/admin"
              className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Return to Admin Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized -> Render ITSM Component
  return <>{children}</>;
};

export default ProtectedITSMRoute;
