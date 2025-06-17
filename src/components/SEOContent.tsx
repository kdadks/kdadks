import React from 'react';

const SEOContent = () => {
  return (
    <div className="sr-only" aria-hidden="true">
      {/* Hidden SEO content for search engines */}
      <article itemScope itemType="https://schema.org/Article">
        <h1 itemProp="headline">
          Kdadks Service Private Limited: Leading Multi-Industry Excellence in India
        </h1>
        
        <div itemProp="articleBody">
          <p>
            <strong>Kdadks Service Private Limited</strong> stands as a premier multi-industry 
            company in India, delivering exceptional services across IT consulting, healthcare, 
            fashion, and travel sectors. Based in Lucknow, Uttar Pradesh, we have established 
            ourselves as a trusted partner for businesses and individuals seeking professional 
            excellence.
          </p>
          
          <h2>Our Comprehensive Service Portfolio</h2>
          
          <h3>IT Consulting and Training (IT Wala)</h3>
          <p>
            Our IT division specializes in cutting-edge technology solutions including:
            AI Product Management, AI Program Management, Software Testing, AI/ML DevOps, 
            Prompt Engineering, Agentic AI, and comprehensive development training. We provide 
            both consulting services and educational programs to empower individuals and 
            organizations in the digital age.
          </p>
          
          <h3>Healthcare Services (Ayuh Clinic)</h3>
          <p>
            Ayuh Clinic offers comprehensive healthcare solutions with a focus on homeopathic 
            treatments, specialized medical care, health checkups, homecare services, wellness 
            programs, and telemedicine. Our experienced medical professionals are committed to 
            providing quality healthcare services to the community.
          </p>
          
          <h3>Fashion and Tailoring (Nirchal)</h3>
          <p>
            Nirchal represents our commitment to style and quality in fashion. We offer custom 
            tailoring services, readymade fashion collections, quality fabric selection, and 
            style consultation. Our designers create garments that reflect individual personality 
            and contemporary fashion trends.
          </p>
          
          <h3>Travel Solutions (Raahirides)</h3>
          <p>
            Raahirides provides comprehensive travel services including point-to-point transportation, 
            package tours, corporate travel arrangements, business retreats, Eastern UP travel 
            solutions, and spiritual tours. We ensure memorable and seamless travel experiences 
            for all our clients.
          </p>
          
          <h2>Why Choose Kdadks Service Private Limited?</h2>
          
          <ul>
            <li><strong>Multi-Industry Expertise:</strong> Unique advantage of diverse service portfolio</li>
            <li><strong>Local Presence:</strong> Based in Lucknow with deep understanding of regional needs</li>
            <li><strong>Quality Assurance:</strong> Commitment to excellence across all service verticals</li>
            <li><strong>Professional Team:</strong> Experienced professionals in each industry segment</li>
            <li><strong>Customer-Centric Approach:</strong> Tailored solutions for individual and business needs</li>
            <li><strong>Innovation Focus:</strong> Continuous adoption of latest technologies and trends</li>
          </ul>
          
          <h2>Service Areas and Locations</h2>
          <p>
            While headquartered in Lucknow, Uttar Pradesh, our services extend across India. 
            We serve clients in major cities and provide remote consulting and training services 
            nationwide. Our IT training programs are available online, making quality education 
            accessible to learners everywhere.
          </p>
          
          <h2>Industry Recognition and Achievements</h2>
          <p>
            With over 5 years of experience and 100+ success stories, Kdadks Service Private 
            Limited has earned recognition for its commitment to quality and innovation. Our 
            four distinct brands - IT Wala, Ayuh Clinic, Nirchal, and Raahirides - each maintain 
            leadership positions in their respective markets.
          </p>
          
          <h2>Contact Information</h2>
          <address itemScope itemType="https://schema.org/PostalAddress">
            <strong>Kdadks Service Private Limited</strong><br />
            <span itemProp="addressLocality">Lucknow</span>, 
            <span itemProp="addressRegion">Uttar Pradesh</span>, 
            <span itemProp="addressCountry">India</span><br />
            Phone: <span itemProp="telephone">+91 7982303199</span><br />
            Email: <span itemProp="email">kdadks@outlook.com</span>
          </address>
        </div>
        
        <meta itemProp="author" content="Kdadks Service Private Limited" />
        <meta itemProp="datePublished" content="2025-01-17" />
        <meta itemProp="dateModified" content="2025-01-17" />
        <meta itemProp="publisher" content="Kdadks Service Private Limited" />
      </article>
      
      {/* FAQ Schema for SEO */}
      <div itemScope itemType="https://schema.org/FAQPage">
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
          <h3 itemProp="name">What services does Kdadks Service Private Limited offer?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <div itemProp="text">
              Kdadks offers comprehensive services across four main areas: IT consulting and training 
              through IT Wala, healthcare services via Ayuh Clinic, fashion and tailoring through 
              Nirchal, and travel solutions with Raahirides.
            </div>
          </div>
        </div>
        
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
          <h3 itemProp="name">Where is Kdadks Service Private Limited located?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <div itemProp="text">
              Kdadks is headquartered in Lucknow, Uttar Pradesh, India, and serves clients 
              across the country with both in-person and remote services.
            </div>
          </div>
        </div>
        
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
          <h3 itemProp="name">How can I contact Kdadks for services?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <div itemProp="text">
              You can contact Kdadks by phone at +91 7982303199, email at kdadks@outlook.com, 
              or through the contact form on our website.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SEOContent;