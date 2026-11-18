import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const rawSupabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
const rawSupabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(
  /^https?:\/\//i.test(rawSupabaseUrl) &&
    rawSupabaseAnonKey &&
    !rawSupabaseUrl.includes("placeholder") &&
    !rawSupabaseUrl.includes("your-project-ref") &&
    !rawSupabaseUrl.includes("your_supabase") &&
    !rawSupabaseAnonKey.includes("placeholder") &&
    !rawSupabaseAnonKey.includes("your_supabase")
);

const supabaseUrl = isSupabaseConfigured
  ? rawSupabaseUrl
  : "https://placeholder.supabase.co";
const supabaseAnonKey = isSupabaseConfigured
  ? rawSupabaseAnonKey
  : "placeholder-anon-key";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
