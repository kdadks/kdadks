import React from 'react'
import { RotateCcw, DollarSign, Calendar, AlertTriangle, ArrowLeft } from 'lucide-react'

const CancellationRefund = () => {
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
            <RotateCcw className="w-12 h-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-secondary-900">Cancellation & Refund Policy</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our cancellation and refund policy for all services across Kdadks Service Private Limited brands. 
            Please review the specific terms for each service type.
          </p>
          <p className="text-sm text-gray-500 mt-2">Last updated: December 2024</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <div className="space-y-8">
            {/* General Policy */}
            <section>
              <div className="flex items-center mb-4">
                <DollarSign className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">General Refund Policy</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>
                  We are committed to customer satisfaction. Our refund policy varies by service type 
                  and is designed to be fair to both customers and our business operations.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <p className="text-blue-800 font-medium">
                    Refund processing time: 5-7 business days after approval
                  </p>
                </div>
              </div>
            </section>

            {/* Service-Specific Policies */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Service-Specific Policies</h2>
              
              {/* IT Wala */}
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-blue-900 mb-4">IT Wala - IT Consulting & Training</h3>
                  <div className="space-y-3 text-blue-800">
                    <div>
                      <h4 className="font-semibold">Digital Courses & Materials:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>7-day refund period from purchase date</li>
                        <li>No refund after course completion ({'>'}80% progress)</li>
                        <li>Technical issues: Full refund available</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Live Training Sessions:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>24-hour cancellation notice required</li>
                        <li>Rescheduling available once without charges</li>
                        <li>Emergency cancellations: Case-by-case basis</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Consulting Services:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>48-hour cancellation notice required</li>
                        <li>50% refund if cancelled within 24 hours</li>
                        <li>No refund for no-shows</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Ayuh Clinic */}
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-red-900 mb-4">Ayuh Clinic - Healthcare Services</h3>
                  <div className="space-y-3 text-red-800">
                    <div>
                      <h4 className="font-semibold">Consultations:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>4-hour advance cancellation required</li>
                        <li>Full refund for cancellations {'>'}4 hours before appointment</li>
                        <li>50% refund for cancellations 2-4 hours before</li>
                        <li>No refund for cancellations {'<'}2 hours or no-shows</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Health Packages:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>24-hour cancellation notice required</li>
                        <li>Rescheduling preferred over refunds</li>
                        <li>Partial services completed: Prorated refund</li>
                      </ul>
                    </div>
                    <div className="bg-red-100 p-3 rounded border-l-4 border-red-400">
                      <p className="text-red-900 text-sm font-medium">
                        Emergency medical situations: Special consideration given
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nirchal */}
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-purple-900 mb-4">Nirchal - Fashion & Tailoring</h3>
                  <div className="space-y-3 text-purple-800">
                    <div>
                      <h4 className="font-semibold">Custom Clothing:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>Cancellation allowed before cutting/stitching begins</li>
                        <li>80% refund if cancelled before material cutting</li>
                        <li>No refund once stitching begins</li>
                        <li>Size/fit issues: Free alterations within 15 days</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Ready-made Items:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>7-day return period</li>
                        <li>Items must be unused with tags</li>
                        <li>Exchange preferred over refund</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Styling Consultations:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>24-hour cancellation notice required</li>
                        <li>Rescheduling available twice</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Raahirides */}
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-orange-900 mb-4">Raahirides - Travel Solutions</h3>
                  <div className="space-y-3 text-orange-800">
                    <div>
                      <h4 className="font-semibold">Transportation Services:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>2-hour advance cancellation for local rides</li>
                        <li>24-hour advance cancellation for outstation</li>
                        <li>Full refund for timely cancellations</li>
                        <li>Driver allocation: 50% refund if cancelled after</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Travel Packages:</h4>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        <li>Cancellation charges based on booking date</li>
                        <li>{'>'}30 days: 10% cancellation charges</li>
                        <li>15-30 days: 25% cancellation charges</li>
                        <li>7-15 days: 50% cancellation charges</li>
                        <li>{'<'}7 days: 75% cancellation charges</li>
                      </ul>
                    </div>
                    <div className="bg-orange-100 p-3 rounded border-l-4 border-orange-400">
                      <p className="text-orange-900 text-sm font-medium">
                        Force majeure events: Full refund or credit note offered
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Refund Process */}
            <section>
              <div className="flex items-center mb-4">
                <Calendar className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Refund Process</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>To request a refund:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>Contact us via email or phone with your booking/order details</li>
                  <li>Provide reason for cancellation/refund request</li>
                  <li>Submit any required documentation</li>
                  <li>Await confirmation and refund processing</li>
                </ol>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Required Information:</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Order/Booking ID</li>
                    <li>Service type and date</li>
                    <li>Reason for cancellation</li>
                    <li>Preferred refund method</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Non-Refundable Items */}
            <section>
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Non-Refundable Services</h2>
              </div>
              <div className="text-gray-700">
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                  <p className="text-red-800 mb-2 font-medium">The following are generally non-refundable:</p>
                  <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                    <li>Completed digital course downloads</li>
                    <li>Services already rendered</li>
                    <li>Custom products after production begins</li>
                    <li>No-show appointments</li>
                    <li>Third-party bookings (hotels, flights) - subject to vendor policies</li>
                    <li>Emergency or last-minute cancellations</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Special Circumstances */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Special Circumstances</h2>
              <div className="text-gray-700 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Medical Emergencies</h3>
                    <p className="text-green-800 text-sm">
                      Full refund considered with medical documentation for any service cancellation.
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Technical Issues</h3>
                    <p className="text-blue-800 text-sm">
                      Full refund or service credit if our technical problems prevent service delivery.
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 mb-2">Natural Disasters</h3>
                    <p className="text-yellow-800 text-sm">
                      Full refund or rescheduling without penalty for force majeure events.
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">Service Quality Issues</h3>
                    <p className="text-purple-800 text-sm">
                      Partial or full refund after investigation if service doesn't meet promised standards.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Refund Support</h2>
              <div className="text-gray-700 space-y-2">
                <p>For cancellation and refund requests:</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> kdadks@outlook.com</p>
                  <p><strong>Phone:</strong> +91 7982303199</p>
                  <p><strong>Address:</strong> Lucknow, Uttar Pradesh, India</p>
                  <p><strong>Support Hours:</strong> Monday to Saturday, 9 AM to 6 PM</p>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Please allow 24-48 hours for response to refund requests. Complex cases may require additional time for review.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CancellationRefund