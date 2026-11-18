import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Linking,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  useAuth,
  type DeliveryStepStage,
  type DriverShiftStatus,
} from "../../lib/auth-context";
import { VERTICAL_TEMPLATES } from "../../lib/brand-config";
import { VEHICLE_CLASSES } from "../../lib/pricing-engine";
import {
  openTurnByTurnNavigation,
  type NavProvider,
} from "../../lib/location-tracker";
import { SignaturePad } from "../../components/SignaturePad";
import { BrandHeader } from "../../components/BrandHeader";
import { DeliveryMapCard } from "../../components/DeliveryMapCard";

const SHIFT_OPTIONS: { key: DriverShiftStatus; label: string }[] = [
  { key: "Offline", label: "Offline" },
  { key: "Available", label: "Available" },
  { key: "OnDuty", label: "On Duty" },
];

const DELIVERY_FLOW_STEPS: {
  stage: DeliveryStepStage;
  label: string;
  ctaLabel: string;
}[] = [
  { stage: "en_route_pickup", label: "En Route Pickup", ctaLabel: "Arrived at Pickup" },
  { stage: "arrived_pickup", label: "At Pickup", ctaLabel: "Confirm Cargo Loaded" },
  { stage: "cargo_loaded", label: "Cargo Loaded", ctaLabel: "Start Route to Dropoff" },
  { stage: "en_route_dropoff", label: "En Route Dropoff", ctaLabel: "Mark Arrived at Dropoff" },
  { stage: "arrived_dropoff", label: "At Dropoff", ctaLabel: "Capture Proof of Delivery" },
  { stage: "delivered", label: "Proof of Delivery", ctaLabel: "Delivered" },
];

function resolveCurrentStage(
  status: string,
  stage?: DeliveryStepStage
): DeliveryStepStage {
  if (stage) return stage;
  if (status === "Delivered") return "delivered";
  if (status === "InTransit") return "en_route_dropoff";
  if (status === "PickedUp") return "cargo_loaded";
  if (status === "Accepted") return "arrived_pickup";
  return "en_route_pickup";
}

