import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import {
  VERTICAL_TEMPLATES,
  getTenantLogoAsset,
  type UserRole,
} from "../../lib/brand-config";
import { WhiteLabelModal } from "../../components/WhiteLabelModal";
import { OnboardingWizardModal } from "../../components/OnboardingWizardModal";
import { DeliveryMapCard } from "../../components/DeliveryMapCard";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, signUp, signInWithPhone, enterDemoMode, brandConfig } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [phoneNumber, setPhoneNumber] = useState("317-555-0142");
  const [otpCode, setOtpCode] = useState("123456");
  const [phoneRole, setPhoneRole] = useState<UserRole>("driver");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRole] = useState<UserRole>("recipient");
  const [submitting, setSubmitting] = useState(false);
  const [whiteLabelModalOpen, setWhiteLabelModalOpen] = useState(false);
  const [storyboardOpen, setStoryboardOpen] = useState(false);

  const verticalMeta = VERTICAL_TEMPLATES[brandConfig.vertical];
  const topPlaces = verticalMeta.quickPlaces.slice(0, 2);
  const tenantLogoAsset = getTenantLogoAsset(brandConfig.tenantSlug);

  async function handlePhoneSubmit() {
    if (!phoneNumber.trim()) {
      Alert.alert("Missing Phone", "Please enter your mobile phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await signInWithPhone(phoneNumber.trim(), otpCode.trim(), phoneRole);
      if (res.error) {
        Alert.alert("Phone Sign-In Failed", res.error);
        return;
      }
      if (res.role === "driver") {
        router.replace("/(app)/driver");
      } else {
        router.replace("/(app)/customer");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAuthSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signin") {
        const res = await signIn(email.trim(), password);
        if (res.error) {
          Alert.alert("Sign-In Failed", res.error);
          return;
        }
      } else {
        if (!fullName.trim()) {
          Alert.alert("Missing Name", "Please enter your full name.");
          return;
        }
        const res = await signUp(
          fullName.trim(),
          email.trim(),
          brandConfig.supportPhone,
          password,
          signupRole
        );
        if (res.error) {
          Alert.alert("Sign-Up Failed", res.error);
          return;
        }
      }
      router.replace("/(app)/customer");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEnterApp() {
    enterDemoMode("recipient");
    router.replace("/(app)/customer");
  }

  return (
    <SafeAreaView className="flex-1 bg-[#EEF0F4]" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* 1. Live Google Maps Street Canvas */}
        <DeliveryMapCard
          fullBleed
          height={340}
          pickupLabel={topPlaces[1]?.address || "2500 Airport Expy, Indianapolis, IN"}
          dropoffLabel={topPlaces[0]?.address || "8702 Keystone Crossing, Indianapolis, IN"}
          distanceMi={28.2}
          durationMinutes={34}
          topOverlay={
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setWhiteLabelModalOpen(true)}
                style={{
                  shadowColor: "#09090B",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                }}
                className="bg-white/95 rounded-full px-3.5 py-2 border border-black/5 flex-row items-center gap-2"
              >
                {tenantLogoAsset ? (
                  <Image
                    source={tenantLogoAsset}
                    style={{ width: 120, height: 26 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View className="flex-row items-center gap-2 py-0.5">
                    <View
                      style={{ backgroundColor: brandConfig.theme.primary }}
                      className="w-2.5 h-2.5 rounded-full"
                    />
                    <Text className="text-xs font-extrabold tracking-tight text-[#09090B]">
                      {brandConfig.companyName}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={() => setStoryboardOpen(true)}
                style={{
                  shadowColor: "#09090B",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.14,
                  shadowRadius: 12,
                }}
                className="bg-[#09090B] rounded-full px-3.5 py-2 flex-row items-center gap-1.5"
              >
                <Ionicons name="play-circle" size={13} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">
                  How It Works
                </Text>
              </Pressable>
            </View>
          }
        />

        {/* 2. Uber-Clean Bottom Sheet */}
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
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 28,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Prominent Visual Onboarding Banner */}
            <Pressable
              onPress={() => setStoryboardOpen(true)}
              className="bg-[#F4F4F5] rounded-2xl p-3.5 mb-4 flex-row items-center justify-between active:opacity-80"
            >
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View
                  style={{ backgroundColor: brandConfig.theme.primary }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <Ionicons name="compass-outline" size={17} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-[#09090B]">
                    New here? See how {brandConfig.shortName} works
                  </Text>
                  <Text className="text-[11px] text-[#71717A] mt-0.5">
                    60-sec visual walkthrough: Book → Live GPS → Signed POD
                  </Text>
                </View>
              </View>
              <View className="bg-white px-2.5 py-1 rounded-full">
                <Text className="text-[11px] font-bold text-[#09090B]">
                  Tour →
                </Text>
              </View>
            </Pressable>

            <Text className="text-[26px] font-bold text-[#09090B] tracking-tight leading-[32px]">
              {verticalMeta.heroHeadline}
            </Text>
            <Text className="text-[14px] text-[#71717A] mt-1 leading-5">
              Upfront Google Maps pricing, live driver tracking, and{" "}
              {verticalMeta.custodyBadge.toLowerCase()}.
            </Text>

            {/* Uber-Style Destination Search Pill */}
            <Pressable
              onPress={handleEnterApp}
              className="mt-4 h-[56px] bg-[#F4F4F5] rounded-2xl px-4 flex-row items-center justify-between active:opacity-80"
            >
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <Ionicons name="search" size={20} color="#09090B" />
                <Text
                  numberOfLines={1}
                  className="text-[16px] font-semibold text-[#09090B]"
                >
                  {verticalMeta.searchPrompt}
                </Text>
              </View>
              <View
                style={{ backgroundColor: brandConfig.theme.primary }}
                className="w-9 h-9 rounded-full items-center justify-center"
              >
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </View>
            </Pressable>

            {/* 2 Saved Destination Rows */}
            <View className="mt-2.5">
              {topPlaces.map((place, idx) => (
                <View key={place.label}>
                  {idx > 0 ? (
                    <View className="ml-[50px] h-[1px] bg-[#F4F4F5]" />
                  ) : null}
                  <Pressable
                    onPress={handleEnterApp}
                    className="flex-row items-center py-3 active:opacity-70"
                  >
                    <View className="w-9 h-9 rounded-full bg-[#F4F4F5] items-center justify-center mr-3.5">
                      <Ionicons
                        name={idx === 0 ? "location-outline" : "time-outline"}
                        size={17}
                        color="#09090B"
                      />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className="text-[15px] font-semibold text-[#09090B]">
                        {place.label}
                      </Text>
                      <Text className="text-[13px] text-[#71717A]">
                        {place.subtitle}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#D4D4D8"
                    />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Clean Footer (Zero Driver/Dispatch/Owner Clutter at Bottom) */}
            {!showAuthForm ? (
              <View className="mt-4 pt-3.5 border-t border-[#F4F4F5] flex-row items-center justify-between">
                <Pressable onPress={() => setStoryboardOpen(true)}>
                  <Text className="text-[13px] font-semibold text-[#52525B]">
                    Setup & Beta Share
                  </Text>
                </Pressable>

                <Pressable onPress={() => setShowAuthForm(true)}>
                  <Text
                    style={{ color: brandConfig.theme.primary }}
                    className="text-[13px] font-bold"
                  >
                    Driver SMS / Sign In →
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View className="mt-4 bg-[#F4F4F5] rounded-2xl p-4">
                <View className="flex-row items-center justify-between mb-3">
                  {/* Top Switcher: Phone vs Email */}
                  <View className="flex-row bg-white p-1 rounded-xl flex-1 mr-2">
                    <Pressable
                      onPress={() => setAuthMethod("phone")}
                      className={`flex-1 py-1.5 rounded-lg items-center ${
                        authMethod === "phone" ? "bg-[#09090B]" : ""
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          authMethod === "phone" ? "text-white" : "text-[#71717A]"
                        }`}
                      >
                        📱 Phone SMS
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAuthMethod("email")}
                      className={`flex-1 py-1.5 rounded-lg items-center ${
                        authMethod === "email" ? "bg-[#09090B]" : ""
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          authMethod === "email" ? "text-white" : "text-[#71717A]"
                        }`}
                      >
                        ✉️ Email
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => setShowAuthForm(false)}
                    className="w-8 h-8 rounded-full bg-white items-center justify-center"
                  >
                    <Ionicons name="close" size={16} color="#71717A" />
                  </Pressable>
                </View>

                {authMethod === "phone" ? (
                  <View>
                    <View className="mb-2">
                      <Text className="text-[11px] font-bold text-[#71717A] mb-1">
                        Driver or Shipper Mobile Number
                      </Text>
                      <TextInput
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        placeholder="(317) 555-0142"
                        placeholderTextColor="#A1A1AA"
                        className="bg-white rounded-xl px-3.5 py-2.5 text-[#09090B] text-sm font-semibold"
                      />
                    </View>

                    {/* Quick Demo Pre-fill Pill */}
                    <View className="flex-row items-center justify-between mb-2.5">
                      <Pressable
                        onPress={() => {
                          setPhoneNumber("317-555-0142");
                          setPhoneRole("driver");
                        }}
                        className="bg-white px-2.5 py-1 rounded-full border border-black/5"
                      >
                        <Text className="text-[10px] font-bold text-[#09090B]">
                          ⚡ Marcus Vance (Fleet Driver)
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setPhoneNumber("317-555-0177");
                          setPhoneRole("recipient");
                        }}
                        className="bg-white px-2.5 py-1 rounded-full border border-black/5"
                      >
                        <Text className="text-[10px] font-bold text-[#09090B]">
                          Shipper Phone
                        </Text>
                      </Pressable>
                    </View>

                    <View className="mb-3">
                      <Text className="text-[11px] font-bold text-[#71717A] mb-1">
                        6-Digit Verification Code
                      </Text>
                      <TextInput
                        value={otpCode}
                        onChangeText={setOtpCode}
                        keyboardType="number-pad"
                        placeholder="123456"
                        placeholderTextColor="#A1A1AA"
                        className="bg-white rounded-xl px-3.5 py-2.5 text-[#09090B] text-sm font-semibold"
                      />
                    </View>

                    <Pressable
                      onPress={handlePhoneSubmit}
                      disabled={submitting}
                      style={{ backgroundColor: brandConfig.theme.primary }}
                      className="rounded-xl py-3 items-center justify-center"
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-bold text-sm">
                          Verify & Enter App →
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <View className="flex-row bg-white p-1 rounded-xl mb-3">
                      <Pressable
                        onPress={() => setMode("signin")}
                        className={`flex-1 py-1.5 rounded-lg items-center ${
                          mode === "signin" ? "bg-[#09090B]" : ""
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            mode === "signin" ? "text-white" : "text-[#71717A]"
                          }`}
                        >
                          Sign In
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setMode("signup")}
                        className={`flex-1 py-1.5 rounded-lg items-center ${
                          mode === "signup" ? "bg-[#09090B]" : ""
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            mode === "signup" ? "text-white" : "text-[#71717A]"
                          }`}
                        >
                          Create Account
                        </Text>
                      </Pressable>
                    </View>

                    {mode === "signup" ? (
                      <View className="mb-2.5">
                        <TextInput
                          value={fullName}
                          onChangeText={setFullName}
                          placeholder="Full Name"
                          placeholderTextColor="#A1A1AA"
                          className="bg-white rounded-xl px-3.5 py-2.5 text-[#09090B] text-sm"
                        />
                      </View>
                    ) : null}

                    <View className="mb-2.5">
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="Email address"
                        placeholderTextColor="#A1A1AA"
                        className="bg-white rounded-xl px-3.5 py-2.5 text-[#09090B] text-sm"
                      />
                    </View>

                    <View className="mb-3">
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="Password"
                        placeholderTextColor="#A1A1AA"
                        className="bg-white rounded-xl px-3.5 py-2.5 text-[#09090B] text-sm"
                      />
                    </View>

                    <Pressable
                      onPress={handleAuthSubmit}
                      disabled={submitting}
                      style={{ backgroundColor: brandConfig.theme.primary }}
                      className="rounded-xl py-3 items-center justify-center"
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-bold text-sm">
                          {mode === "signin" ? "Sign In" : "Create Account"}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        <WhiteLabelModal
          visible={whiteLabelModalOpen}
          onClose={() => setWhiteLabelModalOpen(false)}
        />
        <OnboardingWizardModal
          visible={storyboardOpen}
          onClose={() => setStoryboardOpen(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
