import React from 'react'
import { ArrowRight, Play, Star, Code, Users, Heart, Car } from 'lucide-react'

const Hero = () => {
  const brands = [
    { name: 'IT Wala', icon: Code, logo: '/IT - WALA_logo (1).png', color: 'text-blue-400' },
    { name: 'Ayuh Clinic', icon: Heart, logo: '/AYUH_Logo_2.png', color: 'text-red-400' },
    { name: 'Nirchal', icon: Users, logo: '/Nirchal_Logo.png', color: 'text-purple-400' },
    { name: 'Raahirides', icon: Car, color: 'text-orange-400' },
  ]

  return (
    <section id="home" className="relative min-h-screen flex items-center bg-gradient-primary overflow-hidden pt-16 md:pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse animate-delay-200"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-white animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up">
              Excellence Across
              <span className="block text-accent-300">multiple Industries</span>
            </h1>

            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6 animate-slide-up animate-delay-100">
              <Star className="w-4 h-4 mr-2 text-yellow-400" />
              Trusted Multi-Industry Leader
            </div>

            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed animate-slide-up animate-delay-200">
              From cutting-edge IT solutions to compassionate healthcare, premium fashion, and seamless travel experiences - Kdadks Service delivers excellence across all sectors.
            </p>

            {/* Brand Pills */}
            <div className="flex flex-wrap gap-3 mb-8 animate-slide-up animate-delay-250">
              {brands.map((brand, index) => {
                const Icon = brand.icon
                return (
                  <div key={brand.name} className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={`${brand.name} logo`}
                        className="w-4 h-4 object-contain"
                      />
                    ) : (
                      <Icon className={`w-4 h-4 ${brand.color}`} />
                    )}
                    <span>{brand.name}</span>
                  </div>
                )
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-slide-up animate-delay-300">
              <a
                href="#services"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
              >
                Explore Our Services
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              
              <a
                href="#about"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
              >
                <Play className="mr-2 w-5 h-5" />
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 animate-slide-up animate-delay-400">
              <div>
                <div className="text-3xl font-bold mb-1">4</div>
                <div className="text-blue-200 text-sm">Diverse Brands</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">100+</div>
                <div className="text-blue-200 text-sm">Success Stories</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">5+</div>
                <div className="text-blue-200 text-sm">Years Experience</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative animate-fade-in animate-delay-200">
            <div className="relative">
              {/* Main Card - Updated to show multi-brand concept */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  {/* Header with Kdadks logo placeholder */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <div className="w-5 h-5 bg-primary-600 rounded"></div>
                      </div>
                      <div className="text-lg font-bold text-primary-600">Kdadks</div>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Brand icons grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <img
                        src="/IT - WALA_logo (1).png"
                        alt="IT Wala logo"
                        className="w-5 h-5 object-contain"
                      />
                      <div className="text-xs font-medium text-blue-800">IT Wala</div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                      <img
                        src="/AYUH_Logo_2.png"
                        alt="Ayuh Clinic logo"
                        className="w-5 h-5 object-contain"
                      />
                      <div className="text-xs font-medium text-red-800">Ayuh Clinic</div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                      <img
                        src="/Nirchal_Logo.png"
                        alt="Nirchal logo"
                        className="w-5 h-5 object-contain"
                      />
                      <div className="text-xs font-medium text-purple-800">Nirchal</div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
                      <Car className="w-5 h-5 text-orange-600" />
                      <div className="text-xs font-medium text-orange-800">Raahirides</div>
                    </div>
                  </div>
                  
                  {/* Action button */}
                  <div className="w-full h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Multi-Industry Excellence</span>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-accent-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                <Star className="w-8 h-8 text-white" />
              </div>
              
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-yellow-400 rounded-full shadow-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}

export default Hero