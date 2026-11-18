import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import type { UserRole } from "../../lib/brand-config";
import { RouteErrorBoundary } from "../../components/RouteErrorBoundary";
import { SimulationControllerBar } from "../../components/SimulationControllerBar";

const ROLE_TO_TAB: Record<UserRole, string> = {
  recipient: "/(app)/customer",
  dispatcher: "/(app)/dispatcher",
  driver: "/(app)/driver",
  admin: "/(app)/admin",
};

const ROLE_TO_PATH: Record<UserRole, string> = {
  recipient: "/customer",
  dispatcher: "/dispatcher",
  driver: "/driver",
  admin: "/admin",
};

const PATH_TO_ROLE: Record<string, UserRole> = {
  "/customer": "recipient",
  "/dispatcher": "dispatcher",
  "/driver": "driver",
  "/admin": "admin",
};

function renderTabIcon(name: keyof typeof Ionicons.glyphMap) {
  return function TabBarIcon({
    color,
    size,
  }: {
    color: unknown;
    size: number;
  }) {
    return (
      <Ionicons
        name={name}
        size={size}
        color={typeof color === "string" ? color : "#71717A"}
      />
    );
  };
}

/**
 * Uber-Style Bottom Navigation Bar
 *
 * In Evaluation Mode (!isRoleLocked):
 * Every user and role sees the balanced 5-tab bar (Book · Dispatch · Driver · Hub · Account)
 * so operators & investors can test all 4 hats freely.
 *
 * In Production Mode (isRoleLocked):
 * Navigation is strictly role-locked:
 * - Driver sees ONLY Driver Cockpit & Account (no Hub, Dispatch, or Customer).
 * - Customer sees ONLY Book / Timeline & Account (no Hub, Dispatch, or Driver).
 * - Dispatcher sees Dispatch, Book, Hub, and Account (no Driver Cockpit).
 */
export default function AppTabsLayout() {
  const { activeRole, setActiveRole, brandConfig, isRoleLocked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastRoleRef = useRef<UserRole>(activeRole);
  const lastPathRef = useRef<string>("");

  useEffect(() => {
    if (pathname === lastPathRef.current) {
      return;
    }
    lastPathRef.current = pathname;
    const matchedRole = PATH_TO_ROLE[pathname];
    if (matchedRole && matchedRole !== lastRoleRef.current) {
      lastRoleRef.current = matchedRole;
      setActiveRole(matchedRole);
    }
  }, [pathname, setActiveRole]);

  useEffect(() => {
    if (lastRoleRef.current === activeRole) {
      return;
    }
    lastRoleRef.current = activeRole;
    const targetTab = ROLE_TO_TAB[activeRole];
    const targetPath = ROLE_TO_PATH[activeRole];
    if (targetTab && targetPath && pathname !== targetPath) {
      lastPathRef.current = targetPath;
      router.replace(targetTab as any);
    }
  }, [activeRole, pathname, router]);

  // Tab visibility based on role locking
  const isCustomerVisible =
    !isRoleLocked ||
    activeRole === "recipient" ||
    activeRole === "dispatcher" ||
    activeRole === "admin";

  const isDispatchVisible =
    !isRoleLocked ||
    activeRole === "dispatcher" ||
    activeRole === "admin";

  const isDriverVisible =
    !isRoleLocked ||
    activeRole === "driver" ||
    activeRole === "admin";

  const isHubVisible =
    !isRoleLocked ||
    activeRole === "dispatcher" ||
    activeRole === "admin";

  return (
    <RouteErrorBoundary routeName="Workspace">
      <View className="flex-1 bg-white">
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#09090B",
            tabBarInactiveTintColor: "#A1A1AA",
            tabBarStyle: {
              backgroundColor: "#FFFFFF",
              borderTopColor: "#F4F4F5",
              height: 64,
              paddingTop: 6,
              paddingBottom: 8,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "700",
            },
          }}
        >
          <Tabs.Screen
            name="customer"
            options={{
              title: "Book",
              href: isCustomerVisible ? undefined : null,
              tabBarIcon: renderTabIcon("cube-outline"),
            }}
          />
          <Tabs.Screen
            name="dispatcher"
            options={{
              title: "Dispatch",
              href: isDispatchVisible ? undefined : null,
              tabBarIcon: renderTabIcon("map-outline"),
            }}
          />
          <Tabs.Screen
            name="driver"
            options={{
              title: "Driver",
              href: isDriverVisible ? undefined : null,
              tabBarIcon: renderTabIcon("navigate-outline"),
            }}
          />
          <Tabs.Screen
            name="admin"
            options={{
              title: "Hub",
              href: isHubVisible ? undefined : null,
              tabBarActiveTintColor: brandConfig.theme.primary,
              tabBarIcon: renderTabIcon("layers-outline"),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Account",
              tabBarIcon: renderTabIcon("person-outline"),
            }}
          />
        </Tabs>

        {/* Global Live Simulation Controller HUD */}
        <SimulationControllerBar />
      </View>
    </RouteErrorBoundary>
  );
}
