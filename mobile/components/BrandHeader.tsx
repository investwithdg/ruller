import React, { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth-context";
import {
  VERTICAL_TEMPLATES,
  getTenantLogoAsset,
} from "../lib/brand-config";
import { WhiteLabelModal } from "./WhiteLabelModal";
import { OnboardingWizardModal } from "./OnboardingWizardModal";

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  rightElement?: React.ReactNode;
  centerElement?: React.ReactNode;
  children?: React.ReactNode;
  floating?: boolean;
}

/**
 * Clean, Invariant Uber-Style Top Header
 *
 * Left: Active Brand Identity (taps into White-Label Brand Studio)
 * Right: Prominent "How It Works / Beta" trigger (opens Visual Storyboard,
 *        4-Step Setup Wizard, and Expo Go / TestFlight Beta Share).
 */
export function BrandHeader({
  title,
  subtitle,
  badgeText,
  rightElement,
  centerElement,
  children,
  floating = false,
}: BrandHeaderProps) {
  const { brandConfig } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const verticalMeta = VERTICAL_TEMPLATES[brandConfig.vertical];
  const tenantLogoAsset = getTenantLogoAsset(brandConfig.tenantSlug);

  if (floating) {
    return (
      <View>
        <View className="flex-row items-center justify-between">
          {/* Left Floating Glass Brand Pill (Tap to Switch White-Label Tenant) */}
          <Pressable
            onPress={() => setModalOpen(true)}
            style={{
              shadowColor: "#09090B",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
            }}
            className="bg-white/95 border border-black/5 rounded-full px-3 py-1.5 flex-row items-center gap-1.5"
          >
            {tenantLogoAsset ? (
              <Image
                source={tenantLogoAsset}
                style={{ width: 92, height: 22 }}
                resizeMode="contain"
              />
            ) : (
              <View className="flex-row items-center gap-1.5 py-0.5">
                <View
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="w-2.5 h-2.5 rounded-full"
                />
                <Text
                  numberOfLines={1}
                  className="text-xs font-extrabold tracking-tight text-[#09090B] max-w-[96px]"
                >
                  {brandConfig.shortName}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={10} color="#71717A" />
          </Pressable>

          {/* Optional Center HUD Pill */}
          {centerElement ? <View>{centerElement}</View> : null}

          {/* Right Floating Controls: Custom Right Element + Storyboard / Beta Tour Pill */}
          <View className="flex-row items-center gap-1.5">
            {rightElement ? <View>{rightElement}</View> : null}

            <Pressable
              onPress={() => setGuideOpen(true)}
              style={{
                shadowColor: "#09090B",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
              }}
              className="flex-row items-center gap-1 bg-white/95 border border-black/5 px-3 py-1.5 rounded-full"
            >
              <Ionicons
                name="play-circle"
                size={13}
                color={brandConfig.theme.primary}
              />
              <Text className="text-[11px] font-bold text-[#09090B]">
                Tour & Setup
              </Text>
            </Pressable>
          </View>
        </View>

        <WhiteLabelModal
          visible={modalOpen}
          onClose={() => setModalOpen(false)}
        />
        <OnboardingWizardModal
          visible={guideOpen}
          onClose={() => setGuideOpen(false)}
        />
      </View>
    );
  }

  return (
    <View className="bg-white border-b border-[#F4F4F5] px-5 pt-2 pb-3.5">
      <View className="flex-row items-center justify-between mb-2.5">
        <Pressable
          onPress={() => setModalOpen(true)}
          className="flex-row items-center gap-2 flex-1 pr-2"
        >
          {tenantLogoAsset ? (
            <Image
              source={tenantLogoAsset}
              style={{ width: 132, height: 34 }}
              resizeMode="contain"
            />
          ) : (
            <View className="flex-row items-center gap-2.5 flex-1">
              <View
                style={{ backgroundColor: brandConfig.theme.primary }}
                className="w-8 h-8 rounded-xl items-center justify-center"
              >
                <Text className="text-xs font-black text-white">
                  {brandConfig.orderPrefix.slice(0, 2)}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-sm font-bold text-[#09090B] tracking-tight"
                >
                  {brandConfig.shortName}
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-[11px] font-medium text-[#71717A]"
                >
                  {verticalMeta.shortBadge}
                </Text>
              </View>
            </View>
          )}
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={() => setGuideOpen(true)}
            className="flex-row items-center gap-1.5 bg-[#09090B] px-3 py-1.5 rounded-full"
          >
            <Ionicons name="play-circle" size={13} color="#FFFFFF" />
            <Text className="text-[11px] font-bold text-white">
              How It Works · Setup
            </Text>
          </Pressable>
        </View>
      </View>

      {title ? (
        <View className="flex-row items-end justify-between">
          <View className="flex-1 pr-3">
            {badgeText ? (
              <View className="flex-row items-center gap-1.5 mb-1">
                <View
                  style={{ backgroundColor: brandConfig.theme.primarySoft }}
                  className="px-2 py-0.5 rounded-md"
                >
                  <Text
                    style={{ color: brandConfig.theme.primary }}
                    className="text-[10px] font-bold uppercase tracking-wider"
                  >
                    {badgeText}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text className="text-[24px] font-bold text-[#09090B] tracking-tight leading-7">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-[13px] text-[#71717A] mt-0.5">
                {subtitle}
              </Text>
            ) : null}
          </View>

          {rightElement ? <View>{rightElement}</View> : null}
        </View>
      ) : null}

      {children ? <View className="mt-3">{children}</View> : null}

      <WhiteLabelModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
      />
      <OnboardingWizardModal
        visible={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </View>
  );
}
