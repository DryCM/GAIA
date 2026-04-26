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

// ─────────────────────────────────────────────────────────────────────────────
// Visual config per mascot
// ─────────────────────────────────────────────────────────────────────────────
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
  pupilColor: string;
  hasPatch: boolean;
  patchColor: string;
  beakColor: string | null;
  tailType: "none" | "round" | "fluffy" | "long" | "fin";
  tailColor: string;
  accessory: "none" | "scarf" | "bow" | "glasses" | "hat";
  accessoryColor: string;
  blushColor: string;
  shadowColor: string;
};

const CONFIGS: Record<string, MascotCfg> = {
  panda: {
    bodyColor: "#f5f2ed", headColor: "#f5f2ed", bellyColor: "#ffffff",
    earColor: "#1c1c1c", innerEarColor: "#3a3a3a", earType: "round",
    snoutColor: "#faf8f5", irisColor: "#5599ee", pupilColor: "#111",
    hasPatch: true, patchColor: "#1c1c1c",
    beakColor: null,
    tailType: "round", tailColor: "#f0f0ec",
    accessory: "scarf", accessoryColor: "#ee4466",
    blushColor: "#ffaacc", shadowColor: "#d8d0c8",
  },
  fox: {
    bodyColor: "#d86010", headColor: "#d86010", bellyColor: "#ffe4b8",
    earColor: "#c05000", innerEarColor: "#ffe8cc", earType: "pointed",
    snoutColor: "#edd888", irisColor: "#cc5500", pupilColor: "#1a0800",
    hasPatch: false, patchColor: "",
    beakColor: null,
    tailType: "fluffy", tailColor: "#e07020",
    accessory: "none", accessoryColor: "",
    blushColor: "#ffaa66", shadowColor: "#b84800",
  },
  bunny: {
    bodyColor: "#ddd4ff", headColor: "#ddd4ff", bellyColor: "#f0eaff",
    earColor: "#cfc4f8", innerEarColor: "#ffaad0", earType: "long",
    snoutColor: "#ffeaf2", irisColor: "#9955dd", pupilColor: "#220044",
    hasPatch: false, patchColor: "",
    beakColor: null,
    tailType: "round", tailColor: "#ede8ff",
    accessory: "bow", accessoryColor: "#ff66aa",
    blushColor: "#ffaadd", shadowColor: "#b8a8ee",
  },
  otter: {
    bodyColor: "#8c6030", headColor: "#9c7040", bellyColor: "#d4a870",
    earColor: "#7a5028", innerEarColor: "#cc9060", earType: "round",
    snoutColor: "#ddaa68", irisColor: "#6a3800", pupilColor: "#1a0800",
    hasPatch: false, patchColor: "",
    beakColor: null,
    tailType: "long", tailColor: "#7a5028",
    accessory: "none", accessoryColor: "",
    blushColor: "#ee9955", shadowColor: "#6a4818",
  },
  koala: {
    bodyColor: "#8898a8", headColor: "#8898a8", bellyColor: "#b8ccd8",
    earColor: "#7888a0", innerEarColor: "#ccddee", earType: "round",
    snoutColor: "#ccd6e0", irisColor: "#446688", pupilColor: "#112233",
    hasPatch: false, patchColor: "",
    beakColor: null,
    tailType: "none", tailColor: "",
    accessory: "none", accessoryColor: "",
    blushColor: "#aabbcc", shadowColor: "#5a6878",
  },
  owl: {
    bodyColor: "#7c6018", headColor: "#7c6018", bellyColor: "#c8a048",
    earColor: "#5c4010", innerEarColor: null, earType: "tuft",
    snoutColor: "#7c6018", irisColor: "#eeaa00", pupilColor: "#220000",
    hasPatch: false, patchColor: "",
    beakColor: "#ff9820",
    tailType: "none", tailColor: "",
    accessory: "glasses", accessoryColor: "#331100",
    blushColor: "#cc8833", shadowColor: "#4a3800",
  },
  cat: {
    bodyColor: "#e0a820", headColor: "#e0a820", bellyColor: "#fff4cc",
    earColor: "#c89010", innerEarColor: "#ff9aaa", earType: "pointed",
    snoutColor: "#fff8ee", irisColor: "#228820", pupilColor: "#001100",
    hasPatch: false, patchColor: "",
    beakColor: null,
    tailType: "long", tailColor: "#c89010",
    accessory: "none", accessoryColor: "",
    blushColor: "#ffcc66", shadowColor: "#a87810",
  },
  dolphin: {
    bodyColor: "#4898d8", headColor: "#4898d8", bellyColor: "#b0e0f8",
    earColor: "#3880c0", innerEarColor: null, earType: "fin",
    snoutColor: "#90ccee", irisColor: "#115599", pupilColor: "#001133",
    hasPatch: false, patchColor: "",
    beakColor: null,
    tailType: "fin", tailColor: "#3880c0",
    accessory: "none", accessoryColor: "",
    blushColor: "#66bbee", shadowColor: "#2060a8",
  },
};

