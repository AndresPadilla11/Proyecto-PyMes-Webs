import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';

import type { CreateInvoicePayload, Invoice, InvoiceItem } from '../services/invoiceService';
import { createInvoice, getInvoices, deleteInvoice } from '../services/invoiceService';
import { getProducts, type Product } from '../services/productService';

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    number: string;
    clientId: string;
    issueDate: string;
  }>({
    number: '',
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0]
  });
  const [items, setItems] = useState<Array<InvoiceItem & { id: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoices = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      setError('No fue posible cargar las facturas.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      // Filtrar solo productos activos con stock > 0
      setProducts(data.filter(p => p.isActive && Number(p.stock) > 0));
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  useEffect(() => {
    void fetchInvoices();
    void fetchProducts();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productId: '',
        quantity: 1,
        unitPrice: undefined,
        taxRate: undefined
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Si se selecciona un producto, cargar sus datos
          if (field === 'productId' && typeof value === 'string') {
            const product = products.find(p => p.id === value);
            if (product) {
              updatedItem.unitPrice = Number(product.price);
              updatedItem.taxRate = Number(product.defaultTaxRate);
              updatedItem.description = product.name;
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting) {
      return;
    }

    // Validar que haya al menos un item
    if (items.length === 0) {
      alert('Debes agregar al menos un producto a la factura');
      return;
    }

    // Validar que todos los items tengan producto seleccionado
    const invalidItems = items.filter(item => !item.productId);
    if (invalidItems.length > 0) {
      alert('Todos los items deben tener un producto seleccionado');
      return;
    }
    
    setIsSubmitting(true);
    setWarnings([]);
    setShowWarnings(false);
    
    try {
      const payload: CreateInvoicePayload = {
        number: formData.number,
        clientId: formData.clientId || undefined,
        items: items.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          description: item.description,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate
        })),
        issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        paymentMethod: 'CASH',
        currency: 'COP'
      };
      
      const result = await createInvoice(payload);
      
      // Si hay warnings, mostrarlos
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
        setShowWarnings(true);
      } else {
        alert('Factura creada exitosamente');
      }
      
      // Agregar la nueva factura a la lista
      setInvoices((prevInvoices) => [result.invoice, ...prevInvoices]);
      
      // Limpiar formulario
      setFormData({
        number: '',
        clientId: '',
        issueDate: new Date().toISOString().split('T')[0]
      });
      setItems([]);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'No fue posible crear la factura. Intenta nuevamente.';
      alert(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(numAmount);
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      DRAFT: { label: 'Borrador', className: 'bg-gray-500' },
      ISSUED: { label: 'Emitida', className: 'bg-blue-500' },
      PAID: { label: 'Pagada', className: 'bg-green-500' },
      CANCELLED: { label: 'Cancelada', className: 'bg-red-500' }
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={`px-2 py-1 rounded text-white text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getProductStock = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? Number(product.stock) : 0;
  };

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    // Pedir confirmación al usuario
    const confirmed = window.confirm(
      `¿Está seguro de eliminar la factura "${invoiceNumber}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteInvoice(id);
      
      // Mostrar notificación de éxito
      alert(`Factura "${invoiceNumber}" eliminada exitosamente.`);
      
      // Actualizar la lista de facturas removiendo la eliminada
      setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== id));
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'No fue posible eliminar la factura. Intenta nuevamente.';
      alert(`Error: ${errorMessage}`);
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="bg-card-background rounded-3xl shadow-lg p-8">
        <h2 className="text-4xl lg:text-5xl font-extrabold mb-3 text-text-dark tracking-tight">Gestión de Facturas</h2>
        <p className="text-text-light text-lg">Administra tus facturas y documentos</p>
      </div>
      
      {/* Alertas de stock bajo */}
      {showWarnings && warnings.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-2xl shadow-md">
          <div className="flex justify-between items-start">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Venta registrada, pero atención:</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowWarnings(false)}
              className="ml-4 text-yellow-400 hover:text-yellow-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Formulario */}
      <form 
        onSubmit={handleSubmit} 
        className="bg-card-background rounded-3xl shadow-md p-8 border-b-2 border-gray-100 mb-8" 
        noValidate
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col">
            <label htmlFor="number" className="block mb-2 font-medium text-text-dark">
              Número de Factura *
            </label>
            <input
              id="number"
              name="number"
              type="text"
              value={formData.number}
              onChange={handleInputChange}
              required
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Ej: INV-001"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="clientId" className="block mb-2 font-medium text-text-dark">
              ID del Cliente
            </label>
            <input
              id="clientId"
              name="clientId"
              type="text"
              value={formData.clientId}
              onChange={handleInputChange}
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="ID del cliente"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="issueDate" className="block mb-2 font-medium text-text-dark">
              Fecha de Emisión
            </label>
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              value={formData.issueDate}
              onChange={handleInputChange}
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Lista de productos */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-text-dark">Productos</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-blue-500 text-white px-5 py-2.5 rounded-2xl hover:bg-blue-600 active:bg-blue-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner"
            >
              + Agregar Producto
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-text-light text-center py-8 bg-gray-50 rounded-2xl">No hay productos agregados. Haz clic en "Agregar Producto" para comenzar.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const stock = getProductStock(item.productId);
                const selectedProduct = products.find(p => p.id === item.productId);
                return (
                  <div key={item.id} className="border-2 border-gray-200 rounded-2xl p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-2">
                        <label className="block mb-2 text-sm font-medium text-text-dark">
                          Producto *
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                          required
                          className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="">Seleccionar producto</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock})
                            </option>
                          ))}
                        </select>
                        {selectedProduct && (
                          <p className="text-xs text-text-light mt-2">
                            Stock disponible: {stock}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-text-dark">
                          Cantidad *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={stock}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                          required
                          className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        {item.quantity > stock && (
                          <p className="text-xs text-danger-red mt-2 font-medium">Cantidad excede el stock disponible</p>
                        )}
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-text-dark">
                          Precio Unitario
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                          className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Precio"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="bg-red-500 text-white px-4 py-2.5 rounded-2xl hover:bg-red-600 active:bg-red-700 transition-all duration-200 font-semibold w-full active:scale-[0.98] active:shadow-inner"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={isSubmitting || items.length === 0}
            className="bg-blue-500 text-white px-6 py-3 rounded-2xl hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner"
          >
            {isSubmitting ? 'Guardando...' : 'Crear Factura'}
          </button>
        </div>
      </form>

      {invoices.length === 0 ? (
        <div className="bg-card-background rounded-3xl shadow-md p-12 text-center">
          <div className="bg-purple-50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-12 h-12 text-primary-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-text-light text-lg">No hay facturas registradas.</p>
        </div>
      ) : (
        <div className="bg-card-background rounded-3xl shadow-md overflow-hidden border-b-2 border-gray-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Número</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Cliente ID</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Fecha de Emisión</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Total</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Estado</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 py-4 border-b border-gray-100 text-text-dark font-medium">{invoice.number}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-light">{invoice.clientId ?? '-'}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-light">{formatDate(invoice.issueDate)}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-dark font-semibold">{formatCurrency(invoice.total)}</td>
                  <td className="p-4 py-4 border-b border-gray-100">{getStatusBadge(invoice.status)}</td>
                  <td className="p-4 py-4 border-b border-gray-100">
                    <button
                      onClick={() => handleDeleteInvoice(invoice.id, invoice.number)}
                      className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-4 py-2 rounded-2xl transition-all duration-200 flex items-center gap-2 font-semibold active:scale-[0.98] active:shadow-inner"
                      title="Eliminar factura"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-sm">Eliminar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
