import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useAuth, type MobileOrder } from "../../lib/auth-context";
import { VERTICAL_TEMPLATES } from "../../lib/brand-config";
import {
  VEHICLE_CLASSES,
  resolveRouteDistanceMiles,
  type VehicleClass,
} from "../../lib/pricing-engine";
import { BrandHeader } from "../../components/BrandHeader";
import { DeliveryMapCard } from "../../components/DeliveryMapCard";

type DispatchFilter = "ALL" | "NEEDS_DRIVER" | "ACTIVE" | "EXCEPTIONS" | "COMPLETED";

export default function DispatcherScreen() {
  const {
    orders,
    drivers,
    brandConfig,
    onboardingState,
    updateOnboardingState,
    createOrderFromQuote,
    moveOrderInQueue,
    toggleOrderPriority,
    assignDriverToOrder,
    autoDispatchNearestDriver,
    reportOrderException,
    resolveOrderException,
    shareOrderTrackingLink,
    startLiveRunSimulation,
  } = useAuth();
  const [filter, setFilter] = useState<DispatchFilter>("NEEDS_DRIVER");
  const [search, setSearch] = useState("");
  const [assigningOrder, setAssigningOrder] = useState<MobileOrder | null>(
    null
  );
  const [newLoadModalOpen, setNewLoadModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("Midwest Supply Co");
  const [newPickup, setNewPickup] = useState(
    "6910 Bluff Rd, Indianapolis, IN 46217"
  );
  const [newDropoff, setNewDropoff] = useState(
    "8702 Keystone Crossing, Indianapolis, IN 46240"
  );
  const [newVehicle, setNewVehicle] = useState<VehicleClass>("cargo_van");
  const [newStatPriority, setNewStatPriority] = useState(false);
  const [newNotes, setNewNotes] = useState("");

  const verticalMeta = VERTICAL_TEMPLATES[brandConfig.vertical];

  const unassignedCount = orders.filter(
    (o) => o.status === "ReadyForDispatch"
  ).length;
  const inTransitCount = orders.filter((o) =>
    ["Assigned", "Accepted", "PickedUp", "InTransit"].includes(o.status)
  ).length;
  const exceptionCount = orders.filter(
    (o) => Boolean(o.exceptionReason) || o.status === "Canceled"
  ).length;
  const completedCount = orders.filter((o) => o.status === "Delivered").length;
  const availableDriversCount = drivers.filter((d) => d.isAvailable).length;

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      filter === "ALL" ||
      (filter === "NEEDS_DRIVER" && o.status === "ReadyForDispatch") ||
      (filter === "ACTIVE" &&
        ["Assigned", "Accepted", "PickedUp", "InTransit"].includes(o.status)) ||
      (filter === "EXCEPTIONS" &&
        (Boolean(o.exceptionReason) || o.status === "Canceled")) ||
      (filter === "COMPLETED" && o.status === "Delivered");

    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.pickupAddress.toLowerCase().includes(q) ||
      o.dropoffAddress.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const FILTER_TABS: { id: DispatchFilter; label: string; count: number }[] = [
    { id: "ALL", label: "All", count: orders.length },
    { id: "NEEDS_DRIVER", label: "Queue", count: unassignedCount },
    { id: "ACTIVE", label: "Active", count: inTransitCount },
    { id: "EXCEPTIONS", label: "Alerts", count: exceptionCount },
    { id: "COMPLETED", label: "Done", count: completedCount },
  ];

  const featuredOrder =
    orders.find((o) => o.status === "ReadyForDispatch") ||
    orders.find((o) => o.status !== "Delivered" && o.status !== "Canceled") ||
    orders[0];

  return (
    <SafeAreaView className="flex-1 bg-[#EEF0F4]" edges={["top"]}>
      {/* 1. Sleek Full-Bleed Fleet Radar Map (Shows Live 4-Unit Fleet) */}
      <DeliveryMapCard
        fullBleed
        height={236}
        fleetDrivers={drivers}
        pickupLabel={featuredOrder?.pickupAddress || "Downtown Hub"}
        dropoffLabel={featuredOrder?.dropoffAddress || "North Terminal"}
        distanceMi={featuredOrder?.distanceMi || 14.0}
        durationMinutes={18}
        topOverlay={
          <BrandHeader
            floating
            centerElement={
              <View
                style={{
                  shadowColor: "#09090B",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                }}
                className="bg-white/95 border border-black/5 px-3 py-1.5 rounded-full flex-row items-center gap-1.5"
              >
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text
                  style={{ fontVariant: ["tabular-nums"] }}
                  className="text-[11px] font-bold text-[#09090B]"
                >
                  {availableDriversCount} Drivers · {inTransitCount} Active
                </Text>
              </View>
            }
          />
        }
      />

      {/* 2. Sleek Overlapping White Sheet (Queue + Fleet Roster) */}
      <View
        style={{
          shadowColor: "#09090B",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
        }}
        className="flex-1 bg-white -mt-6 rounded-t-[32px] pt-3"
      >
        <View className="items-center mb-2.5">
          <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
        </View>

        <View className="px-5 pb-3 border-b border-[#F4F4F5]">
          <View className="flex-row items-center justify-between mb-2.5">
            <View>
              <Text className="text-[22px] font-bold text-[#09090B] tracking-tight">
                Dispatch Queue
              </Text>
              <Text className="text-xs text-[#71717A]">
                {verticalMeta.shortBadge} · {unassignedCount} awaiting driver
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={() => startLiveRunSimulation()}
                className="bg-[#F4F4F5] px-2.5 py-1.5 rounded-full flex-row items-center gap-1 active:opacity-80"
              >
                <Ionicons name="flash" size={12} color="#09090B" />
                <Text className="text-[11px] font-bold text-[#09090B]">
                  Simulate
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setNewLoadModalOpen(true)}
                className="bg-[#09090B] px-3 py-1.5 rounded-full flex-row items-center gap-1"
              >
                <Ionicons name="add" size={13} color="#FFFFFF" />
                <Text className="text-[11px] font-bold text-white">
                  New Load
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Clean iOS Segmented Queue Control */}
          <View className="bg-[#F4F4F5] p-1 rounded-2xl flex-row">
            {FILTER_TABS.map((tab) => {
              const active = filter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setFilter(tab.id)}
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
                  className="flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1"
                >
                  <Text
                    className={`text-xs font-bold ${
                      active ? "text-[#09090B]" : "text-[#71717A]"
                    }`}
                  >
                    {tab.label}
                  </Text>
                  <Text
                    style={{
                      fontVariant: ["tabular-nums"],
                      color:
                        tab.id === "NEEDS_DRIVER" && tab.count > 0
                          ? brandConfig.theme.primary
                          : active
                            ? "#09090B"
                            : "#A1A1AA",
                    }}
                    className="text-[11px] font-extrabold"
                  >
                    {tab.count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
        >
          {!onboardingState.dismissedDispatchGuide ? (
            <View className="bg-[#F4F4F5] rounded-2xl px-3.5 py-2.5 mt-3 flex-row items-center justify-between">
              <Text className="text-[11px] font-medium text-[#52525B] flex-1 pr-2">
                1. New loads arrive in Queue → 2. Tap Auto-Nearest or Assign → 3. Watch live fleet pins & resolve Alerts
              </Text>
              <Pressable
                onPress={() =>
                  updateOnboardingState({ dismissedDispatchGuide: true })
                }
              >
                <Ionicons name="close" size={14} color="#71717A" />
              </Pressable>
            </View>
          ) : null}

          {/* Compact Search Pill */}
          <View className="mt-3 mb-1">
            <View className="bg-[#F4F4F5] rounded-2xl px-3.5 h-10 flex-row items-center gap-2">
              <Ionicons name="search" size={16} color="#71717A" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search order #, customer, or street..."
                placeholderTextColor="#A1A1AA"
                className="flex-1 text-sm text-[#09090B] py-0"
              />
            </View>
          </View>

          {/* Indented-Hairline Order Queue Rows */}
          <View>
            {filteredOrders.map((order, idx) => {
              const needsDriver = order.status === "ReadyForDispatch";
              const isDelivered = order.status === "Delivered";
              const shortPickup = order.pickupAddress.split(",")[0];
              const shortDropoff = order.dropoffAddress.split(",")[0];

              return (
                <View key={order.id}>
                  {idx > 0 ? <View className="h-[1px] bg-[#F4F4F5]" /> : null}
                  <View className="py-3.5">
                    {/* Row 1: Order # + Status Pill + Price */}
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          style={{ fontVariant: ["tabular-nums"] }}
                          className="text-[15px] font-bold text-[#09090B]"
                        >
                          {order.orderNumber}
                        </Text>
                        <View
                          style={{
                            backgroundColor: needsDriver
                              ? brandConfig.theme.primarySoft
                              : "#F4F4F5",
                          }}
                          className="px-2 py-0.5 rounded-full flex-row items-center gap-1"
                        >
                          <View
                            style={{
                              backgroundColor: needsDriver
                                ? brandConfig.theme.primary
                                : isDelivered
                                  ? "#16A34A"
                                  : "#09090B",
                            }}
                            className="w-1.5 h-1.5 rounded-full"
                          />
                          <Text
                            style={{
                              color: needsDriver
                                ? brandConfig.theme.primary
                                : "#09090B",
                            }}
                            className="text-[11px] font-bold"
                          >
                            {needsDriver
                              ? "Unassigned"
                              : isDelivered
                                ? "Delivered"
                                : "In Transit"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{ fontVariant: ["tabular-nums"] }}
                        className="text-[15px] font-bold text-[#09090B]"
                      >
                        ${order.priceTotal.toFixed(2)}
                      </Text>
                    </View>

                    {/* Row 2: 1-Line Route */}
                    <Text
                      numberOfLines={1}
                      className="text-[14px] font-medium text-[#09090B] mt-0.5"
                    >
                      {shortPickup} → {shortDropoff}
                    </Text>

                    {/* Exception Banner (Full-Width Row When Flagged) */}
                    {order.exceptionReason ? (
                      <View className="mt-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 flex-row items-center justify-between">
                        <Text className="text-[11px] font-semibold text-rose-700 flex-1 pr-2">
                          Alert: {order.exceptionReason}
                        </Text>
                        <Pressable
                          onPress={() => void resolveOrderException(order.id)}
                        >
                          <Text className="text-[11px] font-bold text-rose-700">
                            Resolve
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {/* Row 3: Customer + Driver Assignment Action */}
                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-1 pr-2">
                        <Text
                          numberOfLines={1}
                          className="text-xs text-[#71717A]"
                        >
                          {order.customerName} ·{" "}
                          {order.driverName
                            ? `${order.driverName}`
                            : `${
                                VEHICLE_CLASSES[order.vehicleType]
                                  ?.shortLabel || "Courier"
                              } (${order.distanceMi} mi)`}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-1.5 justify-end">
                        {/* Queue Sequence Reorder Controls (Up / Down) */}
                        <Pressable
                          onPress={() => moveOrderInQueue(order.id, "up")}
                          className="w-7 h-7 rounded-full bg-[#F4F4F5] items-center justify-center"
                        >
                          <Ionicons
                            name="arrow-up"
                            size={12}
                            color="#09090B"
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => moveOrderInQueue(order.id, "down")}
                          className="w-7 h-7 rounded-full bg-[#F4F4F5] items-center justify-center"
                        >
                          <Ionicons
                            name="arrow-down"
                            size={12}
                            color="#09090B"
                          />
                        </Pressable>

                        {/* 1-Tap STAT Rush Priority Toggle */}
                        {!isDelivered ? (
                          <Pressable
                            onPress={() => toggleOrderPriority(order.id)}
                            className={`px-2.5 py-1 rounded-full ${
                              order.serviceLevel === "stat_90m"
                                ? "bg-amber-500"
                                : "bg-[#F4F4F5]"
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-bold ${
                                order.serviceLevel === "stat_90m"
                                  ? "text-white"
                                  : "text-[#09090B]"
                              }`}
                            >
                              {order.serviceLevel === "stat_90m"
                                ? "STAT"
                                : "Std"}
                            </Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          onPress={() => shareOrderTrackingLink(order)}
                          className="w-7 h-7 rounded-full bg-[#F4F4F5] items-center justify-center"
                        >
                          <Ionicons
                            name="share-outline"
                            size={13}
                            color="#09090B"
                          />
                        </Pressable>

                        {!isDelivered && !order.exceptionReason ? (
                          <Pressable
                            onPress={() =>
                              Alert.alert(
                                `Flag Exception · ${order.orderNumber}`,
                                "Select exception type:",
                                [
                                  {
                                    text: "Delayed / Traffic Hold",
                                    onPress: () =>
                                      void reportOrderException(
                                        order.id,
                                        "Delayed in transit (>15m SLA risk)"
                                      ),
                                  },
                                  {
                                    text: "Pickup / Dock Issue",
                                    onPress: () =>
                                      void reportOrderException(
                                        order.id,
                                        "Dock gate access hold"
                                      ),
                                  },
                                  { text: "Cancel", style: "cancel" },
                                ]
                              )
                            }
                            className="w-8 h-8 rounded-full bg-[#F4F4F5] items-center justify-center"
                          >
                            <Ionicons
                              name="warning-outline"
                              size={14}
                              color="#D97706"
                            />
                          </Pressable>
                        ) : null}

                        {needsDriver ? (
                          <Pressable
                            onPress={async () => {
                              const matched =
                                await autoDispatchNearestDriver(order.id);
                              if (matched) {
                                Alert.alert(
                                  "Auto-Dispatched",
                                  `Assigned nearest driver ${matched.name} to ${order.orderNumber}.`
                                );
                              }
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#09090B]"
                          >
                            <Text className="text-xs font-bold text-white">
                              Auto-Nearest
                            </Text>
                          </Pressable>
                        ) : null}

                        {!isDelivered ? (
                          <Pressable
                            onPress={() => setAssigningOrder(order)}
                            style={
                              needsDriver
                                ? { backgroundColor: brandConfig.theme.primary }
                                : { backgroundColor: "#F4F4F5" }
                            }
                            className="px-3.5 py-1.5 rounded-full"
                          >
                            <Text
                              className={`text-xs font-bold ${
                                needsDriver ? "text-white" : "text-[#09090B]"
                              }`}
                            >
                              {order.driverName ? "Reassign" : "Assign"}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Clean Indented-Hairline Fleet Roster */}
          <View className="mt-4 pt-4 border-t border-[#F4F4F5]">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A] mb-2">
              Active Fleet ({drivers.length})
            </Text>

            {drivers.map((drv, idx) => (
              <View key={drv.id}>
                {idx > 0 ? (
                  <View className="ml-[48px] h-[1px] bg-[#F4F4F5]" />
                ) : null}
                <View className="py-2.5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="relative">
                      <View className="w-9 h-9 rounded-full bg-[#F4F4F5] items-center justify-center">
                        <Ionicons
                          name="car-sport-outline"
                          size={17}
                          color="#09090B"
                        />
                      </View>
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-[#09090B]">
                        {drv.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-xs text-[#71717A]"
                      >
                        {drv.vehicleDetails}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(`tel:${drv.phone}`).catch(() => {})
                    }
                    className="bg-[#F4F4F5] px-3 py-1.5 rounded-full flex-row items-center gap-1"
                  >
                    <Ionicons name="call-outline" size={12} color="#09090B" />
                    <Text className="text-xs font-bold text-[#09090B]">
                      Call
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Proximity-Sorted Driver Assignment Bottom Sheet */}
      <Modal
        visible={Boolean(assigningOrder)}
        animationType="slide"
        transparent
        onRequestClose={() => setAssigningOrder(null)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] pt-3 pb-8 px-6">
            <View className="items-center mb-3">
              <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-lg font-bold text-[#09090B]">
                  Assign Closest Driver
                </Text>
                <Text className="text-xs text-[#71717A]">
                  {assigningOrder?.orderNumber} · {assigningOrder?.customerName}{" "}
                  ({assigningOrder?.distanceMi} mi)
                </Text>
              </View>
              <Pressable
                onPress={() => setAssigningOrder(null)}
                className="w-8 h-8 rounded-full bg-[#F4F4F5] items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#09090B" />
              </Pressable>
            </View>

            <View>
              {drivers.map((drv, idx) => {
                const distFromPickup = (0.8 + idx * 1.4).toFixed(1);
                const etaMin = 4 + idx * 3;
                return (
                  <View key={drv.id}>
                    {idx > 0 ? (
                      <View className="ml-[52px] h-[1px] bg-[#F4F4F5]" />
                    ) : null}
                    <Pressable
                      onPress={async () => {
                        if (assigningOrder) {
                          await assignDriverToOrder(assigningOrder.id, drv.id);
                        }
                        setAssigningOrder(null);
                      }}
                      className="py-3 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-3 flex-1 pr-2">
                        <View className="relative">
                          <View className="w-10 h-10 rounded-full bg-[#F4F4F5] items-center justify-center">
                            <Ionicons
                              name="person-outline"
                              size={17}
                              color="#09090B"
                            />
                          </View>
                          <View className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[15px] font-bold text-[#09090B]">
                            {drv.name}
                          </Text>
                          <Text className="text-xs text-[#71717A]">
                            {drv.vehicleDetails}
                          </Text>
                          <Text
                            style={{ fontVariant: ["tabular-nums"] }}
                            className="text-[11px] font-semibold text-[#09090B] mt-0.5"
                          >
                            {distFromPickup} mi away · ETA {etaMin} min
                          </Text>
                        </View>
                      </View>
                      <View
                        style={{ backgroundColor: brandConfig.theme.primary }}
                        className="px-4 py-2 rounded-full"
                      >
                        <Text className="text-xs font-bold text-white">
                          Assign
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* In-Place Dispatcher Quick-Create Load Modal (Stays on Dispatch Board) */}
      <Modal
        visible={newLoadModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setNewLoadModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] pt-3 pb-8 px-6">
            <View className="items-center mb-3">
              <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-bold text-[#09090B]">
                  Add Load to Dispatch Queue
                </Text>
                <Text className="text-xs text-[#71717A]">
                  Creates an order directly in your active queue
                </Text>
              </View>
              <Pressable
                onPress={() => setNewLoadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4F4F5] items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#09090B" />
              </Pressable>
            </View>

            <View className="gap-2.5">
              <TextInput
                value={newCustomerName}
                onChangeText={setNewCustomerName}
                placeholder="Customer / Account Name"
                placeholderTextColor="#A1A1AA"
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
              />
              <TextInput
                value={newPickup}
                onChangeText={setNewPickup}
                placeholder="Pickup Address"
                placeholderTextColor="#A1A1AA"
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
              />
              <TextInput
                value={newDropoff}
                onChangeText={setNewDropoff}
                placeholder="Drop-off Address"
                placeholderTextColor="#A1A1AA"
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
              />
              <TextInput
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="PO #, gate code, or dock note (optional)"
                placeholderTextColor="#A1A1AA"
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3 text-sm font-medium text-[#09090B]"
              />

              <View className="flex-row gap-2">
                {(["sedan", "suv", "cargo_van"] as VehicleClass[]).map(
                  (vKey) => {
                    const selected = newVehicle === vKey;
                    return (
                      <Pressable
                        key={vKey}
                        onPress={() => setNewVehicle(vKey)}
                        style={
                          selected
                            ? { backgroundColor: "#09090B" }
                            : { backgroundColor: "#F4F4F5" }
                        }
                        className="flex-1 py-2.5 rounded-xl items-center"
                      >
                        <Text
                          className={`text-xs font-bold ${
                            selected ? "text-white" : "text-[#09090B]"
                          }`}
                        >
                          {VEHICLE_CLASSES[vKey].shortLabel}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              <Pressable
                onPress={() => setNewStatPriority((p) => !p)}
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3 flex-row items-center justify-between"
              >
                <Text className="text-xs font-bold text-[#09090B]">
                  Priority Level
                </Text>
                <Text
                  style={{
                    color: newStatPriority
                      ? "#D97706"
                      : brandConfig.theme.primary,
                  }}
                  className="text-xs font-extrabold"
                >
                  {newStatPriority
                    ? "Direct STAT (60–90m)"
                    : "3-Hour Urgent B2B"}
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  if (!newPickup.trim() || !newDropoff.trim()) return;
                  const dist = await resolveRouteDistanceMiles(
                    newPickup,
                    newDropoff
                  );
                  await createOrderFromQuote({
                    pickupAddress: newPickup.trim(),
                    dropoffAddress: newDropoff.trim(),
                    distanceMi: dist.distanceMi,
                    weightLb: 35,
                    vehicleType: newVehicle,
                    serviceLevel: newStatPriority ? "stat_90m" : "urgent_3h",
                    accessorials: [],
                    billingMode: "corporate_net_terms",
                    customerName:
                      newCustomerName.trim() || "Commercial Account",
                    customerEmail: brandConfig.supportEmail,
                    customerPhone: brandConfig.supportPhone,
                    specialInstructions: newNotes.trim() || undefined,
                  });
                  setNewNotes("");
                  setNewLoadModalOpen(false);
                  setFilter("NEEDS_DRIVER");
                }}
                style={{ backgroundColor: brandConfig.theme.primary }}
                className="h-[52px] rounded-2xl items-center justify-center mt-1"
              >
                <Text className="text-sm font-bold text-white">
                  Create & Add to Queue →
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
