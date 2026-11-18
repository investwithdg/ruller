import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, type MobileOrder } from "../../lib/auth-context";
import { VERTICAL_TEMPLATES } from "../../lib/brand-config";
import {
  getGoogleMapsStatus,
  searchAddressSuggestions,
  type AddressSuggestion,
} from "../../lib/google-maps";
import {
  SERVICE_LEVELS,
  calculateDeliveryQuote,
  resolveRouteDistanceMiles,
  type BillingMode,
  type ServiceLevel,
  type VehicleClass,
} from "../../lib/pricing-engine";
import {
  SignatureStrokePreview,
  svgPathToStrokes,
} from "../../components/SignaturePad";
import { BrandHeader } from "../../components/BrandHeader";
import { DeliveryMapCard } from "../../components/DeliveryMapCard";
import { OnboardingWizardModal } from "../../components/OnboardingWizardModal";

const VEHICLE_ICONS: Record<
  VehicleClass,
  "car-outline" | "car-sport-outline" | "bus-outline"
> = {
  sedan: "car-outline",
  suv: "car-sport-outline",
  cargo_van: "bus-outline",
};

const PROGRESS_STEPS = ["Confirmed", "Picked Up", "On the Way", "Delivered"];

function getOrderStepIndex(status: MobileOrder["status"]): number {
  if (status === "Delivered") return 3;
  if (status === "InTransit" || status === "PickedUp") return 2;
  if (status === "Accepted" || status === "Assigned") return 1;
  return 0;
}

export default function CustomerScreen() {
  const {
    orders,
    brandConfig,
    pricingRules,
    userEmail,
    onboardingState,
    updateOnboardingState,
    savedCards,
    selectedPaymentMethodId,
    addPaymentCard,
    selectPaymentMethod,
    createOrderFromQuote,
    shareOrderTrackingLink,
    shareCustomerBookingLink,
    startLiveRunSimulation,
  } = useAuth();

  const verticalMeta = VERTICAL_TEMPLATES[brandConfig.vertical];

  const [activeSubTab, setActiveSubTab] = useState<"quote" | "orders">("quote");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState(false);
  const [pickupAddress, setPickupAddress] = useState(
    "6910 Bluff Rd, Indianapolis, IN 46217"
  );
  const [dropoffAddress, setDropoffAddress] = useState(
    "8702 Keystone Crossing, Indianapolis, IN 46240"
  );
  const [vehicleType, setVehicleType] = useState<VehicleClass>("sedan");
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("urgent_3h");
  const [billingMode, setBillingMode] = useState<BillingMode>("card");
  const [poNumber, setPoNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [distanceMi, setDistanceMi] = useState<number>(14.2);
  const [durationMinutes, setDurationMinutes] = useState<number>(22);
  const [routeSource, setRouteSource] = useState<"google_maps" | "live_api" | "estimator">("estimator");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [activeAddressField, setActiveAddressField] = useState<
    "pickup" | "dropoff" | null
  >(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [receiptOrder, setReceiptOrder] = useState<MobileOrder | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardZip, setCardZip] = useState("");
  const [storyboardModalOpen, setStoryboardModalOpen] = useState(false);
  const mapsStatus = getGoogleMapsStatus();

  const activeSavedCard = savedCards.find((c) => c.id === selectedPaymentMethodId);
  const activePaymentLabel =
    selectedPaymentMethodId === "apple_pay"
      ? "Apple Pay"
      : selectedPaymentMethodId === "net_30"
        ? "Corporate Net-30"
        : activeSavedCard
          ? `${activeSavedCard.brand} •••• ${activeSavedCard.last4}`
          : "Apple Pay";

  useEffect(() => {
    let cancelled = false;
    void resolveRouteDistanceMiles(
      "6910 Bluff Rd, Indianapolis, IN 46217",
      "8702 Keystone Crossing, Indianapolis, IN 46240"
    ).then((res) => {
      if (!cancelled) {
        setDistanceMi(res.distanceMi);
        setDurationMinutes(res.durationMinutes);
        setRouteSource(res.source);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeAddressField) {
      return;
    }
    const q = activeAddressField === "pickup" ? pickupAddress : dropoffAddress;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchAddressSuggestions(q, verticalMeta.quickPlaces).then((results) => {
        if (!cancelled) {
          setAddressSuggestions(results);
        }
      });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeAddressField, pickupAddress, dropoffAddress, verticalMeta.quickPlaces]);

  const vehicleTiers = useMemo(
    () =>
      (["sedan", "suv", "cargo_van"] as VehicleClass[]).map((key) => ({
        key,
        title: verticalMeta.vehicleLabels[key].title,
        subtitle: verticalMeta.vehicleLabels[key].subtitle,
        icon: VEHICLE_ICONS[key],
      })),
    [verticalMeta]
  );

  const breakdown = useMemo(
    () =>
      calculateDeliveryQuote(distanceMi, 25, pricingRules, {
        vehicleType,
        serviceLevel,
        accessorials: [],
      }),
    [distanceMi, pricingRules, vehicleType, serviceLevel]
  );

  const vehiclePrices = useMemo(() => {
    const map: Record<VehicleClass, number> = {
      sedan: 0,
      suv: 0,
      cargo_van: 0,
    };
    (["sedan", "suv", "cargo_van"] as VehicleClass[]).forEach((vKey) => {
      const q = calculateDeliveryQuote(distanceMi, 25, pricingRules, {
        vehicleType: vKey,
        serviceLevel,
        accessorials: [],
      });
      map[vKey] = q.total;
    });
    return map;
  }, [distanceMi, pricingRules, serviceLevel]);

  async function handleRecalculateRoute(
    nextPickup?: string,
    nextDropoff?: string
  ) {
    const p = (nextPickup ?? pickupAddress).trim();
    const d = (nextDropoff ?? dropoffAddress).trim();
    if (!p || !d) return;
    const res = await resolveRouteDistanceMiles(p, d);
    setDistanceMi(res.distanceMi);
    setDurationMinutes(res.durationMinutes);
    setRouteSource(res.source);
  }

  function cycleSpeedLevel() {
    if (serviceLevel === "urgent_3h") setServiceLevel("stat_90m");
    else if (serviceLevel === "stat_90m") setServiceLevel("same_day");
    else setServiceLevel("urgent_3h");
  }

  async function handleBookAndPay() {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) return;
    const defaultDemoCustomer =
      brandConfig.demoAccounts.find((a) => a.role === "recipient")?.email ||
      brandConfig.supportEmail;
    setSubmittingOrder(true);
    const created = await createOrderFromQuote({
      pickupAddress: pickupAddress.trim(),
      dropoffAddress: dropoffAddress.trim(),
      distanceMi: breakdown.distanceMi,
      weightLb: 25,
      vehicleType: breakdown.vehicleType,
      serviceLevel: breakdown.serviceLevel,
      accessorials: [],
      billingMode,
      poNumber: poNumber.trim() || undefined,
      customerName: "Alex Morgan",
      customerEmail: userEmail || defaultDemoCustomer,
      customerPhone: brandConfig.supportPhone,
      specialInstructions: specialInstructions.trim(),
    });
    setSubmittingOrder(false);
    setSelectedOrderId(created.id);
    setActiveSubTab("orders");
  }

  const trackedOrder =
    orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  const selectedTier =
    vehicleTiers.find((t) => t.key === breakdown.vehicleType) ||
    vehicleTiers[0];

  const shortPickup = pickupAddress.split(",")[0] || "Pickup";
  const shortDropoff = dropoffAddress.split(",")[0] || "Dropoff";

  return (
    <SafeAreaView className="flex-1 bg-[#EEF0F4]" edges={["top"]}>
      {/* 1. Expansive Real Street Map Canvas (Top 45% of Screen) */}
      <DeliveryMapCard
        fullBleed
        height={304}
        pickupLabel={
          activeSubTab === "quote"
            ? pickupAddress
            : trackedOrder?.pickupAddress || pickupAddress
        }
        dropoffLabel={
          activeSubTab === "quote"
            ? dropoffAddress
            : trackedOrder?.dropoffAddress || dropoffAddress
        }
        distanceMi={
          activeSubTab === "quote"
            ? distanceMi
            : trackedOrder?.distanceMi || distanceMi
        }
        durationMinutes={durationMinutes}
        topOverlay={
          <BrandHeader
            floating
            centerElement={
              <View
                style={{
                  shadowColor: "#09090B",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                }}
                className="bg-white/95 border border-black/5 rounded-full p-1 flex-row"
              >
                <Pressable
                  onPress={() => setActiveSubTab("quote")}
                  style={
                    activeSubTab === "quote"
                      ? { backgroundColor: brandConfig.theme.primary }
                      : undefined
                  }
                  className="px-3 py-1 rounded-full"
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      activeSubTab === "quote" ? "text-white" : "text-[#71717A]"
                    }`}
                  >
                    Book
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveSubTab("orders")}
                  style={
                    activeSubTab === "orders"
                      ? { backgroundColor: brandConfig.theme.primary }
                      : undefined
                  }
                  className="px-3 py-1 rounded-full"
                >
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className={`text-[11px] font-bold ${
                      activeSubTab === "orders"
                        ? "text-white"
                        : "text-[#71717A]"
                    }`}
                  >
                    Timeline ({orders.length})
                  </Text>
                </Pressable>
              </View>
            }
          />
        }
      />

      {/* 2. Sleek, Minimalist Bottom Sheet (Pure White, Zero Clutter) */}
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

        {activeSubTab === "quote" ? (
          <View className="flex-1 justify-between">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 16,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!onboardingState.dismissedCustomerGuide ? (
                <Pressable
                  onPress={() => setStoryboardModalOpen(true)}
                  className="bg-[#09090B] rounded-2xl px-3.5 py-2.5 mb-3 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2 flex-1 pr-2">
                    <Ionicons name="play-circle" size={16} color="#FFFFFF" />
                    <Text className="text-[11px] font-bold text-white flex-1">
                      How Rüller Works: Book → Live GPS Timeline → Signed POD
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[11px] font-bold text-white/80">
                      Tour →
                    </Text>
                    <Pressable
                      onPress={() =>
                        updateOnboardingState({ dismissedCustomerGuide: true })
                      }
                    >
                      <Ionicons name="close" size={14} color="#A1A1AA" />
                    </Pressable>
                  </View>
                </Pressable>
              ) : null}

              {/* Compact 1-Line Route Pill (Tap to Expand Address Editor) */}
              {!editingRoute ? (
                <Pressable
                  onPress={() => setEditingRoute(true)}
                  className="bg-[#F4F4F5] rounded-2xl px-4 py-3.5 flex-row items-center justify-between mb-4 active:opacity-80"
                >
                  <View className="flex-row items-center gap-2.5 flex-1 pr-3">
                    <View
                      style={{ backgroundColor: brandConfig.theme.primary }}
                      className="w-2 h-2 rounded-full"
                    />
                    <Text
                      numberOfLines={1}
                      className="text-[14px] font-semibold text-[#09090B] flex-shrink"
                    >
                      {shortPickup}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color="#71717A" />
                    <Text
                      numberOfLines={1}
                      className="text-[14px] font-semibold text-[#09090B] flex-1"
                    >
                      {shortDropoff}
                    </Text>
                  </View>
                  <View className="bg-white px-2.5 py-1 rounded-full">
                    <Text className="text-xs font-bold text-[#09090B]">
                      Edit
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <View className="bg-[#F4F4F5] rounded-2xl p-3.5 mb-4 gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Route · {routeSource === "google_maps" ? "Google Live" : mapsStatus.configured ? "Google Ready" : "Quick Estimate"}
                    </Text>
                    <Pressable onPress={() => setEditingRoute(false)}>
                      <Text className="text-xs font-bold text-[#09090B]">
                        Done
                      </Text>
                    </Pressable>
                  </View>
                  <TextInput
                    value={pickupAddress}
                    onFocus={() => setActiveAddressField("pickup")}
                    onChangeText={(text) => {
                      setActiveAddressField("pickup");
                      setPickupAddress(text);
                    }}
                    onBlur={() => handleRecalculateRoute()}
                    placeholder="Pickup address"
                    placeholderTextColor="#A1A1AA"
                    className="bg-white rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#09090B]"
                  />
                  <TextInput
                    value={dropoffAddress}
                    onFocus={() => setActiveAddressField("dropoff")}
                    onChangeText={(text) => {
                      setActiveAddressField("dropoff");
                      setDropoffAddress(text);
                    }}
                    onBlur={() => handleRecalculateRoute()}
                    placeholder="Drop-off address"
                    placeholderTextColor="#A1A1AA"
                    className="bg-white rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#09090B]"
                  />
                  {activeAddressField && addressSuggestions.length > 0 ? (
                    <View className="bg-white rounded-xl overflow-hidden border border-[#E4E4E7]">
                      {addressSuggestions.map((place, idx) => (
                        <Pressable
                          key={`${place.address}-${idx}`}
                          onPress={() => {
                            if (activeAddressField === "pickup") {
                              setPickupAddress(place.address);
                              void handleRecalculateRoute(
                                place.address,
                                dropoffAddress
                              );
                            } else {
                              setDropoffAddress(place.address);
                              void handleRecalculateRoute(
                                pickupAddress,
                                place.address
                              );
                            }
                            setActiveAddressField(null);
                          }}
                          className={`px-3 py-2 flex-row items-center gap-2 ${
                            idx > 0 ? "border-t border-[#F4F4F5]" : ""
                          }`}
                        >
                          <Ionicons
                            name={place.source === "google" ? "map-outline" : "location-outline"}
                            size={14}
                            color={brandConfig.theme.primary}
                          />
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-[#09090B]">
                              {place.label}
                            </Text>
                            <Text
                              numberOfLines={1}
                              className="text-[11px] text-[#71717A]"
                            >
                              {place.address}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <View className="flex-row gap-2">
                    <TextInput
                      value={poNumber}
                      onChangeText={setPoNumber}
                      placeholder={verticalMeta.referencePlaceholder}
                      placeholderTextColor="#A1A1AA"
                      className="flex-1 bg-white rounded-xl px-3.5 py-2.5 text-sm text-[#09090B]"
                    />
                    <TextInput
                      value={specialInstructions}
                      onChangeText={setSpecialInstructions}
                      placeholder={verticalMeta.defaultInstructionsPlaceholder}
                      placeholderTextColor="#A1A1AA"
                      className="flex-[1.5] bg-white rounded-xl px-3.5 py-2.5 text-sm text-[#09090B]"
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2 pt-1">
                      {verticalMeta.quickPlaces.map((p) => (
                        <Pressable
                          key={p.label}
                          onPress={() => {
                            setDropoffAddress(p.address);
                            handleRecalculateRoute(pickupAddress, p.address);
                            setEditingRoute(false);
                          }}
                          className="bg-white px-3 py-1.5 rounded-full"
                        >
                          <Text className="text-xs font-semibold text-[#09090B]">
                            {p.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* B2B Zero-App-Download Web Booking Pill */}
              <View className="bg-[#F4F4F5] rounded-2xl px-3.5 py-2.5 mb-3 flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-[11px] font-bold text-[#09090B]">
                    Corporate Web Booking Link
                  </Text>
                  <Text numberOfLines={1} className="text-[10px] text-[#71717A]">
                    {brandConfig.websiteUrl}/book/{brandConfig.tenantSlug}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void shareCustomerBookingLink()}
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="px-2.5 py-1 rounded-full"
                >
                  <Text className="text-[10px] font-bold text-white">Share Link</Text>
                </Pressable>
              </View>

              {/* 3 Ultra-Clean Vehicle Rows Tailored to Active Vertical */}
              <View className="gap-2">
                {vehicleTiers.map((tier) => {
                  const selected = breakdown.vehicleType === tier.key;
                  const price = vehiclePrices[tier.key];
                  return (
                    <Pressable
                      key={tier.key}
                      onPress={() => setVehicleType(tier.key)}
                      style={{
                        borderColor: selected ? "#09090B" : "transparent",
                        backgroundColor: selected ? "#FAFAFA" : "#FFFFFF",
                      }}
                      className="rounded-2xl border-2 px-3.5 py-3 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                        <View
                          style={
                            selected
                              ? { backgroundColor: brandConfig.theme.primary }
                              : { backgroundColor: "#F4F4F5" }
                          }
                          className="w-12 h-12 rounded-2xl items-center justify-center"
                        >
                          <Ionicons
                            name={tier.icon}
                            size={22}
                            color={selected ? "#FFFFFF" : "#09090B"}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[16px] font-bold text-[#09090B] tracking-tight">
                            {tier.title}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="text-[13px] text-[#71717A] mt-0.5"
                          >
                            {tier.subtitle}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{ fontVariant: ["tabular-nums"] }}
                        className="text-[17px] font-bold text-[#09090B]"
                      >
                        ${price.toFixed(0)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Pinned Minimalist Checkout Footer */}
            <View className="bg-white border-t border-[#F4F4F5] px-5 pt-2.5 pb-3.5">
              <View className="flex-row items-center justify-between mb-2.5">
                <Pressable
                  onPress={() => setPaymentModalOpen(true)}
                  className="flex-row items-center gap-2 bg-[#F4F4F5] px-3 py-1.5 rounded-full"
                >
                  <Ionicons
                    name={
                      selectedPaymentMethodId === "apple_pay"
                        ? "logo-apple"
                        : selectedPaymentMethodId === "net_30"
                          ? "business-outline"
                          : "card-outline"
                    }
                    size={15}
                    color="#09090B"
                  />
                  <Text className="text-xs font-bold text-[#09090B]">
                    {activePaymentLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={11} color="#71717A" />
                </Pressable>

                <Pressable
                  onPress={cycleSpeedLevel}
                  className="bg-[#F4F4F5] px-3 py-1.5 rounded-full flex-row items-center gap-1"
                >
                  <Ionicons
                    name="flash"
                    size={12}
                    color={brandConfig.theme.primary}
                  />
                  <Text className="text-xs font-semibold text-[#09090B]">
                    {SERVICE_LEVELS[serviceLevel].shortLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={11} color="#71717A" />
                </Pressable>
              </View>

              <Pressable
                onPress={handleBookAndPay}
                disabled={submittingOrder}
                style={{ backgroundColor: brandConfig.theme.primary }}
                className="h-[54px] rounded-2xl px-5 flex-row items-center justify-between active:opacity-90"
              >
                {submittingOrder ? (
                  <View className="flex-1 items-center">
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                ) : (
                  <>
                    <Text className="text-[16px] font-bold text-white">
                      Request {selectedTier.title}
                    </Text>
                    <Text
                      style={{ fontVariant: ["tabular-nums"] }}
                      className="text-[16px] font-bold text-white"
                    >
                      ${breakdown.total.toFixed(2)} →
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          /* Sleek, Uncluttered Live Tracking & Proof-of-Delivery Sheet */
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Interactive Shipment Switcher Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row gap-2">
                {orders.map((ord) => {
                  const active = trackedOrder?.id === ord.id;
                  return (
                    <Pressable
                      key={ord.id}
                      onPress={() => setSelectedOrderId(ord.id)}
                      style={
                        active
                          ? { backgroundColor: "#09090B" }
                          : { backgroundColor: "#F4F4F5" }
                      }
                      className="px-3.5 py-2 rounded-full flex-row items-center gap-1.5"
                    >
                      <View
                        style={{
                          backgroundColor:
                            ord.status === "Delivered"
                              ? "#16A34A"
                              : brandConfig.theme.primary,
                        }}
                        className="w-2 h-2 rounded-full"
                      />
                      <Text
                        style={{ fontVariant: ["tabular-nums"] }}
                        className={`text-xs font-bold ${
                          active ? "text-white" : "text-[#09090B]"
                        }`}
                      >
                        {ord.orderNumber}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {trackedOrder ? (
              <View>
                {(() => {
                  const stepIdx = getOrderStepIndex(trackedOrder.status);
                  const isDelivered = trackedOrder.status === "Delivered";
                  const etaMin = Math.max(
                    8,
                    Math.round(trackedOrder.distanceMi * 1.4)
                  );

                  return (
                    <View>
                      {/* Status Headline + Clean Price Pill */}
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-1 pr-3">
                          <Text className="text-[22px] font-bold text-[#09090B] tracking-tight">
                            {isDelivered
                              ? "Delivered & Signed"
                              : trackedOrder.driverName
                                ? `Arriving in ${etaMin} min`
                                : "Assigning courier"}
                          </Text>
                          <Text className="text-[13px] text-[#71717A] mt-0.5">
                            {trackedOrder.orderNumber} ·{" "}
                            {trackedOrder.dropoffAddress.split(",")[0]}
                          </Text>
                        </View>

                        <View className="bg-[#F4F4F5] px-3 py-1.5 rounded-full">
                          <Text
                            style={{ fontVariant: ["tabular-nums"] }}
                            className="text-sm font-bold text-[#09090B]"
                          >
                            ${trackedOrder.priceTotal.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {/* Minimal 4-Segment Progress Bar */}
                      <View className="flex-row gap-1.5 mb-3">
                        {PROGRESS_STEPS.map((label, sIdx) => (
                          <View
                            key={label}
                            style={{
                              backgroundColor:
                                sIdx <= stepIdx
                                  ? brandConfig.theme.primary
                                  : "#E4E4E7",
                            }}
                            className="flex-1 h-1.5 rounded-full"
                          />
                        ))}
                      </View>

                      {/* Live Public SMS Tracking & Simulation Action Bar */}
                      <View className="flex-row items-center gap-2 mb-3">
                        <Pressable
                          onPress={() => shareOrderTrackingLink(trackedOrder)}
                          className="flex-1 bg-[#F4F4F5] rounded-xl py-2 px-3 flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center gap-1.5 flex-1 pr-1">
                            <Ionicons
                              name="share-social-outline"
                              size={13}
                              color="#09090B"
                            />
                            <Text
                              numberOfLines={1}
                              className="text-[11px] font-bold text-[#09090B]"
                            >
                              SMS Live Tracking Link
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={13}
                            color="#A1A1AA"
                          />
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            startLiveRunSimulation(trackedOrder.id)
                          }
                          style={{ backgroundColor: "#09090B" }}
                          className="rounded-xl py-2 px-3 flex-row items-center gap-1"
                        >
                          <Ionicons name="flash" size={12} color="#FBBF24" />
                          <Text className="text-[11px] font-bold text-white">
                            ⚡ Simulate Run
                          </Text>
                        </Pressable>
                      </View>

                      {/* Uber-Style Vertical Activity Timeline */}
                      <View className="bg-[#F4F4F5] rounded-2xl p-4 mb-3">
                        <Text className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] mb-2.5">
                          Live Uber-Style Activity Timeline
                        </Text>
                        {[
                          {
                            idx: 0,
                            title: "Order Confirmed & Rate Locked",
                            detail: `${trackedOrder.orderNumber} · $${trackedOrder.priceTotal.toFixed(2)} (${trackedOrder.distanceMi} mi)`,
                            time: "Confirmed",
                          },
                          {
                            idx: 1,
                            title: trackedOrder.driverName
                              ? `Courier Assigned (${trackedOrder.driverName})`
                              : "Matching Nearest Available Courier",
                            detail: `Pickup: ${trackedOrder.pickupAddress.split(",")[0]}`,
                            time: stepIdx >= 1 ? "Matched" : "Pending",
                          },
                          {
                            idx: 2,
                            title: "Cargo Picked Up & In Transit",
                            detail: `En route to ${trackedOrder.dropoffAddress.split(",")[0]}`,
                            time: stepIdx >= 2 ? "In Transit" : `~${etaMin}m`,
                          },
                          {
                            idx: 3,
                            title: isDelivered
                              ? `Delivered & Signed (${trackedOrder.pod?.recipientName || "Verified"})`
                              : "Proof of Delivery (Photo + Signature)",
                            detail: trackedOrder.dropoffAddress,
                            time: isDelivered ? "Done ✓" : "Dropoff",
                          },
                        ].map((node, nIdx) => {
                          const completed = nIdx <= stepIdx;
                          return (
                            <View key={node.title} className="flex-row">
                              <View className="items-center mr-3">
                                <View
                                  style={{
                                    backgroundColor: completed
                                      ? "#09090B"
                                      : "#D4D4D8",
                                  }}
                                  className="w-3 h-3 rounded-full mt-1"
                                />
                                {nIdx < 3 ? (
                                  <View
                                    style={{
                                      backgroundColor:
                                        nIdx < stepIdx ? "#09090B" : "#D4D4D8",
                                    }}
                                    className="w-0.5 flex-1 my-1 min-h-[22px]"
                                  />
                                ) : null}
                              </View>
                              <View className="flex-1 pb-2.5">
                                <View className="flex-row items-center justify-between">
                                  <Text
                                    className={`text-xs font-bold ${
                                      completed
                                        ? "text-[#09090B]"
                                        : "text-[#71717A]"
                                    }`}
                                  >
                                    {node.title}
                                  </Text>
                                  <Text className="text-[10px] font-bold text-[#71717A]">
                                    {node.time}
                                  </Text>
                                </View>
                                <Text
                                  numberOfLines={1}
                                  className="text-[11px] text-[#71717A] mt-0.5"
                                >
                                  {node.detail}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      {/* Courier Card */}
                      {trackedOrder.driverName ? (
                        <View className="bg-[#F4F4F5] rounded-2xl p-3.5 flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center gap-3 flex-1 pr-2">
                            <View
                              style={{
                                backgroundColor: brandConfig.theme.primary,
                              }}
                              className="w-10 h-10 rounded-full items-center justify-center"
                            >
                              <Ionicons
                                name="person"
                                size={16}
                                color="#FFFFFF"
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-bold text-[#09090B]">
                                {trackedOrder.driverName} · Verified COI
                              </Text>
                              <Text
                                numberOfLines={1}
                                className="text-xs text-[#71717A] mt-0.5"
                              >
                                {trackedOrder.driverVehicle || "Commercial Unit"} ·{" "}
                                {verticalMeta.custodyBadge}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row gap-2">
                            {trackedOrder.driverPhone ? (
                              <Pressable
                                onPress={() =>
                                  Linking.openURL(
                                    `tel:${trackedOrder.driverPhone}`
                                  ).catch(() => {})
                                }
                                className="w-9 h-9 rounded-full bg-white items-center justify-center"
                              >
                                <Ionicons
                                  name="call"
                                  size={15}
                                  color="#09090B"
                                />
                              </Pressable>
                            ) : null}
                            <Pressable
                              onPress={() =>
                                shareOrderTrackingLink(trackedOrder)
                              }
                              className="w-9 h-9 rounded-full bg-white items-center justify-center"
                            >
                              <Ionicons
                                name="share-outline"
                                size={15}
                                color="#09090B"
                              />
                            </Pressable>
                          </View>
                        </View>
                      ) : null}

                      {/* Clean Proof of Delivery Preview (When Delivered) */}
                      {isDelivered ? (
                        <Pressable
                          onPress={() => setReceiptOrder(trackedOrder)}
                          className="bg-[#F4F4F5] rounded-2xl p-3 active:opacity-80"
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-xs font-bold text-[#09090B]">
                              Proof of Delivery ·{" "}
                              {trackedOrder.pod?.custodyCertificateId ||
                                "Verified"}
                            </Text>
                            <Text
                              style={{ color: brandConfig.theme.primary }}
                              className="text-xs font-bold"
                            >
                              View Receipt →
                            </Text>
                          </View>
                          <View className="flex-row gap-2.5 h-24">
                            <View className="flex-1 rounded-xl overflow-hidden bg-white">
                              <Image
                                source={{
                                  uri:
                                    trackedOrder.pod?.photoUrls?.[0] ||
                                    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600",
                                }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                              />
                            </View>
                            <View className="flex-1 rounded-xl bg-white p-2 justify-between">
                              {trackedOrder.pod?.signatureSvg ? (
                                <SignatureStrokePreview
                                  strokes={svgPathToStrokes(
                                    trackedOrder.pod.signatureSvg
                                  )}
                                  height={56}
                                />
                              ) : null}
                              <Text
                                numberOfLines={1}
                                className="text-[11px] font-semibold text-[#71717A]"
                              >
                                Signed:{" "}
                                {trackedOrder.pod?.recipientName || "Recipient"}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })()}
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      {/* Historical Delivery Receipt & Chain-of-Custody Modal */}
      <Modal
        visible={Boolean(receiptOrder)}
        animationType="slide"
        transparent
        onRequestClose={() => setReceiptOrder(null)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] pt-3 pb-8 px-6">
            <View className="items-center mb-3">
              <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-bold text-[#09090B]">
                  Delivery Receipt · {receiptOrder?.orderNumber}
                </Text>
                <Text className="text-xs text-[#71717A]">
                  {receiptOrder?.pod?.custodyCertificateId || "Signed & Verified"}
                </Text>
              </View>
              <Pressable
                onPress={() => setReceiptOrder(null)}
                className="w-8 h-8 rounded-full bg-[#F4F4F5] items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#09090B" />
              </Pressable>
            </View>

            {receiptOrder ? (
              <View className="gap-3">
                <View className="h-36 rounded-2xl overflow-hidden bg-[#F4F4F5]">
                  <Image
                    source={{
                      uri:
                        receiptOrder.pod?.photoUrls?.[0] ||
                        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600",
                    }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>

                <View className="bg-[#F4F4F5] rounded-2xl p-3.5 gap-2">
                  {receiptOrder.pod?.signatureSvg ? (
                    <SignatureStrokePreview
                      strokes={svgPathToStrokes(receiptOrder.pod.signatureSvg)}
                      height={58}
                    />
                  ) : null}
                  <Text className="text-xs font-bold text-[#09090B]">
                    Recipient: {receiptOrder.pod?.recipientName || "Verified Receiver"}
                  </Text>
                  <Text className="text-xs text-[#71717A]">
                    GPS Stamp: {receiptOrder.pod?.gpsLat.toFixed(4)},{" "}
                    {receiptOrder.pod?.gpsLng.toFixed(4)} (±
                    {receiptOrder.pod?.gpsAccuracyMeters}m geofence verified)
                  </Text>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="text-xs font-bold text-[#09090B]"
                  >
                    Total Paid: ${receiptOrder.priceTotal.toFixed(2)} (
                    {receiptOrder.billingMode === "corporate_net_terms"
                      ? "Net-7 Invoice"
                      : "Card"}
                    )
                  </Text>
                </View>

                <Pressable
                  onPress={() => void shareOrderTrackingLink(receiptOrder)}
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="h-12 rounded-2xl flex-row items-center justify-center gap-2"
                >
                  <Ionicons name="share-outline" size={16} color="#FFFFFF" />
                  <Text className="text-sm font-bold text-white">
                    Share Receipt & Certificate
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Uber-Style Payment Options & Add Credit/Debit Card Modal */}
      <Modal
        visible={paymentModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPaymentModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] pt-3 pb-8 px-6">
            <View className="items-center mb-3">
              <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-[#09090B]">
                Payment Options
              </Text>
              <Pressable
                onPress={() => {
                  setAddingCard(false);
                  setPaymentModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-[#F4F4F5] items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#09090B" />
              </Pressable>
            </View>

            {!addingCard ? (
              <View className="gap-2.5">
                <Pressable
                  onPress={() => {
                    selectPaymentMethod("apple_pay");
                    setBillingMode("card");
                    setPaymentModalOpen(false);
                  }}
                  className="bg-[#F4F4F5] rounded-2xl p-3.5 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="logo-apple" size={20} color="#09090B" />
                    <View>
                      <Text className="text-sm font-bold text-[#09090B]">
                        Apple Pay
                      </Text>
                      <Text className="text-xs text-[#71717A]">
                        Instant 1-tap biometric checkout
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={
                      selectedPaymentMethodId === "apple_pay"
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={20}
                    color={
                      selectedPaymentMethodId === "apple_pay"
                        ? "#09090B"
                        : "#A1A1AA"
                    }
                  />
                </Pressable>

                {savedCards.map((c) => {
                  const selected = selectedPaymentMethodId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        selectPaymentMethod(c.id);
                        setBillingMode("card");
                        setPaymentModalOpen(false);
                      }}
                      className="bg-[#F4F4F5] rounded-2xl p-3.5 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-3">
                        <Ionicons
                          name="card-outline"
                          size={20}
                          color="#09090B"
                        />
                        <View>
                          <Text className="text-sm font-bold text-[#09090B]">
                            {c.brand} •••• {c.last4}
                          </Text>
                          <Text className="text-xs text-[#71717A]">
                            Expires {c.expiry} · {c.cardholderName}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={selected ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={selected ? "#09090B" : "#A1A1AA"}
                      />
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => {
                    selectPaymentMethod("net_30");
                    setBillingMode("corporate_net_terms");
                    setPaymentModalOpen(false);
                  }}
                  className="bg-[#F4F4F5] rounded-2xl p-3.5 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color="#09090B"
                    />
                    <View>
                      <Text className="text-sm font-bold text-[#09090B]">
                        Corporate Net-30 Account
                      </Text>
                      <Text className="text-xs text-[#71717A]">
                        Monthly consolidated B2B invoicing
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={
                      selectedPaymentMethodId === "net_30"
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={20}
                    color={
                      selectedPaymentMethodId === "net_30"
                        ? "#09090B"
                        : "#A1A1AA"
                    }
                  />
                </Pressable>

                <Pressable
                  onPress={() => setAddingCard(true)}
                  className="mt-1 h-12 bg-[#09090B] rounded-2xl flex-row items-center justify-center gap-2"
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text className="text-sm font-bold text-white">
                    Add Credit or Debit Card
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-3">
                <TextInput
                  value={cardName}
                  onChangeText={setCardName}
                  placeholder="Cardholder Name"
                  placeholderTextColor="#A1A1AA"
                  className="bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
                />
                <TextInput
                  value={cardNumber}
                  onChangeText={(txt) => {
                    const digits = txt.replace(/\D/g, "").slice(0, 16);
                    const grouped = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setCardNumber(grouped);
                  }}
                  keyboardType="number-pad"
                  placeholder="Card Number (16 digits)"
                  placeholderTextColor="#A1A1AA"
                  className="bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
                />
                <View className="flex-row gap-2.5">
                  <TextInput
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    placeholder="MM/YY"
                    placeholderTextColor="#A1A1AA"
                    className="flex-1 bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
                  />
                  <TextInput
                    value={cardCvc}
                    onChangeText={setCardCvc}
                    keyboardType="number-pad"
                    secureTextEntry
                    placeholder="CVV"
                    placeholderTextColor="#A1A1AA"
                    className="flex-1 bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
                  />
                  <TextInput
                    value={cardZip}
                    onChangeText={setCardZip}
                    keyboardType="number-pad"
                    placeholder="ZIP"
                    placeholderTextColor="#A1A1AA"
                    className="flex-1 bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
                  />
                </View>

                <View className="flex-row gap-2 mt-1">
                  <Pressable
                    onPress={() => setAddingCard(false)}
                    className="flex-1 h-12 bg-[#F4F4F5] rounded-2xl items-center justify-center"
                  >
                    <Text className="text-xs font-bold text-[#09090B]">
                      Back
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      addPaymentCard({
                        number: cardNumber,
                        expiry: cardExpiry,
                        cvc: cardCvc,
                        cardholderName: cardName,
                        zip: cardZip,
                      });
                      setBillingMode("card");
                      setCardNumber("");
                      setCardExpiry("");
                      setCardCvc("");
                      setAddingCard(false);
                      setPaymentModalOpen(false);
                    }}
                    style={{ backgroundColor: brandConfig.theme.primary }}
                    className="flex-[1.8] h-12 rounded-2xl items-center justify-center"
                  >
                    <Text className="text-sm font-bold text-white">
                      Save & Use Card
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <OnboardingWizardModal
        visible={storyboardModalOpen}
        onClose={() => setStoryboardModalOpen(false)}
      />
    </SafeAreaView>
  );
}
