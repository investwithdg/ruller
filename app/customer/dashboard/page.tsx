import { createServiceRoleClient } from '@/lib/supabase/server';
import CustomerDashboardClient from './CustomerDashboardClient';

export default async function CustomerDashboardPage() {
  const supabase = createServiceRoleClient();

  // Without auth, we can't identify a specific customer, so show empty state
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-900">No Orders Found</h2>
        <p className="text-yellow-700 mt-2">
          You haven&apos;t placed any orders yet. Start by requesting a quote!
        </p>
      </div>
    </div>
  );
}
