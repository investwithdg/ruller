import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isTwilioConfigured } from '@/lib/notifications/providers/twilio';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createServiceRoleClient();

  const databaseStatus: { ok: boolean; error?: string } = { ok: true };
  try {
    const { error } = await supabase.from('orders').select('id').limit(1);
    if (error) {
      throw error;
    }
  } catch (error) {
    databaseStatus.ok = false;
    databaseStatus.error = error instanceof Error ? error.message : 'Unknown database error';
  }

  const stripeStatus = {
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
  };

  const googleMapsStatus = {
    configured: Boolean(
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY
    ),
  };

  const notificationsStatus = {
    sms: isTwilioConfigured(),
    push: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    database: databaseStatus,
    stripe: stripeStatus,
    googleMaps: googleMapsStatus,
    notifications: notificationsStatus,
  });
}
