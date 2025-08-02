import jsPDF from 'jspdf';
import type { CompanySettings } from '../types/invoice';

export interface PDFBrandingOptions {
  headerImage?: string; // Base64 data URL
  footerImage?: string; // Base64 data URL
  logoImage?: string;   // Base64 data URL
}

export interface PDFDimensions {
  pageWidth: number;
  pageHeight: number;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
}

/**
 * Utility class for integrating branding images into PDF invoices
 */
export class PDFBrandingUtils {
  
  /**
   * Add header image to PDF with edge-to-edge stretching
   */
  static async addHeaderImage(
    pdf: jsPDF, 
    headerImageData: string, 
    dimensions: PDFDimensions
  ): Promise<number> {
    try {
      const { pageWidth } = dimensions;
      
      // Create image element to get natural dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = headerImageData;
      });
      
      // Calculate aspect ratio and scale to fit page width edge-to-edge
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const maxHeaderHeight = 30; // Increased for better proportion
      
      // Edge-to-edge width
      const headerWidth = pageWidth;
      let headerHeight = headerWidth / aspectRatio;
      
      // If height exceeds max, adjust proportionally but maintain edge-to-edge width
      if (headerHeight > maxHeaderHeight) {
        headerHeight = maxHeaderHeight;
      }
      
      // Position at very top, edge-to-edge
      const headerX = 0;
      const headerY = 0;
      
      // Add image to PDF with edge-to-edge positioning
      pdf.addImage(
        headerImageData, 
        'JPEG', 
        headerX, 
        headerY, 
        headerWidth, 
        headerHeight,
        undefined,
        'FAST'
      );
      
