import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View, useWindowDimensions } from "react-native";

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

const ROOM_H = 276;

const MOOD_EYES: Record<MascotMood, string> = {
	idle: "◕ ◕",
	thinking: "◑ ◐",
	happy: "✧ ✧",
	listening: "◉ ◉",
	speaking: "◕ ◕",
};

const MOOD_MOUTH: Record<MascotMood, string> = {
	idle: "‿",
	thinking: "～",
	happy: "▽",
	listening: "○",
	speaking: "◡",
};

const MOOD_BLUSH: Record<MascotMood, boolean> = {
	idle: false,
	thinking: false,
	happy: true,
	listening: false,
	speaking: true,
};

export function MascotRoom({ mascot, mood, bounceAnim, speakingLevel = 0 }: Props) {
	const { width } = useWindowDimensions();
	const roomW = Math.min(width - 32, 620);

	const floatAnim = useRef(new Animated.Value(0)).current;
	const wobbleAnim = useRef(new Animated.Value(0)).current;
	const glowAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
				Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
			])
		).start();
		Animated.loop(
			Animated.sequence([
				Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
				Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
			])
		).start();
	}, [floatAnim, glowAnim]);

	useEffect(() => {
		if (mood === "happy") {
			Animated.loop(
				Animated.sequence([
					Animated.timing(wobbleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
					Animated.timing(wobbleAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
					Animated.timing(wobbleAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
				])
			).start();
		} else if (mood === "speaking") {
			Animated.loop(
				Animated.sequence([
					Animated.timing(wobbleAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }),
					Animated.timing(wobbleAnim, { toValue: -0.5, duration: 200, useNativeDriver: true }),
				])
			).start();
		} else {
			wobbleAnim.setValue(0);
		}
	}, [mood, wobbleAnim]);

	const moodText = useMemo(() => {
		if (mood === "speaking") return "Hablando";
		if (mood === "listening") return "Escuchando";
		if (mood === "thinking") return "Pensando";
		if (mood === "happy") return "Feliz";
		return "En calma";
	}, [mood]);

	const floatTranslateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
	const wobbleRotate = wobbleAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-6deg", "0deg", "6deg"] });

	return (
		<View style={[styles.room, { width: roomW, height: ROOM_H }]}>
			<View style={[styles.bg, { backgroundColor: mascot.bg }]} />
			<Animated.View
				style={[
					styles.bgOrb,
					styles.bgOrbLeft,
					{
						opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.45] }),
						transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
					},
				]}
			/>
			<Animated.View
				style={[
					styles.bgOrb,
					styles.bgOrbRight,
					{
						opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.38] }),
						transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
					},
				]}
			/>

			<Animated.View
				style={[
					styles.spriteContainer,
					{
						transform: [
							{ translateY: floatTranslateY },
							{ rotate: wobbleRotate },
							{ scale: bounceAnim },
							{ scale: mood === "speaking" ? 1 + Math.min(0.06, speakingLevel * 0.06) : 1 },
						],
					},
				]}
			>
				<View style={styles.shadow} />
				<Text style={styles.spriteEmoji}>{mascot.emoji}</Text>
				<View style={styles.faceOverlay}>
					<Text style={styles.eyes}>{MOOD_EYES[mood]}</Text>
					{MOOD_BLUSH[mood] && (
						<View style={styles.blushRow}>
							<View style={[styles.blush, styles.blushLeft]} />
							<View style={[styles.blush, styles.blushRight]} />
						</View>
					)}
					<Text style={[styles.mouth, mood === "speaking" && styles.mouthSpeaking]}>
						{MOOD_MOUTH[mood]}
					</Text>
				</View>
			</Animated.View>

			<View style={styles.badge}>
				<Text style={styles.name}>{mascot.name}</Text>
				<Text style={styles.state}>{moodText}</Text>
			</View>

			{mood === "happy" && (
				<>
					<Text style={[styles.particle, { top: 30, left: "20%" }]}>✦</Text>
					<Text style={[styles.particle, { top: 50, right: "18%" }]}>✧</Text>
					<Text style={[styles.particle, { top: 20, right: "30%" }]}>⋆</Text>
				</>
			)}
			{mood === "thinking" && (
				<>
					<Text style={[styles.particle, { top: 26, right: "22%" }]}>💭</Text>
					<Text style={[styles.particle, { top: 42, right: "16%", fontSize: 10 }]}>•</Text>
					<Text style={[styles.particle, { top: 56, right: "14%", fontSize: 8 }]}>•</Text>
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	room: {
		borderRadius: 22,
		overflow: "hidden",
		position: "relative",
	},
	bg: {
		...StyleSheet.absoluteFillObject,
	},
	bgOrb: {
		position: "absolute",
		borderRadius: 999,
	},
	bgOrbLeft: {
		width: 160,
		height: 160,
		left: -30,
		top: -20,
		backgroundColor: "#ffe0da",
	},
	bgOrbRight: {
		width: 180,
		height: 180,
		right: -40,
		bottom: -30,
		backgroundColor: "#cff6ff",
	},
	spriteContainer: {
		alignSelf: "center",
		marginTop: 20,
		alignItems: "center",
	},
	shadow: {
		position: "absolute",
		bottom: -8,
		width: 80,
		height: 16,
		borderRadius: 40,
		backgroundColor: "rgba(0,0,0,0.08)",
		alignSelf: "center",
	},
	spriteEmoji: {
		fontSize: 90,
	},
	faceOverlay: {
		position: "absolute",
		top: 22,
		left: 0,
		right: 0,
		alignItems: "center",
	},
	eyes: {
		fontSize: 16,
		letterSpacing: 8,
		color: "#2c3340",
		marginBottom: 2,
	},
	blushRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 28,
	},
	blush: {
		width: 12,
		height: 6,
		borderRadius: 6,
		backgroundColor: "rgba(255, 140, 160, 0.4)",
	},
	blushLeft: {},
	blushRight: {},
	mouth: {
		fontSize: 18,
		color: "#7c3d4f",
		marginTop: 0,
	},
	mouthSpeaking: {
		fontSize: 22,
	},
	badge: {
		alignSelf: "center",
		marginTop: 6,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.86)",
		borderWidth: 1,
		borderColor: "rgba(132, 153, 188, 0.4)",
		paddingVertical: 5,
		paddingHorizontal: 14,
		flexDirection: "row",
		gap: 6,
		alignItems: "center",
	},
	name: {
		color: "#31435e",
		fontWeight: "800",
		fontSize: 14,
	},
	state: {
		color: "#5b6e8b",
		fontWeight: "600",
		fontSize: 12,
	},
	particle: {
		position: "absolute",
		fontSize: 14,
		color: "#ffb84d",
	},
});
