import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { VERTICAL_TEMPLATES, WHITE_LABEL_PRESETS } from "../../lib/brand-config";
import { WhiteLabelModal } from "../../components/WhiteLabelModal";
import { OnboardingWizardModal } from "../../components/OnboardingWizardModal";
import { BrandHeader } from "../../components/BrandHeader";
import {
  VEHICLE_CLASSES,
  calculateDeliveryQuote,
  type VehicleClass,
} from "../../lib/pricing-engine";
import { getGoogleMapsStatus } from "../../lib/google-maps";
import {
  SAMPLE_CSV_TEMPLATES,
  parseImportedClients,
  parseImportedDrivers,
  parseImportedOrders,
  type CrmAdapterMode,
  type OpsImportDatasetType,
} from "../../lib/ops-data-portability";

type AdminTab = "overview" | "pricing" | "data" | "fleet" | "logs";

export default function AdminScreen() {
  const {
    orders,
    drivers,
    users,
    auditEvents,
    brandConfig,
    pricingRules,
    apiHealth,
    crmSettings,
    onboardingState,
    updatePricingRules,
    addFleetDriver,
    verifyDriverDocs,
    applyWhiteLabelTenant,
    exportClientInstallConfig,
    updateCrmSettings,
    sendDriverInviteLink,
    shareCustomerBookingLink,
    importOpsDataset,
    exportLedgerCsv,
    resetDemoWorkspace,
  } = useAuth();

  const [tab, setTab] = useState<AdminTab>("overview");
  const [whiteLabelModalOpen, setWhiteLabelModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);

  const [importDataset, setImportDataset] = useState<OpsImportDatasetType>("orders");
  const [csvDraft, setCsvDraft] = useState<string>(SAMPLE_CSV_TEMPLATES.orders);
  const [crmMode] = useState<CrmAdapterMode>(crmSettings.mode);
  const [hubspotToken, setHubspotToken] = useState<string>(
    crmSettings.hubspotPrivateAppToken || ""
  );
  const [crmWebhookUrl, setCrmWebhookUrl] = useState<string>(crmSettings.webhookUrl);
  const mapsStatus = getGoogleMapsStatus();

  const [baseFee, setBaseFee] = useState(String(pricingRules.baseFee));
  const [perMileRate, setPerMileRate] = useState(
    String(pricingRules.perMileRate)
  );
  const [fuelPct] = useState(String(Math.round(pricingRules.fuelPct * 100)));
  const [minCharge, setMinCharge] = useState(
    String(pricingRules.minimumCharge)
  );
  const [driverSplitPct, setDriverSplitPct] = useState(
    String(Math.round((pricingRules.driverCommissionRate ?? 0.7) * 100))
  );

  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverVehicle, setDriverVehicle] = useState("");
  const [driverVehicleType, setDriverVehicleType] =
    useState<VehicleClass>("cargo_van");

  const verticalMeta = VERTICAL_TEMPLATES[brandConfig.vertical];

  const totalRevenue = orders.reduce((acc, o) => acc + o.priceTotal, 0);
  const totalDriverPayouts = orders.reduce(
    (acc, o) => acc + (o.driverPayout || 0),
    0
  );
  const totalPlatformMargin = orders.reduce(
    (acc, o) => acc + (o.platformMargin || 0),
    0
  );
  const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;
  const driverShareInt = Math.round(
    (pricingRules.driverCommissionRate ?? 0.7) * 100
  );
  const ownerMarginInt = 100 - driverShareInt;

  function handleSavePricing() {
    const nextRules = {
      baseFee: Math.max(0, Number(baseFee) || 0),
      perMileRate: Math.max(0, Number(perMileRate) || 0),
      fuelPct: Math.max(0, (Number(fuelPct) || 0) / 100),
      minimumCharge: Math.max(0, Number(minCharge) || 0),
      driverCommissionRate: Math.min(
        0.95,
        Math.max(0.4, (Number(driverSplitPct) || 70) / 100)
      ),
      hipaaComplianceMode: Boolean(pricingRules.hipaaComplianceMode),
      currency: "usd",
    };
    updatePricingRules(nextRules);
    Alert.alert(
      "Rates Saved",
      "Your delivery pricing and driver split are now live."
    );
  }

  function handleAddDriver() {
    if (!driverName.trim() || !driverPhone.trim() || !driverVehicle.trim()) {
      Alert.alert(
        "Missing Info",
        "Please enter driver name, phone number, and vehicle."
      );
      return;
    }
    addFleetDriver(
      driverName.trim(),
      driverPhone.trim(),
      driverVehicle.trim(),
      driverVehicleType
    );
    setDriverName("");
    setDriverPhone("");
    setDriverVehicle("");
    Alert.alert("Driver Added", "New driver added to your team.");
  }

  const previewQuote = calculateDeliveryQuote(15, 50, {
    baseFee: Number(baseFee) || 0,
    perMileRate: Number(perMileRate) || 0,
    fuelPct: (Number(fuelPct) || 0) / 100,
    minimumCharge: Number(minCharge) || 0,
    driverCommissionRate: (Number(driverSplitPct) || 70) / 100,
    currency: "usd",
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <BrandHeader
        title="Business & Rates"
        subtitle={`${brandConfig.companyName} · ${verticalMeta.shortBadge}`}
      >
        {/* Clean iOS Segmented Control */}
        <View className="bg-[#F4F4F5] p-1 rounded-2xl flex-row">
          {(
            [
              { id: "overview", label: "Balances" },
              { id: "data", label: "Sync" },
              { id: "pricing", label: "Rates" },
              { id: "fleet", label: "Team" },
              { id: "logs", label: "Logs" },
            ] as { id: AdminTab; label: string }[]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
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
                className="flex-1 py-2 rounded-xl items-center"
              >
                <Text
                  className={`text-xs font-bold ${
                    active ? "text-[#09090B]" : "text-[#71717A]"
                  }`}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BrandHeader>

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === "overview" ? (
          <View>
            {/* 0. Self-Serve Tenant Activation Checklist (Mobbin / Rippling Pattern) */}
            {(() => {
              const checks = [
                {
                  label: `Brand & Vertical (${brandConfig.shortName} · ${verticalMeta.shortBadge})`,
                  done: onboardingState.brandConfigured,
                },
                {
                  label: `Rates & Split ($${pricingRules.baseFee} + $${pricingRules.perMileRate}/mi · ${driverShareInt}% driver)`,
                  done: onboardingState.ratesConfigured,
                },
                {
                  label: `Systems Connected (${crmSettings.mode === "hubspot_deals" ? "HubSpot Auto-Mirror" : crmSettings.mode === "csv_only" ? "CSV / Spreadsheet" : "Webhook"})`,
                  done: onboardingState.dataOrCrmConnected,
                },
                {
                  label: "Driver SMS Invite & Customer Booking Link Shared",
                  done: onboardingState.teamAndBookingShared,
                },
              ];
              const completedCount = checks.filter((c) => c.done).length;

              return (
                <View className="px-5 pt-4 pb-2">
                  <View className="bg-[#F4F4F5] rounded-2xl p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-1 pr-2">
                        <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                          Launch Progress · {completedCount} of 4 Complete
                        </Text>
                        <Text className="text-[16px] font-bold text-[#09090B] mt-0.5">
                          Self-Serve Fleet Onboarding
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setOnboardingModalOpen(true)}
                        style={{ backgroundColor: brandConfig.theme.primary }}
                        className="px-3.5 py-2 rounded-full"
                      >
                        <Text className="text-xs font-bold text-white">
                          {completedCount === 4 ? "Edit Setup" : "Setup Wizard →"}
                        </Text>
                      </Pressable>
                    </View>

                    <View className="gap-1.5 my-2">
                      {checks.map((item) => (
                        <View
                          key={item.label}
                          className="flex-row items-center gap-2"
                        >
                          <Ionicons
                            name={
                              item.done
                                ? "checkmark-circle"
                                : "ellipse-outline"
                            }
                            size={15}
                            color={
                              item.done
                                ? brandConfig.theme.primary
                                : "#A1A1AA"
                            }
                          />
                          <Text
                            numberOfLines={1}
                            className={`text-xs flex-1 ${
                              item.done
                                ? "font-semibold text-[#09090B]"
                                : "font-medium text-[#71717A]"
                            }`}
                          >
                            {item.label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View className="flex-row gap-2 pt-2.5 mt-1 border-t border-black/5">
                      <Pressable
                        onPress={() =>
                          void sendDriverInviteLink(
                            drivers[0]?.name || "Marcus Vance",
                            drivers[0]?.phone || "317-555-0142"
                          )
                        }
                        className="flex-1 bg-white py-2 rounded-xl flex-row items-center justify-center gap-1.5"
                      >
                        <Ionicons
                          name="person-add-outline"
                          size={13}
                          color="#09090B"
                        />
                        <Text className="text-xs font-bold text-[#09090B]">
                          Invite Driver
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void shareCustomerBookingLink()}
                        className="flex-1 bg-white py-2 rounded-xl flex-row items-center justify-center gap-1.5"
                      >
                        <Ionicons
                          name="link-outline"
                          size={14}
                          color="#09090B"
                        />
                        <Text className="text-xs font-bold text-[#09090B]">
                          Booking Link
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* 1. Stripe Dashboard iOS Zero-Noise Balance Hero */}
            <View className="px-5 pt-4 pb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-[#71717A] uppercase tracking-wider">
                  Net Business Profit (USD)
                </Text>
                <View
                  style={{ backgroundColor: brandConfig.theme.primarySoft }}
                  className="px-2.5 py-1 rounded-full"
                >
                  <Text
                    style={{
                      color: brandConfig.theme.primary,
                      fontVariant: ["tabular-nums"],
                    }}
                    className="text-[11px] font-bold"
                  >
                    {ownerMarginInt}% Owner Take
                  </Text>
                </View>
              </View>

              <Text
                style={{ fontVariant: ["tabular-nums"] }}
                className="text-[36px] font-bold text-[#09090B] tracking-tight mt-1"
              >
                ${totalPlatformMargin.toFixed(2)}
              </Text>
              <Text className="text-xs text-[#71717A] mt-0.5">
                Available for instant payout after driver settlements
              </Text>

              {/* Key-Value Ledger Rows */}
              <View className="mt-4 pt-3 border-t border-[#F4F4F5] gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[15px] font-medium text-[#09090B]">
                    Gross delivery volume ({orders.length} orders)
                  </Text>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="text-[15px] font-bold text-[#09090B]"
                  >
                    ${totalRevenue.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] text-[#71717A]">
                    Driver payouts ({driverShareInt}% commission split)
                  </Text>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="text-[14px] font-semibold text-[#71717A]"
                  >
                    -${totalDriverPayouts.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-[#F4F4F5]">
                  <Text className="text-[14px] font-bold text-[#09090B]">
                    Verified completions ({verticalMeta.custodyBadge})
                  </Text>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="text-[14px] font-bold text-[#09090B]"
                  >
                    {deliveredOrders} of {orders.length}
                  </Text>
                </View>
              </View>
            </View>

            <View className="h-[1px] bg-[#F4F4F5]" />

            {/* 2. White-Label Tenant Switcher & Brand Studio */}
            <View className="px-5 py-4">
              <View className="flex-row items-center justify-between mb-2.5">
                <View>
                  <Text className="text-[17px] font-bold text-[#09090B]">
                    White-Label Tenants
                  </Text>
                  <Text className="text-xs text-[#71717A]">
                    Tap any client preset to switch brand & vertical live
                  </Text>
                </View>
                <Pressable
                  onPress={() => setWhiteLabelModalOpen(true)}
                  className="bg-[#F4F4F5] px-3 py-1.5 rounded-full"
                >
                  <Text className="text-xs font-bold text-[#09090B]">
                    + Custom Brand
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-3"
              >
                <View className="flex-row gap-2">
                  {WHITE_LABEL_PRESETS.map((preset) => {
                    const selected =
                      preset.tenantSlug === brandConfig.tenantSlug;
                    return (
                      <Pressable
                        key={preset.tenantSlug}
                        onPress={() => applyWhiteLabelTenant(preset)}
                        style={
                          selected
                            ? { backgroundColor: preset.theme.primary }
                            : { backgroundColor: "#F4F4F5" }
                        }
                        className="px-3.5 py-2 rounded-full flex-row items-center gap-2"
                      >
                        <View
                          style={{
                            backgroundColor: selected
                              ? "#FFFFFF"
                              : preset.theme.primary,
                          }}
                          className="w-2 h-2 rounded-full"
                        />
                        <Text
                          className={`text-xs font-bold ${
                            selected ? "text-white" : "text-[#09090B]"
                          }`}
                        >
                          {preset.shortName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => setWhiteLabelModalOpen(true)}
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="flex-1 h-11 rounded-2xl flex-row items-center justify-center gap-1.5"
                >
                  <Ionicons
                    name="color-palette-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text className="text-xs font-bold text-white">
                    Open Brand Studio
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => exportClientInstallConfig()}
                  className="flex-1 h-11 bg-[#F4F4F5] rounded-2xl flex-row items-center justify-center gap-1.5"
                >
                  <Ionicons name="share-outline" size={16} color="#09090B" />
                  <Text className="text-xs font-bold text-[#09090B]">
                    Export Config
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="h-[1px] bg-[#F4F4F5]" />

            {/* API Health & Real-Time Telemetry Status */}
            <View className="px-5 py-4">
              <Text className="text-[17px] font-bold text-[#09090B] mb-2">
                Platform & API Health
              </Text>
              <View className="bg-[#F4F4F5] rounded-2xl p-3.5 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-[#71717A]">
                    Supabase Database & RLS
                  </Text>
                  <Text className="text-xs font-bold text-[#09090B]">
                    {apiHealth.supabaseConfigured
                      ? "Connected"
                      : "Seed / Offline Sandbox"}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-[#71717A]">
                    Network & Realtime Stream
                  </Text>
                  <Text className="text-xs font-bold text-[#09090B]">
                    {apiHealth.networkOnline ? "Online" : "Offline Queue Active"} ·{" "}
                    {apiHealth.realtimeConnected ? "Live" : "Standby"}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-[#71717A]">
                    Offline Sync Queue
                  </Text>
                  <Text
                    style={{ fontVariant: ["tabular-nums"] }}
                    className="text-xs font-bold text-[#09090B]"
                  >
                    {apiHealth.pendingOfflineCount} pending
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-[#71717A]">
                    Google Places & Distance Matrix
                  </Text>
                  <Text className="text-xs font-bold text-[#09090B]">
                    {mapsStatus.configured ? "Live Key Active" : "Estimator Fallback"}
                  </Text>
                </View>
              </View>
            </View>

            <View className="h-[1px] bg-[#F4F4F5]" />

            {/* 3. Stripe-Style Order Settlement Rows */}
            <View className="px-5 py-4">
              <Text className="text-[17px] font-bold text-[#09090B] mb-2">
                Recent settlements
              </Text>

              {orders.map((order, idx) => (
                <View key={order.id}>
                  {idx > 0 ? (
                    <View className="ml-[42px] h-[1px] bg-[#F4F4F5]" />
                  ) : null}
                  <View className="py-3 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <View className="w-7 h-7 rounded-lg bg-[#F4F4F5] items-center justify-center">
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color={brandConfig.theme.primary}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{ fontVariant: ["tabular-nums"] }}
                          className="text-[15px] font-semibold text-[#09090B]"
                        >
                          +${(order.platformMargin || 0).toFixed(2)} net profit
                        </Text>
                        <Text className="text-[13px] text-[#71717A]">
                          {order.orderNumber} · {order.customerName} ($
                          {order.priceTotal.toFixed(2)} gross)
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{ fontVariant: ["tabular-nums"] }}
                      className="text-xs font-semibold text-[#71717A]"
                    >
                      {order.billingMode === "corporate_net_terms"
                        ? "Net-7"
                        : "Card"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {tab === "data" ? (
          <View className="px-5 pt-4 gap-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[18px] font-bold text-[#09090B]">
                  CRM & Spreadsheet Sync
                </Text>
                <Text className="text-xs text-[#71717A] mt-0.5">
                  Plug in HubSpot, Google Sheets, or QuickBooks so orders, drivers, and signed PODs flow automatically.
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Pressable
                  onPress={() => {
                    void resetDemoWorkspace();
                    Alert.alert(
                      "Workspace Reset",
                      `Restored ${brandConfig.shortName} seed loads, drivers, and rates.`
                    );
                  }}
                  className="bg-[#F4F4F5] px-2.5 py-2 rounded-full"
                >
                  <Text className="text-[11px] font-bold text-[#09090B]">
                    Reset
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void exportLedgerCsv()}
                  className="bg-[#09090B] px-3 py-2 rounded-full flex-row items-center gap-1"
                >
                  <Ionicons name="download-outline" size={12} color="#FFFFFF" />
                  <Text className="text-[11px] font-bold text-white">
                    Export Ledger
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 1. HubSpot CRM Card (PST Native Workflow) */}
            <View className="bg-[#F4F4F5] rounded-2xl p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-9 h-9 rounded-xl bg-[#09090B] items-center justify-center">
                    <Ionicons
                      name="git-network-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-[#09090B]">
                      HubSpot CRM Pipeline
                    </Text>
                    <Text className="text-[11px] text-[#71717A]">
                      Auto-mirrors Deals → Dispatch → Signed POD
                    </Text>
                  </View>
                </View>
                <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
                  <Text className="text-[10px] font-bold text-emerald-800">
                    2-Way Ready
                  </Text>
                </View>
              </View>

              <TextInput
                value={hubspotToken}
                onChangeText={setHubspotToken}
                autoCapitalize="none"
                placeholder="Paste HubSpot Private App Token (pat-na1-...)"
                placeholderTextColor="#A1A1AA"
                className="bg-white rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#09090B]"
              />

              {/* Visual Staged Deals Ready to Pull */}
              <View className="bg-white rounded-xl p-3 gap-2">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                  Staged Deals Ready to Dispatch
                </Text>
                {parseImportedOrders(SAMPLE_CSV_TEMPLATES.orders).map((deal) => (
                  <View
                    key={deal.poNumber}
                    className="flex-row items-center justify-between py-1.5 border-t border-[#F4F4F5]"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-xs font-bold text-[#09090B]">
                        {deal.customerName} · {deal.poNumber}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-[11px] text-[#71717A]"
                      >
                        {deal.pickupAddress.split(",")[0]} →{" "}
                        {deal.dropoffAddress.split(",")[0]} ({deal.distanceMi} mi)
                      </Text>
                    </View>
                    <View className="bg-[#F4F4F5] px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-bold text-[#09090B]">
                        {deal.vehicleType === "cargo_van" ? "Van" : "Sedan"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={async () => {
                  await updateCrmSettings({
                    mode: "hubspot_deals",
                    hubspotPrivateAppToken: hubspotToken.trim(),
                    hubspotPipelineId: "default",
                    webhookUrl: crmWebhookUrl.trim(),
                    autoSyncOnDelivered: true,
                    lastSyncStatus: "Synced",
                  });
                  const res = await importOpsDataset(
                    "orders",
                    SAMPLE_CSV_TEMPLATES.orders
                  );
                  Alert.alert(
                    "HubSpot Deals Synced",
                    `${res.message} Completed PODs will automatically close the matching HubSpot deals.`
                  );
                }}
                style={{ backgroundColor: brandConfig.theme.primary }}
                className="h-11 rounded-xl flex-row items-center justify-center gap-2"
              >
                <Ionicons name="sync-outline" size={15} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">
                  Sync 2 Open Deals into Dispatch Queue
                </Text>
              </Pressable>
            </View>

            {/* 2. Google Sheets / Excel Visual Workbook Sync */}
            <View className="bg-[#F4F4F5] rounded-2xl p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-9 h-9 rounded-xl bg-white items-center justify-center">
                    <Ionicons
                      name="grid-outline"
                      size={18}
                      color="#09090B"
                    />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-[#09090B]">
                      Google Sheets & Excel Roster
                    </Text>
                    <Text className="text-[11px] text-[#71717A]">
                      Import drivers, client accounts, or daily route sheets
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-2">
                {(
                  [
                    { id: "orders", label: "Route Loads (2)" },
                    { id: "drivers", label: "Drivers (2)" },
                    { id: "clients", label: "B2B Clients (2)" },
                  ] as { id: OpsImportDatasetType; label: string }[]
                ).map((ds) => {
                  const selected = importDataset === ds.id;
                  return (
                    <Pressable
                      key={ds.id}
                      onPress={() => {
                        setImportDataset(ds.id);
                        setCsvDraft(SAMPLE_CSV_TEMPLATES[ds.id]);
                      }}
                      style={
                        selected
                          ? { backgroundColor: "#09090B" }
                          : { backgroundColor: "#FFFFFF" }
                      }
                      className="flex-1 py-2 rounded-xl items-center"
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          selected ? "text-white" : "text-[#09090B]"
                        }`}
                      >
                        {ds.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="bg-white rounded-xl p-3 gap-1.5">
                {importDataset === "orders"
                  ? parseImportedOrders(csvDraft).map((r) => (
                      <View
                        key={r.poNumber + r.customerName}
                        className="flex-row items-center justify-between py-1"
                      >
                        <Text className="text-xs font-semibold text-[#09090B]">
                          {r.customerName}
                        </Text>
                        <Text className="text-[11px] text-[#71717A]">
                          {r.distanceMi} mi · {r.poNumber}
                        </Text>
                      </View>
                    ))
                  : importDataset === "drivers"
                    ? parseImportedDrivers(csvDraft).map((d) => (
                        <View
                          key={d.name}
                          className="flex-row items-center justify-between py-1"
                        >
                          <Text className="text-xs font-semibold text-[#09090B]">
                            {d.name} ({d.phone})
                          </Text>
                          <Text className="text-[11px] text-[#71717A]">
                            {d.vehicleDetails}
                          </Text>
                        </View>
                      ))
                    : parseImportedClients(csvDraft).map((c) => (
                        <View
                          key={c.email}
                          className="flex-row items-center justify-between py-1"
                        >
                          <Text className="text-xs font-semibold text-[#09090B]">
                            {c.name}
                          </Text>
                          <Text className="text-[11px] text-[#71717A]">
                            {c.email}
                          </Text>
                        </View>
                      ))}
              </View>

              <Pressable
                onPress={async () => {
                  const res = await importOpsDataset(importDataset, csvDraft);
                  Alert.alert("Workbook Synced", res.message);
                }}
                className="h-11 bg-[#09090B] rounded-xl items-center justify-center"
              >
                <Text className="text-xs font-bold text-white">
                  Import Selected{" "}
                  {importDataset === "orders"
                    ? "Loads"
                    : importDataset === "drivers"
                      ? "Drivers"
                      : "Clients"}{" "}
                  into {brandConfig.shortName} →
                </Text>
              </Pressable>
            </View>

            {/* 3. Custom Webhook / Salesforce Connector */}
            <View className="bg-[#F4F4F5] rounded-2xl p-4 gap-2.5">
              <Text className="text-sm font-bold text-[#09090B]">
                Salesforce / Zapier / Make Webhook
              </Text>
              <TextInput
                value={crmWebhookUrl}
                onChangeText={setCrmWebhookUrl}
                autoCapitalize="none"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                placeholderTextColor="#A1A1AA"
                className="bg-white rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#09090B]"
              />
              <Pressable
                onPress={() => {
                  void updateCrmSettings({
                    mode: crmMode,
                    hubspotPrivateAppToken: hubspotToken.trim(),
                    hubspotPipelineId: "default",
                    webhookUrl: crmWebhookUrl.trim(),
                    autoSyncOnDelivered: true,
                    lastSyncStatus: "Active",
                  });
                  Alert.alert(
                    "Webhook Saved",
                    "Real-time order & POD events will POST to your endpoint."
                  );
                }}
                className="h-10 bg-white rounded-xl items-center justify-center border border-black/10"
              >
                <Text className="text-xs font-bold text-[#09090B]">
                  Save Webhook Endpoint
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {tab === "pricing" ? (
          <View className="px-5 pt-4 gap-4">
            <View>
              <Text className="text-[18px] font-bold text-[#09090B]">
                Delivery Rates & Driver Split
              </Text>
              <Text className="text-xs text-[#71717A] mt-0.5">
                Configure upfront customer pricing and driver commission share.
              </Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                  Base Pickup Fee ($)
                </Text>
                <TextInput
                  value={baseFee}
                  onChangeText={setBaseFee}
                  keyboardType="decimal-pad"
                  className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                  Price Per Mile ($)
                </Text>
                <TextInput
                  value={perMileRate}
                  onChangeText={setPerMileRate}
                  keyboardType="decimal-pad"
                  className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                  Minimum Order ($)
                </Text>
                <TextInput
                  value={minCharge}
                  onChangeText={setMinCharge}
                  keyboardType="decimal-pad"
                  className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                  Driver Share (%)
                </Text>
                <TextInput
                  value={driverSplitPct}
                  onChangeText={setDriverSplitPct}
                  keyboardType="decimal-pad"
                  className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                />
              </View>
            </View>

            {/* Live 15-Mile Split Simulator Card */}
            <View className="bg-[#F4F4F5] rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                  15-Mile Delivery Simulator
                </Text>
                <Text
                  style={{ fontVariant: ["tabular-nums"] }}
                  className="text-base font-bold text-[#09090B]"
                >
                  ${previewQuote.total.toFixed(2)} Total
                </Text>
              </View>

              {/* Visual Split Bar */}
              <View className="h-2 rounded-full bg-[#E4E4E7] overflow-hidden flex-row mb-2.5">
                <View
                  style={{
                    flex: Math.max(1, Number(driverSplitPct) || 70),
                    backgroundColor: brandConfig.theme.primary,
                  }}
                />
                <View
                  style={{
                    flex: Math.max(1, 100 - (Number(driverSplitPct) || 70)),
                    backgroundColor: "#09090B",
                  }}
                />
              </View>

              <View className="flex-row justify-between">
                <Text
                  style={{ fontVariant: ["tabular-nums"] }}
                  className="text-xs font-bold text-[#09090B]"
                >
                  Driver earns: ${previewQuote.driverPayout.toFixed(2)}
                </Text>
                <Text
                  style={{ fontVariant: ["tabular-nums"] }}
                  className="text-xs font-bold text-[#09090B]"
                >
                  Your net profit: +${previewQuote.platformMargin.toFixed(2)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleSavePricing}
              style={{ backgroundColor: brandConfig.theme.primary }}
              className="h-[52px] rounded-2xl items-center justify-center"
            >
              <Text className="text-white font-bold text-sm">
                Save Live Rates
              </Text>
            </Pressable>
          </View>
        ) : null}

        {tab === "fleet" ? (
          <View className="px-5 pt-4 gap-4">
            <View className="bg-[#F4F4F5] rounded-2xl p-4 gap-2.5">
              <Text className="text-base font-bold text-[#09090B]">
                Add Fleet Driver
              </Text>
              <TextInput
                value={driverName}
                onChangeText={setDriverName}
                placeholder="Driver full name"
                placeholderTextColor="#A1A1AA"
                className="bg-white rounded-xl px-3.5 py-2.5 text-sm text-[#09090B]"
              />
              <TextInput
                value={driverPhone}
                onChangeText={setDriverPhone}
                placeholder="Phone number (317-555-0144)"
                placeholderTextColor="#A1A1AA"
                className="bg-white rounded-xl px-3.5 py-2.5 text-sm text-[#09090B]"
              />
              <View className="flex-row gap-2">
                {(Object.keys(VEHICLE_CLASSES) as VehicleClass[]).map(
                  (vKey) => {
                    const spec = VEHICLE_CLASSES[vKey];
                    const selected = driverVehicleType === vKey;
                    return (
                      <Pressable
                        key={vKey}
                        onPress={() => setDriverVehicleType(vKey)}
                        style={
                          selected
                            ? { backgroundColor: "#09090B" }
                            : { backgroundColor: "#FFFFFF" }
                        }
                        className="flex-1 py-2 rounded-xl items-center"
                      >
                        <Text
                          className={`text-xs font-bold ${
                            selected ? "text-white" : "text-[#09090B]"
                          }`}
                        >
                          {spec.shortLabel}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
              <TextInput
                value={driverVehicle}
                onChangeText={setDriverVehicle}
                placeholder="Vehicle make, model & plate"
                placeholderTextColor="#A1A1AA"
                className="bg-white rounded-xl px-3.5 py-2.5 text-sm text-[#09090B]"
              />
              <Pressable
                onPress={handleAddDriver}
                style={{ backgroundColor: brandConfig.theme.primary }}
                className="h-11 rounded-xl items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">Add Driver</Text>
              </Pressable>
            </View>

            {/* Driver Document Verification Roster */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A] mb-1">
                Driver Compliance & Document Verification
              </Text>
              {drivers.map((drv, idx) => (
                <View key={drv.id}>
                  {idx > 0 ? <View className="h-[1px] bg-[#F4F4F5]" /> : null}
                  <View className="py-3 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-bold text-[#09090B]">
                        {drv.name}
                      </Text>
                      <Text className="text-xs text-[#71717A]" numberOfLines={1}>
                        {drv.vehicleDetails} · Exp {drv.licenseExpiry}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void verifyDriverDocs(drv.id, !drv.docVerified)}
                      style={
                        drv.docVerified
                          ? { backgroundColor: "#ECFDF5" }
                          : { backgroundColor: "#FEF3C7" }
                      }
                      className="px-3 py-1.5 rounded-full"
                    >
                      <Text
                        className={`text-xs font-bold ${
                          drv.docVerified ? "text-emerald-700" : "text-amber-800"
                        }`}
                      >
                        {drv.docVerified ? "COI Verified ✓" : "Verify Docs"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <View>
              {users.map((u, idx) => (
                <View key={u.id}>
                  {idx > 0 ? <View className="h-[1px] bg-[#F4F4F5]" /> : null}
                  <View className="py-3 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-bold text-[#09090B]">
                        {u.email}
                      </Text>
                      <Text className="text-xs text-[#71717A] uppercase mt-0.5">
                        {u.role}
                      </Text>
                    </View>
                    {u.role === "recipient" ? (
                      <View className="bg-[#F4F4F5] px-2.5 py-1 rounded-full">
                        <Text className="text-xs font-bold text-[#09090B]">
                          {u.corporateAccountApproved
                            ? "Net-7 Approved"
                            : "Card Only"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {tab === "logs" ? (
          <View className="px-5 pt-2">
            {auditEvents.map((evt, idx) => (
              <View key={evt.id}>
                {idx > 0 ? <View className="h-[1px] bg-[#F4F4F5]" /> : null}
                <View className="py-3">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text
                      style={{ color: brandConfig.theme.primary }}
                      className="text-xs font-bold"
                    >
                      {evt.eventType.replace(/_/g, " ")}
                    </Text>
                    <Text
                      style={{ fontVariant: ["tabular-nums"] }}
                      className="text-[11px] text-[#71717A]"
                    >
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text className="text-xs font-medium text-[#09090B]">
                    {evt.summary}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <WhiteLabelModal
        visible={whiteLabelModalOpen}
        onClose={() => setWhiteLabelModalOpen(false)}
      />
      <OnboardingWizardModal
        visible={onboardingModalOpen}
        onClose={() => setOnboardingModalOpen(false)}
      />
    </SafeAreaView>
  );
}
