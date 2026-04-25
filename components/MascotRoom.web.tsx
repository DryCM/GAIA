import React, { useRef, Suspense, useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions, type Animated } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

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

// ── Per-mascot 3D configuration ─────────────────────────────────────────────
type EarType = "round" | "pointed" | "long" | "fin" | "tuft";
type MascotConfig = {
	bodyColor: string;
	headColor: string;
	earColor: string;
	innerEarColor: string | null;
	earType: EarType;
	snoutColor: string;
	hasPatch: boolean;
	patchColor: string;
	eyeSize: number;
	beakColor: string | null;
};

const MASCOT_CONFIGS: Record<string, MascotConfig> = {
	panda:   { bodyColor: "#eeebe7", headColor: "#eeebe7", earColor: "#1a1a1a", innerEarColor: "#4a4a4a", earType: "round",   snoutColor: "#f5f5f3", hasPatch: true,  patchColor: "#1a1a1a", eyeSize: 0.065, beakColor: null },
	fox:     { bodyColor: "#e06820", headColor: "#e06820", earColor: "#e06820", innerEarColor: "#fff0e0", earType: "pointed", snoutColor: "#f5d8a8", hasPatch: false, patchColor: "",        eyeSize: 0.062, beakColor: null },
	bunny:   { bodyColor: "#f0ecff", headColor: "#f0ecff", earColor: "#f0ecff", innerEarColor: "#f9b0cc", earType: "long",    snoutColor: "#fdd8e8", hasPatch: false, patchColor: "",        eyeSize: 0.060, beakColor: null },
	otter:   { bodyColor: "#7a4e2d", headColor: "#8a5c35", earColor: "#7a4e2d", innerEarColor: "#c48a5a", earType: "round",   snoutColor: "#d4a060", hasPatch: false, patchColor: "",        eyeSize: 0.062, beakColor: null },
	koala:   { bodyColor: "#9098a5", headColor: "#9098a5", earColor: "#9098a5", innerEarColor: "#c8d0d8", earType: "round",   snoutColor: "#d8dce2", hasPatch: false, patchColor: "",        eyeSize: 0.060, beakColor: null },
	owl:     { bodyColor: "#7a5814", headColor: "#7a5814", earColor: "#5c3e0a", innerEarColor: null,      earType: "tuft",    snoutColor: "#7a5814", hasPatch: false, patchColor: "",        eyeSize: 0.080, beakColor: "#ffa830" },
	cat:     { bodyColor: "#f0c038", headColor: "#f0c038", earColor: "#f0c038", innerEarColor: "#ff9ab0", earType: "pointed", snoutColor: "#fff8ee", hasPatch: false, patchColor: "",        eyeSize: 0.062, beakColor: null },
	dolphin: { bodyColor: "#4a8fc4", headColor: "#4a8fc4", earColor: "#4a8fc4", innerEarColor: null,      earType: "fin",     snoutColor: "#8dc8f0", hasPatch: false, patchColor: "",        eyeSize: 0.058, beakColor: null },
};

