import jsPDF from 'jspdf';
import type { Employee, SalarySlip } from '../types/employee';
import type { CompanySettings } from '../types/invoice';
import { PDFBrandingUtils } from './pdfBrandingUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function generateSalarySlipPDF(
  employee: Employee,
  salarySlip: SalarySlip,
  companySettings?: CompanySettings
): Promise<jsPDF> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const dimensions = PDFBrandingUtils.getStandardDimensions();

  let currentY = dimensions.topMargin;

  // Apply branding if available
  if (companySettings) {
    const brandingResult = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
    currentY = brandingResult.contentStartY;
  }

  // Document Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SALARY SLIP', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
  currentY += 10;

  // Month and Year
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const monthYear = `${MONTH_NAMES[salarySlip.salary_month - 1]} ${salarySlip.salary_year}`;
  pdf.text(monthYear, pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
  currentY += 10;

  // Financial Year
  pdf.setFontSize(9);
  pdf.text(`Financial Year: ${salarySlip.financial_year}`, pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
  currentY += 12;

  // Draw a line
  pdf.setLineWidth(0.5);
  pdf.line(dimensions.leftMargin, currentY, dimensions.rightMargin, currentY);
  currentY += 8;

  // Employee Information Section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EMPLOYEE INFORMATION', dimensions.leftMargin, currentY);
  currentY += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  const employeeInfo = [
    ['Employee Name:', employee.full_name, 'Employee No:', employee.employee_number],
    ['Designation:', employee.designation, 'Department:', employee.department || '-'],
    ['PAN:', employee.pan_number || '-', 'UAN:', employee.uan_number || '-'],
    ['Date of Joining:', new Date(employee.date_of_joining).toLocaleDateString('en-GB'), '', '']
  ];

  employeeInfo.forEach(([label1, value1, label2, value2]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label1, dimensions.leftMargin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value1, dimensions.leftMargin + 35, currentY);

    if (label2) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label2, dimensions.leftMargin + 105, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value2, dimensions.leftMargin + 140, currentY);
    }

    currentY += 5;
  });

  currentY += 3;

  // Attendance Information
  pdf.setFont('helvetica', 'bold');
  pdf.text('ATTENDANCE', dimensions.leftMargin, currentY);
  currentY += 6;

  pdf.setFont('helvetica', 'normal');
  const attendanceInfo = [
    ['Working Days:', salarySlip.working_days.toString(), 'Paid Days:', salarySlip.paid_days.toString()],
    ['LOP Days:', salarySlip.lop_days.toString(), 'Leaves Taken:', salarySlip.leaves_taken.toString()]
  ];

  attendanceInfo.forEach(([label1, value1, label2, value2]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label1, dimensions.leftMargin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value1, dimensions.leftMargin + 35, currentY);

    pdf.setFont('helvetica', 'bold');
    pdf.text(label2, dimensions.leftMargin + 105, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value2, dimensions.leftMargin + 140, currentY);

    currentY += 5;
  });

  currentY += 5;

  // Draw a line
  pdf.line(dimensions.leftMargin, currentY, dimensions.rightMargin, currentY);
  currentY += 8;

  // Earnings and Deductions Table
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');

  // Table Headers
  const col1X = dimensions.leftMargin;
  const col2X = dimensions.leftMargin + 70;
  const col3X = dimensions.leftMargin + 105;
  const col4X = dimensions.leftMargin + 175;

  pdf.text('EARNINGS', col1X, currentY);
  pdf.text('AMOUNT (₹)', col2X, currentY);
  pdf.text('DEDUCTIONS', col3X, currentY);
  pdf.text('AMOUNT (₹)', col4X, currentY);
  currentY += 2;

  // Underline headers
  pdf.setLineWidth(0.3);
  pdf.line(col1X, currentY, col2X + 25, currentY);
  pdf.line(col3X, currentY, col4X + 20, currentY);
  currentY += 5;

  // Earnings and Deductions Data
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  const earningsData = [
    ['Basic Salary', salarySlip.basic_salary],
    ['HRA', salarySlip.hra],
    ['Special Allowance', salarySlip.special_allowance],
    ['Transport Allowance', salarySlip.transport_allowance],
    ['Medical Allowance', salarySlip.medical_allowance],
    ['Other Allowances', salarySlip.other_allowances],
    ['Bonus', salarySlip.bonus],
    ['Overtime', salarySlip.overtime]
  ];

  const deductionsData = [
    ['Provident Fund', salarySlip.provident_fund],
    ['Professional Tax', salarySlip.professional_tax],
    ['ESIC', salarySlip.esic],
    ['TDS (Income Tax)', salarySlip.tds],
    ['Loan Repayment', salarySlip.loan_repayment],
    ['Other Deductions', salarySlip.other_deductions],
    ['', 0],
    ['', 0]
  ];

  const maxRows = Math.max(earningsData.length, deductionsData.length);

  for (let i = 0; i < maxRows; i++) {
    // Earnings
    if (i < earningsData.length && earningsData[i][1] > 0) {
      pdf.text(earningsData[i][0], col1X, currentY);
      pdf.text(earningsData[i][1].toLocaleString('en-IN'), col2X + 20, currentY, { align: 'right' });
    }

    // Deductions
    if (i < deductionsData.length && deductionsData[i][1] > 0) {
      pdf.text(deductionsData[i][0], col3X, currentY);
      pdf.text(deductionsData[i][1].toLocaleString('en-IN'), col4X + 15, currentY, { align: 'right' });
    }

    currentY += 5;
  }

  currentY += 2;

  // Draw line before totals
  pdf.setLineWidth(0.5);
  pdf.line(col1X, currentY, col2X + 25, currentY);
  pdf.line(col3X, currentY, col4X + 20, currentY);
  currentY += 5;

  // Totals
  pdf.setFont('helvetica', 'bold');
  pdf.text('GROSS SALARY', col1X, currentY);
  pdf.text(salarySlip.gross_salary.toLocaleString('en-IN'), col2X + 20, currentY, { align: 'right' });

  pdf.text('TOTAL DEDUCTIONS', col3X, currentY);
  pdf.text(salarySlip.total_deductions.toLocaleString('en-IN'), col4X + 15, currentY, { align: 'right' });
  currentY += 7;

  // Double line before net salary
  pdf.setLineWidth(0.8);
  pdf.line(dimensions.leftMargin, currentY, dimensions.rightMargin, currentY);
  currentY += 6;

  // Net Salary
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('NET SALARY PAYABLE', dimensions.leftMargin, currentY);
  pdf.text(`₹ ${salarySlip.net_salary.toLocaleString('en-IN')}`, dimensions.rightMargin, currentY, { align: 'right' });
  currentY += 6;

  pdf.setLineWidth(0.8);
  pdf.line(dimensions.leftMargin, currentY, dimensions.rightMargin, currentY);
  currentY += 10;

  // Net Salary in Words
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  const netInWords = numberToWords(salarySlip.net_salary);
  pdf.text(`In Words: ${netInWords} Rupees Only`, dimensions.leftMargin, currentY);
  currentY += 10;

  // Tax Information
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TAX INFORMATION', dimensions.leftMargin, currentY);
  currentY += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  const taxInfo = [
    ['Year-to-Date Gross Salary:', `₹${salarySlip.ytd_gross.toLocaleString('en-IN')}`],
    ['Year-to-Date TDS Deducted:', `₹${salarySlip.ytd_tds.toLocaleString('en-IN')}`],
    ['Projected Annual Income:', `₹${salarySlip.projected_annual_income.toLocaleString('en-IN')}`],
    ['Annual Tax Liability (Estimated):', `₹${salarySlip.annual_tax_liability.toLocaleString('en-IN')}`]
  ];

  taxInfo.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, dimensions.leftMargin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, dimensions.leftMargin + 75, currentY);
    currentY += 5;
  });

  currentY += 8;

  // Payment Information (if paid)
  if (salarySlip.status === 'paid' && salarySlip.payment_date) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT INFORMATION', dimensions.leftMargin, currentY);
    currentY += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Payment Date: ${new Date(salarySlip.payment_date).toLocaleDateString('en-GB')}`, dimensions.leftMargin, currentY);
    currentY += 5;

    if (salarySlip.payment_mode) {
      pdf.text(`Payment Mode: ${salarySlip.payment_mode}`, dimensions.leftMargin, currentY);
      currentY += 5;
    }

    if (salarySlip.payment_reference) {
      pdf.text(`Reference: ${salarySlip.payment_reference}`, dimensions.leftMargin, currentY);
      currentY += 5;
    }

    currentY += 5;
  }

  // Bank Details (if available)
  if (employee.bank_name) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('BANK DETAILS', dimensions.leftMargin, currentY);
    currentY += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Bank Name: ${employee.bank_name}`, dimensions.leftMargin, currentY);
    currentY += 5;

    if (employee.bank_account_number) {
      const maskedAccount = maskAccountNumber(employee.bank_account_number);
      pdf.text(`Account Number: ${maskedAccount}`, dimensions.leftMargin, currentY);
      currentY += 5;
    }

    if (employee.bank_ifsc_code) {
      pdf.text(`IFSC Code: ${employee.bank_ifsc_code}`, dimensions.leftMargin, currentY);
      currentY += 5;
    }

    currentY += 5;
  }

  // Footer Note
  currentY += 5;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('This is a computer-generated salary slip and does not require a signature.',
    pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
  currentY += 4;
  pdf.text('For any discrepancies, please contact the HR department.',
    pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  return pdf;
}

/**
 * Mask account number showing only last 4 digits
 */
function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  const lastFour = accountNumber.slice(-4);
  const masked = 'X'.repeat(accountNumber.length - 4);
  return masked + lastFour;
}

/**
 * Convert number to words (Indian numbering system)
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';

    if (n < 10) return ones[n];

    if (n < 20) return teens[n - 10];

    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    }

    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  if (num < 1000) {
    return convertLessThanThousand(num);
  }

  // Indian numbering system: ones, thousands, lakhs, crores
  let result = '';
  let crores = Math.floor(num / 10000000);
  num %= 10000000;

  let lakhs = Math.floor(num / 100000);
  num %= 100000;

  let thousands = Math.floor(num / 1000);
  num %= 1000;

  if (crores > 0) {
    result += convertLessThanThousand(crores) + ' Crore ';
  }

  if (lakhs > 0) {
    result += convertLessThanThousand(lakhs) + ' Lakh ';
  }

  if (thousands > 0) {
    result += convertLessThanThousand(thousands) + ' Thousand ';
  }

  if (num > 0) {
    result += convertLessThanThousand(num);
  }

  return result.trim();
}

export default { generateSalarySlipPDF };