const OUTLINE = "#1a1a2a";
const BSIDE   = THREE.BackSide;

// ─────────────────────────────────────────────────────────────────────────────
// Ears
// ─────────────────────────────────────────────────────────────────────────────
function EarPair({ cfg }: { cfg: MascotCfg }) {
  const c  = cfg.earColor;
  const ic = cfg.innerEarColor;

  if (cfg.earType === "round") {
    return (
      <>
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * 0.38, 0.66, 0]}>
            <mesh scale={1.10}><sphereGeometry args={[0.18, 20, 20]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
            <mesh><sphereGeometry args={[0.18, 20, 20]} /><meshToonMaterial color={c} /></mesh>
            <mesh position={[0, -0.05, 0]} scale={[1, 0.4, 1]}><sphereGeometry args={[0.18, 16, 8]} /><meshToonMaterial color={cfg.shadowColor} /></mesh>
            {ic && <mesh position={[0, 0, 0.10]}><sphereGeometry args={[0.10, 14, 14]} /><meshToonMaterial color={ic} /></mesh>}
          </group>
        ))}
      </>
    );
  }
  if (cfg.earType === "pointed") {
    return (
      <>
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * 0.36, 0.72, 0]} rotation={[0, 0, s * -0.28] as unknown as THREE.Euler}>
            <mesh scale={1.12}><coneGeometry args={[0.15, 0.42, 12]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
            <mesh><coneGeometry args={[0.15, 0.42, 12]} /><meshToonMaterial color={c} /></mesh>
            {ic && <mesh position={[0, 0, 0.06]}><coneGeometry args={[0.075, 0.26, 10]} /><meshToonMaterial color={ic} /></mesh>}
          </group>
        ))}
      </>
    );
  }
  if (cfg.earType === "long") {
    return (
      <>
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * 0.22, 0.92, 0]}>
            <mesh scale={1.09}><capsuleGeometry args={[0.10, 0.52, 8, 14]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
            <mesh><capsuleGeometry args={[0.10, 0.52, 8, 14]} /><meshToonMaterial color={c} /></mesh>
            {ic && <mesh position={[0, 0, 0.06]}><capsuleGeometry args={[0.055, 0.36, 6, 10]} /><meshToonMaterial color={ic} /></mesh>}
          </group>
        ))}
      </>
    );
  }
  if (cfg.earType === "fin") {
    return (
      <mesh position={[0, 0.76, -0.10]} rotation={[0.18, 0, 0] as unknown as THREE.Euler}>
        <coneGeometry args={[0.14, 0.42, 10]} /><meshToonMaterial color={c} />
      </mesh>
    );
  }
  if (cfg.earType === "tuft") {
    return (
      <>
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * 0.26, 0.72, 0]} rotation={[0, 0, s * -0.22] as unknown as THREE.Euler}>
            <mesh><coneGeometry args={[0.09, 0.32, 8]} /><meshToonMaterial color={c} /></mesh>
            <mesh position={[s * 0.06, 0, 0]}><coneGeometry args={[0.06, 0.24, 7]} /><meshToonMaterial color={c} /></mesh>
          </group>
        ))}
      </>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eye — layered anime style
