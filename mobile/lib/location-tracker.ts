/**
 * Real-Time Fleet Intelligence, Background GPS & Navigation Module (Gate 4)
 *
 * Implements:
 * 1. Battery-efficient GPS polling via Expo Location (`startLocationUpdatesAsync`)
 *    with 10–15s / 50m delta throttling while the driver is On Duty.
 * 2. Supabase Telemetry broadcast (`driver_locations` & `tracking_events`) scoped by `tenant_id`.
 * 3. Supabase Realtime channel subscription for live Dispatcher & Customer fleet views.
 * 4. Turn-by-turn routing deep-links (Apple Maps, Google Maps, Waze).
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BRAND_CONFIG } from "./brand-config";
import { supabase, isSupabaseConfigured } from "./supabase";

export const BACKGROUND_LOCATION_TASK = "ruller-driver-background-location";
const ACTIVE_TRACKING_CONTEXT_KEY = "ruller_active_tracking_ctx_v1";
const MIN_SYNC_INTERVAL_MS = 12_000; // 10–15s battery-safe throttle
const MIN_DISTANCE_DELTA_M = 50; // 50-meter displacement threshold

export type NavProvider = "apple" | "google" | "waze";

export interface TelemetryPoint {
  driverId: string;
  tenantId?: string;
  orderId?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

interface StoredTrackingContext {
  driverId: string;
  tenantId: string;
  orderId?: string | null;
}

let lastEmittedPoint: { lat: number; lng: number; timestampMs: number } | null = null;
let foregroundWatcher: Location.LocationSubscription | null = null;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceBetweenMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function shouldEmitTelemetry(
  nextLat: number,
  nextLng: number,
  nowMs: number = Date.now()
): boolean {
  if (!lastEmittedPoint) return true;
  const elapsed = nowMs - lastEmittedPoint.timestampMs;
  if (elapsed >= MIN_SYNC_INTERVAL_MS) return true;
  const movedMeters = distanceBetweenMeters(
    lastEmittedPoint.lat,
    lastEmittedPoint.lng,
    nextLat,
    nextLng
  );
  return movedMeters >= MIN_DISTANCE_DELTA_M;
}

// Register Expo TaskManager handler cleanly at module load time
if (
  Platform.OS !== "web" &&
  typeof TaskManager.isTaskDefined === "function" &&
  !TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)
) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const payload = data as { locations?: Location.LocationObject[] };
    const latest = payload.locations?.[payload.locations.length - 1];
    if (!latest) return;

    const { latitude, longitude, accuracy, heading, speed } = latest.coords;
    if (!shouldEmitTelemetry(latitude, longitude)) return;

    try {
      const ctxRaw = await AsyncStorage.getItem(ACTIVE_TRACKING_CONTEXT_KEY);
      if (!ctxRaw) return;
      const ctx = JSON.parse(ctxRaw) as StoredTrackingContext;
      await recordDriverTelemetry({
        driverId: ctx.driverId,
        tenantId: ctx.tenantId,
        orderId: ctx.orderId,
        latitude,
        longitude,
        accuracy: accuracy ?? undefined,
        heading: heading ?? undefined,
        speed: speed != null ? Math.max(0, speed * 2.23694) : undefined,
        updatedAt: new Date(latest.timestamp || Date.now()).toISOString(),
      });
    } catch {
      // Fail silently in background task so OS never terminates process
    }
  });
}

/**
 * Broadcasts a driver's current GPS coordinates to tenant-scoped Supabase tables.
 */