export default function DriverScreen() {
  const {
    orders,
    brandConfig,
    driverShiftStatus,
    setDriverShiftStatus,
    isOfflineSimulated,
    networkOnline,
    offlineQueue,
    onboardingState,
    updateOnboardingState,
    claimOpenOrder,
    declineOpenOrder,
    advanceDeliveryStage,
    submitProofOfDelivery,
  } = useAuth();

  const verticalMeta = VERTICAL_TEMPLATES[brandConfig.vertical];

  const [podModalOrderId, setPodModalOrderId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("Front Desk / Receiver");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [signatureSvg, setSignatureSvg] = useState<string>("");
  const [dismissedOfferId, setDismissedOfferId] = useState<string | null>(null);
  const [offerTimer, setOfferTimer] = useState<{
    offerId: string | null;
    secondsLeft: number;
  }>({ offerId: null, secondsLeft: 60 });

  const openBoardOrders = useMemo(
    () => orders.filter((o) => o.status === "ReadyForDispatch" && !o.driverId),
    [orders]
  );

  const incomingOffer = useMemo(
    () =>
      driverShiftStatus !== "Offline"
        ? openBoardOrders.find((o) => o.id !== dismissedOfferId) || null
        : null,
    [driverShiftStatus, openBoardOrders, dismissedOfferId]
  );

  const incomingOfferId = incomingOffer?.id ?? null;
  const offerSecondsLeft =
    offerTimer.offerId === incomingOfferId ? offerTimer.secondsLeft : 60;

  // 60-second Accept / Decline dispatch countdown on incoming offers
  useEffect(() => {
    if (!incomingOfferId) return;
    const timer = setInterval(() => {
      setOfferTimer((prev) => {
        const current = prev.offerId === incomingOfferId ? prev.secondsLeft : 60;
        return {
          offerId: incomingOfferId,
          secondsLeft: current > 1 ? current - 1 : 60,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingOfferId]);

  const activeDriverOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.driverId === "drv-101" || o.driverName === "Marcus Vance") &&
          o.status !== "Delivered"
      ),
    [orders]
  );

  const completedDriverOrders = useMemo(
    () => orders.filter((o) => o.status === "Delivered"),
    [orders]
  );

  const totalToday = useMemo(() => {
    const completed = completedDriverOrders.reduce(
      (sum, o) => sum + (o.driverPayout || 0),
      0
    );
    const active = activeDriverOrders.reduce(
      (sum, o) => sum + (o.driverPayout || 0),
      0
    );
    return completed + active;
  }, [completedDriverOrders, activeDriverOrders]);

  function promptTurnByTurn(address: string) {
    Alert.alert("Turn-by-Turn Navigation", `Open route to ${address.split(",")[0]}`, [
      {
        text: "Apple Maps",
        onPress: () => void openTurnByTurnNavigation(address, "apple"),
      },
      {
        text: "Google Maps",
        onPress: () => void openTurnByTurnNavigation(address, "google"),
      },
      {
        text: "Waze",
        onPress: () => void openTurnByTurnNavigation(address, "waze"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleQuickNav(address: string, provider: NavProvider) {
    void openTurnByTurnNavigation(address, provider);
  }

  async function handleTakePhoto() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.granted) {
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.7,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          setPhotoUris((prev) => [...prev, res.assets[0].uri]);
          return;
        }
      }
    } catch {
      // Simulator fallback captures mock PoD evidence so investor flow never blocks
    }

    setPhotoUris([
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600",
    ]);
  }

  async function handleCompleteDelivery(orderId: string) {
    if (!recipientName.trim() || !signatureSvg.trim()) {
      Alert.alert(
        "Signature Needed",
        "Ask the receiver to sign on the pad (or tap Auto-Sign)."
      );
      return;
    }

    await submitProofOfDelivery({
      orderId,
      recipientName: recipientName.trim(),
      notes: "Handed directly to recipient.",
      photoUris:
        photoUris.length > 0
          ? photoUris
          : [
              "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600",
            ],
      signatureConfirmed: true,
      signatureSvg,
    });

    setPodModalOrderId(null);
    setPhotoUris([]);
    setSignatureSvg("");
  }

  const primaryOrder = activeDriverOrders[0] || null;
  const activeStage: DeliveryStepStage = primaryOrder
    ? resolveCurrentStage(primaryOrder.status, primaryOrder.deliveryStage)
    : "en_route_pickup";
  const stageIdx = Math.max(
    0,
    DELIVERY_FLOW_STEPS.findIndex((s) => s.stage === activeStage)
  );
  const currentStepSpec = DELIVERY_FLOW_STEPS[stageIdx] || DELIVERY_FLOW_STEPS[0];
  const nextStepSpec = DELIVERY_FLOW_STEPS[stageIdx + 1] || null;

  const isPickupSide =
    activeStage === "en_route_pickup" || activeStage === "arrived_pickup";
  const targetAddress = primaryOrder
    ? isPickupSide
      ? primaryOrder.pickupAddress
      : primaryOrder.dropoffAddress
    : brandConfig.defaultCoordinates.city;

  const isOfflineMode = isOfflineSimulated || !networkOnline;

  return (
    <SafeAreaView className="flex-1 bg-[#EEF0F4]" edges={["top"]}>
      {/* 1. Expansive Real Street Map Canvas */}
      <DeliveryMapCard
        fullBleed
        height={308}
        pickupLabel={primaryOrder?.pickupAddress || "6910 Bluff Rd"}
        dropoffLabel={primaryOrder?.dropoffAddress || "9708 E US Hwy 36"}
        distanceMi={primaryOrder?.distanceMi || 18.0}
        durationMinutes={22}
        topOverlay={
          <BrandHeader
            floating
            centerElement={
              <Pressable
                onPress={() =>
                  void setDriverShiftStatus(
                    driverShiftStatus === "OnDuty" ? "Available" : "OnDuty"
                  )
                }
                style={{
                  shadowColor: "#09090B",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.16,
                  shadowRadius: 10,
                }}
                className="bg-[#09090B] px-3.5 py-1.5 rounded-full flex-row items-center gap-2"
              >
                <View
                  className={`w-2 h-2 rounded-full ${
                    driverShiftStatus === "OnDuty"
                      ? "bg-emerald-400"
                      : driverShiftStatus === "Available"
                        ? "bg-amber-400"
                        : "bg-[#71717A]"
                  }`}
                />
                <Text
                  style={{ fontVariant: ["tabular-nums"] }}
                  className="text-[13px] font-bold text-white"
                >
                  ${totalToday.toFixed(2)}
                </Text>
              </Pressable>
            }
          />
        }
      />

      {/* 2. Sleek Active Stop Bottom Sheet */}
      <View
        style={{
          shadowColor: "#09090B",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
        }}
        className="flex-1 bg-white -mt-6 rounded-t-[32px] pt-3"
      >
        <View className="items-center mb-3">
          <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Shift Status Selector (Offline / Available / On Duty) */}
          <View className="bg-[#F4F4F5] p-1 rounded-2xl flex-row mb-3.5">
            {SHIFT_OPTIONS.map((opt) => {
              const active = driverShiftStatus === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => void setDriverShiftStatus(opt.key)}
                  style={
                    active
                      ? {
                          backgroundColor: "#FFFFFF",
                          shadowColor: "#09090B",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.06,
                          shadowRadius: 3,
                        }
                      : undefined
                  }
                  className="flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5"
                >
                  <View
                    className={`w-2 h-2 rounded-full ${
                      opt.key === "OnDuty"
                        ? "bg-emerald-500"
                        : opt.key === "Available"
                          ? "bg-amber-500"
                          : "bg-[#A1A1AA]"
                    }`}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      active ? "text-[#09090B]" : "text-[#71717A]"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Self-Guided Driver First-Shift Setup Card */}
          {!onboardingState.dismissedDriverGuide ? (
            <View className="bg-[#F4F4F5] rounded-2xl p-3 mb-3.5">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-bold text-[#09090B]">
                  Driver Quick-Start · 3 Checks Ready
                </Text>
                <Pressable
                  onPress={() =>
                    updateOnboardingState({ dismissedDriverGuide: true })
                  }
                >
                  <Ionicons name="close" size={14} color="#71717A" />
                </Pressable>
              </View>
              <Text className="text-[11px] text-[#52525B]">
                ✓ Vehicle & COI Verified · ✓ Maps Ready · ✓ Tap primary button at each stop & capture photo + signature POD at dropoff.
              </Text>
            </View>
          ) : null}

          {/* Offline-First Queue Resilience Strip */}
          {isOfflineMode || offlineQueue.length > 0 ? (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2.5 flex-row items-center justify-between mb-3.5">
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                <Ionicons name="cloud-offline-outline" size={16} color="#B45309" />
                <Text className="text-xs font-semibold text-amber-900">
                  {isOfflineMode
                    ? "Offline-Safe Mode: PoD & signatures queue locally"
                    : `${offlineQueue.length} action(s) queued to sync`}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Active Delivery 6-Step Flow (Rendered FIRST so incoming offers never push down active controls) */}
          {primaryOrder ? (
            <View className="mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View
                    style={{
                      backgroundColor: isPickupSide
                        ? "#09090B"
                        : brandConfig.theme.primary,
                    }}
                    className="px-2 py-0.5 rounded-md"
                  >
                    <Text className="text-[10px] font-bold uppercase text-white">
                      {isPickupSide ? "Stop 1 · Pickup" : "Stop 2 · Dropoff"}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-[#71717A]">
                    {primaryOrder.orderNumber} · {primaryOrder.distanceMi} mi
                  </Text>
                </View>
                <Text
                  style={{ fontVariant: ["tabular-nums"] }}
                  className="text-[18px] font-bold text-[#09090B]"
                >
                  +${primaryOrder.driverPayout.toFixed(2)}
                </Text>
              </View>

              {/* 6-Step Progress Bar */}
              <View className="flex-row gap-1 my-2.5">
                {DELIVERY_FLOW_STEPS.map((step, idx) => (
                  <View
                    key={step.stage}
                    style={{
                      backgroundColor:
                        idx <= stageIdx ? brandConfig.theme.primary : "#E4E4E7",
                    }}
                    className="flex-1 h-1.5 rounded-full"
                  />
                ))}
              </View>

              {/* Stop Address & High-Visibility Gate / Dock Notes (Zero Menu Hunting) */}
              <Text className="text-[20px] font-bold text-[#09090B] tracking-tight leading-7 mt-0.5">
                {targetAddress}
              </Text>
              <View className="flex-row items-center justify-between mt-0.5">
                <Text numberOfLines={1} className="text-[13px] text-[#71717A] flex-1 pr-2">
                  {primaryOrder.customerName}
                  {primaryOrder.poNumber ? ` · Ref: ${primaryOrder.poNumber}` : ""} ·{" "}
                  {currentStepSpec.label}
                </Text>
                {activeStage !== "arrived_dropoff" ? (
                  <Pressable onPress={() => setPodModalOrderId(primaryOrder.id)}>
                    <Text
                      style={{ color: brandConfig.theme.primary }}
                      className="text-xs font-bold"
                    >
                      POD early →
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {primaryOrder.specialInstructions ? (
                <View className="bg-[#F4F4F5] rounded-xl px-3 py-2 mt-2.5 flex-row items-center gap-2">
                  <Ionicons name="information-circle-outline" size={15} color="#09090B" />
                  <Text className="text-xs font-semibold text-[#09090B] flex-1">
                    {primaryOrder.specialInstructions}
                  </Text>
                </View>
              ) : null}

              {/* Single Clean Comms & Navigation Row */}
              <View className="flex-row gap-2 mt-3.5 mb-2.5">
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `tel:${primaryOrder.customerPhone || brandConfig.supportPhone}`
                    ).catch(() => {})
                  }
                  className="flex-1 h-11 bg-[#F4F4F5] rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                >
                  <Ionicons name="call-outline" size={15} color="#09090B" />
                  <Text className="text-xs font-semibold text-[#09090B]">
                    Call
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `sms:${primaryOrder.customerPhone || brandConfig.supportPhone}`
                    ).catch(() => {})
                  }
                  className="flex-1 h-11 bg-[#F4F4F5] rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                >
                  <Ionicons name="chatbubble-outline" size={15} color="#09090B" />
                  <Text className="text-xs font-semibold text-[#09090B]">
                    Text
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => promptTurnByTurn(targetAddress)}
                  className="flex-[1.4] h-11 bg-[#09090B] rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                >
                  <Ionicons name="navigate" size={14} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">
                    Navigate ↗
                  </Text>
                </Pressable>
              </View>

              {/* Compact Direct App Shortcuts */}
              <View className="flex-row items-center justify-end gap-3 mb-3.5">
                {(
                  [
                    { key: "apple", label: "Apple Maps" },
                    { key: "google", label: "Google Maps" },
                    { key: "waze", label: "Waze" },
                  ] as { key: NavProvider; label: string }[]
                ).map((nav) => (
                  <Pressable
                    key={nav.key}
                    onPress={() => handleQuickNav(targetAddress, nav.key)}
                  >
                    <Text className="text-[11px] font-semibold text-[#71717A]">
                      {nav.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Single Primary Thumb Action Button (Zero Stacked Button Clutter) */}
              {activeStage === "arrived_dropoff" ? (
                <Pressable
                  onPress={() => setPodModalOrderId(primaryOrder.id)}
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="h-[54px] rounded-2xl flex-row items-center justify-between px-5 active:opacity-90"
                >
                  <Text className="text-white font-bold text-[15px]">
                    Capture Photo & Signature POD
                  </Text>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="text-white font-bold text-[15px]"
                  >
                    +${primaryOrder.driverPayout.toFixed(2)} →
                  </Text>
                </Pressable>
              ) : nextStepSpec ? (
                <Pressable
                  onPress={() =>
                    void advanceDeliveryStage(
                      primaryOrder.id,
                      nextStepSpec.stage
                    )
                  }
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="h-[54px] rounded-2xl items-center justify-center active:opacity-90"
                >
                  <Text className="text-white font-bold text-[15px]">
                    {currentStepSpec.ctaLabel} →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View className="bg-[#F4F4F5] rounded-2xl p-5 items-center mb-4">
              <Text className="text-sm font-bold text-[#09090B]">
                No active stop assigned
              </Text>
              <Text className="text-xs text-[#71717A] text-center mt-1">
                Accept an available load below or switch to Dispatch to assign a run.
              </Text>
            </View>
          )}

          {/* Incoming Load Offer (Placed BELOW active stop so buttons never jump mid-drive) */}
          {incomingOffer ? (
            <View
              style={{ borderColor: brandConfig.theme.primary }}
              className="bg-[#F4F4F5] border rounded-2xl p-3.5"
            >
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-1.5">
                  <View
                    style={{ backgroundColor: brandConfig.theme.primary }}
                    className="px-2 py-0.5 rounded-full"
                  >
                    <Text className="text-[10px] font-bold text-white uppercase">
                      {primaryOrder ? "Up Next Offer" : "New Dispatch"}
                    </Text>
                  </View>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="text-xs font-bold text-[#71717A]"
                  >
                    {offerSecondsLeft}s
                  </Text>
                </View>
                <Text
                  style={{ fontVariant: ["tabular-nums"] }}
                  className="text-[15px] font-bold text-[#09090B]"
                >
                  +${incomingOffer.driverPayout.toFixed(2)}
                </Text>
              </View>

              <Text className="text-sm font-bold text-[#09090B]">
                {incomingOffer.orderNumber} · {incomingOffer.dropoffAddress.split(",")[0]}
              </Text>
              <Text className="text-xs text-[#71717A] mt-0.5 mb-3">
                Pickup: {incomingOffer.pickupAddress.split(",")[0]} · {incomingOffer.distanceMi} mi ·{" "}
                {VEHICLE_CLASSES[incomingOffer.vehicleType]?.shortLabel}
              </Text>

              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    setDismissedOfferId(incomingOffer.id);
                    void declineOpenOrder(incomingOffer.id);
                  }}
                  className="flex-1 h-10 bg-white rounded-xl items-center justify-center"
                >
                  <Text className="text-xs font-bold text-[#09090B]">
                    Decline
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void claimOpenOrder(incomingOffer.id, "drv-101")}
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="flex-[1.6] h-10 rounded-xl items-center justify-center"
                >
                  <Text className="text-xs font-bold text-white">
                    Accept Load
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Proof of Delivery Photo + Signature Modal */}
      <Modal
        visible={Boolean(podModalOrderId)}
        animationType="slide"
        transparent
        onRequestClose={() => setPodModalOrderId(null)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] pt-3 pb-8 px-6">
            <View className="items-center mb-3">
              <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-bold text-[#09090B]">
                  Proof of Delivery
                </Text>
                <Text className="text-xs text-[#71717A]">
                  {verticalMeta.custodyBadge}
                  {isOfflineMode ? " · Offline Queue Ready" : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => setPodModalOrderId(null)}
                className="w-8 h-8 rounded-full bg-[#F4F4F5] items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#09090B" />
              </Pressable>
            </View>

            <TextInput
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Receiver's name"
              placeholderTextColor="#A1A1AA"
              className="bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B] mb-3"
            />

            <SignaturePad
              onSignatureChange={(_strokes, svg) => setSignatureSvg(svg)}
            />

            <Pressable
              onPress={handleTakePhoto}
              className="mt-3 h-12 bg-[#F4F4F5] rounded-2xl flex-row items-center justify-center gap-2"
            >
              <Ionicons name="camera-outline" size={18} color="#09090B" />
              <Text className="text-sm font-semibold text-[#09090B]">
                {photoUris.length > 0
                  ? `Drop-off Photo Captured (${photoUris.length}) ✓`
                  : "Capture Drop-off Photo"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                podModalOrderId && handleCompleteDelivery(podModalOrderId)
              }
              style={{ backgroundColor: brandConfig.theme.primary }}
              className="mt-3 h-[54px] rounded-2xl items-center justify-center"
            >
              <Text className="text-white font-bold text-[16px]">
                Confirm & Complete Delivery
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
