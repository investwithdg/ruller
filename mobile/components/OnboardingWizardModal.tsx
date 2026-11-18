import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth-context";
import {
  VERTICAL_TEMPLATES,
  WHITE_LABEL_PRESETS,
  buildTenantBrandConfig,
  type LogisticsVertical,
  type UserRole,
} from "../lib/brand-config";
import { calculateDeliveryQuote } from "../lib/pricing-engine";
import { getGoogleMapsStatus } from "../lib/google-maps";
import { type CrmAdapterMode } from "../lib/ops-data-portability";

interface OnboardingWizardModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: "storyboard" | "setup" | "beta";
}

type ModalMode = "storyboard" | "setup" | "beta";

const WIZARD_STEPS = [
  { step: 1, title: "Brand & Fleet Vertical", subtitle: "Step 1 of 4 · 30 sec" },
  { step: 2, title: "Rates & Driver Split", subtitle: "Step 2 of 4 · 30 sec" },
  { step: 3, title: "Connect Your CRM / Data", subtitle: "Step 3 of 4 · 1-Click" },
  { step: 4, title: "Invite Team & Share Link", subtitle: "Step 4 of 4 · Go Live" },
];

const STORYBOARD_SCENES: {
  step: string;
  title: string;
  badge: string;
  summary: string;
  bullets: string[];
  targetRole: UserRole;
  cta: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    step: "01",
    title: "Customer Books & Pays Like Uber",
    badge: "Customer Visibility",
    summary:
      "Replaces phone quotes and text threads. Customers enter pickup & dropoff (live Google Maps mileage), pick a vehicle, and pay via saved Card, Apple Pay, or Corporate Net-30.",
    bullets: [
      "Live Google Places Autocomplete & exact driving mileage",
      "Uber-style wallet: add credit/debit cards or use Corporate Net-30",
      "Instant order confirmation with shareable live tracking link",
    ],
    targetRole: "recipient",
    cta: "Jump to Book Tab →",
    icon: "cube-outline",
  },
  {
    step: "02",
    title: "Live GPS Pin & Uber Activity Timeline",
    badge: "Real-Time Tracking",
    summary:
      "Both the Customer and Dispatcher see the exact same Uber-style vertical status timeline and live moving driver pin from pickup to dropoff.",
    bullets: [
      "4-stage vertical timeline: Confirmed → Assigned → Picked Up → Delivered",
      "Live driver card with vehicle details, COI badge, and 1-tap Call/Text",
      "Eliminates 'where is my driver?' support calls",
    ],
    targetRole: "recipient",
    cta: "View Live Timeline →",
    icon: "time-outline",
  },
  {
    step: "03",
    title: "Dispatcher Reorders & Assigns the Queue",
    badge: "Dispatch Control",
    summary:
      "New loads land in the Dispatch Queue (or sync in 1 click from HubSpot Deals). Dispatchers reorder stops (↑/↓), bump STAT priority, or 1-tap assign the nearest driver.",
    bullets: [
      "Create new loads directly inside Dispatch without leaving the board",
      "Move stops Up (↑) or Down (↓) and toggle STAT Rush priority in 1 tap",
      "Auto-mirrors deal stages back to HubSpot or your connected CRM",
    ],
    targetRole: "dispatcher",
    cta: "Open Dispatch Queue →",
    icon: "map-outline",
  },
  {
    step: "04",
    title: "Driver Navigates & Captures Photo + Signature POD",
    badge: "Driver Mobility",
    summary:
      "Drivers get one clean thumb button per stop, 1-tap Apple/Google/Waze turn-by-turn routing, and instant photo + glass signature Proof of Delivery.",
    bullets: [
      "Surfaces gate codes, dock notes, and PO numbers right under the address",
      "Offline-safe: captures photos & signatures in hospital basements or dead zones",
      "Signed POD receipt attaches immediately to the Customer timeline & CRM",
    ],
    targetRole: "driver",
    cta: "Open Driver Console →",
    icon: "navigate-outline",
  },
];

