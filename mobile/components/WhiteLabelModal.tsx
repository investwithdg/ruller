import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BRAND_COLOR_SWATCHES,
  VERTICAL_TEMPLATES,
  WHITE_LABEL_PRESETS,
  buildTenantBrandConfig,
  type LogisticsVertical,
} from "../lib/brand-config";
import { useAuth } from "../lib/auth-context";

interface WhiteLabelModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WhiteLabelModal({ visible, onClose }: WhiteLabelModalProps) {
  const { brandConfig, applyWhiteLabelTenant, exportClientInstallConfig } =
    useAuth();

  const [customCompanyName, setCustomCompanyName] = useState("");
  const [customShortName, setCustomShortName] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [customCity, setCustomCity] = useState("Indianapolis, IN");
  const [customVertical, setCustomVertical] = useState<LogisticsVertical>(
    brandConfig.vertical
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    brandConfig.theme.primary
  );

  async function handleSelectPreset(index: number) {
    const preset = WHITE_LABEL_PRESETS[index];
    if (!preset) return;
    setSelectedColor(preset.theme.primary);
    await applyWhiteLabelTenant(preset);
    onClose();
  }

  async function handleApplyCustomClient() {
    if (!customCompanyName.trim()) return;
    const slug = customCompanyName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const nextBrand = buildTenantBrandConfig({
      tenantSlug: slug || "custom-logistics",
      companyName: customCompanyName.trim(),
      shortName: customShortName.trim() || customCompanyName.trim(),
      orderPrefix:
        customPrefix.trim() ||
        customCompanyName
          .trim()
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 4)
          .toUpperCase(),
      vertical: customVertical,
      city: customCity.trim() || "Indianapolis, IN",
      primaryColor: selectedColor,
    });
    await applyWhiteLabelTenant(nextBrand);
    onClose();
  }

  const activeVerticalMeta = VERTICAL_TEMPLATES[brandConfig.vertical];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View
          style={{ maxHeight: "88%" }}
          className="bg-white rounded-t-[32px] pt-3 pb-8 px-6"
        >
          {/* Sheet Grabber */}
          <View className="items-center mb-3">
            <View className="w-9 h-1 rounded-full bg-[#E4E4E7]" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-2">
              <Text className="text-[22px] font-bold text-[#09090B] tracking-tight">
                White-Label Brand Studio
              </Text>
              <Text className="text-[13px] text-[#71717A] mt-0.5">
                Switch client tenant or provision a new courier brand live.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F4F5] items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#09090B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Active Tenant Identity Card */}
            <View className="bg-[#F4F4F5] rounded-2xl p-4 mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-3">
                <View
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="w-11 h-11 rounded-2xl items-center justify-center"
                >
                  <Text className="text-xs font-black text-white">
                    {brandConfig.orderPrefix}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-[15px] font-bold text-[#09090B]"
                  >
                    {brandConfig.companyName}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-xs text-[#71717A] mt-0.5"
                  >
                    {activeVerticalMeta.shortBadge} ·{" "}
                    {activeVerticalMeta.custodyBadge}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={exportClientInstallConfig}
                className="bg-white px-3 py-2 rounded-full flex-row items-center gap-1.5"
              >
                <Ionicons name="share-outline" size={13} color="#09090B" />
                <Text className="text-xs font-bold text-[#09090B]">Export</Text>
              </Pressable>
            </View>

            {/* 1. Ready-to-Demo Industry Vertical Tenants */}
            <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A] mb-2">
              1-Tap Client Presets
            </Text>
            <View className="mb-5">
              {WHITE_LABEL_PRESETS.map((preset, idx) => {
                const isSelected = preset.tenantSlug === brandConfig.tenantSlug;
                const vMeta = VERTICAL_TEMPLATES[preset.vertical];
                return (
                  <View key={preset.tenantSlug}>
                    {idx > 0 ? (
                      <View className="ml-[52px] h-[1px] bg-[#F4F4F5]" />
                    ) : null}
                    <Pressable
                      onPress={() => handleSelectPreset(idx)}
                      className="py-3 flex-row items-center justify-between active:opacity-75"
                    >
                      <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                        <View
                          style={{ backgroundColor: preset.theme.primary }}
                          className="w-10 h-10 rounded-2xl items-center justify-center"
                        >
                          <Text className="text-[11px] font-black text-white">
                            {preset.orderPrefix}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text
                              numberOfLines={1}
                              className="text-[15px] font-bold text-[#09090B]"
                            >
                              {preset.companyName}
                            </Text>
                            {idx === 0 ? (
                              <View className="bg-[#F4F4F5] px-2 py-0.5 rounded-full">
                                <Text className="text-[9px] font-bold uppercase text-[#09090B]">
                                  Default #1
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text className="text-xs text-[#71717A] mt-0.5">
                            {vMeta.shortBadge} · {vMeta.custodyBadge}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={
                          isSelected ? "checkmark-circle" : "chevron-forward"
                        }
                        size={20}
                        color={isSelected ? preset.theme.primary : "#D4D4D8"}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* 2. 30-Second Custom Prospect Setup */}
            <View className="bg-[#F4F4F5] rounded-2xl p-4 mb-2">
              <Text className="text-[15px] font-bold text-[#09090B]">
                Custom Prospect Provisioner
              </Text>
              <Text className="text-xs text-[#71717A] mt-0.5 mb-3">
                Enter any courier or delivery company to re-skin the app on the
                spot.
              </Text>

              <View className="gap-2.5">
                <TextInput
                  value={customCompanyName}
                  onChangeText={setCustomCompanyName}
                  placeholder="Company name (e.g. Apex Medical Courier)"
                  placeholderTextColor="#A1A1AA"
                  className="bg-white rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#09090B]"
                />

                <View className="flex-row gap-2.5">
                  <TextInput
                    value={customShortName}
                    onChangeText={setCustomShortName}
                    placeholder="Short name (Apex)"
                    placeholderTextColor="#A1A1AA"
                    className="flex-1 bg-white rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#09090B]"
                  />
                  <TextInput
                    value={customPrefix}
                    onChangeText={setCustomPrefix}
                    placeholder="Prefix (APX)"
                    placeholderTextColor="#A1A1AA"
                    autoCapitalize="characters"
                    maxLength={5}
                    className="w-28 bg-white rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#09090B]"
                  />
                  <TextInput
                    value={customCity}
                    onChangeText={setCustomCity}
                    placeholder="City"
                    placeholderTextColor="#A1A1AA"
                    className="flex-1 bg-white rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#09090B]"
                  />
                </View>

                {/* Vertical Selector Pills */}
                <View className="flex-row flex-wrap gap-1.5 pt-1">
                  {(Object.keys(VERTICAL_TEMPLATES) as LogisticsVertical[]).map(
                    (vKey) => {
                      const vMeta = VERTICAL_TEMPLATES[vKey];
                      const active = customVertical === vKey;
                      return (
                        <Pressable
                          key={vKey}
                          onPress={() => {
                            setCustomVertical(vKey);
                            setSelectedColor(vMeta.defaultPalette.primary);
                          }}
                          style={
                            active
                              ? { backgroundColor: "#09090B" }
                              : { backgroundColor: "#FFFFFF" }
                          }
                          className="px-3 py-1.5 rounded-full"
                        >
                          <Text
                            className={`text-xs font-bold ${
                              active ? "text-white" : "text-[#09090B]"
                            }`}
                          >
                            {vMeta.shortBadge}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>

                {/* Curated Brand Color Swatches */}
                <View className="flex-row items-center justify-between pt-1">
                  <Text className="text-xs font-semibold text-[#71717A]">
                    Brand Accent
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {BRAND_COLOR_SWATCHES.map((swatch) => {
                      const active =
                        selectedColor.toLowerCase() ===
                        swatch.primary.toLowerCase();
                      return (
                        <Pressable
                          key={swatch.label}
                          onPress={() => setSelectedColor(swatch.primary)}
                          style={{
                            backgroundColor: swatch.primary,
                            borderWidth: active ? 2.5 : 0,
                            borderColor: "#09090B",
                          }}
                          className="w-7 h-7 rounded-full items-center justify-center"
                        >
                          {active ? (
                            <Ionicons
                              name="checkmark"
                              size={13}
                              color="#FFFFFF"
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  onPress={handleApplyCustomClient}
                  style={{ backgroundColor: selectedColor }}
                  className="h-12 rounded-2xl mt-2 items-center justify-center flex-row gap-2"
                >
                  <Text className="text-white font-bold text-sm">
                    Apply Custom Brand Live
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
