import React, { forwardRef, useImperativeHandle, useEffect, useState } from 'react'
import { Shield } from 'lucide-react'

interface ReCaptchaEnterpriseProps {
  onVerify: (token: string | null) => void
  onError?: (error: string) => void
  action?: string
  className?: string
}

export interface ReCaptchaEnterpriseRef {
  execute: () => Promise<string | null>
  reset: () => void
}

// Declare global grecaptcha for TypeScript
declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready: (callback: () => void) => void
        execute: (siteKey: string, options: { action: string }) => Promise<string>
        render: (container: string | HTMLElement, options: any) => number
        reset: (widgetId?: number) => void
      }
    }
  }
}

const ReCaptchaEnterprise = forwardRef<ReCaptchaEnterpriseRef, ReCaptchaEnterpriseProps>(({
  onVerify,
  onError,
  action = 'submit',
  className = ''
}, ref) => {
  const [isReady, setIsReady] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  
  // Get reCAPTCHA site key from environment variables
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

  // Debug: Log the site key to console
  console.log('🔍 ReCAPTCHA Debug:', {
    siteKey: siteKey,
    hasKey: !!siteKey,
    env: import.meta.env.MODE
  });

  useEffect(() => {
    // Wait for grecaptcha to be available
    const checkRecaptcha = () => {
      console.log('🔍 Checking reCAPTCHA availability:', {
        grecaptcha: !!window.grecaptcha,
        enterprise: !!window.grecaptcha?.enterprise,
        ready: !!window.grecaptcha?.enterprise?.ready,
        siteKey: siteKey
      });
      
      if (window.grecaptcha && window.grecaptcha.enterprise && siteKey) {
        console.log('✅ reCAPTCHA Enterprise found, calling ready...');
        
        try {
          // Try to render the recaptcha explicitly first (this might help with the site key issue)
          window.grecaptcha.enterprise.ready(() => {
            console.log('✅ reCAPTCHA Enterprise ready callback executed');
            
            // Test if we can call execute immediately to check for site key issues
            console.log('🧪 Testing site key by attempting execute...');
            window.grecaptcha.enterprise.execute(siteKey, { action: 'test' })
              .then(() => {
                console.log('✅ Site key test successful');
                setIsReady(true);
              })
              .catch((testError) => {
                console.error('❌ Site key test failed:', testError);
                console.log('🔄 Setting ready anyway for fallback handling');
                setIsReady(true);
              });
          })
        } catch (error) {
          console.error('❌ Error in grecaptcha.enterprise.ready:', error);
          // Fallback - just set ready to true
          setTimeout(() => {
            console.log('🔄 Fallback: Setting ready to true after delay');
            setIsReady(true);
          }, 2000);
        }
      } else {
        console.log('⏳ reCAPTCHA not ready yet, retrying in 500ms...');
        setTimeout(checkRecaptcha, 500)
      }
    }

    checkRecaptcha()
  }, [siteKey])

  const executeRecaptcha = async (): Promise<string | null> => {
    console.log('🚀 executeRecaptcha called:', { siteKey, action, isReady });
    
    if (!siteKey) {
      const error = 'reCAPTCHA site key not configured'
      console.log('❌ No site key:', error);
      onError?.(error)
      return null
    }

    if (!isReady) {
      const error = 'reCAPTCHA not ready yet'
      console.log('❌ Not ready:', error, { 
        grecaptchaExists: !!window.grecaptcha,
        enterpriseExists: !!window.grecaptcha?.enterprise 
      });
      onError?.(error)
      return null
    }

    if (!window.grecaptcha?.enterprise) {
      const error = 'reCAPTCHA Enterprise not loaded'
      console.log('❌ Enterprise not loaded:', error, {
        grecaptcha: !!window.grecaptcha,
        enterprise: !!window.grecaptcha?.enterprise
      });
      onError?.(error)
      return null
    }

    setIsExecuting(true)
    
    try {
      console.log('🔄 Calling grecaptcha.enterprise.execute...', { siteKey, action });
      const token = await window.grecaptcha.enterprise.execute(siteKey, { action })
      console.log('✅ Token received:', { tokenLength: token?.length, tokenPreview: token?.substring(0, 20) + '...' });
      onVerify(token)
      return token
    } catch (error) {
      console.log('❌ Execute error:', error);
      const errorMessage = error instanceof Error ? error.message : 'reCAPTCHA execution failed'
      onError?.(errorMessage)
      return null
    } finally {
      setIsExecuting(false)
    }
  }

  useImperativeHandle(ref, () => ({
    execute: executeRecaptcha,
    reset: () => {
      // For Enterprise v3, there's typically no reset needed as it's invisible
      // But we'll provide the interface for consistency
      if (window.grecaptcha?.enterprise?.reset) {
        window.grecaptcha.enterprise.reset()
      }
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
              reCAPTCHA Enterprise Configuration Required
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Please configure VITE_RECAPTCHA_SITE_KEY in your environment variables to enable reCAPTCHA Enterprise protection.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // reCAPTCHA Enterprise v3 is invisible, so we show a status indicator
  return (
    <div className={`flex items-center justify-center py-2 ${className}`}>
      <div className="flex items-center text-sm text-gray-600">
        <Shield className={`w-4 h-4 mr-2 ${isExecuting ? 'animate-pulse' : ''}`} />
        <span>
          {!isReady ? 'Loading security verification...' :
           isExecuting ? 'Verifying...' :
           'Protected by reCAPTCHA Enterprise'}
        </span>
      </div>
    </div>
  )
})

ReCaptchaEnterprise.displayName = 'ReCaptchaEnterprise'

export default ReCaptchaEnterprise
