import React, { useState } from 'react';
import { X, Mail, KeyRound, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { CustomerAuthService } from '../../services/customerAuthService';
import { useToast } from '../ui/ToastProvider';

interface CustomerResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialToken?: string;
  onPasswordResetSuccess?: () => void;
}

export const CustomerResetPasswordModal: React.FC<CustomerResetPasswordModalProps> = ({
  isOpen,
  onClose,
  initialToken = '',
  onPasswordResetSuccess,
}) => {
  const { showSuccess, showError } = useToast();

  const [mode, setMode] = useState<'request' | 'reset'>(initialToken ? 'reset' : 'request');
  const [emailOrCode, setEmailOrCode] = useState<string>('');
  const [token, setToken] = useState<string>(initialToken);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrCode.trim()) return;

    try {
      setSubmitting(true);
      const res = await CustomerAuthService.requestPasswordReset(emailOrCode.trim());
      if (res.success) {
        setSubmittedMessage(res.message);
        showSuccess(res.message);
      } else {
        showError(res.message);
      }
    } catch (err) {
      showError(`Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !newPassword) return;

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await CustomerAuthService.resetPasswordWithToken(token.trim(), newPassword);
      if (res.success) {
        showSuccess(res.message);
        if (onPasswordResetSuccess) onPasswordResetSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        showError(res.message);
      }
    } catch (err) {
      showError(`Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 backdrop-blur-md">
            <KeyRound className="h-6 w-6 text-indigo-200" />
          </div>
          <h2 className="text-xl font-bold">
            {mode === 'request' ? 'Reset Customer Portal Password' : 'Set New Password'}
          </h2>
          <p className="text-xs text-indigo-100 mt-1">
            {mode === 'request'
              ? 'We will send instructions to your account email'
              : 'Enter your reset token and new password'}
          </p>
        </div>

        {/* Content */}
        {submittedMessage ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto animate-bounce" />
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{submittedMessage}</p>
            <div className="pt-2">
              <button
                onClick={() => setMode('reset')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Have a reset token? Enter token to set password →
              </button>
            </div>
          </div>
        ) : mode === 'request' ? (
          <form onSubmit={handleRequestSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-indigo-500" />
                <span>Customer Email or Customer ID <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                value={emailOrCode}
                onChange={(e) => setEmailOrCode(e.target.value)}
                placeholder="e.g. IND-2026-0001 or billing@acme.com"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Sending Instructions...' : 'Send Password Reset Email'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-[11px] text-gray-500 hover:text-indigo-600"
              >
                Already have a reset token? Enter token
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Password Reset Token <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="csreset_..."
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{submitting ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CustomerResetPasswordModal;
