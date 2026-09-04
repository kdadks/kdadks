import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LifeBuoy, Lock, Mail, KeyRound, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { simpleAuth } from '../../utils/simpleAuth';
import { RoleService } from '../../services/roleService';
import { useToast } from '../ui/ToastProvider';
import ITSMAgentResetPasswordModal from './ITSMAgentResetPasswordModal';

interface ITSMAgentLoginProps {
  onSuccess?: () => void;
}

export const ITSMAgentLogin: React.FC<ITSMAgentLoginProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  const resetTokenFromUrl = searchParams.get('resetToken') || searchParams.get('token') || '';
  const [showResetModal, setShowResetModal] = useState<boolean>(!!resetTokenFromUrl);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    try {
      setSubmitting(true);
      const authResult = await simpleAuth.login(email.trim(), password);

      if (!authResult.success) {
        showError(authResult.error || 'Invalid agent email or password.');
        return;
      }

      // Check user role permissions for 'itsm_tickets'
      const effPerms = await RoleService.getCurrentUserEffectivePermissions();
      const isSuperAdmin = effPerms.isSuperAdmin || authResult.user.email === 'admin@kdadks.com';
      const hasItsmPermission = isSuperAdmin || RoleService.hasPermission(effPerms.permissions, 'itsm_tickets', 'view');

      if (!hasItsmPermission) {
        showError(
          `Access Denied: Role "${effPerms.role?.name || 'Assigned Role'}" lacks 'itsm_tickets' permission assigned via /admin/roles.`
        );
        return;
      }

      // Store ITSM Agent Session
      const sessionData = {
        user_id: authResult.user.id,
        email: authResult.user.email,
        role_name: effPerms.role?.name || (isSuperAdmin ? 'Super Admin' : 'Agent'),
        signed_in_at: new Date().toISOString(),
      };
      sessionStorage.setItem('itsm_agent_session', JSON.stringify(sessionData));

      showSuccess(`Welcome! Agent authenticated into Service Desk.`);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/itsm');
      }
    } catch (err) {
      showError(`Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 p-8 text-white text-center relative">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <LifeBuoy className="h-8 w-8 text-indigo-200 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">ITSM Service Desk Portal</h2>
          <p className="text-xs text-indigo-100 mt-1">
            Agent & Triage Desk Staff Authentication
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleAgentLogin} className="p-8 space-y-5 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-indigo-500" />
              <span>Staff / Agent Email Address <span className="text-red-500">*</span></span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. agent@kdadks.com"
              className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                <span>Agent Account Password <span className="text-red-500">*</span></span>
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start space-x-2">
            <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Role-Based Access: User accounts must be assigned the <strong>Service Desk / ITSM</strong> permission via <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">/admin/roles</code>.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{submitting ? 'Authenticating Agent...' : 'Sign In to Service Desk'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="pt-2 text-center text-[11px]">
            <a href="/admin" className="text-indigo-600 hover:underline font-semibold">
              Return to Main Admin Portal
            </a>
          </div>
        </form>
      </div>

      <ITSMAgentResetPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialToken={resetTokenFromUrl}
      />
    </div>
  );
};

export default ITSMAgentLogin;
