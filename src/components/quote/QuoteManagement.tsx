import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  FileText,
  Download,
  Mail,
  ArrowLeft,
  RefreshCw,
  Trash2,
  X,
  Save,
  Copy,
  ArrowRightCircle,
  Clock,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import { quoteService } from '../../services/quoteService';
import { invoiceService } from '../../services/invoiceService';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ui/ConfirmDialog';
import { PDFBrandingUtils } from '../../utils/pdfBrandingUtils';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { CreateQuote } from './CreateQuote';
import { getTaxLabel, getTaxRegistrationLabel, getDefaultTaxRate, getClassificationCodeLabel } from '../../utils/taxUtils';
import type { 
  Quote, 
  QuoteFilters, 
  QuoteStats, 
  Customer, 
  Product,
  CreateQuoteData, 
  CreateQuoteItemData,
  QuoteSettings
} from '../../types/quote';
import type { CompanySettings, TermsTemplate } from '../../types/invoice';

interface QuoteManagementProps {
  onBackToDashboard?: () => void;
}

const QuoteManagement: React.FC<QuoteManagementProps> = ({ onBackToDashboard }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings[]>([]);
  const [quoteSettings, setQuoteSettings] = useState<QuoteSettings | null>(null);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [termsTemplates, setTermsTemplates] = useState<TermsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<QuoteFilters>({});
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quotes' | 'create-quote'>('dashboard');
  
  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteModalMode, setQuoteModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedDefaultProduct, setSelectedDefaultProduct] = useState<string>('');
  const [globalHsnCode, setGlobalHsnCode] = useState<string>('');
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [generatedQuoteNumber, setGeneratedQuoteNumber] = useState<string>('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
  const [quoteFormData, setQuoteFormData] = useState<CreateQuoteData>({
    customer_id: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    // Project details
    project_title: '',
    estimated_time: '',
    company_contact_name: '',
    company_contact_email: '',
    company_contact_phone: '',
    // Discount
    discount_type: undefined,
    discount_value: 0,
    // Additional info
    notes: '',
    terms_conditions: '',
    items: [{
      product_id: undefined,
      item_name: '',
      description: '',
      quantity: 1,
      unit: 'pcs',
      unit_price: 0,
      tax_rate: 18,
      hsn_code: undefined,
      billable_hours: undefined,
      resource_count: undefined,
      is_service_item: false
    }]
  });
  const [selectedTermsTemplateId, setSelectedTermsTemplateId] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);

  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  useEffect(() => {
    loadData();
  }, [currentPage, filters, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load company settings and quote settings
      try {
        const [companyData, quoteSettingsData] = await Promise.all([
          invoiceService.getCompanySettings(),
          quoteService.getQuoteSettings()
        ]);
        setCompanySettings(companyData);
        setQuoteSettings(quoteSettingsData);
      } catch (settingsError) {
        console.warn('Failed to load settings:', settingsError);
      }

      if (activeTab === 'dashboard') {
        const [quotesData, statsData, customersData] = await Promise.all([
          quoteService.getQuotes(filters, currentPage, 10),
          quoteService.getQuoteStats(),
          invoiceService.getCustomers({}, 1, 1000)
        ]);
        setQuotes(quotesData.data);
        setCustomers(customersData.data || []);
        setTotalPages(quotesData.total_pages);
        setStats(statsData);
      } else if (activeTab === 'quotes') {
        const [quotesData, customersData] = await Promise.all([
          quoteService.getQuotes(filters, currentPage, 20),
          invoiceService.getCustomers({}, 1, 1000)
        ]);
        setQuotes(quotesData.data);
        setCustomers(customersData.data || []);
        setTotalPages(quotesData.total_pages);
      } else if (activeTab === 'create-quote') {
        const [customersData, productsData, termsData] = await Promise.all([
          invoiceService.getCustomers({}, 1, 1000),
          invoiceService.getProducts({}, 1, 1000),
          invoiceService.getTermsTemplates()
        ]);
        
        setCustomers(customersData.data || []);
        setProducts(productsData.data || []);
        setTermsTemplates(termsData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openCreateQuoteTab = async () => {
    setActiveTab('create-quote');
    await loadData();
    
    let defaultTermsContent = '';
    let defaultTemplateId = '';
    try {
      const templates = await invoiceService.getTermsTemplates();
      setTermsTemplates(templates);
      
      const generalTemplate = templates.find(t => t.category === 'general' && t.is_default);
      if (generalTemplate) {
        defaultTermsContent = generalTemplate.content;
        defaultTemplateId = generalTemplate.id;
      }
    } catch (error) {
      console.error('Failed to load terms templates:', error);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (quoteSettings?.validity_days || 30));
    
    setSelectedDefaultProduct('');
    setGlobalHsnCode('');
    setSelectedTermsTemplateId(defaultTemplateId);
    
    try {
      const previewNumber = await quoteService.previewQuoteNumber();
      setGeneratedQuoteNumber(previewNumber);
    } catch (error) {
      console.error('Failed to preview quote number:', error);
      setGeneratedQuoteNumber('QT-PREVIEW');
    }
    
    setQuoteFormData({
      customer_id: '',
      quote_date: today,
      valid_until: validUntil.toISOString().split('T')[0],
      // Project details
      project_title: '',
      estimated_time: '',
      company_contact_name: '',
      company_contact_email: '',
      company_contact_phone: '',
      // Discount
      discount_type: undefined,
      discount_value: 0,
      // Additional info
      notes: quoteSettings?.notes || '',
      terms_conditions: defaultTermsContent,
      items: [{
        product_id: undefined,
        item_name: '',
        description: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 0,
        tax_rate: quoteSettings?.default_tax_rate || 18,
        hsn_code: undefined
      }]
    });
  };

  const closeQuoteModal = () => {
    setShowQuoteModal(false);
    setSelectedQuote(null);
    setSelectedDefaultProduct('');
    setSelectedTermsTemplateId('');
    setGeneratedQuoteNumber('');
    setShowQuotePreview(false);
    setModalLoading(false);
  };

  const handleQuoteFormChange = (field: keyof CreateQuoteData, value: string | CreateQuoteItemData[]) => {
    setQuoteFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuoteItemChange = (index: number, field: keyof CreateQuoteItemData, value: string | number | boolean | undefined) => {
    setQuoteFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const addQuoteItem = () => {
    const selectedCustomer = customers.find(c => c.id === quoteFormData.customer_id);
    const defaultTaxRate = getDefaultTaxRate(selectedCustomer);

    const newItem = {
      product_id: selectedDefaultProduct || undefined,
      item_name: '',
      description: '',
      quantity: 1,
      unit: 'pcs',
      unit_price: 0,
      tax_rate: defaultTaxRate,
      hsn_code: globalHsnCode || undefined,
      billable_hours: undefined,
      resource_count: undefined,
      is_service_item: false
    };

    setQuoteFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeQuoteItem = (index: number) => {
    if (quoteFormData.items.length > 1) {
      setQuoteFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateQuoteTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    quoteFormData.items.forEach(item => {
      let lineTotal = 0;

      // For service-based items: resource_count × quantity (months) × billable_hours × unit_price (rate/hour)
      if (item.is_service_item && item.billable_hours) {
        const resourceCount = item.resource_count || 1;
        lineTotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
      } else {
        // For product-based items: quantity × unit_price
        lineTotal = item.quantity * item.unit_price;
      }

      const taxAmount = (lineTotal * item.tax_rate) / 100;
      subtotal += lineTotal;
      totalTax += taxAmount;
    });

    // Calculate discount
    let discountAmount = 0;
    if (quoteFormData.discount_type && quoteFormData.discount_value) {
      const discountValue = Number(quoteFormData.discount_value);
      if (quoteFormData.discount_type === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }

    // Recalculate tax on discounted subtotal
    const discountedSubtotal = subtotal - discountAmount;
    const averageTaxRate = totalTax > 0 && subtotal > 0 ? (totalTax / subtotal) * 100 : 0;
    const adjustedTaxAmount = (discountedSubtotal * averageTaxRate) / 100;

    return {
      subtotal,
      discountAmount,
      taxAmount: adjustedTaxAmount,
      total: discountedSubtotal + adjustedTaxAmount
    };
  };

  const getCurrencyInfo = (customer: Customer | undefined) => {
    const customerCountry = customer?.country;

    if (customerCountry && customerCountry.currency_symbol && customerCountry.currency_code) {
      return {
        symbol: customerCountry.currency_symbol,
        name: customerCountry.currency_name || 'Currency',
        code: customerCountry.currency_code
      };
    }
    
    return {
      symbol: '₹',
      name: 'Rupees',
      code: 'INR'
    };
  };

  const formatCurrencyAmount = (amount: number, currencyInfo: { symbol: string; code: string }) => {
    const roundedAmount = Math.round(amount * 100) / 100;
    const formattedNumber = roundedAmount.toFixed(2);
    return currencyInfo.symbol + ' ' + formattedNumber;
  };

  // Number to words for amount
  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (n: number): string => {
      let result = '';
      
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result;
      }
      
      if (n > 0) {
        result += ones[n] + ' ';
      }
      
      return result;
    };

    const crores = Math.floor(num / 10000000);
    num %= 10000000;
    const lakhs = Math.floor(num / 100000);
    num %= 100000;
    const thousands = Math.floor(num / 1000);
    num %= 1000;
    const hundreds = num;

    let result = '';
    if (crores > 0) result += convertHundreds(crores) + ' Crore ';
    if (lakhs > 0) result += convertHundreds(lakhs) + ' Lakh ';
    if (thousands > 0) result += convertHundreds(thousands) + ' Thousand ';
    if (hundreds > 0) result += convertHundreds(hundreds);

    return result.trim();
  };

  const formatAmountInWords = (amount: number, currencyName: string = 'Rupees'): string => {
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    
    // Determine decimal unit based on currency
    const decimalUnit = currencyName.toLowerCase().includes('rupee') ? 'Paise' : 'Cents';
    
    let result = numberToWords(integerPart).trim() + ' ' + currencyName;
    if (decimalPart > 0) {
      result += ' and ' + numberToWords(decimalPart).trim() + ' ' + decimalUnit;
    }
    result += ' Only';
    return result.replace(/\s+/g, ' ').trim();
  };

  const handleDefaultProductChange = (productId: string) => {
    setSelectedDefaultProduct(productId);
    
    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product) {
        const hsnCode = product.hsn_code || '';
        setGlobalHsnCode(hsnCode);
        
        const updatedItems = quoteFormData.items.map(item => ({
          ...item,
          product_id: product.id,
          hsn_code: hsnCode
        }));
        
        setQuoteFormData(prev => ({
          ...prev,
          items: updatedItems
        }));
      }
    } else {
      setGlobalHsnCode('');
      const updatedItems = quoteFormData.items.map(item => ({
        ...item,
        product_id: undefined,
        hsn_code: undefined
      }));
      
      setQuoteFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const handleTermsChange = (termsContent: string) => {
    setQuoteFormData(prev => ({
      ...prev,
      terms_conditions: termsContent
    }));
  };

  const handleTermsTemplateSelect = (templateId: string) => {
    setSelectedTermsTemplateId(templateId);
    const template = termsTemplates.find(t => t.id === templateId);
    if (template) {
      handleTermsChange(template.content);
    }
  };

  const handleShowPreview = () => {
    setSelectedQuote(null);
    setShowQuotePreview(true);
  };

  const handleSaveQuote = async () => {
    try {
      setModalLoading(true);
      
      // Validation
      if (!quoteFormData.customer_id || quoteFormData.customer_id.trim() === '') {
        showError('Customer is required. Please select a customer from the dropdown.');
        return;
      }
      
      if (!quoteFormData.quote_date || quoteFormData.quote_date.trim() === '') {
        showError('Quote date is required. Please select a quote date.');
        return;
      }
      
      if (!quoteFormData.items || quoteFormData.items.length === 0) {
        showError('At least one line item is required. Please add items to the quote.');
        return;
      }
      
      // Filter and validate items
      const validItems = quoteFormData.items.filter(item => 
        item.item_name && item.description && item.quantity > 0 && item.unit_price >= 0
      );
      
      if (validItems.length === 0) {
        showError('No valid line items found. Please add at least one complete item.');
        return;
      }
      
      if (quoteModalMode === 'add' || activeTab === 'create-quote') {
        let finalQuoteNumber: string;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          try {
            finalQuoteNumber = await quoteService.generateQuoteNumber();
            
            const existingQuotes = await quoteService.getQuotes({ search: finalQuoteNumber }, 1, 1);
            const exactMatch = existingQuotes.data.find(quote => 
              quote.quote_number === finalQuoteNumber
            );
            
            if (!exactMatch) {
              break;
            } else {
              attempts++;
              
              if (attempts >= maxAttempts) {
                throw new Error(`Unable to generate unique quote number after ${maxAttempts} attempts`);
              }
            }
          } catch (numberError) {
            if (attempts >= maxAttempts - 1) {
              throw numberError;
            }
            attempts++;
          }
        }
        
        setGeneratedQuoteNumber(finalQuoteNumber!);
        
        const finalQuoteData = {
          ...quoteFormData,
          items: validItems
        };
        
        await quoteService.createQuote(finalQuoteData, finalQuoteNumber!);
        showSuccess(`Quotation ${finalQuoteNumber!} created successfully!`);
        setActiveTab('quotes');
      } else if (quoteModalMode === 'edit' && selectedQuote) {
        const updateData = {
          ...quoteFormData,
          items: validItems
        };
        
        await quoteService.updateQuote(selectedQuote.id, updateData);
        showSuccess(`Quotation ${selectedQuote.quote_number} updated successfully!`);
      }
      
      closeQuoteModal();
      await loadData();
    } catch (error) {
      console.error('Failed to save quote:', error);
      
      // Better error message extraction
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Handle Supabase error format
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if ('error' in error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if ('details' in error && typeof error.details === 'string') {
          errorMessage = error.details;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }
      
      showError(`Failed to save quote: ${errorMessage}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewQuote = async (quote: Quote) => {
    try {
      // Load necessary data for viewing
      const [fullQuote, customersData] = await Promise.all([
        quoteService.getQuoteById(quote.id),
        customers.length === 0 ? invoiceService.getCustomers({}, 1, 1000) : Promise.resolve({ data: customers })
      ]);
      
      if (customersData.data && customersData.data.length > 0 && customers.length === 0) {
        setCustomers(customersData.data);
      }
      
      if (fullQuote) {
        setSelectedQuote(fullQuote);
        
        const mappedItems = fullQuote.quote_items?.map(item => ({
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          hsn_code: item.hsn_code,
          billable_hours: item.billable_hours,
          resource_count: item.resource_count,
          is_service_item: item.is_service_item || false
        })) || [];
        
        setQuoteFormData({
          customer_id: fullQuote.customer_id,
          quote_date: fullQuote.quote_date,
          valid_until: fullQuote.valid_until || '',
          // Project details
          project_title: fullQuote.project_title || '',
          estimated_time: fullQuote.estimated_time || '',
          company_contact_name: fullQuote.company_contact_name || '',
          company_contact_email: fullQuote.company_contact_email || '',
          company_contact_phone: fullQuote.company_contact_phone || '',
          // Discount
          discount_type: fullQuote.discount_type,
          discount_value: fullQuote.discount_value || 0,
          // Additional info
          notes: fullQuote.notes || '',
          terms_conditions: fullQuote.terms_conditions || '',
          items: mappedItems.length > 0 ? mappedItems : [{
            product_id: undefined,
            item_name: '',
            description: '',
            quantity: 1,
            unit: 'pcs',
            unit_price: 0,
            tax_rate: 18,
            hsn_code: undefined,
            billable_hours: undefined,
            resource_count: undefined,
            is_service_item: false
          }]
        });
        setGeneratedQuoteNumber(fullQuote.quote_number);
        setQuoteModalMode('view');
        setShowQuoteModal(true);
        setShowQuotePreview(true);
      }
    } catch (error) {
      console.error('Failed to load quote details:', error);
      showError(`Failed to load quote details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditQuote = async (quote: Quote) => {
    try {
      setModalLoading(true);
      const fullQuote = await quoteService.getQuoteById(quote.id);
      
      if (!fullQuote) {
        showError('Quote not found');
        setModalLoading(false);
        return;
      }
      
      // First, load necessary data for editing if not already loaded
      if (customers.length === 0 || products.length === 0) {
        try {
          const [customersData, productsData, termsData] = await Promise.all([
            invoiceService.getCustomers({}, 1, 1000),
            invoiceService.getProducts({}, 1, 1000),
            invoiceService.getTermsTemplates()
          ]);
          setCustomers(customersData.data || []);
          setProducts(productsData.data || []);
          setTermsTemplates(termsData || []);
        } catch (loadError) {
          console.error('Failed to load support data:', loadError);
          showWarning('Some support data could not be loaded');
        }
      }
      
      // Map quote items with all fields INCLUDING the ID for updates
      const mappedItems = fullQuote.quote_items?.map(item => ({
        id: item.id, // IMPORTANT: Preserve ID for updates
        product_id: item.product_id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        hsn_code: item.hsn_code,
        billable_hours: item.billable_hours,
        resource_count: item.resource_count,
        is_service_item: item.is_service_item || false
      })) || [];
      
      const itemsForForm = mappedItems.length > 0 ? mappedItems : [{
        product_id: undefined,
        item_name: '',
        description: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 0,
        tax_rate: 18,
        hsn_code: undefined,
        billable_hours: undefined,
        resource_count: undefined,
        is_service_item: false
      }];
      
      // Set all form data
      const formData = {
        customer_id: fullQuote.customer_id,
        quote_date: fullQuote.quote_date,
        valid_until: fullQuote.valid_until || '',
        // Project details
        project_title: fullQuote.project_title || '',
        estimated_time: fullQuote.estimated_time || '',
        company_contact_name: fullQuote.company_contact_name || '',
        company_contact_email: fullQuote.company_contact_email || '',
        company_contact_phone: fullQuote.company_contact_phone || '',
        // Discount
        discount_type: fullQuote.discount_type,
        discount_value: fullQuote.discount_value || 0,
        // Additional info
        notes: fullQuote.notes || '',
        terms_conditions: fullQuote.terms_conditions || '',
        items: itemsForForm
      };
      
      setQuoteFormData(formData);
      
      // Set the default product dropdown if first item has a product
      if (itemsForForm.length > 0 && itemsForForm[0].product_id) {
        setSelectedDefaultProduct(itemsForForm[0].product_id);
        const product = products.find(p => p.id === itemsForForm[0].product_id);
        if (product?.hsn_code) {
          setGlobalHsnCode(product.hsn_code);
        }
      } else {
        setSelectedDefaultProduct('');
        setGlobalHsnCode('');
      }
      
      // Set state to show modal
      setSelectedQuote(fullQuote);
      setGeneratedQuoteNumber(fullQuote.quote_number);
      setShowQuotePreview(false); // Start in form mode, not preview
      setQuoteModalMode('edit');
      setShowQuoteModal(true);
      
    } catch (error) {
      console.error('Failed to load quote details:', error);
      showError(`Failed to load quote details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteQuote = async (quote: Quote) => {
    // Prevent deletion of accepted quotes
    if (quote.status === 'accepted') {
      showError('Cannot delete an accepted quotation. Please reject it first if needed.');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Quotation',
      message: `Are you sure you want to delete quotation "${quote.quote_number}"?\n\nThis will mark the quotation as expired.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        setLoading(true);
        await quoteService.deleteQuote(quote.id);
        showSuccess('Quotation deleted successfully!');
        await loadData();
      } catch (error) {
        console.error('Failed to delete quote:', error);
        showError(`Failed to delete quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDuplicateQuote = async (quote: Quote) => {
    try {
      const newQuote = await quoteService.duplicateQuote(quote.id);
      showSuccess(`Quotation duplicated successfully! New quote number: ${newQuote.quote_number}`);
      await loadData();
    } catch (error) {
      console.error('Failed to duplicate quote:', error);
      showError(`Failed to duplicate quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    const confirmed = await confirm({
      title: 'Convert to Invoice',
      message: `Convert quotation "${quote.quote_number}" to an invoice?\n\nThis will create a new invoice based on this quotation and mark the quotation as converted.`,
      confirmText: 'Convert',
      type: 'info'
    });
    
    if (confirmed) {
      try {
        showInfo('Converting quotation to invoice...');
        const result = await quoteService.convertToInvoice(quote.id);
        showSuccess(`Quotation converted successfully! New invoice number: ${result.invoiceNumber}`);
        await loadData();
      } catch (error) {
        console.error('Failed to convert quote to invoice:', error);
        showError(`Failed to convert quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleDownloadQuote = async (quote: Quote) => {
    try {
      // Load full quote details and customer data if needed
      const [fullQuote, customersData] = await Promise.all([
        quoteService.getQuoteById(quote.id),
        customers.length === 0 ? invoiceService.getCustomers({}, 1, 1000) : Promise.resolve({ data: customers })
      ]);
      
      if (!fullQuote) {
        showError('Quote not found');
        return;
      }
      
      // Update customers if needed
      const customersList = customersData.data && customersData.data.length > 0 ? customersData.data : customers;
      if (customers.length === 0 && customersList.length > 0) {
        setCustomers(customersList);
      }

      // Get company settings
      const company = companySettings.find(c => c.is_default) || companySettings[0];
      if (!company) {
        showError('No company settings found. Please configure company information first.');
        return;
      }

      // Get customer details - use fullQuote.customer if available
      const customer = fullQuote.customer || customersList.find(c => c.id === fullQuote.customer_id);
      if (!customer) {
        showError('Customer details not found');
        return;
      }

      // Calculate totals with service item support
      const subtotal = fullQuote.quote_items?.reduce((sum, item) => {
        let lineTotal = 0;
        if (item.is_service_item && item.billable_hours) {
          const resourceCount = item.resource_count || 1;
          lineTotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
        } else {
          lineTotal = item.quantity * item.unit_price;
        }
        return sum + lineTotal;
      }, 0) || 0;
      
      // Calculate discount
      let discountAmount = 0;
      if (fullQuote.discount_type && fullQuote.discount_value) {
        if (fullQuote.discount_type === 'percentage') {
          discountAmount = (subtotal * fullQuote.discount_value) / 100;
        } else {
          discountAmount = fullQuote.discount_value;
        }
      }
      
      // Calculate tax on discounted subtotal
      const discountedSubtotal = subtotal - discountAmount;
      const totalTax = fullQuote.quote_items?.reduce((sum, item) => {
        let lineSubtotal = 0;
        if (item.is_service_item && item.billable_hours) {
          const resourceCount = item.resource_count || 1;
          lineSubtotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
        } else {
          lineSubtotal = item.quantity * item.unit_price;
        }
        return sum + (lineSubtotal * item.tax_rate / 100);
      }, 0) || 0;
      const averageTaxRate = totalTax > 0 && subtotal > 0 ? (totalTax / subtotal) * 100 : 0;
      const adjustedTotalTax = (discountedSubtotal * averageTaxRate) / 100;
      const total = discountedSubtotal + adjustedTotalTax;

      // Get currency info
      const currencyInfo = getCurrencyInfo(customer);
      const taxLabel = getTaxLabel(customer);

      // Create PDF with multi-page support
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      pdf.setFont('helvetica');
      
      // Page dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const leftMargin = 15;
      const rightMargin = 15;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      
      // Apply branding header to get content boundaries
      const dimensions = PDFBrandingUtils.getStandardDimensions();
      const { contentStartY, contentEndY } = await PDFBrandingUtils.applyBranding(pdf, company, dimensions);
      
      // Calculate usable content area based on branding
      const topMargin = contentStartY + 5;
      const maxY = contentEndY - 5; // Leave space above footer
      
      let yPos = topMargin + 5;
      
      // Helper function to apply branding to a page
      const applyPageBranding = async (pageNum: number): Promise<void> => {
        pdf.setPage(pageNum);
        await PDFBrandingUtils.applyBranding(pdf, company, dimensions);
      };
      
      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace: number): void => {
        if (yPos + requiredSpace > maxY) {
          pdf.addPage();
          yPos = topMargin + 5;
        }
      };
      
      // ========== TITLE SECTION ==========
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105); // Emerald color
      pdf.text('QUOTATION', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      
      // Quote Number
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Quote #: ${fullQuote.quote_number}`, pageWidth / 2, yPos, { align: 'center' });
      
      // Project Title if exists
      if (fullQuote.project_title) {
        yPos += 10;
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const projectTitleLines = pdf.splitTextToSize(fullQuote.project_title, contentWidth - 40);
        pdf.text(projectTitleLines, pageWidth / 2, yPos, { align: 'center' });
        yPos += projectTitleLines.length * 6;
        
        if (fullQuote.estimated_time) {
          yPos += 2;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Estimated Duration: ${fullQuote.estimated_time}`, pageWidth / 2, yPos, { align: 'center' });
        }
      }
      
      yPos += 15;
      
      // ========== FROM/TO SECTION ==========
      const col1X = leftMargin;
      const col2X = pageWidth / 2 + 10;
      const colWidth = (pageWidth - leftMargin - rightMargin - 20) / 2;
      let fromY = yPos;
      let toY = yPos;
      
      // FROM Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105);
      pdf.text('FROM:', col1X, fromY);
      
      fromY += 6;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const companyNameLines = pdf.splitTextToSize(company.company_name, colWidth);
      pdf.text(companyNameLines, col1X, fromY);
      fromY += companyNameLines.length * 5;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      if (company.address_line1) {
        const addrLines = pdf.splitTextToSize(company.address_line1, colWidth);
        pdf.text(addrLines, col1X, fromY);
        fromY += addrLines.length * 4.5;
      }
      
      const companyLocation = [company.city, company.state, company.postal_code].filter(Boolean).join(', ');
      if (companyLocation) {
        pdf.text(companyLocation, col1X, fromY);
        fromY += 4.5;
      }
      
      if (company.email) {
        pdf.text(`Email: ${company.email}`, col1X, fromY);
        fromY += 4.5;
      }
      
      if (company.phone) {
        pdf.text(`Phone: ${company.phone}`, col1X, fromY);
        fromY += 4.5;
      }
      
      // Contact person for this quote
      if (fullQuote.company_contact_name || fullQuote.company_contact_email || fullQuote.company_contact_phone) {
        fromY += 4;
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(5, 150, 105);
        pdf.text('Contact Person:', col1X, fromY);
        fromY += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        
        if (fullQuote.company_contact_name) {
          pdf.text(fullQuote.company_contact_name, col1X, fromY);
          fromY += 4.5;
        }
        if (fullQuote.company_contact_email) {
          pdf.text(fullQuote.company_contact_email, col1X, fromY);
          fromY += 4.5;
        }
        if (fullQuote.company_contact_phone) {
          pdf.text(fullQuote.company_contact_phone, col1X, fromY);
          fromY += 4.5;
        }
      }
      
      // TO Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105);
      pdf.text('TO:', col2X, toY);
      
      toY += 6;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const customerName = customer.company_name || customer.contact_person || 'Customer';
      const customerNameLines = pdf.splitTextToSize(customerName, colWidth);
      pdf.text(customerNameLines, col2X, toY);
      toY += customerNameLines.length * 5;
      
      if (customer.contact_person && customer.company_name) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Attn: ${customer.contact_person}`, col2X, toY);
        toY += 4.5;
      }
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      if (customer.address_line1) {
        const addressLines = pdf.splitTextToSize(customer.address_line1, colWidth);
        pdf.text(addressLines, col2X, toY);
        toY += addressLines.length * 4.5;
      }
      if (customer.address_line2) {
        const addr2Lines = pdf.splitTextToSize(customer.address_line2, colWidth);
        pdf.text(addr2Lines, col2X, toY);
        toY += addr2Lines.length * 4.5;
      }
      
      const customerLocation = [customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ');
      if (customerLocation) {
        pdf.text(customerLocation, col2X, toY);
        toY += 4.5;
      }
      
      if (customer.email) {
        pdf.text(`Email: ${customer.email}`, col2X, toY);
        toY += 4.5;
      }
      
      if (customer.phone) {
        pdf.text(`Phone: ${customer.phone}`, col2X, toY);
        toY += 4.5;
      }
      
      // Date info box
      toY += 5;
      pdf.setFillColor(245, 245, 245);
      pdf.rect(col2X, toY - 3, colWidth, 20, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Quote Details', col2X + 3, toY + 2);
      toY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${new Date(fullQuote.quote_date).toLocaleDateString()}`, col2X + 3, toY);
      toY += 5;
      if (fullQuote.valid_until) {
        pdf.text(`Valid Until: ${new Date(fullQuote.valid_until).toLocaleDateString()}`, col2X + 3, toY);
        toY += 5;
      }
      
      yPos = Math.max(fromY, toY) + 15;
      
      // ========== ITEMS TABLE ==========
      checkPageBreak(40);
      
      const tableLeftMargin = leftMargin;
      const tableRightEdge = pageWidth - rightMargin;
      const tableWidth = tableRightEdge - tableLeftMargin;
      
      // Column widths optimized for A4 page (total 180mm): #(10), Description(75), Qty(20), Rate(27), Tax(18), Amount(30)
      const colWidths = [10, 75, 20, 27, 18, 30];
      const colX: number[] = [tableLeftMargin];
      for (let i = 1; i < colWidths.length; i++) {
        colX.push(colX[i-1] + colWidths[i-1]);
      }
      
      // Table header
      pdf.setFillColor(5, 150, 105); // Emerald
      pdf.rect(tableLeftMargin, yPos, tableWidth, 10, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      
      const headers = ['#', 'Description', 'Qty', 'Rate', taxLabel, 'Amount'];
      headers.forEach((header, i) => {
        if (i <= 1) {
          pdf.text(header, colX[i] + 3, yPos + 6.5);
        } else {
          pdf.text(header, colX[i] + colWidths[i] - 3, yPos + 6.5, { align: 'right' });
        }
      });
      
      yPos += 10;
      
      // Table rows with proper spacing
      pdf.setTextColor(0, 0, 0);
      
      fullQuote.quote_items?.forEach((item, index) => {
        // Calculate line subtotal based on item type
        let lineSubtotal = 0;
        if (item.is_service_item && item.billable_hours) {
          const resourceCount = item.resource_count || 1;
          lineSubtotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
        } else {
          lineSubtotal = item.quantity * item.unit_price;
        }
        const lineTax = (lineSubtotal * item.tax_rate) / 100;
        const lineTotal = lineSubtotal + lineTax;
        
        // Process description - allow full content with page breaks
        const descriptionLines = item.description ? item.description.split('\n') : [];
        const formattedDescLines: string[] = [];
        
        descriptionLines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            const cleanLine = trimmedLine.replace(/^[•\-\*]\s*/, '• ');
            const wrapped = pdf.splitTextToSize(cleanLine, colWidths[1] - 8);
            formattedDescLines.push(...wrapped);
          }
        });
        
        // Calculate row height - readable sizing
        const itemNameLines = pdf.splitTextToSize(item.item_name, colWidths[1] - 8);
        const nameHeight = itemNameLines.length * 5;
        const serviceInfoHeight = (item.is_service_item && item.billable_hours) ? 4.5 : 0;
        const descHeight = formattedDescLines.length * 4;
        const minRowHeight = 12;
        const rowHeight = Math.max(minRowHeight, nameHeight + serviceInfoHeight + descHeight + 8);
        
        // Check if we need a new page for this row
        checkPageBreak(rowHeight + 5);
        
        // Alternate row background
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(tableLeftMargin, yPos, tableWidth, rowHeight, 'F');
        }
        
        // Draw row border
        pdf.setDrawColor(220, 220, 220);
        pdf.line(tableLeftMargin, yPos + rowHeight, tableRightEdge, yPos + rowHeight);
        
        const textY = yPos + 6;
        
        // Row number
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(String(index + 1), colX[0] + 3, textY);
        
        // Item name (bold, readable)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        let currentY = textY;
        itemNameLines.forEach((nameLine: string) => {
          pdf.text(nameLine, colX[1] + 3, currentY);
          currentY += 5;
        });
        
        // Service item calculation info (if applicable)
        if (item.is_service_item && item.billable_hours) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          const resourceCount = item.resource_count || 1;
          const serviceInfo = `Service: ${resourceCount} resource${resourceCount > 1 ? 's' : ''} x ${item.quantity} month${item.quantity > 1 ? 's' : ''} x ${item.billable_hours} hrs/month`;
          pdf.text(serviceInfo, colX[1] + 5, currentY);
          currentY += 4.5;
          pdf.setTextColor(0, 0, 0);
        }
        
        // Description (normal text, readable size)
        if (formattedDescLines.length > 0) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(70, 70, 70);
          currentY += 1;
          formattedDescLines.forEach((line) => {
            pdf.text(line, colX[1] + 5, currentY);
            currentY += 4;
          });
          pdf.setTextColor(0, 0, 0);
        }
        
        // Numeric columns - readable size, right aligned
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${item.quantity} ${item.unit}`, colX[2] + colWidths[2] - 3, textY, { align: 'right' });
        pdf.text(formatCurrencyAmount(item.unit_price, currencyInfo), colX[3] + colWidths[3] - 3, textY, { align: 'right' });
        pdf.text(`${item.tax_rate}%`, colX[4] + colWidths[4] - 3, textY, { align: 'right' });
        pdf.setFont('helvetica', 'bold');
        pdf.text(formatCurrencyAmount(lineTotal, currencyInfo), colX[5] + colWidths[5] - 3, textY, { align: 'right' });
        
        yPos += rowHeight;
      });
      
      // ========== TOTALS SECTION ==========
      yPos += 8;
      checkPageBreak(50);
      
      const totalsBoxWidth = 80;
      const totalsBoxX = tableRightEdge - totalsBoxWidth;
      
      // Calculate amount in words lines first to determine box height
      pdf.setFontSize(9);
      const amountWords = formatAmountInWords(total, currencyInfo.name);
      const maxWordWidth = totalsBoxWidth - 10;
      const wordLines = pdf.splitTextToSize(amountWords, maxWordWidth);
      const wordLinesHeight = wordLines.length * 4.5 + 8; // Line height + padding
      
      // Calculate total box height based on content
      const baseHeight = discountAmount > 0 ? 45 : 38;
      const totalsBoxHeight = baseHeight + wordLinesHeight;
      
      // Draw totals box with calculated height
      pdf.setFillColor(250, 250, 250);
      pdf.rect(totalsBoxX, yPos, totalsBoxWidth, totalsBoxHeight, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(totalsBoxX, yPos, totalsBoxWidth, totalsBoxHeight, 'S');
      
      const labelX = totalsBoxX + 5;
      const valueX = totalsBoxX + totalsBoxWidth - 5;
      let totalsY = yPos + 8;
      
      // Subtotal
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Subtotal:', labelX, totalsY);
      pdf.text(formatCurrencyAmount(subtotal, currencyInfo), valueX, totalsY, { align: 'right' });
      
      // Discount line (if applicable)
      if (discountAmount > 0) {
        totalsY += 7;
        pdf.setTextColor(220, 38, 38); // Red color for discount
        const discountLabel = fullQuote.discount_type === 'percentage' 
          ? `Discount (${fullQuote.discount_value}%):` 
          : 'Discount:';
        pdf.text(discountLabel, labelX, totalsY);
        pdf.text(`-${formatCurrencyAmount(discountAmount, currencyInfo)}`, valueX, totalsY, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
      }
      
      // Tax
      totalsY += 7;
      pdf.text(`${taxLabel}:`, labelX, totalsY);
      pdf.text(formatCurrencyAmount(adjustedTotalTax, currencyInfo), valueX, totalsY, { align: 'right' });
      
      // Total with highlight
      totalsY += 9;
      pdf.setFillColor(5, 150, 105);
      pdf.rect(totalsBoxX, totalsY - 5, totalsBoxWidth, 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TOTAL:', labelX, totalsY);
      pdf.text(formatCurrencyAmount(total, currencyInfo), valueX, totalsY, { align: 'right' });
      
      // Amount in words - inside the totals box, right aligned
      totalsY += 12;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(80, 80, 80);
      
      // Right-align each line within the totals box
      wordLines.forEach((line: string, index: number) => {
        pdf.text(line, valueX, totalsY + (index * 4.5), { align: 'right' });
      });
      
      // Update yPos to be after the totals box
      yPos = yPos + totalsBoxHeight + 10;
      
      // ========== NOTES SECTION ==========
      if (fullQuote.notes) {
        checkPageBreak(25);
        
        pdf.setFillColor(255, 251, 235); // Light amber
        const notesLines = pdf.splitTextToSize(fullQuote.notes, contentWidth - 10);
        const notesHeight = 10 + (notesLines.length * 5);
        pdf.rect(leftMargin, yPos, contentWidth, notesHeight, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Notes:', leftMargin + 5, yPos + 7);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.text(notesLines, leftMargin + 5, yPos + 14);
        yPos += notesHeight + 10;
      }
      
      // ========== TERMS & CONDITIONS SECTION ==========
      if (fullQuote.terms_conditions) {
        checkPageBreak(25);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Terms & Conditions:', leftMargin, yPos);
        yPos += 7;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        
        // Split terms by lines and handle page breaks
        const termsLines = pdf.splitTextToSize(fullQuote.terms_conditions, contentWidth);
        const linesPerCheck = 5; // Check for page break every 5 lines
        
        for (let i = 0; i < termsLines.length; i++) {
          if (i > 0 && i % linesPerCheck === 0) {
            checkPageBreak(linesPerCheck * 5);
          }
          pdf.text(termsLines[i], leftMargin, yPos);
          yPos += 5;
        }
      }
      
      // ========== APPLY BRANDING TO ALL PAGES ==========
      // Apply header and footer images to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        await applyPageBranding(i);
      }
      
      // Add page numbers to all pages (after branding so they appear on top)
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        
        // Position page number above the footer image
        const pageNumY = contentEndY + 3;
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageNumY, { align: 'center' });
        
        // Add "Computer Generated" note on last page
        if (i === totalPages) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'italic');
          pdf.text('This is a computer generated quotation.', pageWidth / 2, pageNumY + 5, { align: 'center' });
        }
      }
      
      // Save PDF
      pdf.save(`${fullQuote.quote_number.replace(/\//g, '-')}.pdf`);
      showSuccess('Quote PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      showError(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateQuoteStatus = async (quote: Quote, newStatus: Quote['status']) => {
    try {
      await quoteService.updateQuoteStatus(quote.id, newStatus);
      showSuccess(`Quote status updated to ${newStatus}`);
      await loadData();
    } catch (error) {
      console.error('Failed to update quote status:', error);
      showError(`Failed to update quote status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchTerm });
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-slate-100 text-slate-600';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'sent': return <Mail className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'expired': return <Clock className="w-4 h-4" />;
      case 'converted': return <ArrowRightCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Quotations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.total_quotes || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">₹</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Quoted</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats?.total_quoted_amount || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">₹</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats?.pending_amount || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">%</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(stats?.conversion_rate || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quotation Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats?.draft_quotes || 0}</div>
            <div className="text-sm text-gray-500">Draft</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.sent_quotes || 0}</div>
            <div className="text-sm text-gray-500">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.accepted_quotes || 0}</div>
            <div className="text-sm text-gray-500">Accepted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats?.rejected_quotes || 0}</div>
            <div className="text-sm text-gray-500">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-400">{stats?.expired_quotes || 0}</div>
            <div className="text-sm text-gray-500">Expired</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats?.converted_quotes || 0}</div>
            <div className="text-sm text-gray-500">Converted</div>
          </div>
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Quotations</h3>
        </div>
        {renderQuoteTable(quotes.slice(0, 5))}
      </div>
    </div>
  );

  const renderQuoteTable = (quoteList: Quote[] = quotes) => (
    <div className="w-full">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Quote
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Valid Until
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Amount
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Status
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {quoteList.map((quote) => (
          <tr key={quote.id} className={`hover:bg-gray-50 ${quote.status === 'expired' || quote.status === 'rejected' ? 'opacity-60 bg-gray-50' : ''}`}>
            <td className="px-3 py-3 whitespace-nowrap">
              <div className={`text-sm font-medium ${quote.status === 'expired' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {quote.quote_number}
              </div>
            </td>
            <td className="px-3 py-3">
              <div className="text-sm text-gray-900 truncate max-w-xs">
                {quote.customer?.company_name || quote.customer?.contact_person || 'N/A'}
              </div>
            </td>
            <td className="px-3 py-3 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {new Date(quote.quote_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </div>
            </td>
            <td className="px-3 py-3 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
              </div>
            </td>
            <td className="px-3 py-3 whitespace-nowrap">
              <div className="text-sm font-medium text-gray-900">
                <CurrencyDisplay 
                  amount={quote.total_amount}
                  currencyCode={quote.currency_code}
                  inrAmount={quote.inr_total_amount}
                  showBothCurrencies={quote.currency_code !== 'INR'}
                  conversionDate={quote.quote_date}
                />
              </div>
            </td>
            <td className="px-3 py-3 whitespace-nowrap">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                {getStatusIcon(quote.status)}
                <span className="ml-1">{quote.status}</span>
              </span>
            </td>
            <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end space-x-2">
                <button 
                  onClick={() => handleViewQuote(quote)}
                  className="text-emerald-600 hover:text-emerald-900"
                  title="View Quote"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDownloadQuote(quote)}
                  className="text-indigo-600 hover:text-indigo-900"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                {/* Status Change Dropdown */}
                {quote.status !== 'converted' && quote.status !== 'expired' && (
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusDropdownOpen(statusDropdownOpen === quote.id ? null : quote.id);
                      }}
                      className="text-orange-600 hover:text-orange-900"
                      title="Change Status"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    {statusDropdownOpen === quote.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setStatusDropdownOpen(null)}
                        />
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                          <div className="py-1" role="menu">
                            {quote.status !== 'draft' && (
                              <button
                                onClick={() => {
                                  handleUpdateQuoteStatus(quote, 'draft');
                                  setStatusDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Mark as Draft
                              </button>
                            )}
                            {quote.status !== 'sent' && (
                              <button
                                onClick={() => {
                                  handleUpdateQuoteStatus(quote, 'sent');
                                  setStatusDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Mark as Sent
                              </button>
                            )}
                            {quote.status !== 'accepted' && (
                              <button
                                onClick={() => {
                                  handleUpdateQuoteStatus(quote, 'accepted');
                                  setStatusDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Mark as Accepted
                              </button>
                            )}
                            {quote.status !== 'rejected' && (
                              <button
                                onClick={() => {
                                  handleUpdateQuoteStatus(quote, 'rejected');
                                  setStatusDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Mark as Rejected
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {(quote.status === 'draft' || quote.status === 'sent') && (
                  <button 
                    onClick={() => handleEditQuote(quote)}
                    className="text-gray-600 hover:text-gray-900"
                    title="Edit Quote"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => handleDuplicateQuote(quote)}
                  className="text-blue-600 hover:text-blue-900"
                  title="Duplicate Quote"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {quote.status === 'accepted' && (
                  <button 
                    onClick={() => handleConvertToInvoice(quote)}
                    className="text-purple-600 hover:text-purple-900"
                    title="Convert to Invoice"
                  >
                    <ArrowRightCircle className="w-4 h-4" />
                  </button>
                )}
                {quote.status !== 'expired' && quote.status !== 'converted' && quote.status !== 'accepted' && (
                  <button 
                    onClick={() => handleDeleteQuote(quote)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete Quote"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {quoteList.length === 0 && (
          <tr>
            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
              No quotations found. Create your first quotation to get started.
            </td>
          </tr>
        )}
      </tbody>
    </table>
    </div>
  );

  const renderQuotesList = () => (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Quotations</h2>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button 
            onClick={() => openCreateQuoteTab()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Quotation
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Search quotations..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-lg shadow">
        {renderQuoteTable()}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading && quotes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quotations...</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'create-quote') {
    const selectedCustomer = customers.find(c => c.id === quoteFormData.customer_id);
    const currencyInfo = getCurrencyInfo(selectedCustomer);
    const { subtotal, discountAmount, taxAmount, total } = calculateQuoteTotals();
    const taxLabel = getTaxLabel(selectedCustomer);
    
    return (
      <>
        <CreateQuote
          quoteFormData={quoteFormData}
          onFormChange={handleQuoteFormChange}
          onItemChange={handleQuoteItemChange}
          onAddItem={addQuoteItem}
          onRemoveItem={removeQuoteItem}
          onSaveQuote={handleSaveQuote}
          onCloseQuote={() => setActiveTab('quotes')}
          onShowPreview={handleShowPreview}
          onTermsChange={handleTermsChange}
          onTermsTemplateSelect={handleTermsTemplateSelect}
          onDefaultProductChange={handleDefaultProductChange}
          customers={customers}
          products={products}
          termsTemplates={termsTemplates}
          companySettings={companySettings}
          selectedDefaultProduct={selectedDefaultProduct}
          selectedTermsTemplateId={selectedTermsTemplateId}
          globalHsnCode={globalHsnCode}
          generatedQuoteNumber={generatedQuoteNumber}
          modalLoading={modalLoading}
          calculateQuoteTotals={calculateQuoteTotals}
          getCurrencyInfo={getCurrencyInfo}
          formatCurrencyAmount={formatCurrencyAmount}
          formatAmountInWords={formatAmountInWords}
        />
        
        {/* Quote Preview Modal */}
        {showQuotePreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-5xl shadow-lg rounded-lg bg-white">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Quotation Preview</h2>
                <button
                  onClick={() => setShowQuotePreview(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Preview Content with PDF-like styling */}
              <div className="max-h-[80vh] overflow-y-auto">
                <div className="bg-white shadow-lg max-w-4xl mx-auto" style={{fontSize: '14px', lineHeight: '1.4'}}>
                  {/* Header Image - Edge to Edge */}
                  {companySettings[0]?.header_image_url && (
                    <div className="w-full">
                      <img 
                        src={companySettings[0].header_image_url} 
                        alt="Header" 
                        className="w-full h-auto object-cover"
                        style={{ maxHeight: '120px' }}
                      />
                    </div>
                  )}
                  
                  {/* Main Content Area */}
                  <div className="p-6">
                    {/* Company Header - Only if no header image */}
                    {!companySettings[0]?.header_image_url && (
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          {companySettings[0]?.logo_url && (
                            <img 
                              src={companySettings[0].logo_url} 
                              alt="Company Logo" 
                              className="h-12 w-auto mb-3"
                            />
                          )}
                          <div className="text-xl font-bold text-gray-900 mb-1">{companySettings[0]?.company_name || 'Your Company'}</div>
                          <div className="text-xs text-gray-600 leading-tight">
                            {companySettings[0]?.address_line1 && <div>{companySettings[0].address_line1}</div>}
                            {companySettings[0]?.address_line2 && <div>{companySettings[0].address_line2}</div>}
                            <div>{companySettings[0]?.city && `${companySettings[0].city}, `}{companySettings[0]?.state} {companySettings[0]?.postal_code}</div>
                            <div className="flex gap-4 mt-1">
                              {companySettings[0]?.email && <span>📧 {companySettings[0].email}</span>}
                              {companySettings[0]?.phone && <span>📞 {companySettings[0].phone}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-6">
                          <div className="text-2xl font-bold text-emerald-600 mb-2">QUOTATION</div>
                          <div className="text-xs text-gray-600">
                            <div><strong>Quote #:</strong> {generatedQuoteNumber || 'Auto-generated'}</div>
                            <div><strong>Date:</strong> {new Date(quoteFormData.quote_date).toLocaleDateString()}</div>
                            {quoteFormData.valid_until && (
                              <div><strong>Valid Until:</strong> {new Date(quoteFormData.valid_until).toLocaleDateString()}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* With Header Image - Show Quote Info Below */}
                    {companySettings[0]?.header_image_url && (
                      <div className="text-center mb-6">
                        <div className="text-2xl font-bold text-emerald-600 mb-2">QUOTATION</div>
                        <div className="text-sm text-gray-600">
                          <span className="mr-4"><strong>Quote #:</strong> {generatedQuoteNumber || 'Auto-generated'}</span>
                          <span className="mr-4"><strong>Date:</strong> {new Date(quoteFormData.quote_date).toLocaleDateString()}</span>
                          {quoteFormData.valid_until && (
                            <span><strong>Valid Until:</strong> {new Date(quoteFormData.valid_until).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Project Title Banner */}
                    {quoteFormData.project_title && (
                      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                        <h3 className="text-lg font-bold text-emerald-800">{quoteFormData.project_title}</h3>
                        {quoteFormData.estimated_time && (
                          <p className="text-sm text-emerald-600 mt-1">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Estimated Duration: {quoteFormData.estimated_time}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Two Column Layout: From/To */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Quote For (Customer) */}
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="font-semibold text-gray-900 mb-2">Quote For:</div>
                        {selectedCustomer ? (
                          <div className="text-xs text-gray-700">
                            <div className="font-medium text-sm">{selectedCustomer.company_name || selectedCustomer.contact_person}</div>
                            {selectedCustomer.contact_person && selectedCustomer.company_name && (
                              <div className="text-gray-600">Attn: {selectedCustomer.contact_person}</div>
                            )}
                            <div className="mt-1">
                              {selectedCustomer.address_line1 && <div>{selectedCustomer.address_line1}</div>}
                              {selectedCustomer.address_line2 && <div>{selectedCustomer.address_line2}</div>}
                              <div>{selectedCustomer.city && `${selectedCustomer.city}, `}{selectedCustomer.state} {selectedCustomer.postal_code}</div>
                            </div>
                            <div className="mt-1 space-y-1">
                              {selectedCustomer.email && <div>📧 {selectedCustomer.email}</div>}
                              {selectedCustomer.phone && <div>📞 {selectedCustomer.phone}</div>}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-400 italic text-sm">Please select a customer</p>
                        )}
                      </div>
                      
                      {/* Your Contact Person */}
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="font-semibold text-gray-900 mb-2">Your Contact Person:</div>
                        {(quoteFormData.company_contact_name || quoteFormData.company_contact_email || quoteFormData.company_contact_phone) ? (
                          <div className="text-xs text-gray-700 space-y-1">
                            {quoteFormData.company_contact_name && (
                              <div className="font-medium text-sm">{quoteFormData.company_contact_name}</div>
                            )}
                            {quoteFormData.company_contact_email && <div>📧 {quoteFormData.company_contact_email}</div>}
                            {quoteFormData.company_contact_phone && <div>📞 {quoteFormData.company_contact_phone}</div>}
                          </div>
                        ) : (
                          <p className="text-gray-400 italic text-sm">No contact person specified</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Items Table */}
                    <div className="mb-6">
                      <table className="w-full border-collapse border border-gray-300 text-xs">
                        <thead>
                          <tr className="bg-emerald-600 text-white">
                            <th className="border border-emerald-700 px-2 py-2 text-left font-medium w-8">#</th>
                            <th className="border border-emerald-700 px-2 py-2 text-left font-medium">Item</th>
                            <th className="border border-emerald-700 px-2 py-2 text-left font-medium">Description</th>
                            <th className="border border-emerald-700 px-2 py-2 text-center font-medium w-16">Qty</th>
                            <th className="border border-emerald-700 px-2 py-2 text-right font-medium w-20">Rate</th>
                            <th className="border border-emerald-700 px-2 py-2 text-center font-medium w-14">{taxLabel}%</th>
                            <th className="border border-emerald-700 px-2 py-2 text-right font-medium w-24">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quoteFormData.items.map((item, index) => {
                            const lineSubtotal = item.quantity * item.unit_price;
                            const lineTax = (lineSubtotal * item.tax_rate) / 100;
                            const lineTotal = lineSubtotal + lineTax;
                            return (
                              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                                <td className="border border-gray-300 px-2 py-2 font-medium">{item.item_name || 'Item'}</td>
                                <td className="border border-gray-300 px-2 py-2">
                                  {/* Rich text rendering for description */}
                                  <div 
                                    className="text-gray-600 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ 
                                      __html: item.description 
                                        ? item.description
                                            .replace(/\n/g, '<br/>')
                                            .replace(/^[•\-\*]\s*/gm, '<li>')
                                            .replace(/(<li>.*?)(?=<li>|$)/g, '$1</li>')
                                        : '' 
                                    }}
                                  />
                                </td>
                                <td className="border border-gray-300 px-2 py-2 text-center">{item.quantity} {item.unit}</td>
                                <td className="border border-gray-300 px-2 py-2 text-right">{formatCurrencyAmount(item.unit_price, currencyInfo)}</td>
                                <td className="border border-gray-300 px-2 py-2 text-center">{item.tax_rate}%</td>
                                <td className="border border-gray-300 px-2 py-2 text-right font-medium">{formatCurrencyAmount(lineTotal, currencyInfo)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Totals and Notes Section */}
                    <div className="flex justify-between items-start mb-6">
                      {/* Notes Section */}
                      <div className="flex-1 mr-8">
                        {quoteFormData.notes && (
                          <div>
                            <div className="font-semibold text-gray-900 mb-2 text-sm">Notes:</div>
                            <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{quoteFormData.notes}</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Totals Section */}
                      <div className="w-56">
                        <div className="border border-gray-300 text-xs">
                          <div className="flex justify-between px-3 py-2 border-b border-gray-300">
                            <span className="font-medium">Subtotal:</span>
                            <span>{formatCurrencyAmount(subtotal, currencyInfo)}</span>
                          </div>
                          {discountAmount > 0 && (
                            <div className="flex justify-between px-3 py-2 border-b border-gray-300 text-red-600">
                              <span className="font-medium">
                                Discount{quoteFormData.discount_type === 'percentage' ? ` (${quoteFormData.discount_value}%)` : ''}:
                              </span>
                              <span>-{formatCurrencyAmount(discountAmount, currencyInfo)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2 border-b border-gray-300">
                            <span className="font-medium">{taxLabel}:</span>
                            <span>{formatCurrencyAmount(taxAmount, currencyInfo)}</span>
                          </div>
                          <div className="flex justify-between px-3 py-2 bg-emerald-50 font-bold text-emerald-700">
                            <span>Total:</span>
                            <span>{formatCurrencyAmount(total, currencyInfo)}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 italic leading-tight">
                          {formatAmountInWords(total, currencyInfo.name)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Terms & Conditions */}
                    {quoteFormData.terms_conditions && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="font-semibold text-gray-900 mb-2 text-sm">Terms & Conditions:</div>
                        <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{quoteFormData.terms_conditions}</div>
                      </div>
                    )}
                    
                    {/* Disclaimer */}
                    <div className="mt-6 pt-3 border-t border-gray-200 text-center">
                      <p className="text-xs text-gray-500 italic">
                        This is a computer generated quotation and is valid without signature.
                      </p>
                    </div>
                  </div>
                  
                  {/* Footer Image - Edge to Edge */}
                  {companySettings[0]?.footer_image_url && (
                    <div className="w-full">
                      <img 
                        src={companySettings[0].footer_image_url} 
                        alt="Footer" 
                        className="w-full h-auto object-cover"
                        style={{ maxHeight: '100px' }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowQuotePreview(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    setShowQuotePreview(false);
                    handleSaveQuote();
                  }}
                  disabled={modalLoading || !quoteFormData.customer_id}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Save Quotation
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">Quotation Management</h1>
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('quotes')}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'quotes'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Quotations
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'quotes' && renderQuotesList()}
      </main>
      
      {/* View Quote Preview Modal - works from dashboard/quotes list */}
      {showQuotePreview && quoteModalMode === 'view' && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-5xl shadow-lg rounded-lg bg-white mb-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                View Quotation - {selectedQuote.quote_number}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadQuote(selectedQuote)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    setShowQuotePreview(false);
                    setShowQuoteModal(false);
                    setSelectedQuote(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="max-h-[75vh] overflow-y-auto">
              <div className="bg-white shadow-lg max-w-4xl mx-auto border border-gray-200" style={{fontSize: '14px', lineHeight: '1.4'}}>
                {/* Header Image */}
                {companySettings[0]?.header_image_url && (
                  <div className="w-full">
                    <img 
                      src={companySettings[0].header_image_url} 
                      alt="Header" 
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                )}
                
                <div className="p-6">
                  {/* Title */}
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-emerald-600 mb-2">QUOTATION</div>
                    <div className="text-sm text-gray-600">
                      <span className="mr-4"><strong>Quote #:</strong> {selectedQuote.quote_number}</span>
                      <span className="mr-4"><strong>Date:</strong> {new Date(selectedQuote.quote_date).toLocaleDateString()}</span>
                      {selectedQuote.valid_until && (
                        <span><strong>Valid Until:</strong> {new Date(selectedQuote.valid_until).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Project Title */}
                  {selectedQuote.project_title && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                      <h3 className="text-lg font-bold text-emerald-800">{selectedQuote.project_title}</h3>
                      {selectedQuote.estimated_time && (
                        <p className="text-sm text-emerald-600 mt-1">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Estimated Duration: {selectedQuote.estimated_time}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* From/To */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-semibold text-gray-900 mb-2">From:</div>
                      <div className="text-sm">
                        <div className="font-medium">{companySettings[0]?.company_name}</div>
                        {companySettings[0]?.address_line1 && <div className="text-gray-600">{companySettings[0].address_line1}</div>}
                        <div className="text-gray-600">{[companySettings[0]?.city, companySettings[0]?.state, companySettings[0]?.postal_code].filter(Boolean).join(', ')}</div>
                        {companySettings[0]?.email && <div className="text-gray-600">📧 {companySettings[0].email}</div>}
                      </div>
                      {(selectedQuote.company_contact_name || selectedQuote.company_contact_email) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="font-medium text-sm">Contact Person:</div>
                          {selectedQuote.company_contact_name && <div className="text-gray-600 text-sm">{selectedQuote.company_contact_name}</div>}
                          {selectedQuote.company_contact_email && <div className="text-gray-600 text-sm">{selectedQuote.company_contact_email}</div>}
                          {selectedQuote.company_contact_phone && <div className="text-gray-600 text-sm">{selectedQuote.company_contact_phone}</div>}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-semibold text-gray-900 mb-2">To:</div>
                      <div className="text-sm">
                        <div className="font-medium">{selectedQuote.customer?.company_name || selectedQuote.customer?.contact_person}</div>
                        {selectedQuote.customer?.address_line1 && <div className="text-gray-600">{selectedQuote.customer.address_line1}</div>}
                        <div className="text-gray-600">{[selectedQuote.customer?.city, selectedQuote.customer?.state, selectedQuote.customer?.postal_code].filter(Boolean).join(', ')}</div>
                        {selectedQuote.customer?.email && <div className="text-gray-600">📧 {selectedQuote.customer.email}</div>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Items Table */}
                  <div className="mb-6">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                      <thead>
                        <tr className="bg-emerald-600 text-white">
                          <th className="border border-emerald-700 px-2 py-2 text-left font-medium w-8">#</th>
                          <th className="border border-emerald-700 px-2 py-2 text-left font-medium">Item</th>
                          <th className="border border-emerald-700 px-2 py-2 text-center font-medium w-16">Qty</th>
                          <th className="border border-emerald-700 px-2 py-2 text-right font-medium w-24">Rate</th>
                          <th className="border border-emerald-700 px-2 py-2 text-center font-medium w-14">{getTaxLabel(selectedQuote.customer)}%</th>
                          <th className="border border-emerald-700 px-2 py-2 text-right font-medium w-24">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuote.quote_items?.map((item, index) => {
                          // Calculate line totals based on item type
                          let lineSubtotal = 0;
                          if (item.is_service_item && item.billable_hours) {
                            const resourceCount = item.resource_count || 1;
                            lineSubtotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
                          } else {
                            lineSubtotal = item.quantity * item.unit_price;
                          }
                          
                          const lineTax = (lineSubtotal * item.tax_rate) / 100;
                          const lineTotal = lineSubtotal + lineTax;
                          const currInfo = getCurrencyInfo(selectedQuote.customer);
                          return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                              <td className="border border-gray-300 px-2 py-2">
                                <div className="font-medium">{item.item_name}</div>
                                {item.is_service_item && item.billable_hours && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    📊 Service: {item.resource_count || 1} resources × {item.quantity} months × {item.billable_hours} hrs/month
                                  </div>
                                )}
                                {item.description && (
                                  <div className="text-gray-600 text-xs mt-1 whitespace-pre-wrap">{item.description}</div>
                                )}
                              </td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{item.quantity} {item.unit}</td>
                              <td className="border border-gray-300 px-2 py-2 text-right">{formatCurrencyAmount(item.unit_price, currInfo)}</td>
                              <td className="border border-gray-300 px-2 py-2 text-center">{item.tax_rate}%</td>
                              <td className="border border-gray-300 px-2 py-2 text-right font-medium">{formatCurrencyAmount(lineTotal, currInfo)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Totals */}
                  <div className="flex justify-end mb-6">
                    <div className="w-64 text-sm">
                      <div className="flex justify-between py-1">
                        <span>Subtotal:</span>
                        <span>{formatCurrencyAmount(selectedQuote.subtotal, getCurrencyInfo(selectedQuote.customer))}</span>
                      </div>
                      {(selectedQuote.discount_amount ?? 0) > 0 && (
                        <div className="flex justify-between py-1 text-red-600">
                          <span>Discount{selectedQuote.discount_type === 'percentage' ? ` (${selectedQuote.discount_value}%)` : ''}:</span>
                          <span>-{formatCurrencyAmount(selectedQuote.discount_amount ?? 0, getCurrencyInfo(selectedQuote.customer))}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1">
                        <span>{getTaxLabel(selectedQuote.customer)}:</span>
                        <span>{formatCurrencyAmount(selectedQuote.tax_amount, getCurrencyInfo(selectedQuote.customer))}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-emerald-700 border-t border-gray-300 mt-1">
                        <span>Total:</span>
                        <span>{formatCurrencyAmount(selectedQuote.total_amount, getCurrencyInfo(selectedQuote.customer))}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes & Terms */}
                  {selectedQuote.notes && (
                    <div className="mb-4">
                      <div className="font-semibold text-sm mb-1">Notes:</div>
                      <div className="text-xs text-gray-600 whitespace-pre-wrap">{selectedQuote.notes}</div>
                    </div>
                  )}
                  {selectedQuote.terms_conditions && (
                    <div>
                      <div className="font-semibold text-sm mb-1">Terms & Conditions:</div>
                      <div className="text-xs text-gray-600 whitespace-pre-wrap">{selectedQuote.terms_conditions}</div>
                    </div>
                  )}
                </div>
                
                {/* Footer Image */}
                {companySettings[0]?.footer_image_url && (
                  <div className="w-full">
                    <img 
                      src={companySettings[0].footer_image_url} 
                      alt="Footer" 
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '100px' }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-between mt-6 pt-4 border-t">
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedQuote.status)}`}>
                  {getStatusIcon(selectedQuote.status)}
                  <span className="ml-1 capitalize">{selectedQuote.status}</span>
                </span>
              </div>
              <div className="flex space-x-3">
                {(selectedQuote.status === 'draft' || selectedQuote.status === 'sent') && (
                  <button
                    onClick={() => {
                      setShowQuotePreview(false);
                      handleEditQuote(selectedQuote);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit Quote
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowQuotePreview(false);
                    setShowQuoteModal(false);
                    setSelectedQuote(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Quote Modal */}
      {showQuoteModal && quoteModalMode === 'edit' && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-lg bg-white mb-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Edit Quotation - {selectedQuote.quote_number}
              </h2>
              <button
                onClick={closeQuoteModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Edit Form - Using CreateQuote component */}
            <CreateQuote
              quoteFormData={quoteFormData}
              onFormChange={handleQuoteFormChange}
              onItemChange={handleQuoteItemChange}
              onAddItem={addQuoteItem}
              onRemoveItem={removeQuoteItem}
              onSaveQuote={handleSaveQuote}
              onCloseQuote={closeQuoteModal}
              onShowPreview={() => setShowQuotePreview(true)}
              onTermsChange={handleTermsChange}
              onTermsTemplateSelect={handleTermsTemplateSelect}
              onDefaultProductChange={handleDefaultProductChange}
              customers={customers}
              products={products}
              termsTemplates={termsTemplates}
              companySettings={companySettings}
              selectedDefaultProduct={selectedDefaultProduct}
              selectedTermsTemplateId={selectedTermsTemplateId}
              globalHsnCode={globalHsnCode}
              generatedQuoteNumber={generatedQuoteNumber}
              modalLoading={modalLoading}
              calculateQuoteTotals={calculateQuoteTotals}
              getCurrencyInfo={getCurrencyInfo}
              formatCurrencyAmount={formatCurrencyAmount}
              formatAmountInWords={formatAmountInWords}
            />
          </div>
        </div>
      )}

      {/* Edit Mode Preview Modal */}
      {showQuoteModal && quoteModalMode === 'edit' && showQuotePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-5xl shadow-lg rounded-lg bg-white mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Quotation Preview - {selectedQuote?.quote_number}</h2>
              <button
                onClick={() => setShowQuotePreview(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[75vh] overflow-y-auto">
              <div className="bg-white shadow-lg max-w-4xl mx-auto border border-gray-200" style={{fontSize: '14px', lineHeight: '1.4'}}>
                {companySettings[0]?.header_image_url && (
                  <div className="w-full">
                    <img 
                      src={companySettings[0].header_image_url} 
                      alt="Header" 
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                )}
                
                <div className="p-6">
                  {!companySettings[0]?.header_image_url && companySettings[0] && (
                    <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-emerald-600">
                      <div className="flex-1">
                        {companySettings[0].logo_url && (
                          <img 
                            src={companySettings[0].logo_url} 
                            alt="Logo" 
                            className="h-16 w-auto mb-3"
                          />
                        )}
                        <div className="text-xl font-bold text-gray-900 mb-1">{companySettings[0].company_name}</div>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {companySettings[0].address_line1 && <div>{companySettings[0].address_line1}</div>}
                          {companySettings[0].address_line2 && <div>{companySettings[0].address_line2}</div>}
                          <div>{[companySettings[0].city, companySettings[0].state, companySettings[0].postal_code].filter(Boolean).join(', ')}</div>
                          <div className="flex gap-4 mt-1">
                            {companySettings[0].email && <span>{companySettings[0].email}</span>}
                            {companySettings[0].phone && <span>{companySettings[0].phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-600 mb-2">QUOTATION</div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div><strong>Quote #:</strong> {selectedQuote?.quote_number}</div>
                          <div><strong>Date:</strong> {new Date(quoteFormData.quote_date).toLocaleDateString()}</div>
                          {quoteFormData.valid_until && (
                            <div><strong>Valid Until:</strong> {new Date(quoteFormData.valid_until).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {companySettings[0]?.header_image_url && (
                    <div className="text-center mb-6 pb-4 border-b-2 border-emerald-600">
                      <div className="text-3xl font-bold text-emerald-600 mb-2">QUOTATION</div>
                      <div className="text-sm text-gray-600 space-x-4">
                        <span><strong>Quote #:</strong> {selectedQuote?.quote_number}</span>
                        <span><strong>Date:</strong> {new Date(quoteFormData.quote_date).toLocaleDateString()}</span>
                        {quoteFormData.valid_until && (
                          <span><strong>Valid Until:</strong> {new Date(quoteFormData.valid_until).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {quoteFormData.project_title && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                      <h3 className="text-lg font-bold text-emerald-800">{quoteFormData.project_title}</h3>
                      {quoteFormData.estimated_time && (
                        <p className="text-sm text-emerald-600 mt-1">Estimated Duration: {quoteFormData.estimated_time}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-semibold text-emerald-600 mb-2">QUOTE FOR:</div>
                      {(() => {
                        const customer = customers.find(c => c.id === quoteFormData.customer_id);
                        if (!customer) return <p className="text-gray-400 italic">No customer selected</p>;
                        const currencyInfo = getCurrencyInfo(customer);
                        const taxLabel = getTaxLabel(customer);
                        
                        // Calculate totals for preview
                        const { subtotal, discountAmount, taxAmount, total } = calculateQuoteTotals();
                        
                        return (
                          <>
                            <div className="text-sm">
                              <div className="font-bold text-base mb-1">{customer.company_name || customer.contact_person}</div>
                              {customer.contact_person && customer.company_name && (
                                <div className="text-gray-600">Attn: {customer.contact_person}</div>
                              )}
                              <div className="text-xs text-gray-600 mt-2 space-y-0.5">
                                {customer.address_line1 && <div>{customer.address_line1}</div>}
                                {customer.address_line2 && <div>{customer.address_line2}</div>}
                                <div>{[customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ')}</div>
                                {customer.email && <div>Email: {customer.email}</div>}
                                {customer.phone && <div>Phone: {customer.phone}</div>}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-semibold text-emerald-600 mb-2">YOUR CONTACT:</div>
                      {(quoteFormData.company_contact_name || quoteFormData.company_contact_email || quoteFormData.company_contact_phone) ? (
                        <div className="text-sm space-y-1">
                          {quoteFormData.company_contact_name && (
                            <div className="font-bold text-base">{quoteFormData.company_contact_name}</div>
                          )}
                          <div className="text-xs text-gray-600 mt-2 space-y-0.5">
                            {quoteFormData.company_contact_email && <div>Email: {quoteFormData.company_contact_email}</div>}
                            {quoteFormData.company_contact_phone && <div>Phone: {quoteFormData.company_contact_phone}</div>}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-sm">No contact specified</p>
                      )}
                    </div>
                  </div>
                  
                  {(() => {
                    const customer = customers.find(c => c.id === quoteFormData.customer_id);
                    if (!customer) return null;
                    const currencyInfo = getCurrencyInfo(customer);
                    const taxLabel = getTaxLabel(customer);
                    const { subtotal, discountAmount, taxAmount, total } = calculateQuoteTotals();
                    
                    return (
                      <>
                        <table className="w-full border-collapse border border-gray-300 text-xs mb-6">
                          <thead>
                            <tr className="bg-emerald-600 text-white">
                              <th className="border border-emerald-700 px-2 py-2 text-left w-8">#</th>
                              <th className="border border-emerald-700 px-2 py-2 text-left">Description</th>
                              <th className="border border-emerald-700 px-2 py-2 text-center w-16">Qty</th>
                              <th className="border border-emerald-700 px-2 py-2 text-right w-20">Rate</th>
                              <th className="border border-emerald-700 px-2 py-2 text-center w-14">{taxLabel}%</th>
                              <th className="border border-emerald-700 px-2 py-2 text-right w-24">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quoteFormData.items.map((item, index) => {
                              let lineSubtotal = 0;
                              if (item.is_service_item && item.billable_hours) {
                                const resourceCount = item.resource_count || 1;
                                lineSubtotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
                              } else {
                                lineSubtotal = item.quantity * item.unit_price;
                              }
                              const lineTax = (lineSubtotal * item.tax_rate) / 100;
                              const lineTotal = lineSubtotal + lineTax;
                              
                              return (
                                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                  <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                                  <td className="border border-gray-300 px-2 py-2">
                                    <div className="font-bold">{item.item_name}</div>
                                    {item.is_service_item && item.billable_hours && (
                                      <div className="text-[10px] text-gray-500 mt-0.5">
                                        Service: {item.resource_count || 1} resource{(item.resource_count || 1) > 1 ? 's' : ''} x {item.quantity} month{item.quantity > 1 ? 's' : ''} x {item.billable_hours} hrs/month
                                      </div>
                                    )}
                                    <div className="text-gray-600 mt-1 whitespace-pre-line">{item.description}</div>
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-center">{item.quantity} {item.unit}</td>
                                  <td className="border border-gray-300 px-2 py-2 text-right">{formatCurrencyAmount(item.unit_price, currencyInfo)}</td>
                                  <td className="border border-gray-300 px-2 py-2 text-center">{item.tax_rate}%</td>
                                  <td className="border border-gray-300 px-2 py-2 text-right font-bold">{formatCurrencyAmount(lineTotal, currencyInfo)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        
                        <div className="flex justify-end mb-6">
                          <div className="w-64 border border-gray-300">
                            <div className="flex justify-between px-3 py-2 border-b border-gray-300 text-xs">
                              <span className="font-medium">Subtotal:</span>
                              <span>{formatCurrencyAmount(subtotal, currencyInfo)}</span>
                            </div>
                            {discountAmount > 0 && (
                              <div className="flex justify-between px-3 py-2 border-b border-gray-300 text-xs text-red-600">
                                <span className="font-medium">Discount{quoteFormData.discount_type === 'percentage' ? ` (${quoteFormData.discount_value}%)` : ''}:</span>
                                <span>-{formatCurrencyAmount(discountAmount, currencyInfo)}</span>
                              </div>
                            )}
                            <div className="flex justify-between px-3 py-2 border-b border-gray-300 text-xs">
                              <span className="font-medium">{taxLabel}:</span>
                              <span>{formatCurrencyAmount(taxAmount, currencyInfo)}</span>
                            </div>
                            <div className="flex justify-between px-3 py-2 bg-emerald-600 text-white font-bold text-sm">
                              <span>TOTAL:</span>
                              <span>{formatCurrencyAmount(total, currencyInfo)}</span>
                            </div>
                            <div className="px-3 py-2 text-[10px] text-gray-500 italic text-right">
                              {formatAmountInWords(total, currencyInfo.name)}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  
                  {quoteFormData.notes && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="font-semibold text-sm mb-1">Notes:</div>
                      <div className="text-xs text-gray-700 whitespace-pre-wrap">{quoteFormData.notes}</div>
                    </div>
                  )}
                  
                  {quoteFormData.terms_conditions && (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
                      <div className="font-semibold text-sm mb-1">Terms & Conditions:</div>
                      <div className="text-xs text-gray-700 whitespace-pre-wrap">{quoteFormData.terms_conditions}</div>
                    </div>
                  )}
                  
                  {companySettings[0]?.footer_image_url && (
                    <div className="w-full mt-6">
                      <img 
                        src={companySettings[0].footer_image_url} 
                        alt="Footer" 
                        className="w-full h-auto object-cover"
                        style={{ maxHeight: '80px' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowQuotePreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setShowQuotePreview(false);
                  handleSaveQuote();
                }}
                disabled={modalLoading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
              >
                {modalLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog {...dialogProps} loading={loading} />
    </div>
  );
};

export default QuoteManagement;
