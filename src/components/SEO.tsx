import React, { useEffect } from 'react';
import { updateMetaTags, pageSEO, defaultSEO, SEOData } from '../utils/seo';

interface SEOProps {
  page?: keyof typeof pageSEO;
  customData?: Partial<SEOData>;
}

const SEO: React.FC<SEOProps> = ({ page = 'home', customData }) => {
  useEffect(() => {
    const seoData = page ? pageSEO[page] : defaultSEO;
    const finalSEOData = { ...seoData, ...customData };
    updateMetaTags(finalSEOData);
  }, [page, customData]);

  return null; // This component doesn't render anything
};

export default SEO;