import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, X, Filter,
  DollarSign, TrendingUp, Tag, Calendar,
  CreditCard, FileText, RefreshCw, CheckCircle, ArrowUpCircle
} from 'lucide-react';
import {
  financeService,
  ManualTransaction,
  CreateTransactionData,
  IncomeCategory
} from '../../services/financeService';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ui/ConfirmDialog';

type TabType = 'income' | 'categories';

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'neft', label: 'NEFT/RTGS' },
  { value: 'other', label: 'Other' }
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface IncomeStats {
  totalCount: number;
  totalNetAmount: number;
  thisMonth: number;
  categoryCount: number;
  byCategory: { category: string; amount: number; count: number }[];
}


const IncomeManagement: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('income');

  // Income entries state
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ManualTransaction[]>([]);
  const [stats, setStats] = useState<IncomeStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Categories state
  const [categories, setCategories] = useState<IncomeCategory[]>([]);

  // Income entry modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryModalMode, setEntryModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedEntry, setSelectedEntry] = useState<ManualTransaction | null>(null);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        financeService.getTransactions({ type: 'income' }),
        financeService.getIncomeCategories()
      ]);
      setEntries(data);
      setCategories(cats);
      computeStats(data, cats);
    } catch (error) {
      console.error('Error loading income data:', error);
      showError('Failed to load income data');
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    try {
      const data = await financeService.getTransactions({ type: 'income' });
      setEntries(data);
      computeStats(data, categories);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await financeService.getIncomeCategories();
      setCategories(cats);
      computeStats(entries, cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const computeStats = (data: ManualTransaction[], cats: IncomeCategory[]) => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const totalNetAmount = data.reduce((sum, e) => sum + e.net_amount, 0);
    const thisMonth = data
      .filter(e => e.transaction_date >= thisMonthStart && e.transaction_date <= thisMonthEnd)
      .reduce((sum, e) => sum + e.net_amount, 0);

    const categoryMap: Record<string, { amount: number; count: number }> = {};
    data.forEach(e => {
      const cat = e.category || 'Uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
      categoryMap[cat].amount += e.net_amount;
      categoryMap[cat].count += 1;
    });
    const byCategory = Object.entries(categoryMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.amount - a.amount);

    setStats({
      totalCount: data.length,
      totalNetAmount,
      thisMonth,
      categoryCount: cats.length,
      byCategory
    });
  };

  // ---- Entry handlers ----
  const openEntryModal = (mode: 'create' | 'edit' | 'view', entry?: ManualTransaction) => {
    setEntryModalMode(mode);
    setSelectedEntry(entry || null);
    setShowEntryModal(true);
  };

  const closeEntryModal = () => {
    setShowEntryModal(false);
    setSelectedEntry(null);
  };

  const handleSaveEntry = async (data: CreateTransactionData) => {
    try {
      if (entryModalMode === 'create') {
        await financeService.createTransaction({ ...data, transaction_type: 'income' });
        showSuccess('Income entry added successfully');
      } else if (selectedEntry) {
        await financeService.updateTransaction(selectedEntry.id, data);
        showSuccess('Income entry updated successfully');
      }
      closeEntryModal();
      await loadEntries();
    } catch (error) {
      console.error('Error saving:', error);
      showError('Failed to save income entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Income Entry',
      message: 'Are you sure you want to delete this income entry? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await financeService.deleteTransaction(id);
      showSuccess('Income entry deleted');
      await loadEntries();
    } catch (error) {
      console.error('Error deleting:', error);
      showError('Failed to delete income entry');
    }
  };

  // ---- Category handlers ----
  const openCategoryModal = (mode: 'create' | 'edit', cat?: IncomeCategory) => {
    setCategoryModalMode(mode);
    setSelectedCategory(cat || null);
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setSelectedCategory(null);
  };

  const handleSaveCategory = async (name: string, description?: string) => {
    try {
      if (categoryModalMode === 'create') {
        await financeService.createIncomeCategory(name, description);
        showSuccess('Category created successfully');
      } else if (selectedCategory) {
        await financeService.updateIncomeCategory(selectedCategory.id, { name, description: description || null });
        showSuccess('Category updated successfully');
      }
      closeCategoryModal();
      await loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      showError('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await financeService.deleteIncomeCategory(id);
      showSuccess('Category deleted');
      await loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('Failed to delete category');
    }
  };

  // ---- Filters ----
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const filteredEntries = entries.filter(e => {
    const matchSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.party_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !categoryFilter || (e.category || '') === categoryFilter;
    const matchDateFrom = !dateFrom || e.transaction_date >= dateFrom;
    const matchDateTo = !dateTo || e.transaction_date <= dateTo;
    return matchSearch && matchCategory && matchDateFrom && matchDateTo;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpCircle className="w-7 h-7 text-green-600" />
            Income Management
          </h1>
          <p className="text-gray-600 mt-1">Track other income sources beyond invoice earnings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() =>
              activeTab === 'income'
                ? openEntryModal('create')
                : openCategoryModal('create')
            }
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'income' ? 'Add Income' : 'Add Category'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalNetAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Calendar className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.thisMonth)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-xl font-bold text-gray-900">{stats.categoryCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs + Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tab bar */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {([
              { id: 'income', label: 'Income Entries', icon: TrendingUp },
              { id: 'categories', label: 'Categories', icon: Tag }
            ] as { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'income' && entries.length > 0 && (
                    <span className="ml-1 bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                      {entries.length}
                    </span>
                  )}
                  {tab.id === 'categories' && categories.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                      {categories.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : (
          <>
            {/* ===== INCOME ENTRIES TAB ===== */}
            {activeTab === 'income' && (
              <>
                {/* Search & Filter Bar */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by title, reference, or party..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                        showFilters
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {(categoryFilter || dateFrom || dateTo) && (
                        <span className="ml-1 bg-green-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                          {[categoryFilter, dateFrom, dateTo].filter(Boolean).length}
                        </span>
                      )}
                    </button>
                    {(searchTerm || categoryFilter || dateFrom || dateTo) && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                        Clear
                      </button>
                    )}
                  </div>

                  {showFilters && (
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">All Categories</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Table */}
                {filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <TrendingUp className="w-12 h-12 mb-3 opacity-40" />
                    <p className="text-lg font-medium">
                      {entries.length === 0 ? 'No income entries yet' : 'No entries match your filters'}
                    </p>
                    {entries.length === 0 && (
                      <button
                        onClick={() => openEntryModal('create')}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Entry
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-3 font-semibold text-gray-700">Reference</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Title</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Category</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Party</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 text-right">Amount</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 text-right">Net Amount</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Payment</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredEntries.map(entry => (
                          <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-500">{entry.transaction_number}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{formatDate(entry.transaction_date)}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{entry.title}</div>
                              {entry.description && (
                                <div className="text-xs text-gray-500 truncate max-w-[200px]">{entry.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {entry.category ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  <Tag className="w-3 h-3" />
                                  {entry.category}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {entry.party_name || <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                              {formatCurrency(entry.amount)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-green-700">{formatCurrency(entry.net_amount)}</span>
                            </td>
                            <td className="px-4 py-3">
                              {entry.payment_method ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                                  <CreditCard className="w-3 h-3" />
                                  {paymentMethods.find(p => p.value === entry.payment_method)?.label || entry.payment_method}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openEntryModal('view', entry)}
                                  title="View"
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEntryModal('edit', entry)}
                                  title="Edit"
                                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  title="Delete"
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                      Showing {filteredEntries.length} of {entries.length} entries
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== CATEGORIES TAB ===== */}
            {activeTab === 'categories' && (
              <div className="p-6">
                {categories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Tag className="w-12 h-12 mb-3 opacity-40" />
                    <p className="text-lg font-medium">No categories yet</p>
                    <p className="text-sm mt-1">Create categories to organise your income entries</p>
                    <button
                      onClick={() => openCategoryModal('create')}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Category
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map(cat => {
                      const catStats = stats?.byCategory.find(c => c.category === cat.name);
                      return (
                        <div
                          key={cat.id}
                          className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                                <Tag className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                {cat.description && (
                                  <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0 ml-2">
                              <button
                                onClick={() => openCategoryModal('edit', cat)}
                                title="Edit"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                title="Delete"
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {catStats ? (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                              <span className="text-gray-500">{catStats.count} {catStats.count === 1 ? 'entry' : 'entries'}</span>
                              <span className="font-semibold text-green-700">{formatCurrency(catStats.amount)}</span>
                            </div>
                          ) : (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <span className="text-xs text-gray-400">No entries yet</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Income Entry Modal */}
      {showEntryModal && (
        <IncomeEntryModal
          mode={entryModalMode}
          entry={selectedEntry}
          categories={categories}
          onClose={closeEntryModal}
          onSave={handleSaveEntry}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <IncomeCategoryModal
          mode={categoryModalMode}
          category={selectedCategory}
          onClose={closeCategoryModal}
          onSave={handleSaveCategory}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
};

// ==================== INCOME ENTRY MODAL ====================

const IncomeEntryModal: React.FC<{
  mode: 'create' | 'edit' | 'view';
  entry: ManualTransaction | null;
  categories: IncomeCategory[];
  onClose: () => void;
  onSave: (data: CreateTransactionData) => void;
}> = ({ mode, entry, categories, onClose, onSave }) => {
  const isView = mode === 'view';
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<CreateTransactionData>(() => {
    if (entry && (mode === 'edit' || mode === 'view')) {
      return {
        transaction_type: 'income',
        title: entry.title,
        description: entry.description || '',
        amount: entry.amount,
        tax_amount: entry.tax_amount || 0,
        original_currency_code: entry.original_currency_code || 'INR',
        original_amount: entry.original_amount || entry.amount,
        exchange_rate: entry.exchange_rate || 1,
        inr_amount: entry.inr_amount || entry.amount,
        inr_tax_amount: entry.inr_tax_amount || entry.tax_amount,
        inr_net_amount: entry.inr_net_amount || entry.net_amount,
        transaction_date: entry.transaction_date,
        category: entry.category || '',
        payment_method: entry.payment_method || '',
        payment_reference: entry.payment_reference || '',
        party_name: entry.party_name || '',
        party_type: entry.party_type || 'customer',
        notes: entry.notes || ''
      };
    }
    return {
      transaction_type: 'income',
      title: '',
      description: '',
      amount: 0,
      tax_amount: 0,
      original_currency_code: 'INR',
      original_amount: 0,
      exchange_rate: 1,
      inr_amount: 0,
      inr_tax_amount: 0,
      inr_net_amount: 0,
      transaction_date: today,
      category: '',
      payment_method: 'bank_transfer',
      payment_reference: '',
      party_name: '',
      party_type: 'customer',
      notes: ''
    };
  });

  // Recalculate net amount whenever amount or tax changes
  const netAmount = (formData.original_amount || 0) - (formData.tax_amount || 0);

  const handleAmountChange = (val: number) => {
    const net = val - (formData.tax_amount || 0);
    setFormData(prev => ({
      ...prev,
      original_amount: val,
      amount: val,
      inr_amount: val,
      inr_net_amount: net,
      inr_tax_amount: prev.tax_amount || 0
    }));
  };

  const handleTaxChange = (val: number) => {
    const net = (formData.original_amount || 0) - val;
    setFormData(prev => ({
      ...prev,
      tax_amount: val,
      inr_tax_amount: val,
      inr_net_amount: net
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      transaction_type: 'income',
      amount: formData.original_amount || 0,
      inr_amount: formData.original_amount || 0,
      inr_net_amount: netAmount,
      inr_tax_amount: formData.tax_amount || 0
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-green-600" />
            {mode === 'create' ? 'Add Income Entry' : mode === 'edit' ? 'Edit Income Entry' : 'Income Entry Details'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isView}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50"
              placeholder="e.g., Consulting fee received, Bank interest"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isView}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={isView}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                disabled={isView}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                required
              />
            </div>
          </div>

          {/* Amount & Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.original_amount || ''}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                disabled={isView}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Deducted (TDS/GST ₹)</label>
              <input
                type="number"
                value={formData.tax_amount || ''}
                onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                disabled={isView}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Net Amount Display */}
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-green-800">Net Amount Received</span>
            <span className="text-lg font-bold text-green-700">{formatCurrency(netAmount)}</span>
          </div>

          {/* Party & Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received From</label>
              <input
                type="text"
                value={formData.party_name || ''}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                disabled={isView}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                placeholder="Client, bank, individual..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={formData.payment_method || ''}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                disabled={isView}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
              >
                <option value="">Select Method</option>
                {paymentMethods.map(pm => (
                  <option key={pm.value} value={pm.value}>{pm.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction ID</label>
            <input
              type="text"
              value={formData.payment_reference || ''}
              onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
              disabled={isView}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
              placeholder="UTR, cheque no., transaction ID..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={isView}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Info note about Finance Reports */}
          {!isView && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>This income will be included in Finance Reports under <strong>Other Income</strong> and counted in the overall income total.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isView ? 'Close' : 'Cancel'}
            </button>
            {!isView && (
              <button
                type="submit"
                className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                {mode === 'create' ? 'Add Income' : 'Save Changes'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== INCOME CATEGORY MODAL ====================

const IncomeCategoryModal: React.FC<{
  mode: 'create' | 'edit';
  category: IncomeCategory | null;
  onClose: () => void;
  onSave: (name: string, description?: string) => void;
}> = ({ mode, category, onClose, onSave }) => {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name.trim(), description.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-600" />
            {mode === 'create' ? 'Add Income Category' : 'Edit Income Category'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., Consulting, Interest Income"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Optional description for this category..."
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              {mode === 'create' ? 'Add Category' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncomeManagement;
