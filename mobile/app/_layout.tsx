import "../global.css";
import React, { useEffect } from "react";
import { LogBox, Platform, View, useWindowDimensions } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";

LogBox.ignoreLogs(["ImageBackground is deprecated"]);
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  const { width: windowWidth } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View className="flex-1 bg-white" />;
  }

  const isDesktopWeb = Platform.OS === "web" && windowWidth >= 560;

  const appShell = (
    <View
      style={
        isDesktopWeb
          ? {
              width: "100%",
              maxWidth: 430,
              height: "100%",
              maxHeight: 880,
              borderRadius: 40,
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
              borderWidth: 8,
              borderColor: "#18181B",
              shadowColor: "#09090B",
              shadowOffset: { width: 0, height: 24 },
              shadowOpacity: 0.22,
              shadowRadius: 40,
            }
          : undefined
      }
      className={isDesktopWeb ? "w-full flex-1 bg-white" : "flex-1 bg-white"}
    >
      <RootNavigator />
    </View>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouteErrorBoundary routeName="Application">
        <AuthProvider>
          <StatusBar style="dark" />
          {isDesktopWeb ? (
            <View className="flex-1 bg-[#E4E4E7] items-center justify-center p-4">
              {appShell}
            </View>
          ) : (
            appShell
          )}
        </AuthProvider>
      </RouteErrorBoundary>
    </QueryClientProvider>
  );
}
