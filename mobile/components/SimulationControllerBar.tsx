import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth-context";

export function SimulationControllerBar() {
  const {
    simulationState,
    advanceSimulationStep,
    stopLiveRunSimulation,
    brandConfig,
    activeRole,
    setActiveRole,
  } = useAuth();

  if (!simulationState.active) {
    return null;
  }

  const { currentStep, totalSteps, message } = simulationState;

  function handleAdvance() {
    // Optionally synchronize active view with the role of the next step
    if (currentStep === 1) {
      // Step 2 is dispatch assignment
      if (activeRole !== "dispatcher") setActiveRole("dispatcher");
    } else if (currentStep === 2) {
      // Step 3 is driver loading cargo
      if (activeRole !== "driver") setActiveRole("driver");
    } else if (currentStep === 3) {
      // Step 4 is driver in transit or customer tracking
      if (activeRole !== "recipient") setActiveRole("recipient");
    } else if (currentStep === 4) {
      // Step 5 is delivered & signed POD
      if (activeRole !== "recipient") setActiveRole("recipient");
    }
    advanceSimulationStep();
  }

  return (
    <View
      style={{
        shadowColor: "#09090B",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
      }}
      className="bg-[#09090B] border-t border-white/10 px-4 py-3 flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-2.5 flex-1 pr-3">
        <View
          style={{ backgroundColor: brandConfig.theme.primary }}
          className="w-7 h-7 rounded-full items-center justify-center"
        >
          <Ionicons name="flash" size={14} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-[10px] font-black uppercase tracking-wider text-[#A1A1AA]">
              Live Run Simulation · Step {currentStep} of {totalSteps}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            className="text-xs font-bold text-white mt-0.5"
          >
            {message}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={handleAdvance}
          style={{ backgroundColor: brandConfig.theme.primary }}
          className="px-3.5 py-2 rounded-xl flex-row items-center gap-1 active:opacity-85"
        >
          <Text className="text-xs font-black text-white">
            {currentStep >= totalSteps ? "Finish ✓" : "Next Step →"}
          </Text>
        </Pressable>

        <Pressable
          onPress={stopLiveRunSimulation}
          className="w-8 h-8 rounded-full bg-white/10 items-center justify-center active:opacity-75"
        >
          <Ionicons name="close" size={15} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