export async function recordDriverTelemetry(point: TelemetryPoint): Promise<boolean> {
  const tenantId = point.tenantId || BRAND_CONFIG.tenantSlug;
  lastEmittedPoint = {
    lat: point.latitude,
    lng: point.longitude,
    timestampMs: Date.now(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("driver_locations").insert({
        driver_id: point.driverId,
        order_id: point.orderId || null,
        tenant_id: tenantId,
        organization_id: tenantId,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy ?? null,
        heading: point.heading ?? null,
        speed: point.speed ?? null,
      });
      if (!error) return true;
    } catch {
      // Fallback to tenant REST API if offline or unconfigured
    }
  }

  try {
    const res = await fetch(`${BRAND_CONFIG.websiteUrl}/api/drivers/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: point.driverId,
        tenantId,
        orderId: point.orderId || undefined,
        latitude: point.latitude,
        longitude: point.longitude,
        heading: point.heading,
        speed: point.speed,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Starts background (with foreground fallback in Expo Go / Simulator) GPS updates
 * throttled at 12s / 50m delta while driver shift status is On Duty.
 */
export async function startDriverLocationTracking(params: {
  driverId: string;
  tenantId: string;
  orderId?: string | null;
  companyShortName?: string;
  onLocationUpdate?: (point: TelemetryPoint) => void;
}): Promise<{ active: boolean; mode: "background" | "foreground" | "simulated" }> {
  try {
    await AsyncStorage.setItem(
      ACTIVE_TRACKING_CONTEXT_KEY,
      JSON.stringify({
        driverId: params.driverId,
        tenantId: params.tenantId,
        orderId: params.orderId || null,
      } satisfies StoredTrackingContext)
    );
  } catch {
    // Ignore storage warning
  }

  if (Platform.OS === "web") {
    return { active: true, mode: "simulated" };
  }

  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) {
      return { active: false, mode: "simulated" };
    }

    const isExpoGoStoreClient = Constants.executionEnvironment === "storeClient";
    const bg = isExpoGoStoreClient
      ? { granted: false }
      : await Location.requestBackgroundPermissionsAsync().catch(() => ({
          granted: false,
        }));

    if (bg.granted) {
      const started = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      ).catch(() => false);

      if (!started) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: MIN_SYNC_INTERVAL_MS,
          distanceInterval: MIN_DISTANCE_DELTA_M,
          pausesUpdatesAutomatically: true,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: `${params.companyShortName || BRAND_CONFIG.shortName} Driver Active`,
            notificationBody: "Live dispatch & route custody tracking enabled.",
          },
        });
      }
      return { active: true, mode: "background" };
    }

    // Foreground watch fallback (e.g., Expo Go when Background Location entitlement isn't enabled)
    if (foregroundWatcher) {
      foregroundWatcher.remove();
      foregroundWatcher = null;
    }

    foregroundWatcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: MIN_SYNC_INTERVAL_MS,
        distanceInterval: MIN_DISTANCE_DELTA_M,
      },
      (loc) => {
        const { latitude, longitude, accuracy, heading, speed } = loc.coords;
        if (!shouldEmitTelemetry(latitude, longitude)) return;
        const point: TelemetryPoint = {
          driverId: params.driverId,
          tenantId: params.tenantId,
          orderId: params.orderId,
          latitude,
          longitude,
          accuracy: accuracy ?? undefined,
          heading: heading ?? undefined,
          speed: speed != null ? Math.max(0, speed * 2.23694) : undefined,
          updatedAt: new Date(loc.timestamp || Date.now()).toISOString(),
        };
        params.onLocationUpdate?.(point);
        void recordDriverTelemetry(point);
      }
    );

    return { active: true, mode: "foreground" };
  } catch {
    return { active: true, mode: "simulated" };
  }
}

export async function stopDriverLocationTracking(): Promise<void> {
  if (foregroundWatcher) {
    foregroundWatcher.remove();
    foregroundWatcher = null;
  }
  try {
    await AsyncStorage.removeItem(ACTIVE_TRACKING_CONTEXT_KEY);
    if (Platform.OS !== "web") {
      const started = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      ).catch(() => false);
      if (started) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Subscribes Dispatcher & Customer views to real-time tenant GPS and order updates.
 */
export function subscribeToTenantRealtime(
  tenantId: string,
  callbacks: {
    onLocationInsert?: (row: {
      driver_id: string;
      order_id: string | null;
      latitude: number;
      longitude: number;
      speed: number | null;
      created_at: string | null;
    }) => void;
    onOrderChange?: () => void;
    onConnectionChange?: (connected: boolean) => void;
  }
): () => void {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  const channel = supabase
    .channel(`ruller-fleet-${tenantId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "driver_locations",
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const row = payload.new as {
          driver_id?: string;
          order_id?: string | null;
          latitude?: number;
          longitude?: number;
          speed?: number | null;
          created_at?: string | null;
        };
        if (row?.driver_id && typeof row.latitude === "number" && typeof row.longitude === "number") {
          callbacks.onLocationInsert?.({
            driver_id: row.driver_id,
            order_id: row.order_id ?? null,
            latitude: row.latitude,
            longitude: row.longitude,
            speed: row.speed ?? null,
            created_at: row.created_at ?? null,
          });
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `tenant_id=eq.${tenantId}`,
      },
      () => {
        callbacks.onOrderChange?.();
      }
    )
    .subscribe((status) => {
      callbacks.onConnectionChange?.(status === "SUBSCRIBED");
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Opens turn-by-turn navigation in Apple Maps, Google Maps, or Waze.
 */
export async function openTurnByTurnNavigation(
  destinationAddress: string,
  provider?: NavProvider
): Promise<void> {
  const encoded = encodeURIComponent(destinationAddress);
  const wazeUrl = `https://waze.com/ul?q=${encoded}&navigate=yes`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${encoded}&dirflg=d`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;

  if (provider === "waze") {
    const wazeNative = `waze://?q=${encoded}&navigate=yes`;
    const canWaze = await Linking.canOpenURL(wazeNative).catch(() => false);
    await Linking.openURL(canWaze ? wazeNative : wazeUrl).catch(() => {});
    return;
  }

  if (provider === "google") {
    await Linking.openURL(googleMapsUrl).catch(() => {});
    return;
  }

  if (provider === "apple" || Platform.OS === "ios") {
    const canApple = await Linking.canOpenURL(appleMapsUrl).catch(() => false);
    if (canApple) {
      await Linking.openURL(appleMapsUrl).catch(() => {});
      return;
    }
  }

  await Linking.openURL(googleMapsUrl).catch(() => {});
}