// ── Ear helper ───────────────────────────────────────────────────────────────
function EarPair({ cfg }: { cfg: MascotConfig }) {
	if (cfg.earType === "round") {
		return (
			<>
				<mesh position={[-0.34, 0.57, 0]}>
					<sphereGeometry args={[0.15, 12, 12]} />
					<meshStandardMaterial color={cfg.earColor} roughness={0.9} />
				</mesh>
				<mesh position={[0.34, 0.57, 0]}>
					<sphereGeometry args={[0.15, 12, 12]} />
					<meshStandardMaterial color={cfg.earColor} roughness={0.9} />
				</mesh>
				{cfg.innerEarColor && (
					<>
						<mesh position={[-0.34, 0.57, 0.1]}>
							<sphereGeometry args={[0.08, 10, 10]} />
							<meshStandardMaterial color={cfg.innerEarColor} roughness={0.9} />
						</mesh>
						<mesh position={[0.34, 0.57, 0.1]}>
							<sphereGeometry args={[0.08, 10, 10]} />
							<meshStandardMaterial color={cfg.innerEarColor} roughness={0.9} />
						</mesh>
					</>
				)}
			</>
		);
	}
	if (cfg.earType === "pointed") {
		return (
			<>
				<mesh position={[-0.32, 0.62, 0]} rotation={[0, 0, -0.32] as unknown as THREE.Euler}>
					<coneGeometry args={[0.12, 0.30, 8]} />
					<meshStandardMaterial color={cfg.earColor} roughness={0.9} />
				</mesh>
				<mesh position={[0.32, 0.62, 0]} rotation={[0, 0, 0.32] as unknown as THREE.Euler}>
					<coneGeometry args={[0.12, 0.30, 8]} />
					<meshStandardMaterial color={cfg.earColor} roughness={0.9} />
				</mesh>
				{cfg.innerEarColor && (
					<>
						<mesh position={[-0.32, 0.62, 0.07]} rotation={[0, 0, -0.32] as unknown as THREE.Euler}>
							<coneGeometry args={[0.06, 0.18, 8]} />
							<meshStandardMaterial color={cfg.innerEarColor} roughness={0.9} />
						</mesh>
						<mesh position={[0.32, 0.62, 0.07]} rotation={[0, 0, 0.32] as unknown as THREE.Euler}>
							<coneGeometry args={[0.06, 0.18, 8]} />
							<meshStandardMaterial color={cfg.innerEarColor} roughness={0.9} />
						</mesh>
					</>
				)}
			</>
		);
	}
	if (cfg.earType === "long") {
		return (
			<>
				<mesh position={[-0.22, 0.76, 0]}>
					<capsuleGeometry args={[0.08, 0.34, 6, 12]} />
					<meshStandardMaterial color={cfg.earColor} roughness={0.85} />
				</mesh>
				<mesh position={[0.22, 0.76, 0]}>
					<capsuleGeometry args={[0.08, 0.34, 6, 12]} />
					<meshStandardMaterial color={cfg.earColor} roughness={0.85} />
				</mesh>
				{cfg.innerEarColor && (
					<>
						<mesh position={[-0.22, 0.76, 0.07]}>
							<capsuleGeometry args={[0.04, 0.22, 4, 8]} />
							<meshStandardMaterial color={cfg.innerEarColor} roughness={0.85} />
						</mesh>
						<mesh position={[0.22, 0.76, 0.07]}>
							<capsuleGeometry args={[0.04, 0.22, 4, 8]} />
							<meshStandardMaterial color={cfg.innerEarColor} roughness={0.85} />
						</mesh>
					</>
				)}
			</>
		);
	}
	if (cfg.earType === "fin") {
		// Dolphin dorsal fin
		return (
			<mesh position={[0, 0.68, -0.12]} rotation={[0.25, 0, 0] as unknown as THREE.Euler}>
				<coneGeometry args={[0.1, 0.32, 6]} />
				<meshStandardMaterial color={cfg.earColor} roughness={0.85} />
			</mesh>
		);
	}
	if (cfg.earType === "tuft") {
		// Owl ear tufts
		return (
			<>
				<mesh position={[-0.22, 0.62, 0]} rotation={[0, 0, -0.22] as unknown as THREE.Euler}>
					<coneGeometry args={[0.06, 0.22, 6]} />
					<meshStandardMaterial color={cfg.earColor} roughness={0.9} />
				</mesh>
				<mesh position={[0.22, 0.62, 0]} rotation={[0, 0, 0.22] as unknown as THREE.Euler}>
					<coneGeometry args={[0.06, 0.22, 6]} />
					<meshStandardMaterial color={cfg.earColor} roughness={0.9} />
				</mesh>
			</>
		);
	}
	return null;
}

