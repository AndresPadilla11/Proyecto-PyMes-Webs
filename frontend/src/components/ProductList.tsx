import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';

import type { CreateProductPayload, Product, UpdateProductPayload } from '../services/productService';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../services/productService';

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '0',
    cost: '0',
    stock: '0'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null); // Limpiar error anterior
      const data = await getProducts();
      setProducts(data);
    } catch (err: unknown) {
      // Manejo mejorado de errores con mensajes específicos
      let errorMessage = 'No fue posible cargar los productos.';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string; error?: string; code?: string }; status?: number } };
        
        if (axiosError.response?.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        } else if (axiosError.response?.status === 500) {
          // Error P2022: Cliente de Prisma desactualizado
          if (axiosError.response?.data?.code === 'P2022' || axiosError.response?.data?.error === 'P2022 - Columna inexistente' || 
              axiosError.response?.data?.message?.includes('cliente de Prisma') || 
              axiosError.response?.data?.message?.includes('esquema de base de datos')) {
            errorMessage = 'Error de configuración del servidor: El cliente de base de datos está desactualizado. Por favor, contacta al administrador del sistema.';
          } else if (axiosError.response?.data?.message) {
            errorMessage = axiosError.response.data.message;
          } else {
            errorMessage = 'Error del servidor. Verifica que el backend esté funcionando correctamente.';
          }
          console.error('Error del servidor al cargar productos:', axiosError.response?.data);
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

  useEffect(() => {
    void fetchProducts();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    
    // Para campos numéricos, validar que sean números válidos
    if (name === 'price' || name === 'cost' || name === 'stock') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) || value === '' || value === '.' || value === '-') {
        setFormData((prev) => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      price: typeof product.price === 'string' ? product.price : product.price.toString(),
      cost: typeof product.cost === 'string' ? product.cost : product.cost.toString(),
      stock: product.stock.toString()
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      price: '0',
      cost: '0',
      stock: '0'
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await deleteProduct(id);
        await fetchProducts();
      } catch (err) {
        alert('No fue posible eliminar el producto. Intenta nuevamente.');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        // Modo edición
        const payload: UpdateProductPayload = {
          name: formData.name,
          sku: formData.sku || null,
          description: formData.description || null,
          price: Number(formData.price) || 0,
          cost: Number(formData.cost) || 0,
          stock: Number(formData.stock) || 0
        };
        await updateProduct(editingId, payload);
        setEditingId(null);
      } else {
        // Modo creación
        const payload: CreateProductPayload = {
          name: formData.name,
          sku: formData.sku || null,
          description: formData.description || null,
          price: Number(formData.price) || 0,
          cost: Number(formData.cost) || 0,
          stock: Number(formData.stock) || 0,
          isActive: true
        };
        await createProduct(payload);
      }
      setFormData({
        name: '',
        sku: '',
        description: '',
        price: '0',
        cost: '0',
        stock: '0'
      });
      await fetchProducts();
    } catch (err) {
      alert(editingId 
        ? 'No fue posible actualizar el producto. Intenta nuevamente.' 
        : 'No fue posible crear el producto. Intenta nuevamente.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
        <h2 className="text-4xl lg:text-5xl font-extrabold mb-3 text-text-dark tracking-tight">Gestión de Productos</h2>
        <p className="text-text-light text-lg">Administra tu catálogo de productos</p>
      </div>
      
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-card-background rounded-3xl shadow-md p-8 border-b-2 border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col">
            <label htmlFor="name" className="block mb-2 font-medium text-text-dark">
              Nombre *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="sku" className="block mb-2 font-medium text-text-dark">
              SKU
            </label>
            <input
              id="sku"
              name="sku"
              type="text"
              value={formData.sku}
              onChange={handleInputChange}
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex flex-col md:col-span-2">
            <label htmlFor="description" className="block mb-2 font-medium text-text-dark">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="price" className="block mb-2 font-medium text-text-dark">
              Precio *
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleInputChange}
              required
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="cost" className="block mb-2 font-medium text-text-dark">
              Costo *
            </label>
            <input
              id="cost"
              name="cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={handleInputChange}
              required
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="stock" className="block mb-2 font-medium text-text-dark">
              Stock
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={handleInputChange}
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-blue-500 text-white px-6 py-3 rounded-2xl hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-[0.98] active:shadow-inner"
          >
            {isSubmitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={handleCancelEdit} 
              disabled={isSubmitting}
              className="bg-gray-200 text-text-dark px-6 py-3 rounded-2xl hover:bg-gray-300 active:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold active:scale-[0.98]"
            >
              Cancelar Edición
            </button>
          )}
        </div>
      </form>

      {products.length === 0 ? (
        <div className="bg-card-background rounded-3xl shadow-md p-12 text-center">
          <div className="bg-orange-50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-12 h-12 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-text-light text-lg">No hay productos registrados.</p>
        </div>
      ) : (
        <div className="bg-card-background rounded-3xl shadow-md overflow-hidden border-b-2 border-gray-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Nombre</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">SKU</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Precio</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Costo</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Stock</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 py-4 border-b border-gray-100 text-text-dark font-medium">{product.name}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-light">{product.sku ?? '-'}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-dark font-semibold">{formatCurrency(product.price)}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-light">{formatCurrency(product.cost)}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-light">{product.stock}</td>
                  <td className="p-4 py-4 border-b border-gray-100">
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => handleEdit(product)}
                        disabled={editingId !== null && editingId !== product.id}
                        className="bg-blue-500 text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                      >
                        Editar
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDelete(product.id)}
                        disabled={editingId !== null}
                        className="bg-red-500 text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-red-600 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                      >
                        Eliminar
                      </button>
                    </div>
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

export default ProductList;