export function OnboardingWizardModal({
  visible,
  onClose,
  initialTab = "storyboard",
}: OnboardingWizardModalProps) {
  const {
    brandConfig,
    pricingRules,
    crmSettings,
    isOfflineSimulated,
    setActiveRole,
    applyWhiteLabelTenant,
    updatePricingRules,
    updateCrmSettings,
    updateOnboardingState,
    sendDriverInviteLink,
    shareCustomerBookingLink,
    shareBetaAccessInvite,
    exportClientInstallConfig,
    toggleOfflineSimulation,
    startLiveRunSimulation,
  } = useAuth();

  const [mode, setMode] = useState<ModalMode>(initialTab);
  const [step, setStep] = useState<number>(1);

  const [companyName, setCompanyName] = useState(brandConfig.companyName);
  const [shortName, setShortName] = useState(brandConfig.shortName);
  const [orderPrefix, setOrderPrefix] = useState(brandConfig.orderPrefix);
  const [vertical, setVertical] = useState<LogisticsVertical>(
    brandConfig.vertical
  );

  const [baseFee, setBaseFee] = useState(String(pricingRules.baseFee));
  const [perMileRate, setPerMileRate] = useState(
    String(pricingRules.perMileRate)
  );
  const [minCharge, setMinCharge] = useState(
    String(pricingRules.minimumCharge)
  );
  const [driverSplitPct, setDriverSplitPct] = useState(
    String(Math.round((pricingRules.driverCommissionRate ?? 0.7) * 100))
  );

  const [crmMode, setCrmMode] = useState<CrmAdapterMode>(
    crmSettings.mode === "csv_only" ? "hubspot_deals" : crmSettings.mode
  );
  const [hubspotToken, setHubspotToken] = useState(
    crmSettings.hubspotPrivateAppToken || ""
  );
  const [webhookUrl, setWebhookUrl] = useState(crmSettings.webhookUrl || "");

  const [inviteDriverName, setInviteDriverName] = useState("Marcus Vance");
  const [inviteDriverPhone, setInviteDriverPhone] = useState("317-555-0142");
  const [inviteDriverVehicle, setInviteDriverVehicle] = useState(
    "2024 Ford Transit 250 High Roof"
  );

  const mapsStatus = getGoogleMapsStatus();

  const sampleQuote = calculateDeliveryQuote(15, 35, {
    baseFee: Number(baseFee) || 45,
    perMileRate: Number(perMileRate) || 2.1,
    fuelPct: pricingRules.fuelPct,
    minimumCharge: Number(minCharge) || 25,
    driverCommissionRate: Math.min(
      0.95,
      Math.max(0.4, (Number(driverSplitPct) || 70) / 100)
    ),
    currency: "usd",
  });

  function handlePreloadPst() {
    const pst = WHITE_LABEL_PRESETS.find(
      (p) => p.tenantSlug === "preferred-solutions-transport"
    );
    if (!pst) return;
    setCompanyName(pst.companyName);
    setShortName(pst.shortName);
    setOrderPrefix(pst.orderPrefix);
    setVertical(pst.vertical);
    setBaseFee(String(pst.defaultPricing.baseFee));
    setPerMileRate(String(pst.defaultPricing.perMileRate));
    setMinCharge(String(pst.defaultPricing.minimumCharge));
    setCrmMode("hubspot_deals");
    void applyWhiteLabelTenant(pst);
  }

  async function handleSaveStep1() {
    const slug =
      companyName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || brandConfig.tenantSlug;

    const existingPreset = WHITE_LABEL_PRESETS.find(
      (p) => p.tenantSlug === slug
    );

    const nextBrand =
      existingPreset ||
      buildTenantBrandConfig({
        tenantSlug: slug,
        companyName: companyName.trim() || brandConfig.companyName,
        shortName: shortName.trim() || "Fleet",
        orderPrefix: (orderPrefix.trim() || "RUL").toUpperCase().slice(0, 4),
        vertical,
        baseFee: Number(baseFee) || 45,
        perMileRate: Number(perMileRate) || 2.1,
        minimumCharge: Number(minCharge) || 25,
      });

    await applyWhiteLabelTenant(nextBrand);
    updateOnboardingState({ brandConfigured: true });
    setStep(2);
  }

  async function handleSaveStep2() {
    await updatePricingRules({
      baseFee: Math.max(0, Number(baseFee) || 45),
      perMileRate: Math.max(0, Number(perMileRate) || 2.1),
      fuelPct: pricingRules.fuelPct,
      minimumCharge: Math.max(0, Number(minCharge) || 25),
      driverCommissionRate: Math.min(
        0.95,
        Math.max(0.4, (Number(driverSplitPct) || 70) / 100)
      ),
      hipaaComplianceMode: vertical === "medical_stat",
      currency: "usd",
    });
    updateOnboardingState({ ratesConfigured: true });
    setStep(3);
  }

  async function handleSaveStep3() {
    await updateCrmSettings({
      mode: crmMode,
      hubspotPrivateAppToken: hubspotToken.trim(),
      hubspotPipelineId: "default",
      webhookUrl: webhookUrl.trim(),
      autoSyncOnDelivered: true,
      lastSyncStatus:
        crmMode === "hubspot_deals"
          ? "HubSpot 4-Stage Auto-Mirror Active"
          : crmMode === "csv_only"
            ? "Spreadsheet Sync Active"
            : "Webhook Sync Active",
    });
    updateOnboardingState({ dataOrCrmConnected: true });
    setStep(4);
  }

  function handleFinishWizard() {
    updateOnboardingState({
      brandConfigured: true,
      ratesConfigured: true,
      dataOrCrmConnected: true,
      teamAndBookingShared: true,
      wizardCompleted: true,
    });
    onClose();
    Alert.alert(
      `${companyName} Is Live`,
      "Your rates, HubSpot/data sync, driver invite link, and customer booking portal are active."
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-[32px] pt-3 pb-8 px-5 max-h-[92%]">
          <View className="items-center mb-2">
            <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
          </View>

          {/* Top Bar */}
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                {brandConfig.companyName} · Rüller OS
              </Text>
              <Text className="text-[20px] font-bold text-[#09090B] tracking-tight">
                {mode === "storyboard"
                  ? "How Rüller Works"
                  : mode === "setup"
                    ? WIZARD_STEPS[step - 1]?.title
                    : "Share Client Beta Access"}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F4F5] items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#09090B" />
            </Pressable>
          </View>

          {/* 3-Mode Segmented Switcher */}
          <View className="bg-[#F4F4F5] p-1 rounded-2xl flex-row mb-4">
            {(
              [
                { id: "storyboard", label: "How It Works" },
                { id: "setup", label: "4-Step Setup" },
                { id: "beta", label: "Share Beta" },
              ] as { id: ModalMode; label: string }[]
            ).map((tab) => {
              const active = mode === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setMode(tab.id)}
                  style={
                    active
                      ? {
                          backgroundColor: "#FFFFFF",
                          shadowColor: "#09090B",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
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
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {mode === "storyboard" ? (
              <View className="gap-3">
                <View className="bg-[#09090B] rounded-2xl p-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/60">
                    End-to-End Visibility
                  </Text>
                  <Text className="text-[16px] font-bold text-white mt-0.5">
                    Give your customers & drivers an Uber-grade experience—connected directly to your CRM.
                  </Text>
                </View>

                {STORYBOARD_SCENES.map((scene) => (
                  <View
                    key={scene.step}
                    className="bg-[#F4F4F5] rounded-2xl p-4 gap-2"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="w-7 h-7 rounded-lg bg-[#09090B] items-center justify-center">
                          <Text className="text-xs font-bold text-white">
                            {scene.step}
                          </Text>
                        </View>
                        <Text className="text-sm font-bold text-[#09090B]">
                          {scene.title}
                        </Text>
                      </View>
                      <View className="bg-white px-2.5 py-1 rounded-full">
                        <Text className="text-[10px] font-bold text-[#09090B]">
                          {scene.badge}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-xs text-[#52525B] leading-4">
                      {scene.summary}
                    </Text>

                    <View className="gap-1 pt-1">
                      {scene.bullets.map((b) => (
                        <View
                          key={b}
                          className="flex-row items-center gap-1.5"
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={13}
                            color={brandConfig.theme.primary}
                          />
                          <Text className="text-[11px] font-medium text-[#09090B] flex-1">
                            {b}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Pressable
                      onPress={() => {
                        setActiveRole(scene.targetRole);
                        onClose();
                      }}
                      className="mt-1 bg-white py-2.5 px-3.5 rounded-xl flex-row items-center justify-between"
                    >
                      <Text className="text-xs font-bold text-[#09090B]">
                        {scene.cta}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color="#09090B"
                      />
                    </Pressable>
                  </View>
                ))}

                <Pressable
                  onPress={() => setMode("setup")}
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="h-[52px] rounded-2xl items-center justify-center mt-1"
                >
                  <Text className="text-sm font-bold text-white">
                    Configure Company in 4 Steps →
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    startLiveRunSimulation();
                    onClose();
                  }}
                  className="h-[50px] bg-[#09090B] rounded-2xl items-center justify-center flex-row gap-2 active:opacity-90"
                >
                  <Ionicons name="flash" size={15} color="#FBBF24" />
                  <Text className="text-xs font-bold text-white">
                    ⚡ Try Interactive Live Run Simulation (30s) →
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {mode === "setup" ? (
              <View>
                <View className="flex-row gap-1.5 mb-4">
                  {WIZARD_STEPS.map((s) => (
                    <Pressable
                      key={s.step}
                      onPress={() => setStep(s.step)}
                      style={{
                        backgroundColor:
                          s.step <= step
                            ? brandConfig.theme.primary
                            : "#E4E4E7",
                      }}
                      className="flex-1 h-1.5 rounded-full"
                    />
                  ))}
                </View>

                {step === 1 ? (
                  <View className="gap-3.5">
                    <View className="bg-[#F4F4F5] rounded-2xl p-3.5 flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-xs font-bold text-[#09090B]">
                          Anchor Client: Preferred Solutions Transport
                        </Text>
                        <Text className="text-[11px] text-[#71717A] mt-0.5">
                          1-tap load PST brand, Indianapolis rates & HubSpot mode.
                        </Text>
                      </View>
                      <Pressable
                        onPress={handlePreloadPst}
                        className="bg-[#09090B] px-3 py-2 rounded-full"
                      >
                        <Text className="text-[11px] font-bold text-white">
                          Load PST
                        </Text>
                      </Pressable>
                    </View>

                    <View>
                      <Text className="text-xs font-bold text-[#71717A] mb-1">
                        Company Name
                      </Text>
                      <TextInput
                        value={companyName}
                        onChangeText={setCompanyName}
                        placeholder="e.g. Preferred Solutions Transport"
                        placeholderTextColor="#A1A1AA"
                        className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                      />
                    </View>

                    <View className="flex-row gap-2.5">
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-[#71717A] mb-1">
                          Short Badge
                        </Text>
                        <TextInput
                          value={shortName}
                          onChangeText={setShortName}
                          placeholder="PST"
                          placeholderTextColor="#A1A1AA"
                          className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-[#71717A] mb-1">
                          Order Prefix
                        </Text>
                        <TextInput
                          value={orderPrefix}
                          onChangeText={setOrderPrefix}
                          autoCapitalize="characters"
                          placeholder="PST"
                          placeholderTextColor="#A1A1AA"
                          className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                        />
                      </View>
                    </View>

                    <View>
                      <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                        Primary Delivery Vertical
                      </Text>
                      <View className="gap-2">
                        {(
                          Object.keys(VERTICAL_TEMPLATES) as LogisticsVertical[]
                        ).map((vKey) => {
                          const vMeta = VERTICAL_TEMPLATES[vKey];
                          const active = vertical === vKey;
                          return (
                            <Pressable
                              key={vKey}
                              onPress={() => setVertical(vKey)}
                              style={
                                active
                                  ? {
                                      borderColor: brandConfig.theme.primary,
                                      borderWidth: 2,
                                      backgroundColor: "#FFFFFF",
                                    }
                                  : {
                                      borderColor: "#F4F4F5",
                                      borderWidth: 2,
                                      backgroundColor: "#F4F4F5",
                                    }
                              }
                              className="rounded-2xl p-3 flex-row items-center justify-between"
                            >
                              <View className="flex-1 pr-2">
                                <Text className="text-xs font-bold text-[#09090B]">
                                  {vMeta.name}
                                </Text>
                                <Text className="text-[11px] text-[#71717A]">
                                  {vMeta.description}
                                </Text>
                              </View>
                              <Ionicons
                                name={
                                  active
                                    ? "checkmark-circle"
                                    : "ellipse-outline"
                                }
                                size={18}
                                color={
                                  active ? brandConfig.theme.primary : "#A1A1AA"
                                }
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <Pressable
                      onPress={() => void handleSaveStep1()}
                      style={{ backgroundColor: brandConfig.theme.primary }}
                      className="h-[52px] rounded-2xl items-center justify-center mt-1"
                    >
                      <Text className="text-sm font-bold text-white">
                        Save Brand & Continue →
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {step === 2 ? (
                  <View className="gap-3.5">
                    <View className="flex-row gap-2.5">
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-[#71717A] mb-1">
                          Base Pickup ($)
                        </Text>
                        <TextInput
                          value={baseFee}
                          onChangeText={setBaseFee}
                          keyboardType="decimal-pad"
                          className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-[#71717A] mb-1">
                          Per Mile ($)
                        </Text>
                        <TextInput
                          value={perMileRate}
                          onChangeText={setPerMileRate}
                          keyboardType="decimal-pad"
                          className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                        />
                      </View>
                    </View>

                    <View className="flex-row gap-2.5">
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-[#71717A] mb-1">
                          Min Order ($)
                        </Text>
                        <TextInput
                          value={minCharge}
                          onChangeText={setMinCharge}
                          keyboardType="decimal-pad"
                          className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-[#71717A] mb-1">
                          Driver Share (%)
                        </Text>
                        <TextInput
                          value={driverSplitPct}
                          onChangeText={setDriverSplitPct}
                          keyboardType="number-pad"
                          className="bg-[#F4F4F5] rounded-2xl px-3.5 py-3 text-sm font-bold text-[#09090B]"
                        />
                      </View>
                    </View>

                    <View className="bg-[#F4F4F5] rounded-2xl p-4 gap-2">
                      <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                        Live 15-Mile Run Unit Economics
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-[#52525B]">
                          Customer Pays Upfront
                        </Text>
                        <Text className="text-sm font-bold text-[#09090B]">
                          ${sampleQuote.total.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-[#52525B]">
                          Driver Settlement ({driverSplitPct}%)
                        </Text>
                        <Text className="text-xs font-semibold text-[#52525B]">
                          -${sampleQuote.driverPayout.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between pt-2 border-t border-black/5">
                        <Text className="text-xs font-bold text-[#09090B]">
                          Your Net House Margin
                        </Text>
                        <Text
                          style={{ color: brandConfig.theme.primary }}
                          className="text-sm font-extrabold"
                        >
                          +${sampleQuote.platformMargin.toFixed(2)} / run
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => void handleSaveStep2()}
                      style={{ backgroundColor: brandConfig.theme.primary }}
                      className="h-[52px] rounded-2xl items-center justify-center"
                    >
                      <Text className="text-sm font-bold text-white">
                        Lock In Rates & Continue →
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {step === 3 ? (
                  <View className="gap-3.5">
                    <Text className="text-xs text-[#71717A]">
                      Connect the tools your office already runs on—zero custom engineering required.
                    </Text>

                    <View className="flex-row gap-2">
                      {(
                        [
                          { id: "hubspot_deals", label: "HubSpot CRM" },
                          { id: "csv_only", label: "Google Sheets / Excel" },
                          { id: "custom_webhook", label: "Salesforce / Hook" },
                        ] as { id: CrmAdapterMode; label: string }[]
                      ).map((opt) => {
                        const active = crmMode === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            onPress={() => setCrmMode(opt.id)}
                            style={
                              active
                                ? { backgroundColor: "#09090B" }
                                : { backgroundColor: "#F4F4F5" }
                            }
                            className="flex-1 py-2.5 rounded-xl items-center"
                          >
                            <Text
                              className={`text-xs font-bold ${
                                active ? "text-white" : "text-[#09090B]"
                              }`}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {crmMode === "hubspot_deals" ? (
                      <View className="bg-[#F4F4F5] rounded-2xl p-3.5 gap-2.5">
                        <Text className="text-xs font-bold text-[#09090B]">
                          1-Click HubSpot Deal Pipeline Sync
                        </Text>
                        <Text className="text-[11px] text-[#71717A]">
                          Automatically mirrors: 1. Order → Deal · 2. Driver Assigned · 3. In-Transit Status · 4. Signed POD Closes Deal.
                        </Text>
                        <TextInput
                          value={hubspotToken}
                          onChangeText={setHubspotToken}
                          autoCapitalize="none"
                          placeholder="HubSpot Private App Token (pat-na1-...)"
                          placeholderTextColor="#A1A1AA"
                          className="bg-white rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#09090B]"
                        />
                      </View>
                    ) : (
                      <View className="bg-[#F4F4F5] rounded-2xl p-3.5 gap-2">
                        <Text className="text-xs font-bold text-[#09090B]">
                          {crmMode === "csv_only"
                            ? "Google Sheets / Excel Workbook Sync"
                            : "Salesforce / Zapier Outbound Webhook"}
                        </Text>
                        <TextInput
                          value={webhookUrl}
                          onChangeText={setWebhookUrl}
                          autoCapitalize="none"
                          placeholder={
                            crmMode === "csv_only"
                              ? "https://docs.google.com/spreadsheets/d/..."
                              : "https://hooks.zapier.com/..."
                          }
                          placeholderTextColor="#A1A1AA"
                          className="bg-white rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#09090B]"
                        />
                      </View>
                    )}

                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => {
                          updateOnboardingState({ dataOrCrmConnected: true });
                          setStep(4);
                        }}
                        className="flex-1 h-[50px] bg-[#F4F4F5] rounded-2xl items-center justify-center"
                      >
                        <Text className="text-xs font-bold text-[#52525B]">
                          Skip for Now
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleSaveStep3()}
                        style={{ backgroundColor: brandConfig.theme.primary }}
                        className="flex-[1.8] h-[50px] rounded-2xl items-center justify-center"
                      >
                        <Text className="text-xs font-bold text-white">
                          Connect & Continue →
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {step === 4 ? (
                  <View className="gap-3.5">
                    <View className="bg-[#F4F4F5] rounded-2xl p-3.5 gap-2.5">
                      <Text className="text-xs font-bold text-[#09090B]">
                        1. Send First Driver SMS Invite
                      </Text>
                      <View className="flex-row gap-2">
                        <TextInput
                          value={inviteDriverName}
                          onChangeText={setInviteDriverName}
                          placeholder="Driver name"
                          placeholderTextColor="#A1A1AA"
                          className="flex-1 bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-[#09090B]"
                        />
                        <TextInput
                          value={inviteDriverPhone}
                          onChangeText={setInviteDriverPhone}
                          placeholder="Phone"
                          placeholderTextColor="#A1A1AA"
                          className="flex-1 bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-[#09090B]"
                        />
                      </View>
                      <TextInput
                        value={inviteDriverVehicle}
                        onChangeText={setInviteDriverVehicle}
                        placeholder="Vehicle (e.g. 2024 Ford Transit)"
                        placeholderTextColor="#A1A1AA"
                        className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-[#09090B]"
                      />
                      <Pressable
                        onPress={() =>
                          void sendDriverInviteLink(
                            inviteDriverName,
                            inviteDriverPhone,
                            inviteDriverVehicle
                          )
                        }
                        className="h-10 bg-[#09090B] rounded-xl flex-row items-center justify-center gap-1.5"
                      >
                        <Ionicons
                          name="paper-plane-outline"
                          size={13}
                          color="#FFFFFF"
                        />
                        <Text className="text-xs font-bold text-white">
                          Send Driver Invite Link
                        </Text>
                      </Pressable>
                    </View>

                    <View className="bg-[#F4F4F5] rounded-2xl p-3.5 flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-xs font-bold text-[#09090B]">
                          2. Customer Self-Serve Booking Link
                        </Text>
                        <Text className="text-[11px] text-[#71717A] mt-0.5">
                          Share with B2B accounts for upfront quotes & live tracking.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => void shareCustomerBookingLink()}
                        className="bg-white px-3 py-2 rounded-full border border-black/10"
                      >
                        <Text className="text-xs font-bold text-[#09090B]">
                          Share Link
                        </Text>
                      </Pressable>
                    </View>

                    <View className="bg-[#09090B] rounded-2xl p-3.5 flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center gap-1.5 mb-0.5">
                          <View className="bg-amber-400 px-2 py-0.5 rounded-md">
                            <Text className="text-[10px] font-black uppercase text-black">
                              Live Demo
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs font-bold text-white">
                          3. Test Run Simulation
                        </Text>
                        <Text className="text-[11px] text-[#A1A1AA]">
                          Watch a load move across Dispatch, Driver, & Customer in 30s.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          startLiveRunSimulation();
                          onClose();
                        }}
                        style={{ backgroundColor: brandConfig.theme.primary }}
                        className="px-3.5 py-2 rounded-xl flex-row items-center gap-1"
                      >
                        <Ionicons name="play" size={12} color="#FFFFFF" />
                        <Text className="text-xs font-bold text-white">
                          Start Run
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={handleFinishWizard}
                      style={{ backgroundColor: brandConfig.theme.primary }}
                      className="h-[52px] rounded-2xl items-center justify-center mt-1"
                    >
                      <Text className="text-sm font-bold text-white">
                        Complete Setup & Launch Fleet ✓
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            {mode === "beta" ? (
              <View className="gap-3.5">
                {/* 0. Zero-App-Download Web Booking & Live Tracking (Primary B2B Flow) */}
                <View className="bg-[#09090B] rounded-2xl p-4 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-white">
                      Zero-App-Download Web Booking
                    </Text>
                    <View className="bg-white/20 px-2.5 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-white">
                        B2B Shippers
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-[#A1A1AA] leading-4">
                    Corporate shippers (law firms, medical labs, auto parts) book online from desktop or mobile browser without installing an app.
                  </Text>
                  <View className="bg-white/10 rounded-xl p-2.5 flex-row items-center justify-between mt-1">
                    <Text
                      numberOfLines={1}
                      className="text-xs font-mono text-white/90 flex-1 pr-2"
                    >
                      {brandConfig.websiteUrl}/book/{brandConfig.tenantSlug}
                    </Text>
                    <Pressable
                      onPress={() => void shareCustomerBookingLink()}
                      style={{ backgroundColor: brandConfig.theme.primary }}
                      className="px-3 py-1.5 rounded-lg"
                    >
                      <Text className="text-xs font-bold text-white">
                        Share Web Portal
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View className="bg-[#F4F4F5] rounded-2xl p-4 gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-[#09090B]">
                      1. Share Live Expo Go Beta Link
                    </Text>
                    <View className="bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-emerald-800">
                        SDK 58 Live
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-[#52525B]">
                    Send this invite to prospective clients (like PST) so they can open their branded app on their iPhone or Android via Expo Go immediately.
                  </Text>
                  <Pressable
                    onPress={() => void shareBetaAccessInvite()}
                    style={{ backgroundColor: brandConfig.theme.primary }}
                    className="h-11 rounded-xl flex-row items-center justify-center gap-2"
                  >
                    <Ionicons name="share-outline" size={16} color="#FFFFFF" />
                    <Text className="text-xs font-bold text-white">
                      Send Client Beta Invite (SMS / Email)
                    </Text>
                  </Pressable>
                </View>

                <View className="bg-[#F4F4F5] rounded-2xl p-4 gap-2">
                  <Text className="text-sm font-bold text-[#09090B]">
                    2. TestFlight Standalone App Distribution
                  </Text>
                  <Text className="text-xs text-[#52525B]">
                    Bundle ID: {brandConfig.bundleId} · Export the turnkey client install config or trigger EAS Submit to push to Apple TestFlight.
                  </Text>
                  <Pressable
                    onPress={() => void exportClientInstallConfig()}
                    className="h-10 bg-white rounded-xl items-center justify-center border border-black/10 mt-1"
                  >
                    <Text className="text-xs font-bold text-[#09090B]">
                      Export Turnkey Client Build Manifest
                    </Text>
                  </Pressable>
                </View>

                <View className="bg-[#F4F4F5] rounded-2xl p-4 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Verified Google Maps APIs on Key
                    </Text>
                    <Text className="text-[11px] font-bold text-emerald-700">
                      {mapsStatus.configured ? "5 / 5 Active ✓" : "Fallback"}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-1.5 pt-1">
                    {mapsStatus.apis.map((api) => (
                      <View
                        key={api}
                        className="bg-white px-2.5 py-1 rounded-full flex-row items-center gap-1"
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#16A34A"
                        />
                        <Text className="text-[11px] font-semibold text-[#09090B]">
                          {api}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="bg-[#F4F4F5] rounded-2xl p-3.5 flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-bold text-[#09090B]">
                      Offline Dead-Zone Simulation
                    </Text>
                    <Text className="text-[11px] text-[#71717A]">
                      Test offline POD photo & signature queueing
                    </Text>
                  </View>
                  <Pressable
                    onPress={toggleOfflineSimulation}
                    className={`px-3 py-1.5 rounded-full ${
                      isOfflineSimulated ? "bg-amber-500" : "bg-[#09090B]"
                    }`}
                  >
                    <Text className="text-xs font-bold text-white">
                      {isOfflineSimulated ? "Dead-Zone: ON" : "Online"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
