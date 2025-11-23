import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';

import type { Client, CreateClientPayload, UpdateClientPayload } from '../services/clientService';
import { createClient, deleteClient, getClients, updateClient } from '../services/clientService';

const ClientList = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      setError('No fue posible cargar los clientes.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchClients();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setFormData({
      name: client.businessName,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      try {
        await deleteClient(id);
        await fetchClients();
      } catch (err) {
        alert('No fue posible eliminar el cliente. Intenta nuevamente.');
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
        const payload: UpdateClientPayload = {
          businessName: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined
        };
        await updateClient(editingId, payload);
        setEditingId(null);
      } else {
        // Modo creación
        const payload: CreateClientPayload = {
          tenantId: 'DEMO_TENANT',
          businessName: formData.name,
          documentType: 'NIT',
          identification: `TMP-${Date.now()}`,
          nit: undefined,
          dv: undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          hasCredit: false,
          creditLimit: '0',
          currentDebt: '0',
          isActive: true
        };
        await createClient(payload);
      }
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: ''
      });
      await fetchClients();
    } catch (err) {
      alert(editingId 
        ? 'No fue posible actualizar el cliente. Intenta nuevamente.' 
        : 'No fue posible crear el cliente. Intenta nuevamente.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
        <h2 className="text-4xl lg:text-5xl font-extrabold mb-3 text-text-dark tracking-tight">Gestión de Clientes</h2>
        <p className="text-text-light text-lg">Administra tu base de clientes</p>
      </div>
      
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-card-background rounded-3xl shadow-md p-8 border-b-2 border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col">
            <label htmlFor="name" className="block mb-2 font-medium text-text-dark">
              Nombre
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
            <label htmlFor="email" className="block mb-2 font-medium text-text-dark">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="phone" className="block mb-2 font-medium text-text-dark">
              Teléfono
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              value={formData.phone}
              onChange={handleInputChange}
              className="border-2 border-gray-200 rounded-2xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="address" className="block mb-2 font-medium text-text-dark">
              Dirección
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
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
            {isSubmitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Cliente'}
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

      {clients.length === 0 ? (
        <div className="bg-card-background rounded-3xl shadow-md p-12 text-center">
          <div className="bg-blue-50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-text-light text-lg">No hay clientes registrados.</p>
        </div>
      ) : (
        <div className="bg-card-background rounded-3xl shadow-md overflow-hidden border-b-2 border-gray-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Nombre</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Email</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Teléfono</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Dirección</th>
                <th className="p-4 py-5 text-left border-b border-gray-200 font-semibold text-text-dark">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 py-4 border-b border-gray-100 text-text-dark font-medium">{client.businessName}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-light">{client.email ?? '-'}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-light">{client.phone ?? '-'}</td>
                  <td className="p-4 py-4 border-b border-gray-100 text-text-light">{client.address ?? '-'}</td>
                  <td className="p-4 py-4 border-b border-gray-100">
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => handleEdit(client)}
                        disabled={editingId !== null && editingId !== client.id}
                        className="bg-blue-500 text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                      >
                        Editar
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDelete(client.id)}
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

export default ClientList;

