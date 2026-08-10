import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, X, Package, RefreshCw } from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { useToast } from '../ui/ToastProvider';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { Product, CreateProductData } from '../../types/invoice';

const ProductManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    product_code: '',
    category: '',
    unit_price: 0,
    unit: '',
    tax_rate: 18,
    hsn_code: '',
    is_active: true,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    loadProducts();
  }, [currentPage, searchTerm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await invoiceService.getProducts(
        { search: searchTerm || undefined },
        currentPage,
        20
      );
      setProducts(result.data || []);
      setTotalPages(result.total_pages || 1);
    } catch (err) {
      showError(`Failed to load products: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: 'view' | 'edit' | 'add', product?: Product) => {
    setModalMode(mode);
    setSelectedProduct(product ?? null);
    if (mode === 'add') {
      setFormData({
        name: '',
        description: '',
        product_code: '',
        category: '',
        unit_price: 0,
        unit: '',
        tax_rate: 18,
        hsn_code: '',
        is_active: true,
      });
    } else if (product) {
      setFormData({
        name: product.name,
        description: product.description ?? '',
        product_code: product.product_code ?? '',
        category: product.category ?? '',
        unit_price: product.unit_price,
        unit: product.unit,
        tax_rate: product.tax_rate,
        hsn_code: product.hsn_code ?? '',
        is_active: product.is_active,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setModalLoading(false);
  };

  const handleChange = (field: keyof CreateProductData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Product name is required.');
      return;
    }
    try {
      setModalLoading(true);
      if (modalMode === 'add') {
        await invoiceService.createProduct(formData);
        showSuccess('Product created successfully!');
      } else if (modalMode === 'edit' && selectedProduct) {
        await invoiceService.updateProduct(selectedProduct.id, formData);
        showSuccess('Product updated successfully!');
      }
      closeModal();
      await loadProducts();
    } catch (err) {
      showError(`Failed to save product: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: `Delete "${product.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await invoiceService.deleteProduct(product.id);
      showSuccess('Product deleted successfully!');
      await loadProducts();
    } catch (err) {
      showError(`Failed to delete product: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog {...dialogProps} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products & Services</h2>
          <p className="text-sm text-gray-500 mt-1">Shared catalog used across all entities</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button
            onClick={loadProducts}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => openModal('add')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search products by name, code, or description..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No products match your search.' : 'No products yet. Add your first product to get started.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => openModal('add')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {products.length} product{products.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.product_code}</div>
                        {product.description && (
                          <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">{product.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.category || '—'}</div>
                        {product.hsn_code && (
                          <div className="text-xs text-gray-500">HSN: {product.hsn_code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / {product.unit}
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
                          <button onClick={() => openModal('view', product)} className="text-blue-600 hover:text-blue-900" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openModal('edit', product)} className="text-gray-600 hover:text-gray-900" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product)} className="text-red-600 hover:text-red-900" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">Page {currentPage} of {totalPages}</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {modalMode === 'add' ? 'Add New Product' : modalMode === 'edit' ? 'Edit Product' : 'Product Details'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)}
                    disabled={modalMode === 'view'} placeholder="Enter product name"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${modalMode === 'view' ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Code</label>
                  <input type="text" value={formData.product_code} onChange={e => handleChange('product_code', e.target.value)}
                    disabled={modalMode === 'view'} placeholder="Enter product code"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${modalMode === 'view' ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)}
                    disabled={modalMode === 'view'} placeholder="Enter product description" rows={3}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${modalMode === 'view' ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input type="text" value={formData.category} onChange={e => handleChange('category', e.target.value)}
                    disabled={modalMode === 'view'} placeholder="e.g., Software, Consulting"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${modalMode === 'view' ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">HSN/SAC Code</label>
                  <input type="text" value={formData.hsn_code} onChange={e => handleChange('hsn_code', e.target.value)}
                    disabled={modalMode === 'view'} placeholder="Enter HSN/SAC code"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${modalMode === 'view' ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price</label>
                  <input type="number" min="0" step="0.01" value={formData.unit_price}
                    onChange={e => handleChange('unit_price', parseFloat(e.target.value) || 0)}
                    disabled={modalMode === 'view'} placeholder="Enter unit price"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${modalMode === 'view' ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <input type="text" value={formData.unit} onChange={e => handleChange('unit', e.target.value)}
                    disabled={modalMode === 'view'} placeholder="e.g., pcs, hrs, kg"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${modalMode === 'view' ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={formData.tax_rate}
                    onChange={e => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                    disabled={modalMode === 'view'} placeholder="Enter tax rate"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${modalMode === 'view' ? 'bg-gray-50 text-gray-500' : ''}`} />
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="is_active" checked={formData.is_active}
                    onChange={e => handleChange('is_active', e.target.checked)}
                    disabled={modalMode === 'view'} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                  <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-700">Active</label>
                </div>
              </div>
            </div>

            {modalMode !== 'view' && (
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={closeModal}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md text-sm font-medium hover:from-red-600 hover:to-red-700">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={modalLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {modalLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : 'Save Product'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
