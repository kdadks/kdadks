import React from 'react'
import { Shield, Lock, Eye, Users, ArrowLeft } from 'lucide-react'

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container-custom">
        {/* Back Button */}
        <div className="mb-8">
          <a
            href="#"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </a>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-secondary-900">Privacy Policy</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your privacy is important to us. This policy outlines how Kdadks Service Private Limited 
            collects, uses, and protects your personal information.
          </p>
          <p className="text-sm text-gray-500 mt-2">Last updated: December 2024</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <div className="space-y-8">
            {/* Information We Collect */}
            <section>
              <div className="flex items-center mb-4">
                <Eye className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Information We Collect</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>We collect information you provide directly to us, such as:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Personal identification information (name, email address, phone number)</li>
                  <li>Business information for our IT consulting and training services</li>
                  <li>Health information for Ayuh Clinic services (with explicit consent)</li>
                  <li>Travel preferences for Raahirides services</li>
                  <li>Fashion preferences for Nirchal services</li>
                  <li>Payment information for transaction processing</li>
                </ul>
              </div>
            </section>

            {/* How We Use Information */}
            <section>
              <div className="flex items-center mb-4">
                <Users className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">How We Use Your Information</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide, maintain, and improve our services across all brands</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices, updates, and support messages</li>
                  <li>Respond to your comments, questions, and customer service requests</li>
                  <li>Communicate with you about products, services, and events</li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                </ul>
              </div>
            </section>

            {/* Information Sharing */}
            <section>
              <div className="flex items-center mb-4">
                <Lock className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Information Sharing and Disclosure</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>We may share your information in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>With your consent or at your direction</li>
                  <li>With service providers who perform services on our behalf</li>
                  <li>To comply with legal obligations or protect rights and safety</li>
                  <li>In connection with business transfers or corporate transactions</li>
                </ul>
                <p className="font-medium">We do not sell your personal information to third parties.</p>
              </div>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Data Security</h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  We implement appropriate technical and organizational measures to protect your personal 
                  information against unauthorized access, alteration, disclosure, or destruction.
                </p>
                <p>
                  However, no method of transmission over the internet or electronic storage is 100% secure, 
                  so we cannot guarantee absolute security.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Your Rights</h2>
              <div className="text-gray-700 space-y-4">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access and update your personal information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to processing of your personal information</li>
                  <li>Request data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Contact Us</h2>
              <div className="text-gray-700 space-y-2">
                <p>If you have any questions about this Privacy Policy, please contact us:</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> kdadks@outlook.com</p>
                  <p><strong>Phone:</strong> +91 7982303199</p>
                  <p><strong>Address:</strong> Lucknow, Uttar Pradesh, India</p>
                </div>
              </div>
            </section>

            {/* Updates */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Policy Updates</h2>
              <div className="text-gray-700">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes 
                  by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy