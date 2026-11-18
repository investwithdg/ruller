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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { type UserRole } from "../../lib/brand-config";
import { useAuth } from "../../lib/auth-context";

const SIGNUP_ROLES: { role: UserRole; label: string; subtitle: string }[] = [
  {
    role: "recipient",
    label: "Customer",
    subtitle: "Instant delivery quotes, checkout & live tracking",
  },
  {
    role: "driver",
    label: "Driver",
    subtitle: "Accept dispatches, navigate & submit Proof of Delivery",
  },
  {
    role: "dispatcher",
    label: "Dispatcher",
    subtitle: "Monitor active fleet & assign routes in real time",
  },
];

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, brandConfig } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("recipient");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    setError(null);
    setSubmitting(true);
    const res = await signUp(name, email, phone, password, role);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (role === "driver") router.replace("/(app)/driver");
    else if (role === "dispatcher") router.replace("/(app)/dispatcher");
    else router.replace("/(app)/customer");
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Link href="/(auth)/sign-in" asChild>
              <Pressable className="flex-row items-center gap-1.5 mb-5 self-start bg-[#F4F4F5] px-3 py-1.5 rounded-full">
                <Ionicons name="arrow-back" size={14} color="#09090B" />
                <Text className="text-xs font-bold text-[#09090B]">Back to Sign In</Text>
              </Pressable>
            </Link>

            <Text className="text-[26px] font-bold text-[#09090B] tracking-tight">
              Create {brandConfig.shortName} Account
            </Text>
            <Text className="text-sm text-[#71717A] mt-1">
              Register within {brandConfig.companyName} as a customer, driver, or dispatcher.
            </Text>
          </View>

          {error ? (
            <View className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mb-5 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color="#E11D48" />
              <Text className="text-xs font-medium text-rose-700 flex-1">{error}</Text>
            </View>
          ) : null}

          <Text className="text-xs font-bold uppercase tracking-wider text-[#71717A] mb-2">
            Account Role
          </Text>
          <View className="mb-6">
            {SIGNUP_ROLES.map((item, idx) => {
              const selected = role === item.role;
              return (
                <View key={item.role}>
                  {idx > 0 ? <View className="h-[1px] bg-[#F4F4F5]" /> : null}
                  <Pressable
                    onPress={() => setRole(item.role)}
                    className="py-3.5 flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-[15px] font-semibold text-[#09090B]">
                        {item.label}
                      </Text>
                      <Text className="text-xs text-[#71717A] mt-0.5">
                        {item.subtitle}
                      </Text>
                    </View>
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={selected ? brandConfig.theme.primary : "#A1A1AA"}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View className="gap-3.5 mb-6">
            <View>
              <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                Full Name or Company
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Heartland Supply Co."
                placeholderTextColor="#A1A1AA"
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3.5 text-[#09090B] text-sm font-medium"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                Work Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={`you@${brandConfig.tenantSlug}.com`}
                placeholderTextColor="#A1A1AA"
                autoCapitalize="none"
                keyboardType="email-address"
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3.5 text-[#09090B] text-sm font-medium"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                Mobile Phone
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={brandConfig.supportPhone}
                placeholderTextColor="#A1A1AA"
                keyboardType="phone-pad"
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3.5 text-[#09090B] text-sm font-medium"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-[#71717A] mb-1.5">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 8 characters"
                placeholderTextColor="#A1A1AA"
                secureTextEntry
                className="bg-[#F4F4F5] rounded-2xl px-4 py-3.5 text-[#09090B] text-sm font-medium"
              />
            </View>
          </View>

          <Pressable
            onPress={handleSignUp}
            disabled={submitting}
            style={{ backgroundColor: brandConfig.theme.primary }}
            className="h-[54px] rounded-2xl items-center justify-center flex-row gap-2 active:opacity-90"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                <Text className="text-white font-bold text-[15px]">
                  Create {brandConfig.shortName} Account
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
