import React, { useEffect, useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth-context";
import {
  buildLiveGoogleStaticMapUrl,
  fetchGoogleDirections,
  hasGoogleMapsApiKey,
} from "../lib/google-maps";

const INDY_MAP_POSITRON = require("../assets/indy-map-positron.png");

interface FleetMarker {
  id: string;
  name: string;
  speedMph: number;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
}

interface DeliveryMapCardProps {
  pickupLabel: string;
  dropoffLabel: string;
  distanceMi: number;
  durationMinutes: number;
  driverName?: string | null;
  statusLabel?: string;
  fleetDrivers?: FleetMarker[];
  onPressAction?: () => void;
  actionLabel?: string;
  compact?: boolean;
  fullBleed?: boolean;
  height?: number;
  topOverlay?: React.ReactNode;
}

/**
 * Live Uber-Style Positron Street Map Canvas
 *
 * Uses the Operator's Google Maps Static API + Directions API road polyline
 * to draw the real origin (A), destination (B), and active fleet GPS pins.
 * Falls back gracefully to the bundled Positron map if offline.
 */
export function DeliveryMapCard({
  pickupLabel,
  dropoffLabel,
  distanceMi,
  durationMinutes,
  fleetDrivers,
  onPressAction,
  actionLabel,
  compact = false,
  fullBleed = false,
  height,
  topOverlay,
}: DeliveryMapCardProps) {
  const { brandConfig } = useAuth();
  const [encodedPolyline, setEncodedPolyline] = useState<string | null>(null);
  const [failedRouteKey, setFailedRouteKey] = useState<string | null>(null);

  const routeKey = `${pickupLabel}->${dropoffLabel}`;
  const liveMapFailed = failedRouteKey === routeKey;

  const shortPickup = pickupLabel.split(",")[0] || "Pickup";
  const shortDropoff = dropoffLabel.split(",")[0] || "Dropoff";

  useEffect(() => {
    if (!hasGoogleMapsApiKey()) return;
    let cancelled = false;
    void fetchGoogleDirections(pickupLabel, dropoffLabel).then((res) => {
      if (!cancelled) {
        setEncodedPolyline(res?.encodedPolyline || null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pickupLabel, dropoffLabel]);

  const liveGoogleMapUrl = !liveMapFailed
    ? buildLiveGoogleStaticMapUrl({
        pickupAddress: pickupLabel,
        dropoffAddress: dropoffLabel,
        encodedPolyline,
        primaryColorHex: brandConfig.theme.primary,
        fleetDrivers,
      })
    : null;

  const resolvedHeight = height ?? (fullBleed ? 290 : compact ? 148 : 184);

  const mapCanvas = (
    <View
      style={{ height: resolvedHeight }}
      className="bg-[#EEF0F4] relative overflow-hidden justify-between"
    >
      {/* Live Google Maps Static API + Road Polyline (Fallback to Bundled Positron Offline) */}
      <Image
        source={
          liveGoogleMapUrl ? { uri: liveGoogleMapUrl } : INDY_MAP_POSITRON
        }
        onError={() => setFailedRouteKey(routeKey)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
        resizeMode="cover"
      />

      {/* Top Overlay Slot (Floating Header) */}
      <View className="px-4 pt-2">{topOverlay}</View>

      {/* Bottom Uber-Style Route Callout Bar (Origin A -> Destination B + ETA) */}
      <View className="px-4 pb-8 flex-row items-center justify-between">
        <View
          style={{
            shadowColor: "#09090B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.14,
            shadowRadius: 10,
          }}
          className="bg-white/95 border border-black/5 rounded-2xl px-3 py-2 flex-row items-center gap-2 max-w-[78%]"
        >
          <View className="bg-[#09090B] px-2 py-0.5 rounded-md">
            <Text
              style={{ fontVariant: ["tabular-nums"] }}
              className="text-[10px] font-bold text-white"
            >
              {durationMinutes} min · {distanceMi} mi
            </Text>
          </View>
          <Text
            numberOfLines={1}
            className="text-[11px] font-bold text-[#09090B] flex-shrink"
          >
            {shortPickup} → {shortDropoff}
          </Text>
        </View>

        {onPressAction && actionLabel ? (
          <Pressable
            onPress={onPressAction}
            style={{
              shadowColor: "#09090B",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.14,
              shadowRadius: 8,
            }}
            className="bg-[#09090B] px-3 py-2 rounded-full flex-row items-center gap-1"
          >
            <Ionicons name="navigate" size={11} color="#FFFFFF" />
            <Text className="text-[11px] font-bold text-white">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  if (fullBleed) {
    return mapCanvas;
  }

  return (
    <View className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden">
      {mapCanvas}
    </View>
  );
}
