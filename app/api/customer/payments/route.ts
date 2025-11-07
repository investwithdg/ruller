import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/payments
 * Fetches payment history for the authenticated customer
 */
export async function GET() {
  try {
    // Without auth, return empty payments array
    return NextResponse.json({ payments: [] });
  } catch (error: any) {
    console.error('Error in GET /api/customer/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
