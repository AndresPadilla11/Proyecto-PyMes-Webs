import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import logoIcon from '../assets/logo-pymes-contables.svg';
import AdminUnlockModal from '../components/AdminUnlockModal';
import { useAuth } from '../context/AuthContext';
import { closeDayShift } from '../services/cashRegisterService';
import type { CreateInvoicePayload, InvoiceItem } from '../services/invoiceService';
import { createInvoice } from '../services/invoiceService';
import type { Product } from '../services/productService';
import { getProducts } from '../services/productService';

interface CartItem extends InvoiceItem {
  id: string;
  productName: string;
  stock: number;
  subtotal: number;
}

const POS = () => {
  const { user, setAdminMode, promoteToAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const isUserAdmin = user?.role === 'ADMIN';
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-${Date.now().toString().slice(-6)}`
  );
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [applyIva, setApplyIva] = useState<boolean>(false);
  const [isClosingShift, setIsClosingShift] = useState<boolean>(false);
  const [cashRegisterId] = useState<number>(1);
  const [startingBalance, setStartingBalance] = useState<number>(0);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getProducts();
        setProducts(data.filter(p => p.isActive && Number(p.stock) > 0));
      } catch (err: unknown) {
        let errorMessage = 'No fue posible cargar los productos.';
        
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { message?: string; error?: string; code?: string }; status?: number } };

          if (axiosError.response?.status === 401) {
            errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          } else if (axiosError.response?.status === 500) {
            if (axiosError.response?.data?.code === 'P2022' || axiosError.response?.data?.error === 'P2022 - Columna inexistente' || 
                axiosError.response?.data?.message?.includes('cliente de Prisma') || 
                axiosError.response?.data?.message?.includes('esquema de base de datos')) {
              errorMessage = 'Error de configuración del servidor: El cliente de base de datos está desactualizado. Por favor, contacta al administrador del sistema.';
            } else if (axiosError.response?.data?.message) {
              errorMessage = axiosError.response.data.message;
            } else {
              errorMessage = 'Error del servidor. Verifica que el backend esté funcionando correctamente.';
            }
          } else if (axiosError.response?.data?.message) {
            errorMessage = axiosError.response.data.message;
          } else if (axiosError.response?.data?.error) {
            errorMessage = axiosError.response.data.error;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message || errorMessage;
        }
        
        setError(errorMessage);
        console.error('Error al cargar productos:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProducts();
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const availableStock = selectedProduct ? Number(selectedProduct.stock) : 0;

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = () => {
    if (!selectedProductId || !selectedProduct) {
      alert('Por favor selecciona un producto');
      return;
    }

    if (quantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (quantity > availableStock) {
      alert(`Stock insuficiente. Stock disponible: ${availableStock}`);
      return;
    }

    const existingItem = cart.find(item => item.productId === selectedProductId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > availableStock) {
        alert(`Stock insuficiente. Stock disponible: ${availableStock}`);
        return;
      }
      setCart(cart.map(item => 
        item.id === existingItem.id
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * Number(item.unitPrice || selectedProduct.price)
            }
          : item
      ));
    } else {
      const unitPrice = Number(selectedProduct.price);
      const newItem: CartItem = {
        id: Date.now().toString(),
        productId: selectedProductId,
        productName: selectedProduct.name,
        quantity: quantity,
        stock: availableStock,
        description: selectedProduct.name,
        unitPrice: unitPrice,
        taxRate: 0,
        subtotal: quantity * unitPrice
      };
      setCart([...cart, newItem]);
    }

    setSelectedProductId('');
    setQuantity(1);
    setSearchQuery('');
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    setCart(cart.map(item => {
      if (item.id === id) {
        const maxQuantity = item.stock;
        const finalQuantity = Math.min(newQuantity, maxQuantity);
        return {
          ...item,
          quantity: finalQuantity,
          subtotal: finalQuantity * Number(item.unitPrice || 0)
        };
      }
      return item;
    }));
  };

  const handleAdminUnlockSuccess = () => {
    setAdminMode(true);
    setShowAdminModal(false);
    navigate('/dashboard');
  };

  const handleCloseShift = async () => {
    const confirmed = window.confirm(
      '¿Está seguro de cerrar la caja? Esta acción finaliza el turno y registra el cierre de caja.'
    );

    if (!confirmed) {
      return;
    }

    const userId = user?.id;
    if (!userId) {
      alert('Error: No se pudo identificar al usuario para el cierre. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (isNaN(startingBalance) || startingBalance < 0) {
      alert('Error: El saldo inicial debe ser un número válido mayor o igual a 0.');
      return;
    }

    const actualFinalBalanceStr = window.prompt(
      `Ingrese el monto contado real en la caja:\n\n` +
      `Saldo inicial: ${formatCurrency(startingBalance)}\n` +
      `Total de ventas en carrito: ${formatCurrency(calculateTotal())}\n\n` +
      `Monto contado real:`
    );

    if (actualFinalBalanceStr === null) {
      return;
    }

    const actualFinalBalance = parseFloat(actualFinalBalanceStr.replace(/[^\d.-]/g, '')) || 0;
    
    if (isNaN(actualFinalBalance) || actualFinalBalance < 0) {
      alert('Error: El monto contado debe ser un número válido mayor o igual a 0.');
      return;
    }

    try {
      setIsClosingShift(true);

      const result = await closeDayShift({
        cashRegisterId: cashRegisterId,
        startingBalance: startingBalance,
        finalBalance: actualFinalBalance
      });

      alert(
        `¡Cierre de caja exitoso!\n\n` +
        `Total de ventas del turno: ${formatCurrency(result.salesTotal)}\n` +
        `Saldo inicial: ${formatCurrency(result.startingBalance)}\n` +
        `Saldo final: ${formatCurrency(result.finalBalance)}\n` +
        `Hora de cierre: ${new Date(result.closingTime).toLocaleString('es-CO')}`
      );

      setStartingBalance(0);
    } catch (err: any) {
      let errorMessage = 'No fue posible cerrar la caja. Intenta nuevamente.';
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      if (errorMessage.includes('migración') || errorMessage.includes('tabla') || errorMessage.includes('tablas')) {
        errorMessage = 'Las tablas de cierre de caja no están disponibles. Por favor, ejecuta la migración de Prisma en el backend.';
      } else if (errorMessage.includes('no encontrada') || errorMessage.includes('no existe')) {
        errorMessage = 'Caja registradora no encontrada. La caja se creará automáticamente.';
      }
      
      alert(`Error: ${errorMessage}`);
      console.error('Error al cerrar caja:', err);
    } finally {
      setIsClosingShift(false);
    }
  };

  const handleFinalizeSale = async (e: FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('El carrito está vacío. Agrega productos antes de finalizar la venta.');
      return;
    }

    setIsSubmitting(true);
    setWarnings([]);
    setShowWarnings(false);

    try {
      const payload: CreateInvoicePayload = {
        number: invoiceNumber,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          description: item.description,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate
        })),
        issueDate: new Date().toISOString().split('T')[0],
        status: 'ISSUED',
        paymentMethod: 'CASH',
        currency: 'COP',
        applyIva: applyIva
      };

      const result = await createInvoice(payload);

      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
        setShowWarnings(true);
      } else {
        alert('¡Venta realizada exitosamente!');
      }

      setCart([]);
      setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'No fue posible realizar la venta. Intenta nuevamente.';
      alert(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const IVA_RATE = 0.19;

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateImpuesto = () => {
    if (applyIva) {
      return calculateSubtotal() * IVA_RATE;
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const impuesto = calculateImpuesto();
    return subtotal + impuesto;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-600">Cargando productos...</p>
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
    <div className="min-h-screen bg-background-light">
      <header className="w-full bg-card-background shadow-md sticky top-0 z-40 border-b border-gray-200">
        <div className="flex justify-between items-center px-6 lg:px-8 h-16 lg:h-20">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200">
              <img src={logoIcon} alt="PyMes Contables" className="w-8 h-8 lg:w-10 lg:h-10" />
              <div className="hidden sm:flex flex-col">
                <span className="text-sm lg:text-base font-bold text-text-dark leading-tight">PyMes</span>
                <span className="text-xs text-text-light font-medium leading-tight">Contables</span>
              </div>
            </Link>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 rounded-2xl p-2.5">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-light font-medium">Cajero</span>
                <span className="text-base lg:text-lg font-bold text-text-dark">{user?.fullName || 'Usuario'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isUserAdmin && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('¿Deseas convertir tu cuenta en Administrador? Esto te dará acceso completo al panel de administración.')) {
                    try {
                      setIsPromoting(true);
                      await promoteToAdmin();
                      alert('¡Felicidades! Ahora eres Administrador. El botón de ADMIN estará disponible.');
                    } catch (error: any) {
                      const errorMessage = error?.response?.data?.message || error?.message || 'No fue posible promover tu cuenta a ADMIN. Intenta nuevamente.';
                      alert(errorMessage);
                    } finally {
                      setIsPromoting(false);
                    }
                  }
                }}
                disabled={isPromoting}
                className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                title="Convertirse en Administrador"
              >
                {isPromoting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Ser ADMIN</span>
                  </>
                )}
              </button>
            )}
            {isUserAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowAdminModal(true);
                }}
                className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner"
                title="Acceso de Administrador"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>ADMIN</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Deseas cerrar sesión?')) {
                  logout();
                  navigate('/login');
                }
              }}
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold py-2.5 px-5 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner"
              title="Cerrar Sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {showWarnings && warnings.length > 0 && (
        <div className="mx-4 mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-start">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
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
              className="ml-4 text-yellow-400 hover:text-yellow-600 transition-colors"
            >
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className="mx-4 lg:mx-6 mt-6 pb-6 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-4 bg-card-background rounded-3xl shadow-md p-6 lg:p-8 border-b-2 border-gray-100">
            <h3 className="text-xl font-bold text-text-dark mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Productos
            </h3>

            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="product" className="block mb-2 font-medium text-text-dark">
                  Seleccionar Producto *
                </label>
                <select
                  id="product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all"
                >
                  <option value="">Seleccionar producto</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Stock: {product.stock} - {formatCurrency(Number(product.price))}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="mt-2 text-sm text-text-light bg-purple-50 rounded p-2">
                    <span className="font-semibold">Stock disponible:</span> {availableStock} unidades
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="quantity" className="block mb-2 font-medium text-text-dark">
                  Cantidad *
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={availableStock}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all"
                  placeholder="Cantidad"
                />
                {selectedProduct && quantity > availableStock && (
                  <p className="mt-2 text-sm text-danger-red font-medium">⚠️ Cantidad excede el stock disponible</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedProductId || quantity <= 0 || quantity > availableStock}
                className="w-full bg-blue-500 text-white py-4 px-4 rounded-2xl hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg font-semibold shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner disabled:transform-none"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar al Carrito
                </span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-card-background rounded-3xl shadow-md p-6 lg:p-8 border-b-2 border-gray-100">
            <h3 className="text-xl font-bold text-text-dark mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-secondary-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Carrito de Compras
              {cart.length > 0 && (
                <span className="ml-2 bg-primary-purple text-white px-3 py-1 rounded-full text-sm font-bold">
                  {cart.length}
                </span>
              )}
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500 text-lg">El carrito está vacío</p>
                <p className="text-gray-400 text-sm mt-2">Agrega productos para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-2xl p-5 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-text-dark text-base">{item.productName}</h4>
                        <p className="text-sm text-text-light mt-1">
                          {formatCurrency(Number(item.unitPrice || 0))} c/u
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="ml-4 text-danger-red hover:text-red-700 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-300 hover:bg-gray-400 rounded-full flex items-center justify-center font-bold text-text-dark"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                          className="w-16 text-center border-2 border-gray-300 rounded-lg p-1 font-bold text-base"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-8 h-8 bg-primary-purple hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-text-dark text-lg">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-card-background rounded-3xl shadow-md p-6 lg:p-8 border-b-2 border-gray-100">
            <h3 className="text-xl font-bold text-text-dark mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Total
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-text-light">Subtotal:</span>
                  <span className="font-semibold text-text-dark">{formatCurrency(calculateSubtotal())}</span>
                </div>
                {applyIva && (
                  <div className="flex justify-between text-base">
                    <span className="text-text-light">Impuesto (19%):</span>
                    <span className="font-semibold text-primary-purple">{formatCurrency(calculateImpuesto())}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-300 pt-3 flex justify-between text-2xl font-bold">
                  <span className="text-text-dark">Total:</span>
                  <span className="text-primary-purple">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-primary-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <span className="text-base font-semibold text-text-dark">Aplicar Impuesto (19%)</span>
                      <p className="text-xs text-text-light">IVA - Impuesto al Valor Agregado</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApplyIva(!applyIva)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-purple focus:ring-offset-2 ${
                      applyIva ? 'bg-primary-purple' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        applyIva ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <form onSubmit={handleFinalizeSale} className="space-y-4">
                <div>
                  <label htmlFor="invoiceNumber" className="block mb-2 font-medium text-text-dark">
                    Número de Factura
                  </label>
                  <input
                    id="invoiceNumber"
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full bg-blue-500 text-white py-4 px-4 rounded-2xl hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] active:shadow-inner disabled:transform-none"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Finalizar Venta
                    </span>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-300 space-y-4">
                <div>
                  <label htmlFor="startingBalance" className="block mb-2 font-medium text-text-dark">
                    Saldo Inicial de Caja
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-text-light font-semibold">$</span>
                    <input
                      id="startingBalance"
                      type="number"
                      min="0"
                      step="0.01"
                      value={startingBalance}
                      onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                      className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent text-base"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-text-light mt-1">
                    Monto inicial en efectivo al comenzar el turno
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseShift}
                  disabled={isClosingShift}
                  className="w-full bg-blue-500 text-white py-3 px-4 rounded-2xl hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner disabled:transform-none"
                >
                  {isClosingShift ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cerrando caja...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Cerrar Caja
                    </span>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Finaliza el turno y registra el cierre de caja
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showAdminModal && (
        <AdminUnlockModal
          isOpen={showAdminModal}
          onClose={() => {
            setShowAdminModal(false);
          }}
          onSuccess={() => {
            handleAdminUnlockSuccess();
          }}
        />
      )}
    </div>
  );
};

export default POS;
