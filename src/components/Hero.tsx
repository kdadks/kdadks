import React from 'react'
import { ArrowRight, Play, Star, Code, Users, Heart, Car } from 'lucide-react'

const Hero = () => {
  const brands = [
    { name: 'IT Wala', icon: Code, logo: '/IT - WALA_logo (1).png', color: 'text-blue-400' },
    { name: 'Ayuh Clinic', icon: Heart, logo: '/AYUH_Logo_2.png', color: 'text-red-400' },
    { name: 'Nirchal', icon: Users, logo: '/Nirchal_Logo.png', color: 'text-purple-400' },
    { name: 'Raahirides', icon: Car, logo: '/raahi_rides_logo.png', color: 'text-orange-400' },
  ]

  return (
    <section id="home" className="relative min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden pt-16 md:pt-20" role="banner" aria-label="Kdadks Service Private Limited Homepage Hero">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Primary gradient orb */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse"></div>
        {/* Secondary gradient orb */}
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse animate-delay-200"></div>
        {/* Central large orb */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        {/* Additional accent orbs */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-emerald-400/15 to-teal-400/15 rounded-full blur-2xl animate-pulse animate-delay-300"></div>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-orange-400/10 to-red-400/10 rounded-full blur-2xl animate-pulse animate-delay-100"></div>
      </div>

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-white animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up leading-tight">
              <span itemProp="name">Excellence Across</span>
              <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Multiple Industries
              </span>
            </h1>

            {/* Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6 animate-slide-up animate-delay-100 border border-blue-400/30">
              <Star className="w-4 h-4 mr-2 text-yellow-400" />
              <span className="text-blue-100">Trusted Multi-Industry Leader</span>
            </div>

            <p className="text-xl md:text-2xl text-slate-200 mb-8 leading-relaxed animate-slide-up animate-delay-200 max-w-2xl" itemProp="description">
              From cutting-edge IT solutions to compassionate healthcare, premium fashion, and seamless travel experiences - <strong>Kdadks Service delivers excellence across all sectors</strong>.
            </p>

            {/* Brand Pills */}
            <div className="flex flex-wrap gap-3 mb-8 animate-slide-up animate-delay-250">
              {brands.map((brand, index) => {
                const Icon = brand.icon
                const brandColors = {
                  'IT Wala': 'from-blue-500/20 to-cyan-500/20 border-blue-400/40',
                  'Ayuh Clinic': 'from-red-500/20 to-pink-500/20 border-red-400/40',
                  'Nirchal': 'from-purple-500/20 to-indigo-500/20 border-purple-400/40',
                  'Raahirides': 'from-orange-500/20 to-yellow-500/20 border-orange-400/40'
                }
                
                // Map brand names to service section IDs
                const getServiceId = (brandName: string) => {
                  switch(brandName) {
                    case 'IT Wala': return 'itwala-service';
                    case 'Ayuh Clinic': return 'ayuh-clinic-service';
                    case 'Nirchal': return 'nirchal-service';
                    case 'Raahirides': return 'raahirides-service';
                    default: return '';
                  }
                };
                
                return (
                  <button
                    key={brand.name}
                    onClick={() => {
                      const serviceId = getServiceId(brand.name);
                      const el = document.getElementById(serviceId);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 bg-gradient-to-r ${brandColors[brand.name as keyof typeof brandColors]} backdrop-blur-sm rounded-full text-sm font-medium border hover:scale-105 transition-transform duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50`}
                    aria-label={`View ${brand.name} services`}
                  >
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={`${brand.name} logo`}
                        className="w-4 h-4 object-contain"
                      />
                    ) : (
                      <Icon className={`w-4 h-4 ${brand.color}`} />
                    )}
                    <span className="text-white">{brand.name}</span>
                  </button>
                )
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-slide-up animate-delay-300" role="group" aria-label="Call to action buttons">
              <a
                href="#services"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent"
                aria-label="Explore our professional services across IT, healthcare, fashion, and travel"
              >
                Explore Our Services
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" aria-hidden="true" />
              </a>
              
              <a
                href="#about"
                className="group inline-flex items-center justify-center px-8 py-4 border-2 border-white/40 text-white font-semibold rounded-xl backdrop-blur-sm hover:bg-white/10 hover:border-white/60 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
                aria-label="Learn more about Kdadks Service Private Limited"
              >
                <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 animate-slide-up animate-delay-400" role="group" aria-label="Company statistics and achievements">
              <div className="text-center sm:text-left">
                <div className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent" aria-label="4 diverse brands">4</div>
                <div className="text-slate-300 text-sm font-medium">Diverse Brands</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent" aria-label="Over 100 success stories">100+</div>
                <div className="text-slate-300 text-sm font-medium">Success Stories</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" aria-label="Over 5 years of experience">5+</div>
                <div className="text-slate-300 text-sm font-medium">Years Experience</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative animate-fade-in animate-delay-200">
            <div className="relative">
              {/* Main Card - Modern glassmorphism design */}
              <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500 hover:shadow-blue-500/20">
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 shadow-xl border border-white/50">
                  {/* Header with Kdadks logo */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg p-1">
                        <img
                          src="/Logo.png"
                          alt="Kdadks Service Private Limited logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Kdadks</div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full shadow-sm"></div>
                      <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-sm"></div>
                      <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-pink-500 rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  
                  {/* Brand icons grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* ITwala clickable logo */}
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('itwala-service');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="flex items-center space-x-2 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      aria-label="Scroll to ITwala Service section"
                    >
                      <img
                        src="/IT - WALA_logo (1).png"
                        alt="IT Wala logo"
                        className="w-6 h-6 object-contain"
                      />
                      <div className="text-sm font-semibold text-blue-700">IT Wala</div>
                    </button>
                    {/* Ayuh Clinic clickable logo */}
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('ayuh-clinic-service');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="flex items-center space-x-2 p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-100 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                      aria-label="Scroll to Ayuh Clinic Service section"
                    >
                      <img
                        src="/AYUH_Logo_2.png"
                        alt="Ayuh Clinic logo"
                        className="w-6 h-6 object-contain"
                      />
                      <div className="text-sm font-semibold text-red-700">Ayuh Clinic</div>
                    </button>
                    {/* Nirchal clickable logo */}
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('nirchal-service');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="flex items-center space-x-2 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      aria-label="Scroll to Nirchal Service section"
                    >
                      <img
                        src="/Nirchal_Logo.png"
                        alt="Nirchal logo"
                        className="w-6 h-6 object-contain"
                      />
                      <div className="text-sm font-semibold text-purple-700">Nirchal</div>
                    </button>
                    {/* Raahirides clickable logo */}
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('raahirides-service');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="flex items-center space-x-2 p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border border-orange-100 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      aria-label="Scroll to Raahirides Service section"
                    >
                      <img
                        src="/raahi_rides_logo.png"
                        alt="Raahirides logo"
                        className="w-6 h-6 object-contain"
                      />
                      <div className="text-sm font-semibold text-orange-700">Raahirides</div>
                    </button>
                  </div>
                  
                  {/* Action button */}
                  <div className="w-full h-12 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <span className="text-white text-sm font-semibold group-hover:scale-105 transition-transform duration-200">Multi-Industry Excellence</span>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-xl animate-bounce-slow border-4 border-white/30">
                <Star className="w-10 h-10 text-white" />
              </div>
              
              <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-xl animate-pulse border-4 border-white/30"></div>
              
              {/* Additional floating elements */}
              <div className="absolute top-10 -left-4 w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full animate-pulse animate-delay-200 shadow-lg"></div>
              <div className="absolute -top-2 left-1/3 w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full animate-pulse animate-delay-400 shadow-lg"></div>
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
