import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useAuth } from "../../lib/auth-context";
import {
  VERTICAL_TEMPLATES,
  WHITE_LABEL_PRESETS,
  type UserRole,
} from "../../lib/brand-config";
import { WhiteLabelModal } from "../../components/WhiteLabelModal";
import { BrandHeader } from "../../components/BrandHeader";

const ROLE_CARDS: {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    role: "recipient",
    title: "Customer App",
    subtitle: "Upfront courier quotes, checkout & live tracking",
    icon: "cube-outline",
  },
  {
    role: "driver",
    title: "Driver Road HUD",
    subtitle: "Accept runs, navigate & capture proof of delivery",
    icon: "car-sport-outline",
  },
  {
    role: "dispatcher",
    title: "Dispatch Queue",
    subtitle: "Monitor active fleet & assign closest drivers",
    icon: "map-outline",
  },
  {
    role: "admin",
    title: "Business & Rates",
    subtitle: "Net profit balances, rate simulator & white-label studio",
    icon: "bar-chart-outline",
  },
];

export default function ProfileScreen() {
  const {
    userEmail,
    activeRole,
    brandConfig,
    isRoleLocked,
    toggleRoleLock,
    startLiveRunSimulation,
    shareCustomerBookingLink,
    sendDriverInviteLink,
    setActiveRole,
    applyWhiteLabelTenant,
    signOut,
    deleteOwnAccount,
  } = useAuth();
  const [whiteLabelModalOpen, setWhiteLabelModalOpen] = useState(false);
  const verticalTemplate = VERTICAL_TEMPLATES[brandConfig.vertical];

  function handleConfirmDeleteAccount() {
    Alert.alert(
      "Delete Account Permanently?",
      "This permanently deletes your user profile and revokes access immediately. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: async () => {
            const res = await deleteOwnAccount();
            if (res.error) {
              Alert.alert("Error", res.error);
            } else {
              Alert.alert(
                "Account Deleted",
                "Your account has been permanently removed."
              );
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <BrandHeader
        title="Account & Settings"
        subtitle={userEmail || `Signed in to ${brandConfig.companyName}`}
      />

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Indented-Hairline App Experience Switcher */}
        <View className="mt-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A] mb-2">
            Switch App Experience
          </Text>
          <View>
            {ROLE_CARDS.map((card, idx) => {
              const selected = activeRole === card.role;
              return (
                <View key={card.role}>
                  {idx > 0 ? (
                    <View className="ml-[52px] h-[1px] bg-[#F4F4F5]" />
                  ) : null}
                  <Pressable
                    onPress={() => setActiveRole(card.role)}
                    className="py-3 flex-row items-center justify-between active:opacity-75"
                  >
                    <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                      <View
                        style={
                          selected
                            ? { backgroundColor: brandConfig.theme.primary }
                            : { backgroundColor: "#F4F4F5" }
                        }
                        className="w-10 h-10 rounded-2xl items-center justify-center"
                      >
                        <Ionicons
                          name={card.icon}
                          size={18}
                          color={selected ? "#FFFFFF" : "#09090B"}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[15px] font-bold text-[#09090B]">
                          {card.title}
                        </Text>
                        <Text className="text-xs text-[#71717A] mt-0.5">
                          {card.subtitle}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "chevron-forward"}
                      size={20}
                      color={selected ? brandConfig.theme.primary : "#D4D4D8"}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* 2. Navigation Mode Switcher: Evaluation vs Production */}
        <View className="mt-3 bg-[#F4F4F5] rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  backgroundColor: isRoleLocked
                    ? "#09090B"
                    : brandConfig.theme.primary,
                }}
                className="w-7 h-7 rounded-xl items-center justify-center"
              >
                <Ionicons
                  name={isRoleLocked ? "lock-closed" : "layers-outline"}
                  size={14}
                  color="#FFFFFF"
                />
              </View>
              <Text className="text-sm font-bold text-[#09090B]">
                {isRoleLocked
                  ? "Production Mode (Role Locked)"
                  : "Evaluation Mode (All 5 Hats)"}
              </Text>
            </View>

            <Pressable
              onPress={toggleRoleLock}
              className="bg-white px-3 py-1.5 rounded-full border border-black/10"
            >
              <Text className="text-xs font-bold text-[#09090B]">
                {isRoleLocked ? "Unlock All Hats →" : "Lock to Role →"}
              </Text>
            </Pressable>
          </View>

          <Text className="text-xs text-[#52525B] leading-4">
            {isRoleLocked
              ? `Bottom navigation is strictly locked to your active role (${activeRole}). Drivers cannot see company margins or dispatch queues; customers cannot see driver cockpits.`
              : "All 5 role tabs (Book · Dispatch · Driver · Hub · Account) are unlocked in the bottom bar for Donovan and evaluators to test all 4 hats freely."}
          </Text>
        </View>

        {/* 3. ⚡ Live Run Simulation Demo Engine Trigger */}
        <View className="mt-3 bg-[#09090B] rounded-2xl p-4 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className="bg-amber-400 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-black uppercase text-black">
                  Demo Engine
                </Text>
              </View>
            </View>
            <Text className="text-sm font-bold text-white">
              ⚡ Run Live 30-Sec Test Simulation
            </Text>
            <Text className="text-xs text-[#A1A1AA] mt-0.5">
              Watch a hotshot load move across all 5 stages in real time.
            </Text>
          </View>

          <Pressable
            onPress={() => startLiveRunSimulation()}
            style={{ backgroundColor: brandConfig.theme.primary }}
            className="px-3.5 py-2.5 rounded-xl flex-row items-center gap-1.5 active:opacity-85"
          >
            <Ionicons name="play" size={13} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Start Demo</Text>
          </Pressable>
        </View>

        {/* 4. Zero-App-Download Distribution Hub */}
        <View className="mt-3 bg-[#F4F4F5] rounded-2xl p-4 gap-2.5">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            Zero-App-Download Distribution
          </Text>

          <View className="bg-white rounded-xl p-3 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-xs font-bold text-[#09090B]">
                B2B Customer Web Booking Portal
              </Text>
              <Text className="text-[11px] text-[#71717A]">
                {brandConfig.websiteUrl}/book/{brandConfig.tenantSlug}
              </Text>
            </View>
            <Pressable
              onPress={() => void shareCustomerBookingLink()}
              style={{ backgroundColor: brandConfig.theme.primary }}
              className="px-3 py-1.5 rounded-lg"
            >
              <Text className="text-xs font-bold text-white">Share Link</Text>
            </Pressable>
          </View>

          <View className="bg-white rounded-xl p-3 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-xs font-bold text-[#09090B]">
                Driver SMS Invite Link
              </Text>
              <Text className="text-[11px] text-[#71717A]">
                Pre-linked driver portal & OTP auth
              </Text>
            </View>
            <Pressable
              onPress={() =>
                void sendDriverInviteLink("Driver", brandConfig.supportPhone)
              }
              className="bg-[#09090B] px-3 py-1.5 rounded-lg"
            >
              <Text className="text-xs font-bold text-white">Send SMS</Text>
            </Pressable>
          </View>
        </View>

        <View className="h-[1px] bg-[#F4F4F5] my-4" />

        {/* 5. White-Label Tenant & Support */}
        <View>
          <View className="flex-row items-center justify-between mb-2.5">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Active White-Label Tenant
              </Text>
              <Text className="text-[16px] font-bold text-[#09090B] mt-0.5">
                {brandConfig.companyName}
              </Text>
              <Text className="text-xs text-[#71717A]">
                {verticalTemplate.shortBadge} · {verticalTemplate.custodyBadge}
              </Text>
            </View>
            <Pressable
              onPress={() => setWhiteLabelModalOpen(true)}
              style={{ backgroundColor: brandConfig.theme.primary }}
              className="px-3.5 py-2 rounded-full"
            >
              <Text className="text-xs font-bold text-white">Brand Studio</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
          >
            <View className="flex-row gap-2">
              {WHITE_LABEL_PRESETS.map((preset) => {
                const selected = preset.tenantSlug === brandConfig.tenantSlug;
                return (
                  <Pressable
                    key={preset.tenantSlug}
                    onPress={() => applyWhiteLabelTenant(preset)}
                    style={
                      selected
                        ? { backgroundColor: "#09090B" }
                        : { backgroundColor: "#F4F4F5" }
                    }
                    className="px-3.5 py-2 rounded-full flex-row items-center gap-2"
                  >
                    <View
                      style={{ backgroundColor: preset.theme.primary }}
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

          <Pressable
            onPress={() =>
              Linking.openURL(`tel:${brandConfig.supportPhone}`).catch(() => {})
            }
            className="bg-[#F4F4F5] rounded-2xl p-3.5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2.5">
              <Ionicons
                name="call-outline"
                size={16}
                color={brandConfig.theme.primary}
              />
              <Text className="text-xs font-bold text-[#09090B]">
                Dispatch Support ({brandConfig.supportPhone})
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
          </Pressable>
        </View>

        <View className="h-[1px] bg-[#F4F4F5] my-4" />

        {/* 3. Legal, Sign Out & Account Deletion */}
        <View className="gap-2.5">
          <View className="flex-row gap-2.5">
            <Pressable
              onPress={() => Linking.openURL(brandConfig.privacyPolicyUrl)}
              className="flex-1 bg-[#F4F4F5] rounded-2xl py-3 items-center"
            >
              <Text className="text-xs font-semibold text-[#52525B]">
                Privacy Policy
              </Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(brandConfig.termsOfServiceUrl)}
              className="flex-1 bg-[#F4F4F5] rounded-2xl py-3 items-center"
            >
              <Text className="text-xs font-semibold text-[#52525B]">
                Terms of Service
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={signOut}
            className="bg-[#09090B] rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">Sign Out</Text>
          </Pressable>

          <Pressable
            onPress={handleConfirmDeleteAccount}
            className="bg-[#F4F4F5] rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
          >
            <Ionicons name="trash-outline" size={16} color="#E11D48" />
            <Text className="text-xs font-bold text-[#E11D48]">
              Delete Account
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <WhiteLabelModal
        visible={whiteLabelModalOpen}
        onClose={() => setWhiteLabelModalOpen(false)}
      />
    </SafeAreaView>
  );
}
