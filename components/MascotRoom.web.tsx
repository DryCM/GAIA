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

// ── Per-mascot visual configuration ─────────────────────────────────────────
type EarType = "round" | "pointed" | "long" | "fin" | "tuft";

type MascotCfg = {
bodyColor: string;
headColor: string;
bellyColor: string;
earColor: string;
innerEarColor: string | null;
earType: EarType;
snoutColor: string;
irisColor: string;
hasPatch: boolean;
patchColor: string;
beakColor: string | null;
};

const CONFIGS: Record<string, MascotCfg> = {
panda:   { bodyColor: "#f2f0ec", headColor: "#f2f0ec", bellyColor: "#ffffff", earColor: "#1c1c1c", innerEarColor: "#444",   earType: "round",   snoutColor: "#f9f7f4", irisColor: "#4488dd", hasPatch: true,  patchColor: "#1c1c1c", beakColor: null        },
fox:     { bodyColor: "#d96010", headColor: "#d96010", bellyColor: "#ffe4b8", earColor: "#c05000", innerEarColor: "#ffe8cc", earType: "pointed", snoutColor: "#eecf88", irisColor: "#cc5500", hasPatch: false, patchColor: "",        beakColor: null        },
bunny:   { bodyColor: "#ddd4ff", headColor: "#ddd4ff", bellyColor: "#f0eaff", earColor: "#ddd4ff", innerEarColor: "#ffa8cc", earType: "long",    snoutColor: "#ffeaf2", irisColor: "#8844cc", hasPatch: false, patchColor: "",        beakColor: null        },
otter:   { bodyColor: "#8c6030", headColor: "#9c7040", bellyColor: "#d4a870", earColor: "#7a5028", innerEarColor: "#cc9060", earType: "round",   snoutColor: "#ddaa68", irisColor: "#6a3800", hasPatch: false, patchColor: "",        beakColor: null        },
koala:   { bodyColor: "#8898a8", headColor: "#8898a8", bellyColor: "#b8ccd8", earColor: "#7888a0", innerEarColor: "#ccddee", earType: "round",   snoutColor: "#ccd6e0", irisColor: "#446688", hasPatch: false, patchColor: "",        beakColor: null        },
owl:     { bodyColor: "#7c6018", headColor: "#7c6018", bellyColor: "#c8a048", earColor: "#5c4010", innerEarColor: null,      earType: "tuft",    snoutColor: "#7c6018", irisColor: "#eeaa00", hasPatch: false, patchColor: "",        beakColor: "#ff9820"   },
cat:     { bodyColor: "#e0a820", headColor: "#e0a820", bellyColor: "#fff4cc", earColor: "#c89010", innerEarColor: "#ff9aaa", earType: "pointed", snoutColor: "#fff8ee", irisColor: "#228820", hasPatch: false, patchColor: "",        beakColor: null        },
dolphin: { bodyColor: "#4898d8", headColor: "#4898d8", bellyColor: "#b0e0f8", earColor: "#3880c0", innerEarColor: null,      earType: "fin",     snoutColor: "#90ccee", irisColor: "#115599", hasPatch: false, patchColor: "",        beakColor: null        },
};

const OUTLINE = "#1a1a1a";
const BSIDE   = THREE.BackSide;

