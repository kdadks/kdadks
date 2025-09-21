import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, Clock, CheckCircle } from 'lucide-react'
import { ContactFormData } from '../config/brevo'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Validate form data
      if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
        throw new Error('Please fill in all required fields.')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address.')
      }

      let success = false;
      let errorMessages = [];

      // Method 1: Try main website API first
      try {
        console.log('🔄 Attempting main website API...');
        const mainApiResponse = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'support@kdadks.com',
            from: formData.email.trim(),
            customerName: formData.name.trim(),
            subject: `Contact Form Submission from ${formData.name}`,
            text: `Contact Form Submission\n\nName: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\n\nMessage:\n${formData.message}`,
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
            `
          })
        });
        
        if (mainApiResponse.ok) {
          const result = await mainApiResponse.json();
          if (result.success) {
            console.log('✅ Main API success');
            success = true;
          }
        }
      } catch (e) {
        console.log('❌ Main API failed:', e instanceof Error ? e.message : 'Unknown error');
        errorMessages.push('Main API failed');
      }
      
      // Method 2: Formspree backup (guaranteed to work)
      if (!success) {
        try {
          console.log('🔄 Attempting Formspree backup...');
          const formspreeResponse = await fetch('https://formspree.io/f/xdkovnql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              subject: `KDADKS Contact: ${formData.name}`,
              message: `Contact Form Submission\n\nName: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\n\nMessage:\n${formData.message}\n\n---\nSent via contact form to support@kdadks.com`
            })
          });
          
          if (formspreeResponse.ok) {
            console.log('✅ Formspree backup success');
            success = true;
          }
        } catch (e) {
          console.log('❌ Formspree backup failed:', e instanceof Error ? e.message : 'Unknown error');
          errorMessages.push('Formspree backup failed');
        }
      }

      if (success) {
        console.log('✅ Contact form sent successfully');
        // Reset form and show success message
        setFormData({
          name: '',
          email: '',
          company: '',
          message: '',
        })
        setIsSubmitted(true)
        setTimeout(() => setIsSubmitted(false), 5000)
      } else {
        throw new Error(errorMessages.join(', ') || 'All email services failed');
      }

    } catch (error) {
      console.error('Contact form submission failed:', error);
      
      // Ultimate fallback - mailto
      const mailtoSubject = `Contact Form - ${formData.name}`;
      const mailtoBody = `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\n\nMessage:\n${formData.message}`;
      const mailtoUrl = `mailto:support@kdadks.com?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;
      
      setSubmitError(
        `Email delivery failed. Please use direct email: <a href="${mailtoUrl}" target="_blank" style="color: #3b82f6; text-decoration: underline; font-weight: bold;">📧 Click here to open your email client</a> or contact support@kdadks.com directly.`
      );
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
      link: 'mailto:support@kdadks.com',
    },
    {
      icon: Phone,
      title: 'Call Us',
      details: '+91-7982303199',
      link: 'tel:+91-7982303199',
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      details: 'Lucknow, Uttar Pradesh, India',
      link: '#',
    },
  ]

  const businessHours = [
    { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Saturday', hours: '10:00 AM - 4:00 PM' },
    { day: 'Sunday', hours: 'Closed' },
  ]

  return (
    <section id="contact" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Get In Touch</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ready to transform your business? Contact us today to discuss your requirements and get a customized solution.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Send us a message</h3>
            
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Message Sent Successfully!</h4>
                <p className="text-gray-600">Thank you for contacting us. We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your company name (optional)"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Tell us about your requirements..."
                  />
                </div>

                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p 
                      className="text-red-700 text-sm"
                      dangerouslySetInnerHTML={{ __html: submitError }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Contact Details */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Contact Information</h3>
              <div className="space-y-6">
                {contactInfo.map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <item.icon className="w-6 h-6 text-blue-600 mt-1" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">{item.title}</h4>
                      <a
                        href={item.link}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {item.details}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <Clock className="w-6 h-6 text-blue-600 mr-2" />
                Business Hours
              </h3>
              <div className="space-y-3">
                {businessHours.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">{item.day}</span>
                    <span className="text-gray-900 font-medium">{item.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">Why Choose KDADKS?</h4>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  24/7 Technical Support
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  Custom Solutions for Your Business
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  Competitive Pricing
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  Quick Response Time
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
