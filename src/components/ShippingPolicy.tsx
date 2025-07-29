import React from 'react'
import { Truck, Package, MapPin, ArrowLeft } from 'lucide-react'

const ShippingPolicy = () => {
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
            <Truck className="w-12 h-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-secondary-900">Shipping Policy</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our shipping and delivery policy for physical products and services across 
            Kdadks Service Private Limited brands.
          </p>
          <p className="text-sm text-gray-500 mt-2">Last updated: May 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <div className="space-y-8">
            {/* Service-Based Delivery */}
            <section>
              <div className="flex items-center mb-4">
                <Package className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Service Delivery Overview</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <p>
                  Most of our services are delivered digitally or through in-person consultations. 
                  However, some brands may involve physical product delivery:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">IT Wala</h3>
                    <p className="text-blue-800 text-sm">Digital delivery for courses, software, and training materials</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2">Ayuh Clinic</h3>
                    <p className="text-red-800 text-sm">In-person consultations, prescriptions may require pickup</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">Nirchal</h3>
                    <p className="text-purple-800 text-sm">Custom clothing delivery, fabric samples shipping</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">Raahirides</h3>
                    <p className="text-orange-800 text-sm">Transportation services, Tours & travels</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Physical Product Shipping */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Physical Product Shipping</h2>
              <div className="text-gray-700 space-y-4">
                <p>For services that involve physical product delivery (primarily Nirchal fashion items):</p>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Shipping Methods</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="font-medium">Standard Delivery</span>
                      <span className="text-gray-600">5-7 business days</span>
                    </div>
                    
                  </div>
                </div>
              </div>
            </section>

            {/* Delivery Areas */}
            <section>
              <div className="flex items-center mb-4">
                <MapPin className="w-6 h-6 text-primary-600 mr-2" />
                <h2 className="text-2xl font-semibold text-secondary-900">Delivery Areas</h2>
              </div>
              <div className="text-gray-700 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  
       
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">Pan India</h3>
                    <ul className="text-purple-800 text-sm space-y-1">
                      <li>• 5-7 business days</li>
                      <li>• Shipping charges apply</li>
                      <li>• Tracking provided</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            

            

            {/* Order Tracking */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Order Tracking</h2>
              <div className="text-gray-700 space-y-4">
                <p>Track your orders through:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Email notifications with tracking numbers</li>
                  <li>SMS updates for delivery status</li>
                  <li>Direct contact with our customer service</li>
                  <li>Courier partner tracking systems</li>
                </ul>
              </div>
            </section>

            {/* Special Circumstances */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Special Circumstances</h2>
              <div className="text-gray-700 space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                  <h3 className="font-semibold text-yellow-900 mb-2">Delays</h3>
                  <p className="text-yellow-800 text-sm">
                    Delivery may be delayed due to weather conditions, festivals, strikes, 
                    or other unforeseen circumstances. We will notify you of any significant delays.
                  </p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                  <h3 className="font-semibold text-red-900 mb-2">Failed Delivery</h3>
                  <p className="text-red-800 text-sm">
                    If delivery fails due to incorrect address or unavailability, 
                    additional charges may apply for re-delivery attempts.
                  </p>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-4">Shipping Support</h2>
              <div className="text-gray-700 space-y-2">
                <p>For shipping-related queries, contact us:</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> kdadks@outlook.com</p>
                  <p><strong>Phone:</strong> +91 7982303199</p>
                  <p><strong>Address:</strong> Lucknow, Uttar Pradesh, India</p>
                  <p><strong>Support Hours:</strong> Monday to Saturday, 9 AM to 6 PM</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShippingPolicy