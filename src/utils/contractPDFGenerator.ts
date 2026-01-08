/**
 * Contract PDF Generator
 * Generates professional multi-page contract PDFs with header/footer on each page
 */

import jsPDF from 'jspdf';
import { PDFBrandingUtils, PDFDimensions } from './pdfBrandingUtils';
import { formatCurrencyWithSymbol } from './currencyConverter';
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
    // 5mm margins on left and right, minimal on top/bottom for header/footer
    this.dimensions.leftMargin = 5;
    this.dimensions.rightMargin = this.pdf.internal.pageSize.getWidth() - 5;
    this.dimensions.topMargin = 2;
    this.dimensions.bottomMargin = 2;
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

    // Add contract title (centered, bold)
    this.addContractTitle();

    // Add preamble if present (without heading)
    if (this.contract.preamble && this.contract.preamble.trim()) {
      await this.addPreambleContent();
    }

    // Table of contents disabled - sections render with their content

    // Add all sections (must await each one to maintain order)
    for (const section of this.contract.sections) {
      await this.addSection(section);
    }

    // Add milestones if applicable
    if (this.options.includeMilestones && this.contract.milestones && this.contract.milestones.length > 0) {
      await this.addMilestonesSection();
    }

    // Add notes before signature blocks
    if (this.contract.notes && this.contract.notes.trim()) {
      await this.addNotesSection();
    }

    // Add signature blocks (must be last)
    if (this.options.includeSignatureBlocks) {
      await this.addSignatureBlocks();
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
   * Add contract details overlay on header image (no title, no type)
   * Called after branding is applied so details appear on top of header image
   */
  private addContractHeader(): void {
    const { leftMargin, rightMargin } = this.dimensions;

    // Add contract details on header image (positioned at top of page, inside header)
    // Use fixed Y position within header image area (around 10mm from top)
    const headerDetailsY = 10; // Fixed position within header image
    
    this.pdf.setTextColor(255, 255, 255); // WHITE text on header image
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');

    // Left side details
    let detailsY = headerDetailsY;
    this.pdf.text(`Contract Number: ${this.contract.contract_number}`, leftMargin + 2, detailsY);
    detailsY += 5;
    this.pdf.text(`Contract Date: ${new Date(this.contract.contract_date).toLocaleDateString('en-GB')}`, leftMargin + 2, detailsY);
    detailsY += 5;
    this.pdf.text(`Effective Date: ${new Date(this.contract.effective_date).toLocaleDateString('en-GB')}`, leftMargin + 2, detailsY);

    // Right side details
    detailsY = headerDetailsY;
    if (this.contract.expiry_date) {
      this.pdf.text(`Expiry Date: ${new Date(this.contract.expiry_date).toLocaleDateString('en-GB')}`, rightMargin - 2, detailsY, { align: 'right' });
      detailsY += 5;
    }

    // Don't show contract value (hidden per request)
    // const formattedValue = formatCurrencyWithSymbol(this.contract.contract_value || 0, this.contract.currency_code || 'EUR');
    // this.pdf.text(`Contract Value: ${formattedValue}`, rightMargin - 2, detailsY, { align: 'right' });

    // Reset text color for content
    this.pdf.setTextColor(0, 0, 0);
  }

  /**
   * Add contract title (centered, after header)
   */
  private addContractTitle(): void {
    const { leftMargin, rightMargin } = this.dimensions;
    const pageWidth = this.pdf.internal.pageSize.getWidth();

    // Add space after header (6mm padding)
    this.currentY += 6;

    // Contract title - centered, bold, larger font
    this.pdf.setFontSize(15);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(this.contract.contract_title || 'CONTRACT', pageWidth / 2, this.currentY, { align: 'center' });
    
    // Add thin underline beneath title
    const textWidth = this.pdf.getTextWidth(this.contract.contract_title || 'CONTRACT');
    const underlineX = (pageWidth - textWidth) / 2;
    const underlineY = this.currentY + 1.5;
    this.pdf.setLineWidth(0.2);
    this.pdf.line(underlineX, underlineY, underlineX + textWidth, underlineY);
    
    this.currentY += 8;
  }

  /**
   * Add parties information
   */
  private addPartiesSection(): void {
    const { leftMargin, rightMargin } = this.dimensions;
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    const columnWidth = (rightMargin - leftMargin - 8) / 2;

    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('CONTRACT PARTIES', pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 6;

    // Draw line
    this.pdf.setLineWidth(0.3);
    this.pdf.line(leftMargin, this.currentY, rightMargin, this.currentY);
    this.currentY += 6;

    const partyBY = this.currentY;

    // Party A (Left Column)
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('PARTY A:', leftMargin, this.currentY);
    this.pdf.setFontSize(8.5);
    this.pdf.setFont('helvetica', 'bold');
    this.currentY += 5;
    this.pdf.text(this.contract.party_a_name, leftMargin, this.currentY);
    this.currentY += 4;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    if (this.contract.party_a_address) {
      const addressLines = this.pdf.splitTextToSize(this.contract.party_a_address, columnWidth);
      addressLines.forEach((line: string) => {
        this.pdf.text(line, leftMargin, this.currentY);
        this.currentY += 3.5;
      });
    }
    
    if (this.contract.party_a_gstin) {
      this.currentY += 1;
      this.pdf.text(`GSTIN: ${this.contract.party_a_gstin}`, leftMargin, this.currentY);
      this.currentY += 3.5;
    }
    
    if (this.contract.party_a_contact) {
      this.pdf.text(`Contact: ${this.contract.party_a_contact}`, leftMargin, this.currentY);
      this.currentY += 3.5;
    }

    const partyAEndY = this.currentY;

    // Party B (Right Column)
    this.currentY = partyBY;
    const col2X = leftMargin + columnWidth + 8;

    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('PARTY B:', col2X, this.currentY);
    this.pdf.setFontSize(8.5);
    this.pdf.setFont('helvetica', 'bold');
    this.currentY += 5;
    this.pdf.text(this.contract.party_b_name, col2X, this.currentY);
    this.currentY += 4;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    if (this.contract.party_b_address) {
      const addressLines = this.pdf.splitTextToSize(this.contract.party_b_address, columnWidth);
      addressLines.forEach((line: string) => {
        this.pdf.text(line, col2X, this.currentY);
        this.currentY += 3.5;
      });
    }
    
    if (this.contract.party_b_gstin) {
      this.currentY += 1;
      this.pdf.text(`GSTIN: ${this.contract.party_b_gstin}`, col2X, this.currentY);
      this.currentY += 3.5;
    }
    
    if (this.contract.party_b_contact) {
      this.pdf.text(`Contact: ${this.contract.party_b_contact}`, col2X, this.currentY);
      this.currentY += 3.5;
    }

    // Set currentY to the maximum of both columns
    this.currentY = Math.max(partyAEndY, this.currentY);
    this.currentY += 4;

    // Draw line
    this.pdf.setLineWidth(0.3);
    this.pdf.line(leftMargin, this.currentY, rightMargin, this.currentY);
    this.currentY += 6;
  }

  /**
   * Add preamble content (without heading)
   */
  private async addPreambleContent(): Promise<void> {
    const { leftMargin, rightMargin } = this.dimensions;
    const contentWidth = rightMargin - leftMargin;

    await this.checkPageBreak(15);

    // Render preamble content directly (no "PREAMBLE" heading, no separator lines)
    this.pdf.setFontSize(8.5);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(0, 0, 0);

    await this.renderSectionContent(this.contract.preamble || '', contentWidth, leftMargin);

    this.currentY += 6;
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
    const contentIndent = 5; // 5mm indentation for content

    // Force page break if specified
    if (section.page_break_before) {
      await this.checkPageBreak(0, true);
    } else {
      await this.checkPageBreak(15);
    }

    // Section number and title - more compact
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(`${section.section_number}. ${section.section_title}`, leftMargin, this.currentY);
    this.currentY += 5;

    // Section content (indented)
    this.pdf.setFontSize(8.5);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(0, 0, 0);

    // Render content with indentation (5mm from section title)
    await this.renderSectionContent(section.section_content, contentWidth - contentIndent, leftMargin + contentIndent);

    this.currentY += 2; // Reduced from 3
  }

  /**
   * Render section content with table support
   */
  private async renderSectionContent(content: string, maxWidth: number, leftMargin: number): Promise<void> {
    // If content is empty, don't render anything (section title is enough)
    if (!content || !content.trim()) {
      return;
    }

    // Check if content is HTML (from rich text editor)
    const isHTML = /<[a-z][\s\S]*>/i.test(content);
    
    if (isHTML) {
      // Handle HTML content from rich text editor
      await this.renderHTMLContent(content, maxWidth, leftMargin);
    } else {
      // Handle plain text with pipe-format tables (backward compatibility)
      await this.renderPlainTextContent(content, maxWidth, leftMargin);
    }
  }

  /**
   * Render HTML content from rich text editor
   */
  private async renderHTMLContent(htmlContent: string, maxWidth: number, leftMargin: number): Promise<void> {
    // Extract tables first
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let lastIndex = 0;
    let match;

    const parts: Array<{ type: 'text' | 'table', content: string }> = [];

    while ((match = tableRegex.exec(htmlContent)) !== null) {
      // Add text before table
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: htmlContent.substring(lastIndex, match.index)
        });
      }
      
      // Add table
      parts.push({
        type: 'table',
        content: match[0]
      });
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last table
    if (lastIndex < htmlContent.length) {
      parts.push({
        type: 'text',
        content: htmlContent.substring(lastIndex)
      });
    }

    // If no tables found, treat everything as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: htmlContent });
    }

    // Render each part
    for (const part of parts) {
      if (part.type === 'table') {
        await this.renderHTMLTable(part.content, maxWidth, leftMargin);
      } else {
        await this.renderPlainText(part.content, maxWidth, leftMargin);
      }
    }
  }

  /**
   * Render HTML table
   */
  private async renderHTMLTable(tableHTML: string, maxWidth: number, leftMargin: number): Promise<void> {
    // Parse table rows
    const rows: string[][] = [];
    
    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(tableHTML)) !== null) {
      const rowContent = rowMatch[1];
      const cells: string[] = [];
      
      // Extract cells (th or td)
      const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/(th|td)>/gi;
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const cellText = cellMatch[2]
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&ndash;/g, '–')
          .replace(/&mdash;/g, '—')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
          .trim();
        cells.push(cellText);
      }
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return;

    const numCols = rows[0].length;
    const colWidth = maxWidth / numCols;

    // Calculate row heights based on content
    const rowHeights: number[] = [];
    this.pdf.setFontSize(7.5);
    
    rows.forEach((row) => {
      let maxLines = 1;
      row.forEach((cell) => {
        const cellLines = this.pdf.splitTextToSize(cell, colWidth - 2);
        maxLines = Math.max(maxLines, cellLines.length);
      });
      rowHeights.push(Math.max(5, maxLines * 3.5 + 1.5)); // Dynamic height
    });

    const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);
    await this.checkPageBreak(totalHeight + 2);

    // Draw table
    this.pdf.setFontSize(7.5);
    
    rows.forEach((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      const rowHeight = rowHeights[rowIndex];
      
      // Draw row background for header
      if (isHeader) {
        this.pdf.setFillColor(220, 220, 220); // Slightly darker header background
        this.pdf.rect(leftMargin, this.currentY - 3.5, maxWidth, rowHeight, 'F');
      }
      
      // Draw cell borders and content
      row.forEach((cell, colIndex) => {
        const cellX = leftMargin + (colIndex * colWidth);
        
        // Draw cell borders
        this.pdf.setDrawColor(0, 0, 0);
        this.pdf.setLineWidth(0.1);
        this.pdf.rect(cellX, this.currentY - 3.5, colWidth, rowHeight);
        
        // Draw cell text with word wrap
        if (isHeader) {
          this.pdf.setFont('helvetica', 'bold');
        } else {
          this.pdf.setFont('helvetica', 'normal');
        }
        
        const cellLines = this.pdf.splitTextToSize(cell, colWidth - 2);
        cellLines.forEach((line: string, lineIndex: number) => {
          this.pdf.text(line, cellX + 1, this.currentY + (lineIndex * 3.5));
        });
      });
      
      this.currentY += rowHeight;
    });
    
    this.currentY += 1.5; // Reduced spacing after table
    this.pdf.setFontSize(8.5); // Reset font size
  }

  /**
   * Render plain text (HTML stripped)
   */
  private async renderPlainText(htmlOrText: string, maxWidth: number, leftMargin: number): Promise<void> {
    // Strip HTML tags and convert to plain text
    const plainText = htmlOrText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<(ol|ul)[^>]*>/gi, '\n')
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '$1')
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '$1')
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '$1')
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/\n\n+/g, '\n\n') // Reduce multiple blank lines to double
      .trim();

    if (!plainText) return;

    // Split by paragraphs
    const paragraphs = plainText.split('\n\n').filter(p => p.trim());
    
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const paragraph = paragraphs[pIdx];
      const lines = paragraph.split('\n').filter(l => l.trim());
      
      // Check if this paragraph contains only bullet points
      const isBulletParagraph = lines.every(l => l.trim().startsWith('•'));
      
      for (const line of lines) {
        const wrappedLines = this.pdf.splitTextToSize(line.trim(), maxWidth);
        for (const wrappedLine of wrappedLines) {
          await this.checkPageBreak(4);
          this.pdf.text(wrappedLine, leftMargin, this.currentY);
          // Uniform spacing: 4.2mm for all lines
          this.currentY += 4.2;
        }
      }
      
      // Only add extra spacing between paragraphs if not a bullet list, and not the last paragraph
      if (!isBulletParagraph && pIdx < paragraphs.length - 1) {
        this.currentY += 0.8;
      }
    }
  }

  /**
   * Render plain text content with pipe-format tables (backward compatibility)
   */
  private async renderPlainTextContent(content: string, maxWidth: number, leftMargin: number): Promise<void> {
    // Detect tables (simple pipe format)
    const lines = content.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Check if this is a table row (starts and ends with |)
      if (line.startsWith('|') && line.endsWith('|')) {
        // Found a table - collect all table rows
        const tableRows: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableRows.push(lines[i].trim());
          i++;
        }
        
        // Render the table
        await this.renderTable(tableRows, maxWidth, leftMargin);
      } else if (line) {
        // Regular text line
        const wrappedLines = this.pdf.splitTextToSize(line, maxWidth);
        for (const wrappedLine of wrappedLines) {
          await this.checkPageBreak(4);
          this.pdf.text(wrappedLine, leftMargin, this.currentY);
          this.currentY += 3.8;
        }
        i++;
      } else {
        // Empty line - add small gap
        this.currentY += 2;
        i++;
      }
    }
  }

  /**
   * Render a table from pipe-formatted rows
   */
  private async renderTable(rows: string[], maxWidth: number, leftMargin: number): Promise<void> {
    if (rows.length === 0) return;

    // Parse table structure
    const parsedRows = rows.map(row => 
      row.split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim())
    );

    // Skip separator rows (like |----|----|)
    const dataRows = parsedRows.filter(row => 
      !row.every(cell => /^-+$/.test(cell))
    );

    if (dataRows.length === 0) return;

    const numCols = dataRows[0].length;
    const colWidth = maxWidth / numCols;

    // Calculate row heights based on content
    const rowHeights: number[] = [];
    this.pdf.setFontSize(7.5);
    
    dataRows.forEach((row) => {
      let maxLines = 1;
      row.forEach((cell) => {
        const cellLines = this.pdf.splitTextToSize(cell, colWidth - 2);
        maxLines = Math.max(maxLines, cellLines.length);
      });
      rowHeights.push(Math.max(5, maxLines * 3.5 + 1.5));
    });

    const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);
    await this.checkPageBreak(totalHeight + 2);

    // Draw table
    this.pdf.setFontSize(7.5);
    
    dataRows.forEach((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      const rowHeight = rowHeights[rowIndex];
      
      // Draw row background for header
      if (isHeader) {
        this.pdf.setFillColor(240, 240, 240);
        this.pdf.rect(leftMargin, this.currentY - 3.5, maxWidth, rowHeight, 'F');
      }
      
      // Draw cell borders and content
      row.forEach((cell, colIndex) => {
        const cellX = leftMargin + (colIndex * colWidth);
        
        // No cell borders - removed for cleaner look
        
        // Draw cell text with word wrap
        if (isHeader) {
          this.pdf.setFont('helvetica', 'bold');
        } else {
          this.pdf.setFont('helvetica', 'normal');
        }
        
        const cellLines = this.pdf.splitTextToSize(cell, colWidth - 2);
        cellLines.forEach((line: string, lineIndex: number) => {
          this.pdf.text(line, cellX + 1, this.currentY + (lineIndex * 3.5));
        });
      });
      
      this.currentY += rowHeight;
    });
    
    this.currentY += 2;
    this.pdf.setFontSize(8.5); // Reset font size
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

    await this.checkPageBreak(20);

    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('PROJECT MILESTONES', pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 6;

    this.pdf.setLineWidth(0.3);
    this.pdf.line(leftMargin, this.currentY, rightMargin, this.currentY);
    this.currentY += 5;

    for (const milestone of this.contract.milestones) {
      await this.checkPageBreak(18);

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(0, 0, 0);
      this.pdf.text(`Milestone ${milestone.milestone_number}: ${milestone.milestone_title}`, leftMargin, this.currentY);
      this.currentY += 5;

      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(0, 0, 0);

      if (milestone.description) {
        const descLines = this.pdf.splitTextToSize(milestone.description, rightMargin - leftMargin);
        descLines.forEach((line: string) => {
          this.pdf.text(line, leftMargin + 3, this.currentY);
          this.currentY += 3.5;
        });
      }

      if (milestone.deliverables) {
        this.currentY += 1;
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Deliverables:', leftMargin + 3, this.currentY);
        this.pdf.setFont('helvetica', 'normal');
        this.currentY += 3.5;
        const delivLines = this.pdf.splitTextToSize(milestone.deliverables, rightMargin - leftMargin - 6);
        delivLines.forEach((line: string) => {
          this.pdf.text(line, leftMargin + 6, this.currentY);
          this.currentY += 3.5;
        });
      }

      const infoY = this.currentY + 1;
      if (milestone.due_date) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Due Date:', leftMargin + 3, infoY);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(new Date(milestone.due_date).toLocaleDateString('en-GB'), leftMargin + 20, infoY);
      }

      if (milestone.payment_amount) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Payment:', leftMargin + 60, infoY);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(`${this.contract.currency_code} ${milestone.payment_amount.toLocaleString('en-IN')}`, leftMargin + 75, infoY);
      }

      this.currentY = infoY + 5;
    }
  }

  /**
   * Add notes section before signature blocks
   */
  private async addNotesSection(): Promise<void> {
    const { leftMargin, rightMargin } = this.dimensions;
    const maxWidth = rightMargin - leftMargin;

    await this.checkPageBreak(20);

    this.currentY += 2;

    // Notes content (no "NOTES:" heading)
    if (this.contract.notes && this.contract.notes.trim()) {
      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      const noteLines = this.pdf.splitTextToSize(this.contract.notes, maxWidth - 4);
      
      for (const line of noteLines) {
        await this.checkPageBreak(4);
        this.pdf.text(line, leftMargin, this.currentY);
        this.currentY += 4.2;
      }
    }
  }

  /**
   * Add signature blocks
   */
  private async addSignatureBlocks(): Promise<void> {
    const { leftMargin, rightMargin } = this.dimensions;
    const columnWidth = (rightMargin - leftMargin - 10) / 2;

    await this.checkPageBreak(20);

    this.currentY += 10;

    // Signature blocks directly (no "AGREED AND ACCEPTED:" heading)
    const signatureY = this.currentY;

    // Party A signature (Left)
    this.pdf.setLineWidth(0.3);
    this.pdf.line(leftMargin, this.currentY, leftMargin + columnWidth - 10, this.currentY);
    this.currentY += 5;

    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Party A Signature', leftMargin, this.currentY);
    this.currentY += 4;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(7.5);
    this.pdf.text(this.contract.party_a_name, leftMargin, this.currentY);
    this.currentY += 3;
    
    if (this.contract.party_a_contact) {
      this.pdf.text(this.contract.party_a_contact, leftMargin, this.currentY);
      this.currentY += 3;
    }

    this.pdf.text('Date: __________________', leftMargin, this.currentY);

    // Party B signature (Right)
    this.currentY = signatureY;
    const col2X = leftMargin + columnWidth + 10;

    this.pdf.setLineWidth(0.3);
    this.pdf.line(col2X, this.currentY, rightMargin, this.currentY);
    this.currentY += 5;

    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Party B Signature', col2X, this.currentY);
    this.currentY += 4;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(7.5);
    this.pdf.text(this.contract.party_b_name, col2X, this.currentY);
    this.currentY += 3;
    
    if (this.contract.party_b_contact) {
      this.pdf.text(this.contract.party_b_contact, col2X, this.currentY);
      this.currentY += 3;
    }

    this.pdf.text('Date: __________________', col2X, this.currentY);

    this.currentY += 0;
  }

  /**
   * Finalize document - add page numbers and branding to all pages
   */
  private async finalizeDocument(): Promise<void> {
    const totalPages = this.pdf.getNumberOfPages();

    // Apply branding and page numbers to all pages
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);

      // Apply branding (header/footer) to all pages
      await PDFBrandingUtils.applyBranding(this.pdf, this.company, this.dimensions);

      // Add contract header details AFTER branding on page 1 (so it appears on top)
      if (i === 1) {
        this.addContractHeader();
      }

      // Add page numbers only if there are multiple pages
      if (this.options.includePageNumbers && totalPages > 1) {
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(120, 120, 120);
        this.pdf.setFont('helvetica', 'normal');
        
        const pageText = `Page ${i} of ${totalPages}`;
        const pageWidth = this.pdf.internal.pageSize.getWidth();
        this.pdf.text(pageText, pageWidth / 2, this.contentEndY + 12, { align: 'center' });
      }

      // Add "Confidential" footer on last page only
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
