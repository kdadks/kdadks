import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, Key } from 'lucide-react';

interface Props {
  daysUntilExpiry: number;
  onDismiss: () => void;
}

export default function PasswordExpiryReminder({ daysUntilExpiry, onDismiss }: Props) {
  const navigate = useNavigate();

  const session = (() => {
    try {
      const s = sessionStorage.getItem('employee_session');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  })();

  const handleChangePassword = () => {
    onDismiss();
    navigate('/employee/change-password', {
      state: {
        employeeId: session?.id,
        fromExpiryReminder: true,
      },
    });
  };

  const urgency = daysUntilExpiry <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 ${urgency ? 'border-red-400' : 'border-amber-400'} overflow-hidden`}>
        {/* Top accent bar */}
        <div className={`h-1.5 w-full ${urgency ? 'bg-red-500' : 'bg-amber-400'}`} />

        <div className="p-6">
          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            title="Remind me later"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon + heading */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full ${urgency ? 'bg-red-100' : 'bg-amber-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${urgency ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${urgency ? 'text-red-700' : 'text-amber-700'}`}>
                Password Expiring Soon
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {daysUntilExpiry === 1
                  ? <>Your password expires <span className="font-semibold text-gray-800">tomorrow</span>.</>
                  : <>Your password expires in <span className="font-semibold text-gray-800">{daysUntilExpiry} days</span>.</>}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Please change your password now to avoid losing access.
              </p>
            </div>
          </div>

          {/* Info note */}
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm mb-5 ${urgency ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            <Key className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Passwords must be changed every <strong>90 days</strong> for security compliance.</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleChangePassword}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${urgency ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              <Key className="w-4 h-4" />
              Change Password Now
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
