import React from 'react'
import { Users, Award, Heart, Briefcase, GraduationCap } from 'lucide-react'

interface TeamMember {
  name: string
  role: string
  company?: string
  description: string
  experience: string
  specialties: string[]
  image?: string
  background: string
}

const Team = () => {
  const teamMembers: TeamMember[] = [
    {
      name: 'Deepti Sharma',
      role: 'Founder',
      description: 'Deepti Sharma is a seasoned Healthcare professional and visionary founder. Her career reflects a rare blend of clinical expertise, research leadership, and unwavering dedication to patient-centered care. Specializing in multispecialty clinical trials, Deepti has led complex studies across critical care disciplines including ICU, respiratory, nephrology, neurology, diabetes, and oncology.Her ability to balance scientific precision with compassionate care sets her apart as a visionary leader.',
      experience: '21 years',
      specialties: ['Clinical Research', 'Patient Care Management', 'ICU', 'Respiratory Care', 'Nephrology', 'Neurology', 'Diabetic Care', 'Oncology Research'],
      background: 'As a dual-registered nurse (India & Ireland), Deepti combines deep clinical knowledge with a strong commitment to patient safety, ethical research, and holistic care. Their background as a Retired Army Officer further reinforces their discipline, adaptability, and crisis management skills—key strengths in fast-paced medical environments.'
    },
    {
      name: 'Amit Ranjan',
      role: 'Chief Technology Officer',
      description: 'Amit Ranjan is a seasoned technology executive with over 25 years of experience leading transformative digital initiatives. A dynamic leader and strategic thinker, he brings a powerful blend of technical expertise and visionary leadership to our organization. Known for delivering scalable enterprise solutions, Amit has a strong track record in product management, enterprise development, and emerging technologies such as React and Artificial Intelligence.',
      experience: '25 years',
      specialties: ['Product Management', 'Enterprise Development', 'React', 'Artificial Intelligence', 'Team Leadership', 'Innovation Strategy'],
      background: 'Amit’s deep industry experience spans artificial intelligence, Salesforce ecosystems, and digital banking platforms. He possesses a keen ability to align technology with business strategy, driving measurable outcomes across sectors. His time with global enterprises has equipped him with the insights and adaptability to navigate complex environments and implement forward-thinking technology strategies..'
    },
    {
      name: 'Kumar Prateek Srivastav',
      role: 'Managing Director',
      company: 'RaahiRides',
      description: 'Kumar Prateek Srivastav has over 15 years of travel industry experience, leading a trusted government-authorized agency. He offers top travel advice, seamless bookings, and fleet management solutions, ensuring exceptional service for corporate travel and vacations.',
      experience: '15+ years',
      specialties: ['Travel Industry', 'Fleet Management', 'Corporate Travel', 'Government Authorization', 'Customer Service', 'Travel Consulting'],
      background: 'Leading a government-authorized travel agency, Kumar has built a reputation for reliability and excellence in the travel industry, specializing in both corporate and leisure travel solutions.'
    },
    {
      name: 'Deepika Ranjan',
      role: 'Managing Director',
      company: 'Nirchal',
      description: 'With over 10 years in the garment industry, Deepika founded her boutique to craft unique clothing that helps customers express their beauty. From custom dresses to tailored suits, her designs ensure clients feel confident and stylish, making her boutique a go-to destination for personalized clothing.',
      experience: '10+ years',
      specialties: ['Fashion Design', 'Custom Tailoring', 'Garment Industry', 'Boutique Management', 'Personal Styling', 'Client Consultation'],
      background: 'Deepika\'s passion for fashion and commitment to helping clients express their individual style has made her boutique a trusted destination for personalized, high-quality clothing solutions.'
    }
  ]

  const getIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'founder':
        return Award
      case 'chief technology officer':
        return Briefcase
      case 'managing director':
        return Users
      default:
        return GraduationCap
    }
  }

  return (
    <div id="team" className="py-20 bg-gradient-to-br from-secondary-50 to-white">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            <Users className="w-4 h-4 mr-2" />
            Our Leadership Team
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
            Meet Our Visionary Leaders
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Our diverse team brings together decades of experience across healthcare, technology, 
            travel, and fashion industries to deliver exceptional services.
          </p>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {teamMembers.map((member, index) => {
            const IconComponent = getIcon(member.role)
            return (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 group"
              >
                {/* Header */}
                <div className="flex items-start space-x-4 mb-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-secondary-900 mb-1">
                      {member.name}
                    </h3>
                    <p className="text-primary-600 font-semibold mb-1">
                      {member.role}
                    </p>
                    {member.company && (
                      <p className="text-secondary-500 text-sm">
                        {member.company}
                      </p>
                    )}
                    <div className="flex items-center mt-2">
                      <Award className="w-4 h-4 text-amber-500 mr-1" />
                      <span className="text-sm text-secondary-600 font-medium">
                        {member.experience} experience
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-secondary-700 leading-relaxed mb-6">
                  {member.description}
                </p>

                {/* Background */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-secondary-900 mb-2 uppercase tracking-wide">
                    Background
                  </h4>
                  <p className="text-secondary-600 text-sm leading-relaxed">
                    {member.background}
                  </p>
                </div>

                {/* Specialties */}
                <div>
                  <h4 className="text-sm font-semibold text-secondary-900 mb-3 uppercase tracking-wide">
                    Key Expertise
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {member.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium hover:bg-primary-100 hover:text-primary-700 transition-colors duration-200"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Team Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-secondary-900 mb-8">
            Our Collective Impact
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary-600">70+</div>
              <div className="text-secondary-600 font-medium">Years Combined Experience</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary-600">4</div>
              <div className="text-secondary-600 font-medium">Industry Verticals</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary-600">1000+</div>
              <div className="text-secondary-600 font-medium">Lives Impacted</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary-600">100%</div>
              <div className="text-secondary-600 font-medium">Commitment to Excellence</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Work With Our Expert Team?
            </h3>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Connect with our experienced leaders to explore how we can help transform your business 
              across healthcare, technology, travel, and fashion sectors.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-secondary-50 transition-colors duration-200"
            >
              <Heart className="w-5 h-5 mr-2" />
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Team