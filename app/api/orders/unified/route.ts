import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/unified
 *
 * Unified endpoint that returns orders with relations.
 *
 * Query parameters:
 * - status: Filter by order status
 * - driver_id: Filter by assigned driver
 * - customer_id: Filter by customer
 * - limit: Number of results (default 50)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const searchParams = request.nextUrl.searchParams;

    // Build query
    let query = supabase
      .from('orders')
      .select(
        `
        *,
        drivers:drivers!left(
          id,
          name,
          phone,
          vehicle_details
        ),
        customers:customers!left(
          id,
          name,
          email,
          phone
        ),
        quotes:quotes!left(
          pickup_address,
          dropoff_address,
          distance_mi
        )
      `
      )
      .order('created_at', { ascending: false });

    // Apply filters from query params
    const status = searchParams.get('status') as Database['public']['Enums']['order_status'] | null;
    if (status) {
      query = query.eq('status', status);
    }

    const driverId = searchParams.get('driver_id');
    if (driverId) {
      query = query.eq('driver_id', driverId);
    }

    const customerId = searchParams.get('customer_id');
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get total count for pagination
    const countQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });

    if (status) countQuery.eq('status', status);
    if (driverId) countQuery.eq('driver_id', driverId);
    if (customerId) countQuery.eq('customer_id', customerId);

    const { count } = await countQuery;

    // Execute main query with pagination
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Transform to match expected format
    const transformedOrders = (orders || []).map((order: any) => ({
      ...order,
      driver: order.drivers,
      customer: order.customers,
      quote: order.quotes,
    }));

    return NextResponse.json({
      orders: transformedOrders,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Unified orders endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