// ── 3-D chibi mascot mesh ────────────────────────────────────────────────────
function ChibiMascot({ mascotId, mood, speakingLevel }: { mascotId: string; mood: MascotMood; speakingLevel: number }) {
	const group = useRef<THREE.Group>(null);
	const leftEye = useRef<THREE.Mesh>(null);
	const rightEye = useRef<THREE.Mesh>(null);
	const t = useRef(0);
	const cfg: MascotConfig = MASCOT_CONFIGS[mascotId] ?? (MASCOT_CONFIGS["panda"] as MascotConfig);

	useFrame((_, dt) => {
		t.current += dt;
		if (!group.current) return;

		// Idle float
		group.current.position.y = Math.sin(t.current * 1.3) * 0.07;

		if (mood === "happy") {
			group.current.rotation.z = Math.sin(t.current * 7) * 0.08;
			group.current.rotation.y = 0;
		} else if (mood === "thinking") {
			group.current.rotation.y = Math.sin(t.current * 1.2) * 0.18;
			group.current.rotation.z = 0;
		} else if (mood === "speaking") {
			group.current.scale.y = 1 + Math.sin(t.current * 9) * speakingLevel * 0.04;
			group.current.rotation.z = 0;
			group.current.rotation.y = 0;
		} else if (mood === "listening") {
			group.current.rotation.z = -0.06;
			group.current.rotation.y = 0;
		} else {
			group.current.rotation.z = 0;
			group.current.rotation.y = 0;
			group.current.scale.y = 1;
		}

		// Eye squeeze for mood
		const eyeScaleY = mood === "happy" ? 0.28 : mood === "thinking" ? 0.55 : 1.0;
		const eyeScaleX = mood === "happy" ? 1.5 : 1.0;
		if (leftEye.current) leftEye.current.scale.set(eyeScaleX, eyeScaleY, 1);
		if (rightEye.current) rightEye.current.scale.set(eyeScaleX, eyeScaleY, 1);
	});

	const cheekOpacity = mood === "happy" || mood === "speaking" ? 0.7 : 0.4;

	return (
		<group ref={group}>
			{/* Body */}
			<mesh position={[0, -0.40, 0]} scale={[1, 0.86, 0.88]}>
				<sphereGeometry args={[0.50, 20, 20]} />
				<meshStandardMaterial color={cfg.bodyColor} roughness={0.85} />
			</mesh>

			{/* Head */}
			<mesh position={[0, 0.24, 0]}>
				<sphereGeometry args={[0.44, 20, 20]} />
				<meshStandardMaterial color={cfg.headColor} roughness={0.85} />
			</mesh>

			{/* Ears */}
			<EarPair cfg={cfg} />

			{/* Panda eye patches */}
			{cfg.hasPatch && (
				<>
					<mesh position={[-0.17, 0.29, 0.33]}>
						<sphereGeometry args={[0.11, 12, 12]} />
						<meshStandardMaterial color={cfg.patchColor} roughness={0.9} />
					</mesh>
					<mesh position={[0.17, 0.29, 0.33]}>
						<sphereGeometry args={[0.11, 12, 12]} />
						<meshStandardMaterial color={cfg.patchColor} roughness={0.9} />
					</mesh>
				</>
			)}

			{/* Eyes */}
			<mesh ref={leftEye} position={[-0.16, 0.29, 0.39]}>
				<sphereGeometry args={[cfg.eyeSize, 12, 12]} />
				<meshStandardMaterial color="#1a1a1a" />
			</mesh>
			<mesh ref={rightEye} position={[0.16, 0.29, 0.39]}>
				<sphereGeometry args={[cfg.eyeSize, 12, 12]} />
				<meshStandardMaterial color="#1a1a1a" />
			</mesh>

			{/* Eye highlights */}
			<mesh position={[-0.14, 0.31, 0.446]}>
				<sphereGeometry args={[0.020, 6, 6]} />
				<meshStandardMaterial color="white" />
			</mesh>
			<mesh position={[0.18, 0.31, 0.446]}>
				<sphereGeometry args={[0.020, 6, 6]} />
				<meshStandardMaterial color="white" />
			</mesh>

			{/* Snout */}
			<mesh position={[0, 0.14, 0.38]} scale={[1.30, 0.90, 0.72]}>
				<sphereGeometry args={[0.15, 12, 12]} />
				<meshStandardMaterial color={cfg.snoutColor} roughness={0.9} />
			</mesh>

			{/* Beak (owl) */}
			{cfg.beakColor && (
				<mesh position={[0, 0.18, 0.455]} scale={[1, 0.7, 0.7]}>
					<coneGeometry args={[0.06, 0.14, 6]} />
					<meshStandardMaterial color={cfg.beakColor} roughness={0.8} />
				</mesh>
			)}

			{/* Nose */}
			{!cfg.beakColor && (
				<mesh position={[0, 0.20, 0.465]}>
					<sphereGeometry args={[0.038, 8, 8]} />
					<meshStandardMaterial color="#111" />
				</mesh>
			)}

			{/* Mouth dot */}
			{!cfg.beakColor && (
				<mesh position={[0, 0.10, 0.462]}>
					<sphereGeometry args={[0.032, 8, 8]} />
					<meshStandardMaterial color={mood === "happy" ? "#cc3355" : "#aa2244"} />
				</mesh>
			)}

			{/* Cheeks */}
			<mesh position={[-0.29, 0.18, 0.34]}>
				<sphereGeometry args={[0.072, 8, 8]} />
				<meshStandardMaterial color="#ff9bb0" transparent opacity={cheekOpacity} roughness={0.8} />
			</mesh>
			<mesh position={[0.29, 0.18, 0.34]}>
				<sphereGeometry args={[0.072, 8, 8]} />
				<meshStandardMaterial color="#ff9bb0" transparent opacity={cheekOpacity} roughness={0.8} />
			</mesh>
		</group>
	);
}

