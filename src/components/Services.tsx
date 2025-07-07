import React from 'react'
import { Users, Car, Code, Award, LucideIcon } from 'lucide-react'

interface Service {
  icon?: LucideIcon;
  logo?: string;
  title: string;
  description: string;
  features: string[];
  url: string;
  theme: string;
}

const Services = () => {
  const services = [
    {
      logo: '/IT - WALA_logo (1).png',
      title: 'ITwala Product & Consulting',
      description: 'Professional consulting services for product management, software development, and digital transformation solutions.',
      features: ['Product Strategy', 'Technical Consulting', 'Digital Transformation','IT Staffing partner','Product Development','AI Solutions', 'Training & development'],
      url: 'https://it-wala.com/consulting', // updated URL for ITwala Product & Consulting
      theme: 'tech',
    },
    {
      logo: '/IT - WALA_logo (1).png',
      title: 'ITwala Academy',
      description: 'Comprehensive education in AI Product management, AI Program management, AI Software testing, AI/ML DevOps, Prompt Engineering, Agentic AI, AI development, and personality development.',
      features: ['AI Product Management Training', 'AI Program Management Training', 'AI Software Testing Courses', 'Prompt Engineering','Agentic AI Training', 'AI/ML DevOps Training', 'Development Bootcamps', 'Personality Development'],
      url: 'https://it-wala.com/academy', // updated URL for ITwala Academy
      theme: 'education',
    },
    {
      logo: '/Nirchal_Logo.png',
      title: 'Nirchal',
      description: 'High-quality, fashionable garments that cater to diverse clothing needs, whether readymade or custom tailored.',
      features: ['Custom Tailoring', 'Readymade Fashion', 'Quality Fabrics', 'Style Consultation'],
      url: 'https://nirchal.com/',
      theme: 'fashion',
    },
    {
      logo: '/raahi_rides_logo.png',
      title: 'RaahiRides',
      description: 'Seamless travel services including point-to-point journeys, package solutions, and corporate travel arrangements.',
      features: ['Point-to-Point Travel', 'Package Tours', 'Corporate Travel', 'Business Retreats', 'Eastern UP Travel Solutions', 'Spiritual Tours'],
      url: 'https://raahirides.com/',
      theme: 'travel',
    },
    {
      logo: '/AYUH_Logo_2.png',
      title: 'Ayuh Clinic',
      description: 'Comprehensive healthcare services with experienced medical professionals providing quality care.',
      features: ['Homeopathic Treatments', 'Specialized Treatments', 'Health Checkups', 'Homecare Services', 'Wellness Programs', 'Telemedicine'],
      url: 'https://www.ayuhclinic.com/',
      theme: 'healthcare',
    },
  ]

  const getCardStyles = (theme: string) => {
    const baseStyles = "card p-8 relative group transition-all duration-300 h-full flex flex-col";
    
    switch (theme) {
      case 'tech':
        return `${baseStyles} bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 hover:border-blue-300`;
      case 'education':
        return `${baseStyles} bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-100 hover:border-emerald-300`;
      case 'fashion':
        return `${baseStyles} bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-100 hover:border-pink-300`;
      case 'travel':
        return `${baseStyles} bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-100 hover:border-orange-300`;
      case 'healthcare':
        return `${baseStyles} bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-100 hover:border-red-300`;
      default:
        return baseStyles;
    }
  };

  const getIconStyles = (theme: string) => {
    const baseStyles = "w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300";
    
    switch (theme) {
      case 'tech':
        return `${baseStyles} bg-blue-100 group-hover:bg-blue-600`;
      case 'education':
        return `${baseStyles} bg-emerald-100 group-hover:bg-emerald-600`;
      case 'fashion':
        return `${baseStyles} bg-pink-100 group-hover:bg-pink-600`;
      case 'travel':
        return `${baseStyles} bg-orange-100 group-hover:bg-orange-600`;
      case 'healthcare':
        return `${baseStyles} bg-red-100 group-hover:bg-red-600`;
      default:
        return `${baseStyles} bg-primary-100 group-hover:bg-primary-600`;
    }
  };

  const getIconColorStyles = (theme: string) => {
    const baseStyles = "w-8 h-8 group-hover:text-white transition-colors duration-300";
    
    switch (theme) {
      case 'tech':
        return `${baseStyles} text-blue-600`;
      case 'education':
        return `${baseStyles} text-emerald-600`;
      case 'fashion':
        return `${baseStyles} text-pink-600`;
      case 'travel':
        return `${baseStyles} text-orange-600`;
      case 'healthcare':
        return `${baseStyles} text-red-600`;
      default:
        return `${baseStyles} text-primary-600`;
    }
  };

  const getButtonStyles = (theme: string) => {
    const baseStyles = "w-full font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 inline-block text-center";
    
    switch (theme) {
      case 'tech':
        return `${baseStyles} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`;
      case 'education':
        return `${baseStyles} bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500`;
      case 'fashion':
        return `${baseStyles} bg-pink-600 hover:bg-pink-700 text-white focus:ring-pink-500`;
      case 'travel':
        return `${baseStyles} bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500`;
      case 'healthcare':
        return `${baseStyles} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`;
      default:
        return `${baseStyles} btn-primary`;
    }
  };

  const getDotColor = (theme: string) => {
    switch (theme) {
      case 'tech':
        return "w-1.5 h-1.5 bg-blue-500 rounded-full mr-3";
      case 'education':
        return "w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3";
      case 'fashion':
        return "w-1.5 h-1.5 bg-pink-500 rounded-full mr-3";
      case 'travel':
        return "w-1.5 h-1.5 bg-orange-500 rounded-full mr-3";
      case 'healthcare':
        return "w-1.5 h-1.5 bg-red-500 rounded-full mr-3";
      default:
        return "w-1.5 h-1.5 bg-primary-500 rounded-full mr-3";
    }
  };

  return (
    <section id="services" className="section-padding bg-gradient-secondary" itemScope itemType="https://schema.org/Service" role="main" aria-labelledby="services-heading">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 id="services-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6" itemProp="name">
            <span className="block text-gradient">Our Services</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed" itemProp="description">
            Diverse solutions across <strong>IT consulting & education</strong>, <strong>healthcare</strong>, <strong>fashion</strong>, and <strong>travel</strong>.
            Excellence and innovation in every service we provide.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" role="list" aria-label="Our services">
          {services.map((service, index) => {
            // Add id to ITwala, Ayuh Clinic, Nirchal, and Raahirides service cards for scroll target
            const isITwala = service.title.toLowerCase().includes('itwala');
            const isAyuhClinic = service.title.toLowerCase().includes('ayuh clinic');
            const isNirchal = service.title.toLowerCase().includes('nirchal');
            const isRaahirides = service.title.toLowerCase().includes('raahi') || service.title.toLowerCase().includes('raahirides');
            return (
              <article
                key={service.title}
                className={getCardStyles(service.theme)}
                itemScope
                itemType="https://schema.org/Service"
                role="listitem"
                id={isITwala && index === 0 ? 'itwala-service' : isAyuhClinic ? 'ayuh-clinic-service' : isNirchal ? 'nirchal-service' : isRaahirides ? 'raahirides-service' : undefined}
              >
                {/* Icon or Logo */}
                <div className={getIconStyles(service.theme)}>
                  {service.logo ? (
                    <a
                      href={
                        isITwala && index === 0
                          ? '#itwala-service'
                          : isAyuhClinic
                          ? '#ayuh-clinic-service'
                          : isNirchal
                          ? '#nirchal-service'
                          : isRaahirides
                          ? '#raahirides-service'
                          : undefined
                      }
                      aria-label={`Go to ${service.title} card`}
                    >
                      <img
                        src={service.logo}
                        alt={`${service.title} logo`}
                        className="w-12 h-12 object-contain group-hover:scale-110 transition-all duration-300"
                      />
                    </a>
                  ) : null}
                </div>

                {/* Content */}
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-secondary-900 mb-4" itemProp="name">
                    {service.title}
                  </h3>
                  <p className="text-secondary-600 mb-6 leading-relaxed" itemProp="description">
                    {service.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2 mb-8">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-secondary-600">
                        <div className={getDotColor(service.theme)}></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button - Positioned at bottom */}
                <div className="mt-auto border-t border-gray-200 pt-6">
                  <a
                    href={service.url}
                    target={service.url.startsWith('http') ? '_blank' : '_self'}
                    rel={service.url.startsWith('http') ? 'noopener noreferrer' : ''}
                    className={getButtonStyles(service.theme)}
                  >
                    Get Started
                  </a>
                </div>
              </article>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 p-8 bg-white rounded-2xl shadow-lg">
          <h3 className="text-2xl font-bold text-secondary-900 mb-4">
            Looking for Specialized Services?
          </h3>
          <p className="text-secondary-600 mb-6 max-w-2xl mx-auto">
            Whether you need IT consulting, professional training, custom fashion, or travel solutions - we have the expertise to deliver exceptional results tailored to your needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact" className="btn-primary">
              Schedule Consultation
            </a>
            <a
              href="https://wa.me/917982303199?text=Hi%2C%20I%would%20like%20to%20know%20more%20about%20your%20services."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              Chat with Us
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Services
