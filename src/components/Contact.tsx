import React, { useState, useRef } from 'react'
import { Mail, Phone, MapPin, Send, Clock, CheckCircle, Shield } from 'lucide-react'
import { EmailService } from '../services/emailService'
import { ContactFormData } from '../config/brevo'
import ReCaptchaEnterprise, { ReCaptchaEnterpriseRef } from './ui/ReCaptchaEnterprise'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const recaptchaRef = useRef<ReCaptchaEnterpriseRef>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Execute reCAPTCHA Enterprise verification
      const token = await recaptchaRef.current?.execute()
      if (!token) {
        throw new Error('reCAPTCHA verification failed')
      }

      // Validate form data
      if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
        throw new Error('Please fill in all required fields.')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address.')
      }

      // Prepare contact data for direct API call
      const emailData = {
        to: 'amit.ranjan78@gmail.com', // Temporary: Use your personal email to test
        from: formData.email.trim(),
        subject: `New Contact Form Submission from ${formData.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
                <p style="color: #6b7280; margin: 10px 0 0 0;">From KDADKS website contact form</p>
              </div>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Contact Details</h2>
                <p style="margin: 5px 0;"><strong>Name:</strong> ${formData.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${formData.email}</p>
                ${formData.company ? `<p style="margin: 5px 0;"><strong>Company:</strong> ${formData.company}</p>` : ''}
              </div>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px;">
                <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Message</h2>
                <p style="margin: 0; line-height: 1.6; color: #4b5563;">${formData.message.replace(/\n/g, '<br>')}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">This email was sent from the KDADKS website contact form</p>
                <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">Please respond to: ${formData.email}</p>
              </div>
            </div>
          </div>
        `,
        text: `
          New Contact Form Submission
          
          Name: ${formData.name}
          Email: ${formData.email}
          ${formData.company ? `Company: ${formData.company}` : ''}
          
          Message:
          ${formData.message}
          
          ---
          This email was sent from the KDADKS website contact form.
          Please respond to: ${formData.email}
        `,
        recaptchaToken: token,
        recaptchaAction: 'contact_form'
      }

      // Send email using direct API call with enhanced error handling
      const isProduction = import.meta.env.MODE === 'production' || window.location.hostname !== 'localhost';
      const apiEndpoint = isProduction ? '/.netlify/functions/send-email' : '/api/send-email';
      console.log('🔍 Environment detection:', { 
        mode: import.meta.env.MODE, 
        hostname: window.location.hostname, 
        isProduction, 
        apiEndpoint 
      });
      console.log('🔍 Attempting to send email to:', apiEndpoint);
      console.log('🔍 Email data being sent:', emailData);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      })

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is HTML (404/error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('❌ API returned HTML instead of JSON - likely 404');
        const htmlContent = await response.text();
        console.log('HTML Response preview:', htmlContent.substring(0, 200));
        
        // Try alternative email method
        throw new Error('Email service temporarily unavailable. Please try again later or contact us directly at support@kdadks.com');
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      // Check if the response was actually successful
      const result = await response.json()
      console.log('🔍 API Response:', result);
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'Email sending failed')
      }

      console.log('✅ Email sent successfully:', result.messageId);

      // Reset form and show success message
      setFormData({
        name: '',
        email: '',
        company: '',
        message: '',
      })
      setIsSubmitted(true)
      setTimeout(() => setIsSubmitted(false), 5000)
    } catch (error) {
      console.error('Primary email sending failed:', error)
      
      // Try backup email method
      try {
        console.log('🔄 Attempting backup email method...');
        
        // Fallback 1: Try alternative endpoint
        const backupEndpoint = '/.netlify/functions/debug'; // Test if functions work at all
        const debugResponse = await fetch(backupEndpoint);
        
        if (debugResponse.ok) {
          console.log('✅ Netlify Functions are working, but send-email function has issues');
          // Functions work, but send-email is broken
          setSubmitError('Email service is temporarily unavailable. Please contact us directly at support@kdadks.com or try again later.');
        } else {
          console.log('❌ Netlify Functions are not working');
          // Functions are completely down
          setSubmitError('Email service is currently offline. Please contact us directly at support@kdadks.com');
        }
        
      } catch (backupError) {
        console.error('Backup method also failed:', backupError);
        
        // Ultimate fallback - mailto
        const mailtoSubject = `Contact Form - ${formData.name}`;
        const mailtoBody = `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\n\nMessage:\n${formData.message}`;
        const mailtoUrl = `mailto:support@kdadks.com?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;
        
        setSubmitError(
          `Email service is temporarily unavailable. We've prepared an email for you - click here to send it manually: <a href="${mailtoUrl}" target="_blank" style="color: #3b82f6; text-decoration: underline;">Open Email Client</a>`
        );
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email Us',
      details: 'support@kdadks.com',
      description: 'Send us an email anytime',
    },
    {
      icon: Phone,
      title: 'Call Us', 
      details: '+91 7982303199',
      description: 'Mon-Fri from 8am to 5pm',
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      details: 'Lucknow, India',
      description: 'Lucknow, Uttar Pradesh, India',
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: 'Mon - Fri: 8am - 5pm',
      description: 'Weekend support available',
    },
  ]

  return (
    <section id="contact" className="section-padding bg-gradient-secondary" itemScope itemType="https://schema.org/ContactPage" role="main" aria-labelledby="contact-heading">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 id="contact-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6" itemProp="name">
            Get In Touch
            <span className="block text-gradient">With Our Team</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed mb-8" itemProp="description">
            Ready to start your next project? We'd love to hear from you.
            Send us a message and we'll respond as soon as possible.
          </p>
          
          {/* Brand Logos */}
          <div className="flex flex-wrap justify-center items-center space-x-12 mb-8">
            {/* ITwala clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('itwala-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Scroll to ITwala Service section"
              style={{ background: 'none', border: 'none', padding: '8px', margin: '4px' }}
            >
              <img
                src="/IT - WALA_logo (1).png"
                alt="IT Wala logo"
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
              <p className="text-sm text-secondary-500 mt-3">IT Training & Consulting</p>
            </button>
            {/* Ayuh Clinic clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('ayuh-clinic-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Scroll to Ayuh Clinic Service section"
              style={{ background: 'none', border: 'none', padding: '8px', margin: '4px' }}
            >
              <img
                src="/AYUH_Logo_2.png"
                alt="Ayuh Clinic logo"
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
              <p className="text-sm text-secondary-500 mt-3">Healthcare Services</p>
            </button>
            {/* Nirchal clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('nirchal-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Scroll to Nirchal Service section"
              style={{ background: 'none', border: 'none', padding: '8px', margin: '4px' }}
            >
              <img
                src="/Nirchal_Logo.png"
                alt="Nirchal logo"
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
              <p className="text-sm text-secondary-500 mt-3">Fashion & Tailoring</p>
            </button>
            {/* Raahirides clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('raahirides-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
              aria-label="Scroll to Raahirides Service section"
              style={{ background: 'none', border: 'none', padding: '8px', margin: '4px' }}
            >
              <img
                src="/raahi_rides_logo.png"
                alt="Raahirides logo"
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
              <p className="text-sm text-secondary-500 mt-3">Travel Solutions</p>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16" itemScope itemType="https://schema.org/LocalBusiness">
          {/* Contact Form */}
          <div className="card p-8">
            <h3 className="text-2xl font-bold text-secondary-900 mb-6">
              Send us a message
            </h3>
            
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-secondary-900 mb-2">
                  Message Sent Successfully!
                </h4>
                <p className="text-secondary-600">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-label="Contact form">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-secondary-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-secondary-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 resize-none"
                    placeholder="Tell us about your project..."
                  />
                </div>

                {/* reCAPTCHA */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-2">
                    <Shield className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm text-gray-600">Security Verification</span>
                  </div>
                  <ReCaptchaEnterprise
                    ref={recaptchaRef}
                    action="contact_form"
                    onVerify={() => {}} // Invisible reCAPTCHA doesn't need this
                  />
                </div>

                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div 
                      className="text-red-600 text-sm" 
                      dangerouslySetInnerHTML={{ __html: submitError }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="ml-2 w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-8" itemScope itemType="https://schema.org/Organization">
            <div>
              <h3 className="text-2xl font-bold text-secondary-900 mb-6">
                Contact Information
              </h3>
              <p className="text-secondary-600 mb-8 leading-relaxed">
                We're here to help and answer any question you might have.
                We look forward to hearing from you.
              </p>
              <meta itemProp="name" content="Kdadks Service Private Limited" />
              <meta itemProp="url" content="https://kdadks.com" />
              <meta itemProp="email" content="support@kdadks.com" />
              <meta itemProp="telephone" content="+91-7982303199" />
              <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                <meta itemProp="addressLocality" content="Lucknow" />
                <meta itemProp="addressRegion" content="Uttar Pradesh" />
                <meta itemProp="addressCountry" content="India" />
              </div>
            </div>

            <div className="space-y-6">
              {contactInfo.map((info) => {
                const Icon = info.icon
                return (
                  <div key={info.title} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-secondary-900 mb-1">
                        {info.title}
                      </h4>
                      <p className="text-secondary-800 font-medium mb-1">
                        {info.details}
                      </p>
                      <p className="text-secondary-600 text-sm">
                        {info.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Interactive Google Map */}
            <div className="rounded-lg overflow-hidden shadow-lg border border-gray-200" itemScope itemType="https://schema.org/Place">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d227749.21470693277!2d80.77769745!3d26.8466777!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399bfd991f32b16b%3A0x93ccba8909978be7!2sLucknow%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1697808000000!5m2!1sen!2sin"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="KDADKS Location - Lucknow, Uttar Pradesh"
                className="w-full h-64 md:h-80"
                aria-label="Interactive map showing Kdadks location in Lucknow, Uttar Pradesh"
              />
              <meta itemProp="name" content="Kdadks Service Private Limited Office" />
              <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                <meta itemProp="addressLocality" content="Lucknow" />
                <meta itemProp="addressRegion" content="Uttar Pradesh" />
                <meta itemProp="addressCountry" content="India" />
              </div>
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-primary-600" />
                    <span className="font-medium text-secondary-900">Lucknow, Uttar Pradesh, India</span>
                  </div>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Lucknow,Uttar+Pradesh,India"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    Get Directions
                  </a>
                </div>
                <p className="text-sm text-secondary-600 mt-2">
                  Contact us at +91 7982303199 for specific location details and directions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