const ROOM_H = 276;

// ── Main component ───────────────────────────────────────────────────────────
export function MascotRoom({ mascot, mood, bounceAnim: _bounceAnim, speakingLevel = 0 }: Props) {
	const { width } = useWindowDimensions();
	const roomW = Math.min(width - 32, 620);

	const moodLabel = useMemo(() => {
		if (mood === "speaking") return "Hablando";
		if (mood === "listening") return "Escuchando";
		if (mood === "thinking") return "Pensando";
		if (mood === "happy") return "Feliz";
		return "En calma";
	}, [mood]);

	return (
		<View
			style={[
				styles.room,
				{ width: roomW, height: ROOM_H, backgroundColor: mascot.bg },
			]}
		>
			{/* 3-D Three.js mascot */}
			<Canvas
				style={{ width: "100%", height: "100%" } as object}
				camera={{ position: [0, 0.1, 2.8] as [number, number, number], fov: 38 }}
			>
				<color attach="background" args={[mascot.bg]} />
				<ambientLight intensity={0.75} />
				<directionalLight position={[3, 5, 3]} intensity={0.85} />
				<Suspense fallback={null}>
					<ChibiMascot
						mascotId={mascot.id}
						mood={mood}
						speakingLevel={speakingLevel}
					/>
				</Suspense>
			</Canvas>

			{/* Badge overlay */}
			<View style={styles.badge} pointerEvents="none">
				<Text style={styles.name}>{mascot.name}</Text>
				<Text style={styles.state}>{moodLabel}</Text>
			</View>

			{/* Mood particles */}
			{mood === "happy" && (
				<>
					<Text style={[styles.particle, { top: 18, left: "18%" }]}>✨</Text>
					<Text style={[styles.particle, { top: 34, right: "16%" }]}>⭐</Text>
					<Text style={[styles.particle, { top: 12, right: "28%" }]}>✨</Text>
				</>
			)}
			{mood === "thinking" && (
				<>
					<Text style={[styles.particle, { top: 22, right: "20%", fontSize: 13 }]}>💭</Text>
					<Text style={[styles.particle, { top: 44, right: "14%", fontSize: 9 }]}>•</Text>
					<Text style={[styles.particle, { top: 58, right: "12%", fontSize: 7 }]}>•</Text>
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
	badge: {
		position: "absolute",
		bottom: 10,
		alignSelf: "center",
		left: 0,
		right: 0,
		flexDirection: "row",
		justifyContent: "center",
		gap: 6,
		alignItems: "center",
	},
	name: {
		color: "#31435e",
		fontWeight: "800",
		fontSize: 13,
		backgroundColor: "rgba(255,255,255,0.82)",
		borderRadius: 999,
		paddingVertical: 3,
		paddingHorizontal: 10,
	},
	state: {
		color: "#5b6e8b",
		fontWeight: "600",
		fontSize: 12,
		backgroundColor: "rgba(255,255,255,0.72)",
		borderRadius: 999,
		paddingVertical: 3,
		paddingHorizontal: 8,
	},
	particle: {
		position: "absolute",
		fontSize: 14,
		color: "#ffb84d",
	},
});
