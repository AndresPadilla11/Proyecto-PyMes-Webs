import ClientList from '../components/ClientList';

const Clients = () => {
  return (
    <div className="min-h-screen bg-background-light p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <ClientList />
      </div>
    </div>
  );
};

export default Clients;

