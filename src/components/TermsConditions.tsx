import React from 'react'
import { FileText, AlertCircle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'

const TermsConditions = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container-custom">
        {/* Back Button */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </a>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-secondary-900">Terms & Conditions</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Please read these terms and conditions carefully before using our services across 
            all Kdadks Service Private Limited brands.
          </p>
          <p className="text-sm text-gray-500 mt-2">Last updated: December 2024</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <div className="space-y-8">
            {/* Acceptance of Terms */}
            <section>
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Acceptance of Terms</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>
                  By accessing and using the services provided by Kdadks Service Private Limited 
                  and its brands (IT Wala, Ayuh Clinic, Nirchal, Raahirides), you accept and agree 
                  to be bound by the terms and provision of this agreement.
                </p>
                <p>
                  If you do not agree to abide by the above, please do not use our services.
                </p>
              </div>
            </section>

            {/* Services Description */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Our Services</h2>
              <div className="text-gray-700 space-y-4">
                <p>Kdadks Service Private Limited operates through multiple brands:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">IT Wala</h3>
                    <p className="text-blue-800 text-sm">IT consulting, training, and educational services</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2">Ayuh Clinic</h3>
                    <p className="text-red-800 text-sm">Healthcare and medical consultation services</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">Nirchal</h3>
                    <p className="text-purple-800 text-sm">Fashion, tailoring, and style services</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">Raahirides</h3>
                    <p className="text-orange-800 text-sm">Travel solutions and transportation services</p>
                  </div>
                </div>
              </div>
            </section>

            {/* User Responsibilities */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">User Responsibilities</h2>
              <div className="text-gray-700 space-y-4">
                <p>As a user of our services, you agree to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Use our services only for lawful purposes</li>
                  <li>Respect intellectual property rights</li>
                  <li>Not interfere with or disrupt our services</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </div>
            </section>

            {/* Payment Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Payment Terms</h2>
              <div className="text-gray-700 space-y-4">
                <p>For paid services:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Payment is due according to the terms specified for each service</li>
                  <li>All prices are inclusive of applicable taxes unless stated otherwise</li>
                  <li>We reserve the right to change pricing with reasonable notice</li>
                  <li>Refunds are subject to our Cancellation & Refund Policy</li>
                  <li>Failure to pay may result in service suspension</li>
                </ul>
              </div>
            </section>

            {/* Service Availability */}
            <section>
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Service Availability</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>
                  We strive to maintain continuous service availability but cannot guarantee 
                  uninterrupted access due to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Scheduled maintenance and updates</li>
                  <li>Technical difficulties or system failures</li>
                  <li>Force majeure events</li>
                  <li>Third-party service dependencies</li>
                </ul>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Intellectual Property</h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  All content, trademarks, and intellectual property on our platforms belong to 
                  Kdadks Service Private Limited or our licensors. You may not:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Copy, modify, or distribute our content without permission</li>
                  <li>Use our trademarks or brand names without authorization</li>
                  <li>Reverse engineer or attempt to extract source code</li>
                  <li>Create derivative works based on our services</li>
                </ul>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <div className="flex items-center mb-4">
                <XCircle className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Limitation of Liability</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>
                  To the maximum extent permitted by law, Kdadks Service Private Limited shall not be 
                  liable for any indirect, incidental, special, consequential, or punitive damages.
                </p>
                <p>
                  Our total liability for any claim shall not exceed the amount paid by you for the 
                  specific service in question.
                </p>
              </div>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Termination</h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  We may terminate or suspend your access to our services immediately, without prior 
                  notice, for any reason including breach of these terms.
                </p>
                <p>
                  You may terminate your account at any time by contacting us or following the 
                  cancellation procedures for specific services.
                </p>
              </div>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Governing Law</h2>
              <div className="text-gray-700">
                <p>
                  These terms shall be governed by and construed in accordance with the laws of India. 
                  Any disputes shall be subject to the jurisdiction of courts in Lucknow, Uttar Pradesh.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Contact Us</h2>
              <div className="text-gray-700 space-y-2">
                <p>For questions about these Terms & Conditions, contact us:</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> kdadks@outlook.com</p>
                  <p><strong>Phone:</strong> +91 7982303199</p>
                  <p><strong>Address:</strong> Lucknow, Uttar Pradesh, India</p>
                </div>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Changes to Terms</h2>
              <div className="text-gray-700">
                <p>
                  We reserve the right to modify these terms at any time. Changes will be effective 
                  immediately upon posting. Your continued use of our services after changes constitutes 
                  acceptance of the new terms.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsConditions