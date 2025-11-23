import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Página no encontrada</p>
      <Link 
        to="/" 
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
};

export default NotFound;

