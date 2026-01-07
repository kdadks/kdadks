/**
 * Contract PDF Generator
 * Generates professional multi-page contract PDFs with header/footer on each page
 */

import jsPDF from 'jspdf';
import { PDFBrandingUtils, PDFDimensions } from './pdfBrandingUtils';
import type { ContractWithDetails, ContractPDFOptions } from '../types/contract';
import type { CompanySettings } from '../types/invoice';

export class ContractPDFGenerator {
  
  private pdf: jsPDF;
  private dimensions: PDFDimensions;
  private contract: ContractWithDetails;
  private company: CompanySettings;
  private options: ContractPDFOptions;
  private currentY: number;
  private pageNumber: number;
  private contentStartY: number;
  private contentEndY: number;

  constructor(
    contract: ContractWithDetails,
    company: CompanySettings,
    options: Partial<ContractPDFOptions> = {}
  ) {
    this.contract = contract;
    this.company = company;
    this.options = {
      includePageNumbers: true,
      includeTableOfContents: false,
      includeSignatureBlocks: true,
      includeMilestones: true,
      ...options
    };

    this.pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    this.dimensions = PDFBrandingUtils.getStandardDimensions();
    this.currentY = this.dimensions.topMargin;
    this.pageNumber = 1;
    this.contentStartY = this.dimensions.topMargin;
    this.contentEndY = this.pdf.internal.pageSize.getHeight() - this.dimensions.bottomMargin;
  }

  /**
   * Generate the complete contract PDF
   */
  async generate(): Promise<jsPDF> {
    // Apply branding to first page
    await this.applyPageBranding();

    // Add contract header
    this.addContractHeader();

    // Add parties information
    this.addPartiesSection();

    // Add table of contents if enabled
    if (this.options.includeTableOfContents && this.contract.sections.length > 3) {
      this.addTableOfContents();
    }

    // Add all sections
    for (const section of this.contract.sections) {
      this.addSection(section);
    }

    // Add milestones if applicable
    if (this.options.includeMilestones && this.contract.milestones && this.contract.milestones.length > 0) {
      this.addMilestonesSection();
    }

    // Add signature blocks
    if (this.options.includeSignatureBlocks) {
      this.addSignatureBlocks();
    }

    // Apply branding and page numbers to all pages
    await this.finalizeDocument();

    return this.pdf;
  }

  /**
   * Apply header and footer branding to current page
   */
  private async applyPageBranding(): Promise<void> {
    const { contentStartY, contentEndY } = await PDFBrandingUtils.applyBranding(
      this.pdf,
      this.company,
      this.dimensions
    );

    this.contentStartY = contentStartY;
    this.contentEndY = contentEndY;
    this.currentY = this.contentStartY;
  }

  /**
   * Check if we need a new page
   */
  private async checkPageBreak(spaceNeeded: number, forceBreak: boolean = false): Promise<void> {
    if (forceBreak || this.currentY + spaceNeeded > this.contentEndY) {
      this.addPage();
      await this.applyPageBranding();
    }
  }

  /**
   * Add a new page
   */
  private addPage(): void {
    this.pdf.addPage();
    this.pageNumber++;
    this.currentY = this.contentStartY;
  }

  /**
   * Add contract header (title, number, dates)
   */
  private addContractHeader(): void {
    const { leftMargin, rightMargin } = this.dimensions;
    const pageWidth = this.pdf.internal.pageSize.getWidth();

    // Add watermark if specified
    if (this.options.watermark) {
      this.pdf.setTextColor(200, 200, 200);
      this.pdf.setFontSize(60);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(
        this.options.watermark,
        pageWidth / 2,
        this.pdf.internal.pageSize.getHeight() / 2,
        { 
          align: 'center',
          angle: 45
        }
      );
    }

    // Reset colors
    this.pdf.setTextColor(0, 0, 0);

    // Contract Title
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.contract.contract_title, pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    // Contract Type
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(80, 80, 80);
    this.pdf.text(`[${this.contract.contract_type}]`, pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 10;

    // Contract Details Box
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.setFillColor(248, 248, 248);
    this.pdf.rect(leftMargin, this.currentY, rightMargin - leftMargin, 25, 'F');
    this.pdf.setLineWidth(0.2);
    this.pdf.rect(leftMargin, this.currentY, rightMargin - leftMargin, 25);

    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');

    let detailsY = this.currentY + 6;
    const col1X = leftMargin + 5;
    const col2X = leftMargin + 100;

    // Left column
    this.pdf.text('Contract Number:', col1X, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(this.contract.contract_number, col1X + 35, detailsY);

    this.pdf.setFont('helvetica', 'bold');
    detailsY += 6;
    this.pdf.text('Contract Date:', col1X, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(new Date(this.contract.contract_date).toLocaleDateString('en-GB'), col1X + 35, detailsY);

    this.pdf.setFont('helvetica', 'bold');
    detailsY += 6;
    this.pdf.text('Effective Date:', col1X, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(new Date(this.contract.effective_date).toLocaleDateString('en-GB'), col1X + 35, detailsY);

    // Right column
    detailsY = this.currentY + 6;
    if (this.contract.expiry_date) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Expiry Date:', col2X, detailsY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(new Date(this.contract.expiry_date).toLocaleDateString('en-GB'), col2X + 25, detailsY);
      detailsY += 6;
    }

    if (this.contract.contract_value) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Contract Value:', col2X, detailsY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(
        `${this.contract.currency_code} ${this.contract.contract_value.toLocaleString('en-IN')}`,
        col2X + 30,
        detailsY
      );
    }

    this.currentY += 32;
  }

  /**
   * Add parties information
   */
  private addPartiesSection(): void {
    const { leftMargin, rightMargin } = this.dimensions;
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    const columnWidth = (rightMargin - leftMargin - 10) / 2;

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('CONTRACT PARTIES', pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    // Draw line
    this.pdf.setLineWidth(0.5);
    this.pdf.line(leftMargin, this.currentY, rightMargin, this.currentY);
    this.currentY += 8;

    const partyBY = this.currentY;

    // Party A (Left Column)
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(37, 99, 235);
    this.pdf.text('PARTY A:', leftMargin, this.currentY);
    
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.currentY += 6;
    this.pdf.text(this.contract.party_a_name, leftMargin, this.currentY);
    this.currentY += 5;

    this.pdf.setFont('helvetica', 'normal');
    if (this.contract.party_a_address) {
      const addressLines = this.pdf.splitTextToSize(this.contract.party_a_address, columnWidth);
      addressLines.forEach((line: string) => {
        this.pdf.text(line, leftMargin, this.currentY);
        this.currentY += 4;
      });
    }
    
    if (this.contract.party_a_gstin) {
      this.currentY += 2;
      this.pdf.text(`GSTIN: ${this.contract.party_a_gstin}`, leftMargin, this.currentY);
      this.currentY += 4;
    }
    
    if (this.contract.party_a_contact) {
      this.pdf.text(`Contact: ${this.contract.party_a_contact}`, leftMargin, this.currentY);
      this.currentY += 4;
    }

    const partyAEndY = this.currentY;

    // Party B (Right Column)
    this.currentY = partyBY;
    const col2X = leftMargin + columnWidth + 10;

    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(37, 99, 235);
    this.pdf.text('PARTY B:', col2X, this.currentY);
    
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.currentY += 6;
    this.pdf.text(this.contract.party_b_name, col2X, this.currentY);
    this.currentY += 5;

    this.pdf.setFont('helvetica', 'normal');
    if (this.contract.party_b_address) {
      const addressLines = this.pdf.splitTextToSize(this.contract.party_b_address, columnWidth);
      addressLines.forEach((line: string) => {
        this.pdf.text(line, col2X, this.currentY);
        this.currentY += 4;
      });
    }
    
    if (this.contract.party_b_gstin) {
      this.currentY += 2;
      this.pdf.text(`GSTIN: ${this.contract.party_b_gstin}`, col2X, this.currentY);
      this.currentY += 4;
    }
    
    if (this.contract.party_b_contact) {
      this.pdf.text(`Contact: ${this.contract.party_b_contact}`, col2X, this.currentY);
      this.currentY += 4;
    }

    // Set currentY to the maximum of both columns
    this.currentY = Math.max(partyAEndY, this.currentY);
    this.currentY += 5;

    // Draw line
    this.pdf.setLineWidth(0.5);
    this.pdf.line(leftMargin, this.currentY, rightMargin, this.currentY);
    this.currentY += 10;
  }

  /**
   * Add table of contents
   */
  private addTableOfContents(): void {
    const { leftMargin } = this.dimensions;

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TABLE OF CONTENTS', leftMargin, this.currentY);
    this.currentY += 8;

    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');

    this.contract.sections.forEach((section) => {
      const sectionLine = `${section.section_number}. ${section.section_title}`;
      this.pdf.text(sectionLine, leftMargin + 5, this.currentY);
      this.currentY += 5;
    });

    this.currentY += 5;
  }

  /**
   * Add a contract section
   */
  private async addSection(section: typeof this.contract.sections[0]): Promise<void> {
    const { leftMargin, rightMargin } = this.dimensions;
    const contentWidth = rightMargin - leftMargin;

    // Force page break if specified
    if (section.page_break_before) {
      await this.checkPageBreak(0, true);
    } else {
      await this.checkPageBreak(20);
    }

    // Section number and title
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(37, 99, 235);
    this.pdf.text(`${section.section_number}. ${section.section_title}`, leftMargin, this.currentY);
    this.currentY += 7;

    // Section content
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(0, 0, 0);

    // Handle HTML or rich text content (basic parsing)
    const contentLines = this.parseAndSplitContent(section.section_content, contentWidth);

    for (const line of contentLines) {
      await this.checkPageBreak(5);
      this.pdf.text(line, leftMargin, this.currentY);
      this.currentY += 5;
    }

    this.currentY += 5;
  }

  /**
   * Parse HTML/rich text content and split into lines
   */
  private parseAndSplitContent(content: string, maxWidth: number): string[] {
    // Remove HTML tags (basic sanitization)
    const plainText = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // Split by newlines first
    const paragraphs = plainText.split('\n').filter(p => p.trim());
    
    const allLines: string[] = [];
    
    paragraphs.forEach(para => {
      const lines = this.pdf.splitTextToSize(para, maxWidth);
      allLines.push(...lines);
      allLines.push(''); // Add spacing between paragraphs
    });

    return allLines;
  }

  /**
   * Add milestones section
   */
  private async addMilestonesSection(): Promise<void> {
    if (!this.contract.milestones || this.contract.milestones.length === 0) return;

    const { leftMargin, rightMargin } = this.dimensions;
    const pageWidth = this.pdf.internal.pageSize.getWidth();

    await this.checkPageBreak(30);

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('PROJECT MILESTONES', pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    this.pdf.setLineWidth(0.5);
    this.pdf.line(leftMargin, this.currentY, rightMargin, this.currentY);
    this.currentY += 6;

    for (const milestone of this.contract.milestones) {
      await this.checkPageBreak(25);

      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(37, 99, 235);
      this.pdf.text(`Milestone ${milestone.milestone_number}: ${milestone.milestone_title}`, leftMargin, this.currentY);
      this.currentY += 6;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(0, 0, 0);

      if (milestone.description) {
        const descLines = this.pdf.splitTextToSize(milestone.description, rightMargin - leftMargin);
        descLines.forEach((line: string) => {
          this.pdf.text(line, leftMargin + 5, this.currentY);
          this.currentY += 4;
        });
      }

      if (milestone.deliverables) {
        this.currentY += 2;
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Deliverables:', leftMargin + 5, this.currentY);
        this.pdf.setFont('helvetica', 'normal');
        this.currentY += 4;
        const delivLines = this.pdf.splitTextToSize(milestone.deliverables, rightMargin - leftMargin - 10);
        delivLines.forEach((line: string) => {
          this.pdf.text(line, leftMargin + 10, this.currentY);
          this.currentY += 4;
        });
      }

      const infoY = this.currentY + 2;
      if (milestone.due_date) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Due Date:', leftMargin + 5, infoY);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(new Date(milestone.due_date).toLocaleDateString('en-GB'), leftMargin + 25, infoY);
      }

      if (milestone.payment_amount) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Payment:', leftMargin + 70, infoY);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(`${this.contract.currency_code} ${milestone.payment_amount.toLocaleString('en-IN')}`, leftMargin + 90, infoY);
      }

      this.currentY = infoY + 6;
    }
  }

  /**
   * Add signature blocks
   */
  private async addSignatureBlocks(): Promise<void> {
    const { leftMargin, rightMargin } = this.dimensions;
    const columnWidth = (rightMargin - leftMargin - 10) / 2;

    await this.checkPageBreak(50);

    this.currentY += 10;

    // Signature title
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('AGREED AND ACCEPTED:', leftMargin, this.currentY);
    this.currentY += 15;

    const signatureY = this.currentY;

    // Party A signature (Left)
    this.pdf.setLineWidth(0.3);
    this.pdf.line(leftMargin, this.currentY, leftMargin + columnWidth - 10, this.currentY);
    this.currentY += 5;

    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Party A Signature', leftMargin, this.currentY);
    this.currentY += 5;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(this.contract.party_a_name, leftMargin, this.currentY);
    this.currentY += 4;

    this.pdf.text('Date: __________________', leftMargin, this.currentY);

    // Party B signature (Right)
    this.currentY = signatureY;
    const col2X = leftMargin + columnWidth + 10;

    this.pdf.setLineWidth(0.3);
    this.pdf.line(col2X, this.currentY, rightMargin, this.currentY);
    this.currentY += 5;

    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Party B Signature', col2X, this.currentY);
    this.currentY += 5;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(this.contract.party_b_name, col2X, this.currentY);
    this.currentY += 4;

    this.pdf.text('Date: __________________', col2X, this.currentY);

    this.currentY += 15;
  }

  /**
   * Finalize document - add page numbers and branding to all pages
   */
  private async finalizeDocument(): Promise<void> {
    const totalPages = this.pdf.getNumberOfPages();

    // Apply branding and page numbers to all pages
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);

      // Apply branding (header/footer) if not already applied
      if (i > 1) {
        await PDFBrandingUtils.applyBranding(this.pdf, this.company, this.dimensions);
      }

      // Add page numbers
      if (this.options.includePageNumbers) {
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(120, 120, 120);
        this.pdf.setFont('helvetica', 'normal');
        
        const pageText = `Page ${i} of ${totalPages}`;
        const pageWidth = this.pdf.internal.pageSize.getWidth();
        this.pdf.text(pageText, pageWidth / 2, this.contentEndY + 5, { align: 'center' });
      }

      // Add "Confidential" footer on each page
      if (i === totalPages) {
        this.pdf.setFontSize(7);
        this.pdf.setTextColor(150, 150, 150);
        this.pdf.setFont('helvetica', 'italic');
        const pageWidth = this.pdf.internal.pageSize.getWidth();
        this.pdf.text(
          'This contract is confidential and legally binding',
          pageWidth / 2,
          this.contentEndY + 8,
          { align: 'center' }
        );
      }
    }
  }
}

/**
 * Helper function to generate contract PDF
 */
export async function generateContractPDF(
  contract: ContractWithDetails,
  company: CompanySettings,
  options?: Partial<ContractPDFOptions>
): Promise<jsPDF> {
  const generator = new ContractPDFGenerator(contract, company, options);
  return await generator.generate();
}

export default { ContractPDFGenerator, generateContractPDF };
