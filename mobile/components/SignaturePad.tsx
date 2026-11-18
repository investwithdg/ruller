import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  type GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface SignaturePoint {
  x: number;
  y: number;
}

export type SignatureStroke = SignaturePoint[];

interface SignaturePadProps {
  onSignatureChange: (strokes: SignatureStroke[], svgPath: string) => void;
}

export function strokesToSvgPath(strokes: SignatureStroke[]): string {
  return strokes
    .filter((s) => s.length > 0)
    .map((stroke) =>
      stroke
        .map(
          (pt, idx) =>
            `${idx === 0 ? "M" : "L"}${Math.round(pt.x)},${Math.round(pt.y)}`
        )
        .join(" ")
    )
    .join(" ");
}

export function svgPathToStrokes(svgPath?: string | null): SignatureStroke[] {
  if (!svgPath) return [];
  const strokes: SignatureStroke[] = [];
  let current: SignatureStroke = [];

  const tokens = svgPath.trim().split(/\s+/);
  for (const token of tokens) {
    if (token.startsWith("M")) {
      if (current.length > 0) strokes.push(current);
      const [x, y] = token.slice(1).split(",").map(Number);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        current = [{ x, y }];
      }
    } else if (token.startsWith("L")) {
      const [x, y] = token.slice(1).split(",").map(Number);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        current.push({ x, y });
      }
    }
  }
  if (current.length > 0) strokes.push(current);
  return strokes;
}

export function SignatureStrokePreview({
  strokes,
  height = 80,
}: {
  strokes: SignatureStroke[];
  height?: number;
}) {
  return (
    <View
      style={{ height, overflow: "hidden", position: "relative" }}
      className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl w-full"
    >
      {/* Signature baseline */}
      <View
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 18,
          height: 1,
        }}
        className="bg-[#E4E4E7]"
      />
      <Text
        style={{ position: "absolute", left: 12, bottom: 4 }}
        className="text-[9px] font-semibold text-[#A1A1AA] uppercase tracking-wider"
      >
        X — Verified Signature
      </Text>
      {strokes.map((stroke, sIdx) =>
        stroke.map((pt, pIdx) => (
          <View
            key={`${sIdx}-${pIdx}`}
            style={{
              position: "absolute",
              left: pt.x * 0.58 - 1.5,
              top: pt.y * 0.48 - 1.5,
              width: 3.5,
              height: 3.5,
              borderRadius: 2,
              backgroundColor: "#09090B",
            }}
          />
        ))
      )}
    </View>
  );
}

export function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const activeStrokeRef = useRef<SignatureStroke>([]);
  const strokesRef = useRef<SignatureStroke[]>([]);

  function clampPoint(evt: GestureResponderEvent): SignaturePoint {
    const { locationX, locationY } = evt.nativeEvent;
    return {
      x: Math.max(8, Math.min(340, locationX)),
      y: Math.max(8, Math.min(126, locationY)),
    };
  }

  function handleResponderGrant(evt: GestureResponderEvent) {
    const pt = clampPoint(evt);
    activeStrokeRef.current = [pt];
    const next = [...strokesRef.current, activeStrokeRef.current];
    strokesRef.current = next;
    setStrokes([...next]);
    onSignatureChange(next, strokesToSvgPath(next));
  }

  function handleResponderMove(evt: GestureResponderEvent) {
    const pt = clampPoint(evt);
    activeStrokeRef.current = [...activeStrokeRef.current, pt];
    const next = [...strokesRef.current.slice(0, -1), activeStrokeRef.current];
    strokesRef.current = next;
    setStrokes([...next]);
    onSignatureChange(next, strokesToSvgPath(next));
  }

  function handleResponderRelease() {
    onSignatureChange(strokesRef.current, strokesToSvgPath(strokesRef.current));
  }

  function handleClear() {
    strokesRef.current = [];
    activeStrokeRef.current = [];
    setStrokes([]);
    onSignatureChange([], "");
  }

  function handleQuickStamp() {
    const demoStroke: SignatureStroke = [];
    for (let i = 0; i < 38; i++) {
      const x = 28 + i * 6.2;
      const y = 62 + Math.sin(i * 0.45) * 18 + Math.cos(i * 0.9) * 7;
      demoStroke.push({ x, y });
    }
    const next = [demoStroke];
    strokesRef.current = next;
    setStrokes(next);
    onSignatureChange(next, strokesToSvgPath(next));
  }

  const pointCount = strokes.reduce((acc, s) => acc + s.length, 0);

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-bold text-[#71717A] uppercase tracking-wider">
          Recipient Signature {pointCount > 0 ? "· Captured ✓" : ""}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={handleQuickStamp}
            className="bg-[#F4F4F5] px-2.5 py-1 rounded-full"
          >
            <Text className="text-[11px] font-bold text-[#09090B]">
              Auto-Sign
            </Text>
          </Pressable>
          {pointCount > 0 ? (
            <Pressable
              onPress={handleClear}
              className="bg-[#F4F4F5] px-2.5 py-1 rounded-full"
            >
              <Text className="text-[11px] font-semibold text-[#71717A]">
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleResponderGrant}
        onResponderMove={handleResponderMove}
        onResponderRelease={handleResponderRelease}
        style={{ height: 132, position: "relative", overflow: "hidden" }}
        className="bg-[#F4F4F5] rounded-2xl w-full"
      >
        {pointCount === 0 ? (
          <View className="flex-1 items-center justify-center gap-1">
            <Ionicons name="create-outline" size={18} color="#A1A1AA" />
            <Text className="text-xs font-medium text-[#71717A]">
              Sign with finger or tap Auto-Sign
            </Text>
          </View>
        ) : null}

        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 24,
            height: 1,
          }}
          className="bg-[#E4E4E7]"
        />
        <Text
          style={{ position: "absolute", left: 16, bottom: 7 }}
          className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider"
        >
          X — Chain-of-Custody Signature
        </Text>

        {strokes.map((stroke, sIdx) =>
          stroke.map((pt, pIdx) => (
            <View
              key={`${sIdx}-${pIdx}`}
              style={{
                position: "absolute",
                left: pt.x - 2,
                top: pt.y - 2,
                width: 4.5,
                height: 4.5,
                borderRadius: 2.5,
                backgroundColor: "#09090B",
              }}
            />
          ))
        )}
      </View>
    </View>
  );
}