// ─────────────────────────────────────────────────────────────────────────────
function AnimeEye({ xSign, cfg, squishX, squishY, isHappy, isThinking }: {
  xSign: number; cfg: MascotCfg;
  squishX: number; squishY: number;
  isHappy: boolean; isThinking: boolean;
}) {
  const x = xSign * 0.195;
  return (
    <group position={[x, 0.365, 0]} scale={[squishX, squishY, 1]}>
      <mesh position={[0, 0, 0.492]}><circleGeometry args={[0.108, 24]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0, 0.494]}><circleGeometry args={[0.082, 22]} /><meshBasicMaterial color={cfg.irisColor} /></mesh>
      <mesh position={[0, 0.018, 0.496]}><circleGeometry args={[0.058, 18]} /><meshBasicMaterial color={cfg.irisColor} transparent opacity={0.55} /></mesh>
      <mesh position={[0, -0.008, 0.498]}><circleGeometry args={[0.050, 18]} /><meshBasicMaterial color={cfg.pupilColor} /></mesh>
      <mesh position={[-xSign * 0.022, 0.030, 0.500]}><circleGeometry args={[0.026, 12]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[ xSign * 0.028, -0.020, 0.500]}><circleGeometry args={[0.013, 9]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0.052, 0.499]} scale={[1, 0.30, 1]}><circleGeometry args={[0.108, 20]} /><meshBasicMaterial color="#1a1a2a" transparent opacity={0.22} /></mesh>
      {isHappy && (
        <mesh position={[0, 0.044, 0.501]} scale={[1.1, 0.28, 1]}>
          <circleGeometry args={[0.108, 20]} /><meshBasicMaterial color="#1a1a2a" transparent opacity={0.55} />
        </mesh>
      )}
      {isThinking && (
        <mesh position={[xSign * 0.012, 0.14, 0.501]} rotation={[0, 0, xSign * 0.30] as unknown as THREE.Euler}>
          <capsuleGeometry args={[0.012, 0.07, 4, 8]} /><meshBasicMaterial color="#1a1a2a" />
        </mesh>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Eyebrow
// ─────────────────────────────────────────────────────────────────────────────
function Eyebrow({ xSign, mood }: { xSign: number; mood: MascotMood }) {
  const rot = mood === "thinking" ? xSign * -0.45
            : mood === "happy"    ? xSign *  0.22
            : mood === "listening"? xSign *  0.10
            : 0;
  const y = mood === "thinking" ? 0.535 : 0.525;
  return (
    <mesh position={[xSign * 0.195, y, 0.490]} rotation={[0, 0, rot] as unknown as THREE.Euler}>
      <capsuleGeometry args={[0.012, 0.075, 4, 8]} />
      <meshBasicMaterial color="#1a1a2a" />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mouth
// ─────────────────────────────────────────────────────────────────────────────
function Mouth({ mood, meshRef, cfg }: {
  mood: MascotMood; meshRef: React.RefObject<THREE.Mesh | null>; cfg: MascotCfg;
}) {
  if (cfg.beakColor) {
    return (
      <mesh position={[0, 0.20, 0.508]} scale={[1, 0.72, 0.72]} rotation={[Math.PI * 0.9, 0, 0] as unknown as THREE.Euler}>
        <coneGeometry args={[0.070, 0.17, 8]} /><meshBasicMaterial color={cfg.beakColor} />
      </mesh>
    );
  }
  const isBig   = mood === "happy" || mood === "speaking";
  const isSmall = mood === "thinking";
  return (
    <group>
      <mesh ref={meshRef} position={[0, 0.118, 0.512]} rotation={[0, 0, Math.PI] as unknown as THREE.Euler}>
        <torusGeometry args={[0.072, 0.016, 10, 32, Math.PI]} />
        <meshBasicMaterial color={isBig ? "#cc1144" : isSmall ? "#994466" : "#aa1133"} />
      </mesh>
      {isBig && (
        <mesh position={[0, 0.100, 0.514]}>
          <boxGeometry args={[0.088, 0.028, 0.008]} /><meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {mood === "speaking" && (
        <mesh position={[0, 0.082, 0.514]} scale={[0.75, 0.55, 0.2]}>
          <sphereGeometry args={[0.040, 10, 8]} /><meshBasicMaterial color="#ff5577" />
        </mesh>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Accessory
// ─────────────────────────────────────────────────────────────────────────────
function Accessory({ cfg }: { cfg: MascotCfg }) {
  if (cfg.accessory === "scarf") {
    return (
      <group position={[0, -0.02, 0]}>
        <mesh><torusGeometry args={[0.42, 0.055, 10, 32]} /><meshToonMaterial color={cfg.accessoryColor} /></mesh>
        <mesh position={[0.08, -0.055, 0.36]} rotation={[0.4, 0, -0.2] as unknown as THREE.Euler} scale={[0.7, 1.3, 0.7]}>
          <sphereGeometry args={[0.075, 10, 10]} /><meshToonMaterial color={cfg.accessoryColor} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI * 0.5] as unknown as THREE.Euler}>
          <torusGeometry args={[0.42, 0.018, 8, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
        </mesh>
      </group>
    );
  }
  if (cfg.accessory === "bow") {
    return (
      <group position={[-0.34, 0.58, 0.18]} rotation={[0, -0.4, 0.3] as unknown as THREE.Euler}>
        <mesh scale={[1.4, 0.80, 0.40]}><sphereGeometry args={[0.085, 12, 12]} /><meshToonMaterial color={cfg.accessoryColor} /></mesh>
        <mesh scale={[-1.4, 0.80, 0.40]}><sphereGeometry args={[0.085, 12, 12]} /><meshToonMaterial color={cfg.accessoryColor} /></mesh>
        <mesh scale={[0.4, 0.4, 0.4]}><sphereGeometry args={[0.085, 10, 10]} /><meshToonMaterial color={cfg.accessoryColor} /></mesh>
      </group>
    );
  }
  if (cfg.accessory === "glasses") {
    return (
      <group position={[0, 0.34, 0.50]}>
        {([-1, 1] as const).map((s) => (
          <mesh key={s} position={[s * 0.195, 0, 0]}>
            <torusGeometry args={[0.095, 0.013, 8, 22]} /><meshBasicMaterial color={cfg.accessoryColor} />
          </mesh>
        ))}
        <mesh scale={[0.20, 0.013, 0.013]}><boxGeometry /><meshBasicMaterial color={cfg.accessoryColor} /></mesh>
      </group>
    );
  }
  if (cfg.accessory === "hat") {
    return (
      <group position={[0, 0.70, 0]}>
        <mesh scale={[1.1, 0.25, 1.1]}><sphereGeometry args={[0.55, 18, 10]} /><meshToonMaterial color={cfg.accessoryColor} /></mesh>
        <mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.26, 0.30, 0.38, 16]} /><meshToonMaterial color={cfg.accessoryColor} /></mesh>
      </group>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tail
// ─────────────────────────────────────────────────────────────────────────────
function Tail({ cfg }: { cfg: MascotCfg }) {
  if (cfg.tailType === "round") {
    return (
      <mesh position={[0, -0.48, -0.40]} scale={[1, 1, 0.75]}>
        <sphereGeometry args={[0.165, 14, 14]} /><meshToonMaterial color={cfg.tailColor} />
      </mesh>
    );
  }
  if (cfg.tailType === "fluffy") {
    return (
      <group position={[0.06, -0.50, -0.38]} rotation={[0.3, 0, 0.2] as unknown as THREE.Euler}>
        <mesh scale={[0.70, 1.8, 0.70]}><sphereGeometry args={[0.155, 12, 12]} /><meshToonMaterial color={cfg.tailColor} /></mesh>
        <mesh position={[0, 0.30, 0]} scale={[0.65, 0.65, 0.65]}><sphereGeometry args={[0.155, 10, 10]} /><meshToonMaterial color="#ffffff" /></mesh>
      </group>
    );
  }
  if (cfg.tailType === "long") {
    return (
      <group position={[0, -0.44, -0.38]} rotation={[0.4, 0, 0.15] as unknown as THREE.Euler}>
        <mesh scale={[0.40, 1.65, 0.40]}><sphereGeometry args={[0.155, 10, 12]} /><meshToonMaterial color={cfg.tailColor} /></mesh>
      </group>
    );
  }
  if (cfg.tailType === "fin") {
    return (
      <mesh position={[0, -0.68, -0.36]} rotation={[-0.3, 0, 0] as unknown as THREE.Euler} scale={[1.4, 0.60, 0.55]}>
        <sphereGeometry args={[0.22, 12, 10]} /><meshToonMaterial color={cfg.tailColor} />
      </mesh>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arm with paw detail
// ─────────────────────────────────────────────────────────────────────────────
function Arm({ xSign, cfg, mood }: { xSign: number; cfg: MascotCfg; mood: MascotMood }) {
  const isHappy    = mood === "happy";
  const isSpeaking = mood === "speaking";
  const rotZ = xSign * (isHappy ? -1.10 : isSpeaking ? -0.65 : 0.55);
  const rotX = isHappy ? -0.50 : 0.20;
  const posY = isHappy ? -0.15 : -0.26;
  const posX = xSign * (isHappy ? 0.44 : 0.52);
  return (
    <group position={[posX, posY, 0.12]} rotation={[rotX, 0, rotZ] as unknown as THREE.Euler}>
      <mesh scale={[0.90, 1.55, 0.90]}><sphereGeometry args={[0.145, 14, 14]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
      <mesh scale={[0.84, 1.45, 0.84]}><sphereGeometry args={[0.145, 14, 14]} /><meshToonMaterial color={cfg.bodyColor} /></mesh>
      <mesh position={[0, -0.22, 0.06]} scale={[1.1, 0.70, 1.0]}>
        <sphereGeometry args={[0.115, 12, 12]} /><meshToonMaterial color={cfg.snoutColor} />
      </mesh>
      {([[-0.04, 0.04], [0.04, 0.04], [0, -0.04]] as [number, number][]).map(([tx, ty], i) => (
        <mesh key={i} position={[tx, -0.25 + ty, 0.125]}>
          <sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color={OUTLINE} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Foot
// ─────────────────────────────────────────────────────────────────────────────
function Foot({ xSign, cfg }: { xSign: number; cfg: MascotCfg }) {
  return (
    <group position={[xSign * 0.225, -0.77, 0.18]}>
      <mesh scale={[1.38, 0.58, 1.15]}><sphereGeometry args={[0.172, 14, 14]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
      <mesh scale={[1.32, 0.52, 1.08]}><sphereGeometry args={[0.172, 14, 14]} /><meshToonMaterial color={cfg.bodyColor} /></mesh>
      <mesh position={[0, -0.06, 0.14]} scale={[0.88, 0.32, 0.76]}>
        <sphereGeometry args={[0.172, 12, 10]} /><meshToonMaterial color={cfg.bellyColor} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ground shadow blob
// ─────────────────────────────────────────────────────────────────────────────
function GroundShadow() {
  return (
    <mesh position={[0, -0.96, 0]} rotation={[-Math.PI / 2, 0, 0] as unknown as THREE.Euler} scale={[1, 0.33, 1]}>
      <circleGeometry args={[0.44, 28]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.13} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full chibi character
// ─────────────────────────────────────────────────────────────────────────────
function ChibiMascot({ mascotId, mood, speakingLevel }: {
  mascotId: string; mood: MascotMood; speakingLevel: number;
}) {
  const group     = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const mouth     = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const eyeSquishX = useRef(1);
  const eyeSquishY = useRef(1);
  const cfg: MascotCfg = CONFIGS[mascotId] ?? (CONFIGS["panda"] as MascotCfg);

  useFrame((_, dt) => {
    t.current += dt;
    const tk = t.current;
    if (!group.current || !headGroup.current) return;

    group.current.position.y = Math.sin(tk * 1.30) * 0.068;
    group.current.rotation.z = Math.sin(tk * 0.75) * 0.022;

    if (mood === "idle") {
      headGroup.current.rotation.y = Math.sin(tk * 0.55) * 0.12;
      headGroup.current.rotation.z = Math.sin(tk * 0.40) * 0.04;
      eyeSquishX.current = 1; eyeSquishY.current = 1;
    } else if (mood === "happy") {
      headGroup.current.rotation.z = Math.sin(tk * 7.0) * 0.14;
      headGroup.current.rotation.y = 0;
      group.current.position.y += Math.abs(Math.sin(tk * 5.5)) * 0.04;
      eyeSquishX.current = 1.18; eyeSquishY.current = 0.30;
    } else if (mood === "thinking") {
      headGroup.current.rotation.y = Math.sin(tk * 0.9) * 0.22;
      headGroup.current.rotation.z = 0.08;
      eyeSquishX.current = 1.0; eyeSquishY.current = 0.65;
    } else if (mood === "speaking") {
      const pulse = 1 + Math.sin(tk * 9.5) * speakingLevel * 0.025;
      group.current.scale.setScalar(pulse);
      headGroup.current.rotation.z = Math.sin(tk * 4.5) * 0.06;
      headGroup.current.rotation.y = Math.sin(tk * 2.8) * 0.08;
      eyeSquishX.current = 1.0; eyeSquishY.current = 0.95;
    } else if (mood === "listening") {
      headGroup.current.rotation.y = 0.18;
      headGroup.current.rotation.z = -0.05;
      eyeSquishX.current = 1.05; eyeSquishY.current = 1.22;
    } else {
      headGroup.current.rotation.y = 0;
      headGroup.current.rotation.z = 0;
      eyeSquishX.current = 1; eyeSquishY.current = 1;
    }

    if (mouth.current) {
      if (mood === "speaking") {
        const mv = 0.85 + Math.abs(Math.sin(tk * 9.5)) * 0.55;
        mouth.current.scale.set(1.1, mv, 1);
      } else if (mood === "happy") {
        mouth.current.scale.set(1.5, 1.4, 1);
      } else if (mood === "thinking") {
        mouth.current.scale.set(0.55, 0.55, 1);
      } else {
        mouth.current.scale.set(1, 1, 1);
      }
    }
  });

  const isHappy    = mood === "happy";
  const isThinking = mood === "thinking";
  const cheekOp    = (isHappy || mood === "speaking") ? 0.85 : 0.30;

  return (
    <group ref={group}>
      <GroundShadow />

      {/* ── BODY ── */}
      <group position={[0, -0.36, 0]}>
        <mesh scale={[1.065, 0.82, 0.88]}><sphereGeometry args={[0.44, 30, 30]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
        <mesh scale={[1.00, 0.76, 0.82]}><sphereGeometry args={[0.44, 30, 30]} /><meshToonMaterial color={cfg.bodyColor} /></mesh>
        <mesh position={[0, -0.16, 0]} scale={[0.96, 0.32, 0.78]}><sphereGeometry args={[0.44, 20, 12]} /><meshToonMaterial color={cfg.shadowColor} /></mesh>
        <mesh position={[0, 0.06, 0.36]} scale={[0.66, 0.88, 0.60]}><sphereGeometry args={[0.28, 18, 18]} /><meshToonMaterial color={cfg.bellyColor} /></mesh>
      </group>

      <Arm xSign={-1} cfg={cfg} mood={mood} />
      <Arm xSign={ 1} cfg={cfg} mood={mood} />
      <Foot xSign={-1} cfg={cfg} />
      <Foot xSign={ 1} cfg={cfg} />
      <Tail cfg={cfg} />

      {cfg.accessory === "scarf" && <Accessory cfg={cfg} />}

      {/* ── HEAD ── */}
      <group ref={headGroup} position={[0, 0.30, 0]}>
        <mesh scale={1.058}><sphereGeometry args={[0.54, 34, 34]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
        <mesh><sphereGeometry args={[0.54, 34, 34]} /><meshToonMaterial color={cfg.headColor} /></mesh>
        <mesh position={[0, 0.30, 0.30]} scale={[0.55, 0.35, 0.25]}><sphereGeometry args={[0.54, 16, 10]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.10} /></mesh>
        <mesh position={[0, -0.28, 0]} scale={[0.98, 0.28, 0.96]}><sphereGeometry args={[0.54, 20, 10]} /><meshToonMaterial color={cfg.shadowColor} /></mesh>

        <EarPair cfg={cfg} />

        {cfg.hasPatch && ([-1, 1] as const).map((s) => (
          <group key={s} position={[s * 0.188, 0.38, 0.452]}>
            <mesh scale={1.06}><sphereGeometry args={[0.138, 18, 18]} /><meshBasicMaterial color={OUTLINE} side={BSIDE} /></mesh>
            <mesh><sphereGeometry args={[0.138, 18, 18]} /><meshToonMaterial color={cfg.patchColor} /></mesh>
          </group>
        ))}

        <AnimeEye xSign={-1} cfg={cfg} squishX={eyeSquishX.current} squishY={eyeSquishY.current} isHappy={isHappy} isThinking={isThinking} />
        <AnimeEye xSign={ 1} cfg={cfg} squishX={eyeSquishX.current} squishY={eyeSquishY.current} isHappy={isHappy} isThinking={isThinking} />

        <Eyebrow xSign={-1} mood={mood} />
        <Eyebrow xSign={ 1} mood={mood} />

        <mesh position={[0, 0.16, 0.490]} scale={[1.28, 0.82, 0.60]}>
          <sphereGeometry args={[0.182, 20, 18]} /><meshToonMaterial color={cfg.snoutColor} />
        </mesh>

        {!cfg.beakColor && (
          <mesh position={[0, 0.228, 0.516]}>
            <sphereGeometry args={[0.030, 12, 12]} /><meshBasicMaterial color="#111" />
          </mesh>
        )}

        <Mouth mood={mood} meshRef={mouth} cfg={cfg} />

        {([-1, 1] as const).map((s) => (
          <mesh key={s} position={[s * 0.315, 0.215, 0.458]}>
            <circleGeometry args={[0.088, 20]} />
            <meshBasicMaterial color={cfg.blushColor} transparent opacity={cheekOp} />
          </mesh>
        ))}

        {(cfg.accessory === "bow" || cfg.accessory === "glasses" || cfg.accessory === "hat") && (
          <Accessory cfg={cfg} />
        )}
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mood particles overlay
// ─────────────────────────────────────────────────────────────────────────────
function MoodParticles({ mood }: { mood: MascotMood }) {
  if (mood === "happy") return (
    <>
      <Text style={[styles.particle, { top: 12, left: "14%", fontSize: 16 }]}>✨</Text>
      <Text style={[styles.particle, { top: 28, right: "12%", fontSize: 13 }]}>⭐</Text>
      <Text style={[styles.particle, { top: 8,  right: "24%", fontSize: 11 }]}>✨</Text>
      <Text style={[styles.particle, { top: 44, left: "22%",  fontSize: 10 }]}>💫</Text>
    </>
  );
  if (mood === "thinking") return (
    <>
      <Text style={[styles.particle, { top: 18, right: "16%", fontSize: 15 }]}>💭</Text>
      <Text style={[styles.particle, { top: 38, right: "11%", fontSize: 9  }]}>•</Text>
      <Text style={[styles.particle, { top: 52, right: "9%",  fontSize: 7  }]}>•</Text>
    </>
  );
  if (mood === "speaking") return (
    <>
      <Text style={[styles.particle, { top: 20, left: "12%", fontSize: 13 }]}>🎵</Text>
      <Text style={[styles.particle, { top: 36, left: "8%",  fontSize: 10 }]}>♪</Text>
    </>
  );
  if (mood === "listening") return (
    <Text style={[styles.particle, { top: 18, right: "14%", fontSize: 15 }]}>👂</Text>
  );
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MascotRoom — exported component
// ─────────────────────────────────────────────────────────────────────────────
const ROOM_H = 300;

export function MascotRoom({ mascot, mood, bounceAnim: _b, speakingLevel = 0 }: Props) {
  const { width } = useWindowDimensions();
  const roomW = Math.min(width - 32, 640);

  const moodLabel = useMemo(() => ({
    speaking: "Hablando", listening: "Escuchando",
    thinking: "Pensando", happy: "Feliz", idle: "En calma",
  }[mood]), [mood]);

  return (
    <View style={[styles.room, { width: roomW, height: ROOM_H, backgroundColor: mascot.bg }]}>
      <Canvas
        style={{ width: "100%", height: "100%" } as object}
        camera={{ position: [0, 0.08, 3.0] as [number, number, number], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[mascot.bg]} />
        <directionalLight position={[2.8, 5.0, 3.5]} intensity={1.25} color="#fff8ee" />
        <directionalLight position={[-3.5, 1.5, 2.0]} intensity={0.42} color="#c8e4ff" />
        <ambientLight intensity={0.58} />
        <directionalLight position={[0.5, -1.5, -4.5]} intensity={0.28} color="#ffd8cc" />
        <directionalLight position={[0, 6, 1]} intensity={0.18} color="#ffffff" />
        <Suspense fallback={null}>
          <ChibiMascot mascotId={mascot.id} mood={mood} speakingLevel={speakingLevel} />
        </Suspense>
      </Canvas>

      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.nameText}>{mascot.name}</Text>
        <Text style={styles.stateText}>{moodLabel}</Text>
      </View>

      <MoodParticles mood={mood} />
    </View>
  );
}

const styles = StyleSheet.create({
  room: { borderRadius: 24, overflow: "hidden", position: "relative" },
  badge: {
    position: "absolute", bottom: 10, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 6, alignItems: "center",
  },
  nameText: {
    color: "#1e2e44", fontWeight: "800", fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.90)", borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 12, overflow: "hidden",
  },
  stateText: {
    color: "#4a6080", fontWeight: "600", fontSize: 11,
    backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 9, overflow: "hidden",
  },
  particle: { position: "absolute", color: "#ffcc44" },
});
