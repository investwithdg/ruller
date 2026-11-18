import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth-context";

export default function IndexRedirect() {
  const { session, isDemoMode, activeRole, loading } = useAuth();

  if (loading) {
    return null;
  }

  const isLoggedIn = Boolean(session || isDemoMode);

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  switch (activeRole) {
    case "driver":
      return <Redirect href="/(app)/driver" />;
    case "dispatcher":
      return <Redirect href="/(app)/dispatcher" />;
    case "admin":
      return <Redirect href="/(app)/admin" />;
    case "recipient":
    default:
      return <Redirect href="/(app)/customer" />;
  }
}