// ── Ears ─────────────────────────────────────────────────────────────────────
function EarPair({ cfg }: { cfg: MascotCfg }) {
const c = cfg.earColor;
const ic = cfg.innerEarColor;

if (cfg.earType === "round") {
return (<>
<mesh position={[-0.365, 0.62, 0]} scale={1.10}><sphereGeometry args={[0.175, 16, 16]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
<mesh position={[0.365, 0.62, 0]}  scale={1.10}><sphereGeometry args={[0.175, 16, 16]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
<mesh position={[-0.365, 0.62, 0]}><sphereGeometry args={[0.175, 16, 16]} /><meshToonMaterial color={c} /></mesh>
<mesh position={[0.365, 0.62, 0]}><sphereGeometry args={[0.175, 16, 16]} /><meshToonMaterial color={c} /></mesh>
{ic && (<>
<mesh position={[-0.365, 0.62, 0.12]}><sphereGeometry args={[0.096, 12, 12]} /><meshToonMaterial color={ic} /></mesh>
<mesh position={[0.365, 0.62, 0.12]}><sphereGeometry args={[0.096, 12, 12]} /><meshToonMaterial color={ic} /></mesh>
</>)}
</>);
}
if (cfg.earType === "pointed") {
return (<>
<mesh position={[-0.35, 0.68, 0]} rotation={[0, 0, -0.30] as unknown as THREE.Euler} scale={1.12}><coneGeometry args={[0.14, 0.38, 10]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
<mesh position={[0.35, 0.68, 0]}  rotation={[0, 0,  0.30] as unknown as THREE.Euler} scale={1.12}><coneGeometry args={[0.14, 0.38, 10]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
<mesh position={[-0.35, 0.68, 0]} rotation={[0, 0, -0.30] as unknown as THREE.Euler}><coneGeometry args={[0.14, 0.38, 10]} /><meshToonMaterial color={c} /></mesh>
<mesh position={[0.35, 0.68, 0]}  rotation={[0, 0,  0.30] as unknown as THREE.Euler}><coneGeometry args={[0.14, 0.38, 10]} /><meshToonMaterial color={c} /></mesh>
{ic && (<>
<mesh position={[-0.35, 0.68, 0.08]} rotation={[0, 0, -0.30] as unknown as THREE.Euler}><coneGeometry args={[0.068, 0.22, 8]} /><meshToonMaterial color={ic} /></mesh>
<mesh position={[0.35, 0.68, 0.08]}  rotation={[0, 0,  0.30] as unknown as THREE.Euler}><coneGeometry args={[0.068, 0.22, 8]} /><meshToonMaterial color={ic} /></mesh>
</>)}
</>);
}
if (cfg.earType === "long") {
return (<>
<mesh position={[-0.24, 0.84, 0]} scale={1.10}><capsuleGeometry args={[0.096, 0.44, 6, 12]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
<mesh position={[0.24, 0.84, 0]}  scale={1.10}><capsuleGeometry args={[0.096, 0.44, 6, 12]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
<mesh position={[-0.24, 0.84, 0]}><capsuleGeometry args={[0.096, 0.44, 6, 12]} /><meshToonMaterial color={c} /></mesh>
<mesh position={[0.24, 0.84, 0]}><capsuleGeometry args={[0.096, 0.44, 6, 12]} /><meshToonMaterial color={c} /></mesh>
{ic && (<>
<mesh position={[-0.24, 0.84, 0.07]}><capsuleGeometry args={[0.048, 0.30, 4, 8]} /><meshToonMaterial color={ic} /></mesh>
<mesh position={[0.24, 0.84, 0.07]}><capsuleGeometry args={[0.048, 0.30, 4, 8]} /><meshToonMaterial color={ic} /></mesh>
</>)}
</>);
}
if (cfg.earType === "fin") {
return <mesh position={[0, 0.72, -0.14]} rotation={[0.22, 0, 0] as unknown as THREE.Euler}><coneGeometry args={[0.12, 0.36, 8]} /><meshToonMaterial color={c} /></mesh>;
}
if (cfg.earType === "tuft") {
return (<>
<mesh position={[-0.25, 0.68, 0]} rotation={[0, 0, -0.20] as unknown as THREE.Euler}><coneGeometry args={[0.08, 0.28, 7]} /><meshToonMaterial color={c} /></mesh>
<mesh position={[0.25, 0.68, 0]}  rotation={[0, 0,  0.20] as unknown as THREE.Euler}><coneGeometry args={[0.08, 0.28, 7]} /><meshToonMaterial color={c} /></mesh>
</>);
}
return null;
}

// ── Single anime eye (xSign: -1=left, +1=right) ───────────────────────────
function AnimeEye({
xSign, irisColor, meshRef,
}: {
xSign: number; irisColor: string; meshRef: React.RefObject<THREE.Group | null>;
}) {
const x = xSign * 0.19;
return (
<group ref={meshRef} position={[x, 0.36, 0]}>
<mesh position={[0, 0, 0.488]}><circleGeometry args={[0.096, 22]} /><meshBasicMaterial color="#ffffff" /></mesh>
<mesh position={[0, 0, 0.492]}><circleGeometry args={[0.072, 20]} /><meshBasicMaterial color={irisColor} /></mesh>
<mesh position={[0, 0, 0.496]}><circleGeometry args={[0.044, 18]} /><meshBasicMaterial color="#111111" /></mesh>
<mesh position={[-xSign * 0.020,  0.028, 0.499]}><circleGeometry args={[0.022, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
<mesh position={[ xSign * 0.024, -0.026, 0.499]}><circleGeometry args={[0.011,  8]} /><meshBasicMaterial color="#ffffff" /></mesh>
</group>
);
}

// ── Main chibi body ───────────────────────────────────────────────────────────
function ChibiMascot({ mascotId, mood, speakingLevel }: { mascotId: string; mood: MascotMood; speakingLevel: number }) {
const group    = useRef<THREE.Group>(null);
const leftEye  = useRef<THREE.Group>(null);
const rightEye = useRef<THREE.Group>(null);
const mouth    = useRef<THREE.Mesh>(null);
const t = useRef(0);
const cfg: MascotCfg = CONFIGS[mascotId] ?? (CONFIGS["panda"] as MascotCfg);

useFrame((_, dt) => {
t.current += dt;
const tk = t.current;
if (!group.current) return;

group.current.position.y = Math.sin(tk * 1.25) * 0.07;
group.current.scale.setScalar(1);

let ez = 0, ey = 0;
let sx = 1, sy = 1;

if (mood === "happy") {
ez = Math.sin(tk * 6.5) * 0.10;
sx = 1.20; sy = 0.28;
if (mouth.current) mouth.current.scale.set(1.4, 1.4, 1);
} else if (mood === "thinking") {
ey = Math.sin(tk * 1.1) * 0.18;
sx = 1.0; sy = 0.60;
if (mouth.current) mouth.current.scale.set(0.55, 0.55, 1);
} else if (mood === "speaking") {
const pulse = 1 + Math.sin(tk * 9) * speakingLevel * 0.03;
group.current.scale.setScalar(pulse);
sx = 1.0; sy = 1.05;
const mP = 0.9 + Math.abs(Math.sin(tk * 9)) * 0.5;
if (mouth.current) mouth.current.scale.set(1.1, mP, 1);
} else if (mood === "listening") {
ez = -0.07;
sx = 1.05; sy = 1.20;
if (mouth.current) mouth.current.scale.set(0.85, 0.85, 1);
} else {
ez = Math.sin(tk * 0.8) * 0.018;
if (mouth.current) mouth.current.scale.set(1, 1, 1);
}

group.current.rotation.z = ez;
group.current.rotation.y = ey;
if (leftEye.current)  leftEye.current.scale.set(sx, sy, 1);
if (rightEye.current) rightEye.current.scale.set(sx, sy, 1);
});

const isHappy = mood === "happy" || mood === "speaking";
const cheekOp = isHappy ? 0.80 : 0.32;
const bc = cfg.bodyColor;

return (
<group ref={group}>
{/* Body outline */}
<mesh position={[0, -0.38, 0]} scale={[1.07, 0.83, 0.90]}><sphereGeometry args={[0.42, 28, 28]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
{/* Body */}
<mesh position={[0, -0.38, 0]} scale={[1, 0.76, 0.84]}><sphereGeometry args={[0.42, 28, 28]} /><meshToonMaterial color={bc} /></mesh>
{/* Belly */}
<mesh position={[0, -0.35, 0.34]} scale={[0.68, 0.84, 1]}><sphereGeometry args={[0.26, 16, 16]} /><meshToonMaterial color={cfg.bellyColor} /></mesh>
{/* Head outline */}
<mesh position={[0, 0.30, 0]} scale={1.055}><sphereGeometry args={[0.52, 32, 32]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
{/* Head */}
<mesh position={[0, 0.30, 0]}><sphereGeometry args={[0.52, 32, 32]} /><meshToonMaterial color={cfg.headColor} /></mesh>
{/* Ears */}
<EarPair cfg={cfg} />
{/* Panda patches */}
{cfg.hasPatch && (<>
<mesh position={[-0.185, 0.36, 0.435]}><sphereGeometry args={[0.135, 16, 16]} /><meshToonMaterial color={cfg.patchColor} /></mesh>
<mesh position={[0.185, 0.36, 0.435]}><sphereGeometry args={[0.135, 16, 16]} /><meshToonMaterial color={cfg.patchColor} /></mesh>
</>)}
{/* Eyes */}
<AnimeEye xSign={-1} irisColor={cfg.irisColor} meshRef={leftEye} />
<AnimeEye xSign={ 1} irisColor={cfg.irisColor} meshRef={rightEye} />
{/* Snout */}
<mesh position={[0, 0.17, 0.475]} scale={[1.26, 0.84, 0.62]}><sphereGeometry args={[0.175, 18, 18]} /><meshToonMaterial color={cfg.snoutColor} /></mesh>
{/* Beak or Nose */}
{cfg.beakColor
? <mesh position={[0, 0.19, 0.503]} scale={[1, 0.68, 0.68]} rotation={[Math.PI * 0.9, 0, 0] as unknown as THREE.Euler}><coneGeometry args={[0.065, 0.15, 7]} /><meshBasicMaterial color={cfg.beakColor} /></mesh>
: <mesh position={[0, 0.225, 0.508]}><sphereGeometry args={[0.028, 12, 12]} /><meshBasicMaterial color="#111" /></mesh>
}
{/* Smile */}
{!cfg.beakColor && (
<mesh ref={mouth} position={[0, 0.11, 0.510]} rotation={[0, 0, Math.PI] as unknown as THREE.Euler}>
<torusGeometry args={[0.068, 0.014, 8, 28, Math.PI]} />
<meshBasicMaterial color={isHappy ? "#cc1144" : "#aa1133"} />
</mesh>
)}
{/* Cheeks */}
<mesh position={[-0.306, 0.22, 0.445]}><circleGeometry args={[0.082, 18]} /><meshBasicMaterial color="#ff88aa" transparent opacity={cheekOp} /></mesh>
<mesh position={[0.306, 0.22, 0.445]}><circleGeometry args={[0.082, 18]} /><meshBasicMaterial color="#ff88aa" transparent opacity={cheekOp} /></mesh>
{/* Arms */}
<mesh position={[-0.50, -0.24, 0.14]} rotation={[0.25, 0, 0.55] as unknown as THREE.Euler} scale={[1, 1.35, 1]}><sphereGeometry args={[0.145, 14, 14]} /><meshToonMaterial color={bc} /></mesh>
<mesh position={[0.50, -0.24, 0.14]}  rotation={[0.25, 0, -0.55] as unknown as THREE.Euler} scale={[1, 1.35, 1]}><sphereGeometry args={[0.145, 14, 14]} /><meshToonMaterial color={bc} /></mesh>
{/* Feet */}
<mesh position={[-0.22, -0.74, 0.20]} scale={[1.35, 0.62, 1.1]}><sphereGeometry args={[0.165, 14, 14]} /><meshToonMaterial color={bc} /></mesh>
<mesh position={[0.22, -0.74, 0.20]}  scale={[1.35, 0.62, 1.1]}><sphereGeometry args={[0.165, 14, 14]} /><meshToonMaterial color={bc} /></mesh>
{/* Tail */}
{(mascotId === "panda" || mascotId === "bunny") && (
<mesh position={[0, -0.45, -0.38]} scale={[1, 1, 0.75]}><sphereGeometry args={[0.15, 12, 12]} /><meshToonMaterial color={mascotId === "panda" ? "#f0f0f0" : "#e0d8ff"} /></mesh>
)}
{(mascotId === "fox" || mascotId === "cat") && (
<mesh position={[0.04, -0.54, -0.36]} rotation={[0.3, 0, 0.2] as unknown as THREE.Euler} scale={[0.55, 1.6, 0.55]}><sphereGeometry args={[0.145, 10, 10]} /><meshToonMaterial color={mascotId === "fox" ? "#e07020" : "#c89020"} /></mesh>
)}
</group>
);
}

const ROOM_H = 280;

export function MascotRoom({ mascot, mood, bounceAnim: _b, speakingLevel = 0 }: Props) {
const { width } = useWindowDimensions();
const roomW = Math.min(width - 32, 620);

const moodLabel = useMemo(() => {
if (mood === "speaking")  return "Hablando";
if (mood === "listening") return "Escuchando";
if (mood === "thinking")  return "Pensando";
if (mood === "happy")     return "Feliz";
return "En calma";
}, [mood]);

return (
<View style={[styles.room, { width: roomW, height: ROOM_H, backgroundColor: mascot.bg }]}>
<Canvas style={{ width: "100%", height: "100%" } as object} camera={{ position: [0, 0.12, 3.1] as [number, number, number], fov: 36 }}>
<color attach="background" args={[mascot.bg]} />
<directionalLight position={[2.5, 4, 3]} intensity={1.1} color="#fff8ee" />
<directionalLight position={[-3, 1, 2]} intensity={0.35} color="#d8eeff" />
<ambientLight intensity={0.55} />
<directionalLight position={[0, -2, -4]} intensity={0.20} color="#ffeedd" />
<Suspense fallback={null}>
<ChibiMascot mascotId={mascot.id} mood={mood} speakingLevel={speakingLevel} />
</Suspense>
</Canvas>

<View style={styles.badge} pointerEvents="none">
<Text style={styles.nameText}>{mascot.name}</Text>
<Text style={styles.stateText}>{moodLabel}</Text>
</View>

{mood === "happy" && (<>
<Text style={[styles.particle, { top: 16, left: "16%" }]}>✨</Text>
<Text style={[styles.particle, { top: 32, right: "14%", fontSize: 11 }]}>⭐</Text>
<Text style={[styles.particle, { top: 10, right: "26%", fontSize: 10 }]}>✨</Text>
</>)}
{mood === "thinking" && (<>
<Text style={[styles.particle, { top: 20, right: "18%", fontSize: 13 }]}>💭</Text>
<Text style={[styles.particle, { top: 40, right: "13%", fontSize: 8 }]}>•</Text>
<Text style={[styles.particle, { top: 52, right: "11%", fontSize: 6 }]}>•</Text>
</>)}
</View>
);
}

const styles = StyleSheet.create({
room: { borderRadius: 22, overflow: "hidden", position: "relative" },
badge: { position: "absolute", bottom: 9, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5, alignItems: "center" },
nameText: { color: "#1e2e44", fontWeight: "800", fontSize: 13, backgroundColor: "rgba(255,255,255,0.86)", borderRadius: 999, paddingVertical: 3, paddingHorizontal: 11, overflow: "hidden" },
stateText: { color: "#4a6080", fontWeight: "600", fontSize: 11, backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, overflow: "hidden" },
particle: { position: "absolute", fontSize: 13, color: "#ffcc44" },
});
