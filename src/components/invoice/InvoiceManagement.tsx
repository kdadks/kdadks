import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  FileText,
  Download,
  Mail,
  Settings,
  Users,
  Package,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../../services/invoiceService';
import { simpleAuth } from '../../utils/simpleAuth';
import { useToast } from '../ui/ToastProvider';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { Invoice, InvoiceFilters, InvoiceStats, Customer, Product, CompanySettings, InvoiceSettings, Country, CreateProductData, CreateCompanySettingsData, CreateInvoiceSettingsData } from '../../types/invoice';

interface InvoiceManagementProps {
  onBackToDashboard?: () => void;
}

const InvoiceManagement: React.FC<InvoiceManagementProps> = ({ onBackToDashboard }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'customers' | 'products' | 'settings'>('dashboard');
  
  // Product modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    product_code: '',
    category: '',
    unit_price: 0,
    unit: '',
    tax_rate: 18,
    hsn_code: ''
  });
  const [modalLoading, setModalLoading] = useState(false);

  // Company settings modal states
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyModalMode, setCompanyModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [selectedCompany, setSelectedCompany] = useState<CompanySettings | null>(null);
  const [companyFormData, setCompanyFormData] = useState<CreateCompanySettingsData>({
    company_name: '',
    legal_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country_id: '',
    gstin: '',
    pan: '',
    cin: '',
    phone: '',
    email: '',
    website: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    logo_url: '',
    signature_url: '',
    is_default: false
  });

  // Invoice settings modal states
  const [showInvoiceSettingsModal, setShowInvoiceSettingsModal] = useState(false);
  const [invoiceSettingsModalMode, setInvoiceSettingsModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [invoiceSettingsFormData, setInvoiceSettingsFormData] = useState<CreateInvoiceSettingsData>({
    invoice_prefix: 'INV',
    invoice_suffix: '',
    number_format: 'YYYY-MM-####',
    reset_annually: true,
    financial_year_start_month: 4,
    current_financial_year: '2024-25',
    payment_terms: '',
    notes: '',
    footer_text: '',
    default_tax_rate: 18,
    enable_gst: true,
    due_days: 30,
    late_fee_percentage: 0,
    template_name: 'default',
    currency_position: 'before'
  });
  
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  useEffect(() => {
    loadData();
  }, [currentPage, filters, activeTab]);

  useEffect(() => {
    // Reset to page 1 when changing tabs
    setCurrentPage(1);
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await simpleAuth.logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Product Modal Functions
  const openProductModal = (mode: 'view' | 'edit' | 'add', product?: Product) => {
    setModalMode(mode);
    setSelectedProduct(product || null);
    
    if (mode === 'add') {
      setProductFormData({
        name: '',
        description: '',
        product_code: '',
        category: '',
        unit_price: 0,
        unit: '',
        tax_rate: 18,
        hsn_code: ''
      });
    } else if (product) {
      setProductFormData({
        name: product.name,
        description: product.description || '',
        product_code: product.product_code || '',
        category: product.category || '',
        unit_price: product.unit_price,
        unit: product.unit,
        tax_rate: product.tax_rate,
        hsn_code: product.hsn_code || ''
      });
    }
    
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    setModalLoading(false);
  };

  const handleProductFormChange = (field: keyof CreateProductData, value: string | number) => {
    setProductFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProduct = async () => {
    try {
      setModalLoading(true);
      
      if (modalMode === 'add') {
        await invoiceService.createProduct(productFormData);
        showSuccess('Product created successfully!');
      } else if (modalMode === 'edit' && selectedProduct) {
        await invoiceService.updateProduct(selectedProduct.id, productFormData);
        showSuccess('Product updated successfully!');
      }
      
      closeProductModal();
      await loadData(); // Refresh the product list
    } catch (error) {
      console.error('Failed to save product:', error);
      showError(`Failed to save product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await invoiceService.deleteProduct(product.id);
        showSuccess('Product deleted successfully!');
        await loadData(); // Refresh the product list
      } catch (error) {
        console.error('Failed to delete product:', error);
        showError(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Company Settings Modal Functions
  const openCompanyModal = (mode: 'view' | 'edit' | 'add', company?: CompanySettings) => {
    setCompanyModalMode(mode);
    setSelectedCompany(company || null);
    
    if (mode === 'add') {
      setCompanyFormData({
        company_name: '',
        legal_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country_id: 'IN', // Default to India
        gstin: '',
        pan: '',
        cin: '',
        phone: '',
        email: '',
        website: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: '',
        logo_url: '',
        signature_url: '',
        is_default: false
      });
    } else if (company) {
      setCompanyFormData({
        company_name: company.company_name,
        legal_name: company.legal_name || '',
        address_line1: company.address_line1,
        address_line2: company.address_line2 || '',
        city: company.city,
        state: company.state,
        postal_code: company.postal_code,
        country_id: company.country_id,
        gstin: company.gstin || '',
        pan: company.pan || '',
        cin: company.cin || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        bank_name: company.bank_name || '',
        account_number: company.account_number || '',
        ifsc_code: company.ifsc_code || '',
        branch_name: company.branch_name || '',
        logo_url: company.logo_url || '',
        signature_url: company.signature_url || '',
        is_default: company.is_default
      });
    }
    
    setShowCompanyModal(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
    setSelectedCompany(null);
    setModalLoading(false);
  };

  const handleCompanyFormChange = (field: keyof CreateCompanySettingsData, value: string | boolean) => {
    setCompanyFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveCompany = async () => {
    try {
      setModalLoading(true);
      
      // Validate required fields
      if (!companyFormData.company_name) {
        showWarning('Company name is required');
        return;
      }
      if (!companyFormData.address_line1) {
        showWarning('Address line 1 is required');
        return;
      }
      if (!companyFormData.city) {
        showWarning('City is required');
        return;
      }
      if (!companyFormData.state) {
        showWarning('State is required');
        return;
      }
      if (!companyFormData.postal_code) {
        showWarning('Postal code is required');
        return;
      }
      if (!companyFormData.country_id) {
        showWarning('Country ID is required');
        return;
      }

      console.log('💾 Saving company settings:', companyFormData);
      
      if (companyModalMode === 'add') {
        const result = await invoiceService.createCompanySettings(companyFormData);
        console.log('✅ Company settings created successfully:', result);
        showSuccess('Company settings created successfully!');
      } else if (companyModalMode === 'edit' && selectedCompany) {
        const result = await invoiceService.updateCompanySettings(selectedCompany.id, companyFormData);
        console.log('✅ Company settings updated successfully:', result);
        showSuccess('Company settings updated successfully!');
      }
      
      closeCompanyModal();
      await loadData(); // Refresh the data
    } catch (error) {
      console.error('❌ Failed to save company settings:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
      let errorMessage = 'Failed to save company settings';
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'A company with this information already exists';
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Invalid country ID. Please check the country field';
        } else if (error.message.includes('check constraint')) {
          errorMessage = 'Invalid data format. Please check all fields';
        } else {
          errorMessage = `Failed to save company settings: ${error.message}`;
        }
      }
      
      showError(errorMessage);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCompany = async (company: CompanySettings) => {
    const confirmed = await confirm({
      title: 'Delete Company Settings',
      message: `Are you sure you want to delete "${company.company_name}"?\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await invoiceService.deleteCompanySettings(company.id);
        showSuccess('Company settings deleted successfully!');
        await loadData(); // Refresh the data
      } catch (error) {
        console.error('Failed to delete company settings:', error);
        showError(`Failed to delete company settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Invoice Settings Modal Functions
  const openInvoiceSettingsModal = (mode: 'view' | 'edit' | 'add', settings?: InvoiceSettings) => {
    setInvoiceSettingsModalMode(mode);
    
    if (mode === 'add') {
      setInvoiceSettingsFormData({
        invoice_prefix: 'INV',
        invoice_suffix: '',
        number_format: 'YYYY-MM-####',
        reset_annually: true,
        financial_year_start_month: 4,
        current_financial_year: '2024-25',
        payment_terms: '',
        notes: '',
        footer_text: '',
        default_tax_rate: 18,
        enable_gst: true,
        due_days: 30,
        late_fee_percentage: 0,
        template_name: 'default',
        currency_position: 'before'
      });
    } else if (settings) {
      setInvoiceSettingsFormData({
        invoice_prefix: settings.invoice_prefix,
        invoice_suffix: settings.invoice_suffix || '',
        number_format: settings.number_format,
        reset_annually: settings.reset_annually,
        financial_year_start_month: settings.financial_year_start_month,
        current_financial_year: settings.current_financial_year,
        payment_terms: settings.payment_terms || '',
        notes: settings.notes || '',
        footer_text: settings.footer_text || '',
        default_tax_rate: settings.default_tax_rate,
        enable_gst: settings.enable_gst,
        due_days: settings.due_days,
        late_fee_percentage: settings.late_fee_percentage,
        template_name: settings.template_name,
        currency_position: settings.currency_position
      });
    }
    
    setShowInvoiceSettingsModal(true);
  };

  const closeInvoiceSettingsModal = () => {
    setShowInvoiceSettingsModal(false);
    setModalLoading(false);
  };

  const handleInvoiceSettingsFormChange = (field: keyof CreateInvoiceSettingsData, value: string | number | boolean) => {
    setInvoiceSettingsFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveInvoiceSettings = async () => {
    try {
      setModalLoading(true);
      
      // Validate required fields
      if (!invoiceSettingsFormData.invoice_prefix) {
        showWarning('Invoice prefix is required');
        return;
      }
      if (!invoiceSettingsFormData.number_format) {
        showWarning('Number format is required');
        return;
      }
      if (!invoiceSettingsFormData.current_financial_year) {
        showWarning('Current financial year is required');
        return;
      }
      if (!invoiceSettingsFormData.template_name) {
        showWarning('Template name is required');
        return;
      }

      console.log('💾 Saving invoice settings:', invoiceSettingsFormData);
      
      if (invoiceSettingsModalMode === 'add') {
        const result = await invoiceService.createInvoiceSettings(invoiceSettingsFormData);
        console.log('✅ Invoice settings created successfully:', result);
        showSuccess('Invoice settings created successfully!');
      } else if (invoiceSettingsModalMode === 'edit' && invoiceSettings) {
        const result = await invoiceService.updateInvoiceSettings(invoiceSettings.id, invoiceSettingsFormData);
        console.log('✅ Invoice settings updated successfully:', result);
        showSuccess('Invoice settings updated successfully!');
      }
      
      closeInvoiceSettingsModal();
      await loadData(); // Refresh the data
    } catch (error) {
      console.error('❌ Failed to save invoice settings:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
      let errorMessage = 'Failed to save invoice settings';
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'Invoice settings with this configuration already exists';
        } else if (error.message.includes('check constraint')) {
          errorMessage = 'Invalid data format. Please check all fields';
        } else {
          errorMessage = `Failed to save invoice settings: ${error.message}`;
        }
      }
      
      showError(errorMessage);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteInvoiceSettings = async (settings: InvoiceSettings) => {
    const confirmed = await confirm({
      title: 'Delete Invoice Settings',
      message: `Are you sure you want to delete these invoice settings?\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await invoiceService.deleteInvoiceSettings(settings.id);
        showSuccess('Invoice settings deleted successfully!');
        await loadData(); // Refresh the data
      } catch (error) {
        console.error('Failed to delete invoice settings:', error);
        showError(`Failed to delete invoice settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };



  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load countries if not already loaded
      if (countries.length === 0) {
        try {
          const countriesData = await invoiceService.getCountries();
          setCountries(countriesData);
        } catch (countryError) {
          console.warn('Failed to load countries:', countryError);
          // Don't block the rest of the data loading
        }
      }

      if (activeTab === 'dashboard') {
        const [invoicesData, statsData] = await Promise.all([
          invoiceService.getInvoices(filters, currentPage, 10),
          invoiceService.getInvoiceStats()
        ]);
        setInvoices(invoicesData.data);
        setTotalPages(invoicesData.total_pages);
        setStats(statsData);
      } else if (activeTab === 'invoices') {
        const invoicesData = await invoiceService.getInvoices(filters, currentPage, 20);
        setInvoices(invoicesData.data);
        setTotalPages(invoicesData.total_pages);
      } else if (activeTab === 'customers') {
        const customersData = await invoiceService.getCustomers({}, currentPage, 20);
        setCustomers(customersData.data);
        setTotalPages(customersData.total_pages);
      } else if (activeTab === 'products') {
        console.log('🔍 Loading products from database...');
        try {
          const productsData = await invoiceService.getProducts({}, currentPage, 20);
          console.log('📦 Products data received:', productsData);
          console.log('📊 Products count:', productsData.data?.length || 0);
          setProducts(productsData.data || []);
          setTotalPages(productsData.total_pages || 1);
        } catch (productsError) {
          console.error('❌ Failed to load products:', productsError);
          setProducts([]);
          setTotalPages(1);
        }
      } else if (activeTab === 'settings') {
        const [companyData, invoiceSettingsData] = await Promise.all([
          invoiceService.getCompanySettings(),
          invoiceService.getInvoiceSettings()
        ]);
        setCompanySettings(companyData);
        setInvoiceSettings(invoiceSettingsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
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
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.total_invoices || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">₹</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats?.total_revenue || 0)}
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
                <span className="text-white text-sm font-bold">₹</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats?.this_month_revenue || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats?.draft_invoices || 0}</div>
            <div className="text-sm text-gray-500">Draft</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.sent_invoices || 0}</div>
            <div className="text-sm text-gray-500">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.paid_invoices || 0}</div>
            <div className="text-sm text-gray-500">Paid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats?.overdue_invoices || 0}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">
              {(stats?.total_invoices || 0) - (stats?.paid_invoices || 0)}
            </div>
            <div className="text-sm text-gray-500">Unpaid</div>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          {renderInvoiceTable(invoices.slice(0, 5))}
        </div>
      </div>
    </div>
  );

  const renderInvoiceTable = (invoiceList: Invoice[] = invoices) => (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Invoice
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Customer
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Date
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Amount
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Payment
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {invoiceList.map((invoice) => (
          <tr key={invoice.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {invoice.customer?.company_name || invoice.customer?.contact_person || 'N/A'}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(invoice.total_amount)}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.payment_status)}`}>
                {invoice.payment_status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex items-center justify-end space-x-2">
                <button className="text-blue-600 hover:text-blue-900">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="text-green-600 hover:text-green-900">
                  <Download className="w-4 h-4" />
                </button>
                <button className="text-purple-600 hover:text-purple-900">
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderInvoicesList = () => (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search invoices..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.payment_status || ''}
              onChange={(e) => setFilters({ ...filters, payment_status: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Payments</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
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

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {renderInvoiceTable()}
        </div>
        
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

  const renderCustomers = () => (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search customers..."
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.company_name || customer.contact_person}
                    </div>
                    {customer.company_name && customer.contact_person && (
                      <div className="text-sm text-gray-500">{customer.contact_person}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.email}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {customer.city}, {customer.state}
                    </div>
                    <div className="text-sm text-gray-500">{customer.postal_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(customer.credit_limit)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Products & Services</h2>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button 
            onClick={() => loadData()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button 
            onClick={() => openProductModal('add')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search products..."
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        )}
        
        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-500 mb-4">No products are available in the database. Create your first product to get started.</p>
            <button 
              onClick={() => openProductModal('add')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {products.length} product{products.length !== 1 ? 's' : ''} from database
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.product_code}</div>
                        {product.description && (
                          <div className="text-xs text-gray-400 mt-1">{product.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.category || 'N/A'}</div>
                        {product.hsn_code && (
                          <div className="text-xs text-gray-500">HSN: {product.hsn_code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(product.unit_price)} / {product.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.tax_rate}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => openProductModal('view', product)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Product"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openProductModal('edit', product)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && products.length > 0 && totalPages > 1 && (
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

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      
      {/* Company Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => loadData()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button 
              onClick={() => openCompanyModal('add')}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </button>
          </div>
        </div>
        <div className="p-6">
          {companySettings.length > 0 ? (
            <div className="space-y-6">
              {companySettings.map((company) => (
                <div key={company.id} className="border rounded-lg p-4 relative">
                  {/* Action buttons */}
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button 
                      onClick={() => openCompanyModal('view', company)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Company"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openCompanyModal('edit', company)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Edit Company"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCompany(company)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Company"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Company info display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-20">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Name</label>
                      <div className="mt-1 text-sm text-gray-900">{company.company_name}</div>
                      {company.is_default && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mt-1">
                          Default
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Legal Name</label>
                      <div className="mt-1 text-sm text-gray-900">{company.legal_name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {company.address_line1}
                        {company.address_line2 && <>, {company.address_line2}</>}
                        <br />
                        {company.city}, {company.state} {company.postal_code}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {company.email && <div>Email: {company.email}</div>}
                        {company.phone && <div>Phone: {company.phone}</div>}
                        {company.website && <div>Website: {company.website}</div>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">GSTIN</label>
                      <div className="mt-1 text-sm text-gray-900">{company.gstin || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PAN</label>
                      <div className="mt-1 text-sm text-gray-900">{company.pan || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Company Settings Found</h3>
              <p className="text-gray-500 mb-4">Configure your company information to get started.</p>
              <button 
                onClick={() => openCompanyModal('add')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Invoice Settings</h3>
          <div className="flex space-x-2">
            {!invoiceSettings && (
              <button 
                onClick={() => openInvoiceSettingsModal('add')}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Settings
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          {invoiceSettings ? (
            <div className="border rounded-lg p-4 relative">
              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <button 
                  onClick={() => openInvoiceSettingsModal('view', invoiceSettings)}
                  className="text-blue-600 hover:text-blue-900"
                  title="View Settings"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => openInvoiceSettingsModal('edit', invoiceSettings)}
                  className="text-gray-600 hover:text-gray-900"
                  title="Edit Settings"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteInvoiceSettings(invoiceSettings)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete Settings"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Invoice settings display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-20">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Prefix</label>
                  <div className="mt-1 text-sm text-gray-900">{invoiceSettings.invoice_prefix}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Number</label>
                  <div className="mt-1 text-sm text-gray-900">{invoiceSettings.current_number}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Days</label>
                  <div className="mt-1 text-sm text-gray-900">{invoiceSettings.due_days} days</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Tax Rate</label>
                  <div className="mt-1 text-sm text-gray-900">{invoiceSettings.default_tax_rate}%</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Late Fee</label>
                  <div className="mt-1 text-sm text-gray-900">{invoiceSettings.late_fee_percentage}%</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Template</label>
                  <div className="mt-1 text-sm text-gray-900">{invoiceSettings.template_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">GST Enabled</label>
                  <div className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoiceSettings.enable_gst ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {invoiceSettings.enable_gst ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Financial Year</label>
                  <div className="mt-1 text-sm text-gray-900">{invoiceSettings.current_financial_year}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoice Settings Found</h3>
              <p className="text-gray-500 mb-4">Configure your invoice settings to get started.</p>
              <button 
                onClick={() => openInvoiceSettingsModal('add')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Product Modal Component
  const renderProductModal = () => {
    if (!showProductModal) return null;

    const isReadOnly = modalMode === 'view';
    const modalTitle = modalMode === 'add' ? 'Add New Product' : 
                      modalMode === 'edit' ? 'Edit Product' : 'Product Details';

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">{modalTitle}</h3>
            <button
              onClick={closeProductModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productFormData.name}
                  onChange={(e) => handleProductFormChange('name', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter product name"
                />
              </div>

              {/* Product Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Code
                </label>
                <input
                  type="text"
                  value={productFormData.product_code}
                  onChange={(e) => handleProductFormChange('product_code', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter product code"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={productFormData.category}
                  onChange={(e) => handleProductFormChange('category', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value="">Select category</option>
                  <option value="Products">Products</option>
                  <option value="Services">Services</option>
                  <option value="Software">Software</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Consulting">Consulting</option>
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit *
                </label>
                <select
                  value={productFormData.unit}
                  onChange={(e) => handleProductFormChange('unit', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value="">Select unit</option>
                  <option value="piece">Piece</option>
                  <option value="project">Project</option>
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                  <option value="kg">Kilogram</option>
                  <option value="liter">Liter</option>
                </select>
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productFormData.unit_price}
                  onChange={(e) => handleProductFormChange('unit_price', parseFloat(e.target.value) || 0)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="0.00"
                />
              </div>

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%) *
                </label>
                <select
                  value={productFormData.tax_rate}
                  onChange={(e) => handleProductFormChange('tax_rate', parseFloat(e.target.value) || 0)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              {/* HSN Code */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HSN Code
                </label>
                <input
                  type="text"
                  value={productFormData.hsn_code}
                  onChange={(e) => handleProductFormChange('hsn_code', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter HSN code"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={productFormData.description}
                  onChange={(e) => handleProductFormChange('description', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter product description"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={closeProductModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSaveProduct}
                disabled={modalLoading || !productFormData.name || !productFormData.unit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {modalLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Product
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Company Settings Modal Component
  const renderCompanyModal = () => {
    if (!showCompanyModal) return null;

    const isReadOnly = companyModalMode === 'view';
    const modalTitle = companyModalMode === 'add' ? 'Add Company Settings' : 
                      companyModalMode === 'edit' ? 'Edit Company Settings' : 'Company Details';

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">{modalTitle}</h3>
            <button
              onClick={closeCompanyModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyFormData.company_name}
                  onChange={(e) => handleCompanyFormChange('company_name', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter company name"
                />
              </div>

              {/* Legal Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Name
                </label>
                <input
                  type="text"
                  value={companyFormData.legal_name}
                  onChange={(e) => handleCompanyFormChange('legal_name', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter legal name"
                />
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={companyFormData.address_line1}
                  onChange={(e) => handleCompanyFormChange('address_line1', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter address line 1"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={companyFormData.address_line2}
                  onChange={(e) => handleCompanyFormChange('address_line2', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter address line 2"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={companyFormData.city}
                  onChange={(e) => handleCompanyFormChange('city', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter city"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  value={companyFormData.state}
                  onChange={(e) => handleCompanyFormChange('state', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter state"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code *
                </label>
                <input
                  type="text"
                  value={companyFormData.postal_code}
                  onChange={(e) => handleCompanyFormChange('postal_code', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter postal code"
                />
              </div>

              {/* Country ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  value={companyFormData.country_id}
                  onChange={(e) => handleCompanyFormChange('country_id', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value="">Select Country</option>
                  {countries.length > 0 ? (
                    countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name} ({country.code})
                      </option>
                    ))
                  ) : (
                    // Fallback options if countries can't be loaded
                    <>
                      <option value="IN">India (IN)</option>
                      <option value="US">United States (US)</option>
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="CA">Canada (CA)</option>
                      <option value="AU">Australia (AU)</option>
                    </>
                  )}
                </select>
                {countries.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">Using fallback country list</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={companyFormData.email}
                  onChange={(e) => handleCompanyFormChange('email', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter email address"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={companyFormData.phone}
                  onChange={(e) => handleCompanyFormChange('phone', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter phone number"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={companyFormData.gstin}
                  onChange={(e) => handleCompanyFormChange('gstin', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter GSTIN"
                />
              </div>

              {/* PAN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN
                </label>
                <input
                  type="text"
                  value={companyFormData.pan}
                  onChange={(e) => handleCompanyFormChange('pan', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Enter PAN"
                />
              </div>

              {/* Default Company */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={companyFormData.is_default}
                    onChange={(e) => handleCompanyFormChange('is_default', e.target.checked)}
                    disabled={isReadOnly}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Set as default company
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={closeCompanyModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSaveCompany}
                disabled={modalLoading || !companyFormData.company_name || !companyFormData.address_line1 || !companyFormData.city || !companyFormData.state || !companyFormData.postal_code || !companyFormData.country_id}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {modalLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Company
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Invoice Settings Modal Component
  const renderInvoiceSettingsModal = () => {
    if (!showInvoiceSettingsModal) return null;

    const isReadOnly = invoiceSettingsModalMode === 'view';
    const modalTitle = invoiceSettingsModalMode === 'add' ? 'Create Invoice Settings' : 
                      invoiceSettingsModalMode === 'edit' ? 'Edit Invoice Settings' : 'Invoice Settings Details';

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">{modalTitle}</h3>
            <button
              onClick={closeInvoiceSettingsModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice Prefix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Prefix *
                </label>
                <input
                  type="text"
                  value={invoiceSettingsFormData.invoice_prefix}
                  onChange={(e) => handleInvoiceSettingsFormChange('invoice_prefix', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="e.g., INV"
                />
              </div>

              {/* Invoice Suffix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Suffix
                </label>
                <input
                  type="text"
                  value={invoiceSettingsFormData.invoice_suffix}
                  onChange={(e) => handleInvoiceSettingsFormChange('invoice_suffix', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="Optional suffix"
                />
              </div>

              {/* Number Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number Format *
                </label>
                <select
                  value={invoiceSettingsFormData.number_format}
                  onChange={(e) => handleInvoiceSettingsFormChange('number_format', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value="YYYY-MM-####">YYYY-MM-#### (2024-01-0001)</option>
                  <option value="####">#### (0001)</option>
                  <option value="YYYY####">YYYY#### (20240001)</option>
                  <option value="MM-####">MM-#### (01-0001)</option>
                </select>
              </div>

              {/* Due Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Days *
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={invoiceSettingsFormData.due_days}
                  onChange={(e) => handleInvoiceSettingsFormChange('due_days', parseInt(e.target.value) || 30)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="30"
                />
              </div>

              {/* Default Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Tax Rate (%) *
                </label>
                <select
                  value={invoiceSettingsFormData.default_tax_rate}
                  onChange={(e) => handleInvoiceSettingsFormChange('default_tax_rate', parseFloat(e.target.value) || 0)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              {/* Late Fee Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Late Fee (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={invoiceSettingsFormData.late_fee_percentage}
                  onChange={(e) => handleInvoiceSettingsFormChange('late_fee_percentage', parseFloat(e.target.value) || 0)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="0"
                />
              </div>

              {/* Financial Year Start Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Financial Year Start Month *
                </label>
                <select
                  value={invoiceSettingsFormData.financial_year_start_month}
                  onChange={(e) => handleInvoiceSettingsFormChange('financial_year_start_month', parseInt(e.target.value) || 4)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>

              {/* Current Financial Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Financial Year *
                </label>
                <input
                  type="text"
                  value={invoiceSettingsFormData.current_financial_year}
                  onChange={(e) => handleInvoiceSettingsFormChange('current_financial_year', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="e.g., 2024-25"
                />
              </div>

              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template *
                </label>
                <select
                  value={invoiceSettingsFormData.template_name}
                  onChange={(e) => handleInvoiceSettingsFormChange('template_name', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value="default">Default</option>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              {/* Currency Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency Position *
                </label>
                <select
                  value={invoiceSettingsFormData.currency_position}
                  onChange={(e) => handleInvoiceSettingsFormChange('currency_position', e.target.value as 'before' | 'after')}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    isReadOnly ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                >
                  <option value="before">Before Amount (₹100)</option>
                  <option value="after">After Amount (100₹)</option>
                </select>
              </div>

              {/* Enable GST */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={invoiceSettingsFormData.enable_gst}
                    onChange={(e) => handleInvoiceSettingsFormChange('enable_gst', e.target.checked)}
                    disabled={isReadOnly}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable GST calculations
                  </span>
                </label>
              </div>

              {/* Reset Annually */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={invoiceSettingsFormData.reset_annually}
                    onChange={(e) => handleInvoiceSettingsFormChange('reset_annually', e.target.checked)}
                    disabled={isReadOnly}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Reset invoice numbers annually
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={closeInvoiceSettingsModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSaveInvoiceSettings}
                disabled={modalLoading || !invoiceSettingsFormData.invoice_prefix || !invoiceSettingsFormData.number_format || !invoiceSettingsFormData.current_financial_year || !invoiceSettingsFormData.template_name}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {modalLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">Invoice Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: FileText },
              { key: 'invoices', label: 'Invoices', icon: FileText },
              { key: 'customers', label: 'Customers', icon: Users },
              { key: 'products', label: 'Products', icon: Package },
              { key: 'settings', label: 'Settings', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'invoices' && renderInvoicesList()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {/* Product Modal */}
      {renderProductModal()}
      
      {/* Company Settings Modal */}
      {renderCompanyModal()}
      
      {/* Invoice Settings Modal */}
      {renderInvoiceSettingsModal()}
      
      {/* Confirmation Dialog */}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
};

export default InvoiceManagement;