      // Return Y position for content to start after header
      return headerHeight + 5; // Small gap after header image
      
    } catch (error) {
      console.error('Failed to add header image:', error);
      return 15; // Return default top margin if image fails
    }
  }
  
  /**
   * Add footer image to PDF with edge-to-edge stretching
   */
  static async addFooterImage(
    pdf: jsPDF, 
    footerImageData: string, 
    dimensions: PDFDimensions
  ): Promise<number> {
    try {
      const { pageWidth, pageHeight } = dimensions;
      
      // Create image element to get natural dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = footerImageData;
      });
      
      // Calculate aspect ratio and scale to fit page width edge-to-edge
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const maxFooterHeight = 25; // Increased for better proportion
      
      // Edge-to-edge width
      const footerWidth = pageWidth;
      let footerHeight = footerWidth / aspectRatio;
      
      // If height exceeds max, adjust proportionally but maintain edge-to-edge width
      if (footerHeight > maxFooterHeight) {
        footerHeight = maxFooterHeight;
      }
      
      // Position at bottom edge-to-edge
      const footerX = 0;
      const footerY = pageHeight - footerHeight;
      
      // Add image to PDF with edge-to-edge positioning
      pdf.addImage(
        footerImageData, 
        'JPEG', 
        footerX, 
        footerY, 
        footerWidth, 
        footerHeight,
        undefined,
        'FAST'
      );
      
      // Return Y position where content should end (well above footer image)
      return footerY - 15; // Enough space for footer text above image
      
    } catch (error) {
      console.error('Failed to add footer image:', error);
      return dimensions.pageHeight - 20; // Return default bottom margin if image fails
    }
  }
  
  /**
   * Add logo image to PDF, typically in the header area
   */
  static async addLogoImage(
    pdf: jsPDF, 
    logoImageData: string, 
    dimensions: PDFDimensions,
    position: 'top-left' | 'top-right' | 'header' = 'top-right'
  ): Promise<void> {
    try {
      const { pageWidth, leftMargin, rightMargin } = dimensions;
      
      // Create image element to get natural dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoImageData;
      });
      
      // Calculate aspect ratio and optimal size
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const maxLogoSize = 20; // Reduced size for better positioning
      
      // Calculate dimensions maintaining aspect ratio
      let logoWidth, logoHeight;
      
      if (aspectRatio > 1) {
        // Landscape image
        logoWidth = maxLogoSize;
        logoHeight = maxLogoSize / aspectRatio;
      } else {
        // Portrait or square image
        logoHeight = maxLogoSize;
        logoWidth = maxLogoSize * aspectRatio;
      }
      
      // Position logo based on preference
      let logoX: number;
      let logoY: number;
      
      switch (position) {
        case 'top-left':
          logoX = leftMargin;
          logoY = 10;
          break;
        case 'top-right':
          logoX = rightMargin - logoWidth;
          logoY = 10;
          break;
        case 'header':
        default:
          logoX = rightMargin - logoWidth;
          logoY = 5;
          break;
      }
      
      // Add logo to PDF
      pdf.addImage(
        logoImageData, 
        'JPEG', 
        logoX, 
        logoY, 
        logoWidth, 
        logoHeight,
        undefined,
        'FAST'
      );
      
    } catch (error) {
      console.error('Failed to add logo image:', error);
      // Continue without logo if it fails
    }
  }
  
  /**
   * Apply branding to PDF document
   */
  static async applyBranding(
    pdf: jsPDF,
    companySettings: CompanySettings,
    dimensions: PDFDimensions
  ): Promise<{ contentStartY: number; contentEndY: number }> {
    let contentStartY = dimensions.topMargin;
    let contentEndY = dimensions.pageHeight - dimensions.bottomMargin;
    
    // First, add header image if available (this affects contentStartY)
    if (companySettings.header_image_data) {
      // Add header image in background first
      const headerEndY = await this.addHeaderImage(
        pdf, 
        companySettings.header_image_data, 
        dimensions
      );
      // For header with overlay text, we want the header image to start from top
      // but the content should start after we overlay the text
      contentStartY = Math.max(headerEndY - 20, 30); // Reserve space for text overlay
    }
    
    // Add footer image if available (this affects contentEndY)
    if (companySettings.footer_image_data) {
      contentEndY = await this.addFooterImage(
        pdf, 
        companySettings.footer_image_data, 
        dimensions
      );
    }
    
    // Add logo image if available (positioned to avoid text conflict)
    if (companySettings.logo_image_data) {
      await this.addLogoImage(
        pdf, 
        companySettings.logo_image_data, 
        dimensions,
        'top-right'
      );
    }
    
    // Ensure we have proper spacing for text content
    contentStartY = Math.max(contentStartY, 35); // Minimum space for header text
    contentEndY = Math.min(contentEndY, dimensions.pageHeight - 30); // Minimum space for footer
    
    return { contentStartY, contentEndY };
  }
  
  /**
   * Get standard PDF dimensions for A4 paper
   */
  static getStandardDimensions(): PDFDimensions {
    return {
      pageWidth: 210,
      pageHeight: 297,
      leftMargin: 15,
      rightMargin: 195,
      topMargin: 15,
      bottomMargin: 20
    };
  }
  
  /**
   * Optimize image data for PDF inclusion
   */
  static optimizeImageForPDF(imageData: string, maxSize: number = 200): string {
    try {
      // If image is already optimized or small enough, return as-is
      const imageSizeKB = Math.ceil((imageData.length * 3) / 4 / 1024);
      
      if (imageSizeKB <= maxSize) {
        return imageData;
      }
      
      // For oversized images, we'll return the original and let the PDF library handle it
      // In a production environment, you might want to implement server-side optimization
      console.warn(`Image size ${imageSizeKB}KB exceeds recommended ${maxSize}KB`);
      return imageData;
      
    } catch (error) {
      console.error('Image optimization failed:', error);
      return imageData;
    }
  }
  
  /**
   * Check if branding images are available in company settings
   */
  static hasBrandingImages(companySettings: CompanySettings): boolean {
    return !!(
      companySettings.header_image_data || 
      companySettings.footer_image_data || 
      companySettings.logo_image_data
    );
  }
  
  /**
   * Create branded header section with text overlay on header image
   */
  static createBrandedHeader(
    pdf: jsPDF,
    companySettings: CompanySettings,
    invoiceNumber: string,
    invoiceDate: string,
    dueDate: string,
    dimensions: PDFDimensions,
    startY: number
  ): number {
    const { pageWidth, leftMargin, rightMargin } = dimensions;
    
    // If we have a header image, position text overlay ON TOP of the image
    if (companySettings.header_image_data) {
      // Position text overlay at the top of the page (on top of header image)
      const textY = 5; // Position near top of page, over the header image
      
      // Invoice title on left side - white text for visibility over image
      pdf.setTextColor(255, 255, 255); // White color for visibility over header image
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE', leftMargin, textY + 12);
      
      // Invoice details on right side - properly aligned in white
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255); // White color for visibility
      pdf.text(`#${invoiceNumber}`, rightMargin, textY + 8, { align: 'right' });
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255); // White color for all text
      pdf.text(`Date: ${invoiceDate}`, rightMargin, textY + 15, { align: 'right' });
      pdf.text(`Due: ${dueDate}`, rightMargin, textY + 21, { align: 'right' });
      
      // Return position below both header image and text overlay
      return startY; // Use the startY provided by applyBranding
    } else {
      // Use standard header if no header image
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, startY, pageWidth, 25, 'F');
      
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice', leftMargin, startY + 12);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Invoice #${invoiceNumber}`, rightMargin, startY + 12, { align: 'right' });
      
      pdf.setFontSize(8);
      pdf.text(`Date: ${invoiceDate}`, rightMargin, startY + 18, { align: 'right' });
      pdf.text(`Due: ${dueDate}`, rightMargin, startY + 22, { align: 'right' });
      
      return startY + 30;
    }
  }
}

export default PDFBrandingUtils;
