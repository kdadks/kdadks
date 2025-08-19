import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

interface ReCaptchaProps {
  onVerify: (token: string | null) => void
  onExpired?: () => void
  onError?: () => void
  theme?: 'light' | 'dark'
  size?: 'compact' | 'normal'
}

export interface ReCaptchaRef {
  reset: () => void
  execute: () => void
}

const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(({
  onVerify,
  onExpired,
  onError,
  theme = 'light',
  size = 'normal'
}, ref) => {
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  // Get reCAPTCHA site key from environment variables
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

  useImperativeHandle(ref, () => ({
    reset: () => {
      recaptchaRef.current?.reset()
    },
    execute: () => {
      recaptchaRef.current?.execute()
    }
  }))

  // If no site key is configured, show a development warning
  if (!siteKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              reCAPTCHA Configuration Required
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Please configure VITE_RECAPTCHA_SITE_KEY in your environment variables to enable reCAPTCHA protection.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center my-4">
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        onChange={onVerify}
        onExpired={onExpired}
        onError={onError}
        theme={theme}
        size={size}
      />
    </div>
  )
})

ReCaptcha.displayName = 'ReCaptcha'

export default ReCaptcha
