import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BRAND_CONFIG } from "../lib/brand-config";

interface Props {
  children: React.ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Runtime Error Boundary (Pass 5)
 * Wraps critical routes so uncaught JS errors display a clean recovery screen
 * instead of a blank white crash screen.
 */
export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected rendering error occurred.",
    };
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-white items-center justify-center px-6">
          <View className="w-14 h-14 rounded-2xl bg-[#F4F4F5] items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={28} color="#09090B" />
          </View>
          <Text className="text-lg font-bold text-[#09090B] text-center">
            {this.props.routeName ? `${this.props.routeName} paused` : "View temporarily unavailable"}
          </Text>
          <Text className="text-xs text-[#71717A] text-center mt-1.5 leading-5 max-w-[280px]">
            {this.state.errorMessage || "Something interrupted this view. Tap retry to recover."}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={{ backgroundColor: BRAND_CONFIG.theme.primary }}
            className="mt-5 px-6 h-11 rounded-2xl flex-row items-center justify-center gap-2"
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">Retry View</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
