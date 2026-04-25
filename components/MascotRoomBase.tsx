import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";

export type MascotMood = "idle" | "thinking" | "happy" | "listening" | "speaking";

export type MascotData = {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  personality: string;
  reactions: Record<MascotMood, string>;
};

type Props = {
  mascot: MascotData;
  mood: MascotMood;
  bounceAnim: Animated.Value;
  speakingLevel?: number;
};

const REF_MASCOTS = require("../Captura de pantalla 2026-04-09 174853.png");
const ROOM_H = 276;

export function MascotRoomBase({ mascot, mood, bounceAnim, speakingLevel = 0 }: Props) {
  const { width } = useWindowDimensions();
  const roomW = Math.min(width - 32, 620);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim, glowAnim]);

  const moodLabel = useMemo(() => {
    switch (mood) {
      case "thinking":
        return "Pensando";
      case "listening":
        return "Escuchando";
      case "speaking":
        return "Hablando";
      case "happy":
        return "Feliz";
      default:
        return "En calma";
    }
  }, [mood]);

  const imageScale = mood === "happy"
    ? 1.06
    : mood === "speaking"
      ? 1 + Math.min(0.07, speakingLevel * 0.08)
      : 1;

  const borderColor = mood === "happy"
    ? "#ffcc6a"
    : mood === "speaking"
      ? "#79d8ff"
      : mood === "thinking"
        ? "#b4a3ff"
        : "#c8d3e8";

  return (
    <View style={[styles.room, { width: roomW, height: ROOM_H }]}> 
      <View style={styles.bgBase} />
      <Animated.View
        style={[
          styles.bgOrb,
          styles.bgOrbLeft,
          {
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bgOrb,
          styles.bgOrbRight,
          {
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.42] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.card,
          {
            borderColor,
            transform: [
              { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
              { scale: imageScale },
              { scale: bounceAnim },
            ],
          },
        ]}
      >
        <Image source={REF_MASCOTS} resizeMode="cover" style={styles.image} />
      </Animated.View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{mascot.name} - {moodLabel}</Text>
      </View>
    </View>
  );
}

export const MascotRoom = MascotRoomBase;

const styles = StyleSheet.create({
  room: {
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f5eee9",
  },
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  bgOrbLeft: {
    width: 200,
    height: 200,
    left: -40,
    top: -22,
    backgroundColor: "#ffe0da",
  },
  bgOrbRight: {
    width: 220,
    height: 220,
    right: -54,
    bottom: -42,
    backgroundColor: "#cff6ff",
  },
  card: {
    width: "88%",
    height: "78%",
    alignSelf: "center",
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 3,
    overflow: "hidden",
    backgroundColor: "#f9f5ef",
    shadowColor: "#8c7d72",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "rgba(132, 153, 188, 0.4)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  badgeText: {
    color: "#334862",
    fontSize: 12,
    fontWeight: "700",
  },
});