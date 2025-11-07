import DriverClient from './DriverClient';

export default async function DriverPage() {
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your assigned deliveries</p>
        </div>

        <div className="p-6">
          <DriverClient />
        </div>
      </div>
    </div>
  );
}
