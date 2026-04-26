import { StatusBar } from "expo-status-bar";
import { MascotRoom } from "./components/MascotRoom";
import { AdBanner } from "./components/AdBanner";
import { HangmanGame, MemoryGame } from "./components/Minigames";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  webSearchUsed?: boolean;
  isStreaming?: boolean;
};

type Achievement = {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  target: number;
  metric: string;
  unlocked: boolean;
};

type VocabWord = {
  id: string;
  word: string;
  definition: string;
  context: string;
  addedAt: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

type AccentColor = "blue" | "purple" | "green" | "orange";

const ACCENT_COLORS: Record<AccentColor, { primary: string; light: string }> = {
  blue:   { primary: "#3f78e0", light: "#dff6ff" },
  purple: { primary: "#7c3aed", light: "#efe8ff" },
  green:  { primary: "#059669", light: "#e2fff2" },
  orange: { primary: "#ea580c", light: "#fff3e0" },
};

type RecordingIntent = "chat" | "dictation";
type ChildMode = "teacher" | "friend";
type MascotMood = "idle" | "thinking" | "happy" | "listening" | "speaking";
type UserRole = "normal" | "admin";
type AppScreen = "login" | "register" | "app" | "onboarding";

// ES: Modos de habla disponibles
// EN: Available speech modes
const SPEECH_MODES: { id: ChildMode; label: string; emoji: string }[] = [
  { id: "teacher", label: "Profesor", emoji: "📚" },
  { id: "friend",  label: "Amigo",    emoji: "🎮" },
];

type AppLanguage = "es" | "en" | "fr" | "it";
const LANGUAGES: { id: AppLanguage; label: string; flag: string; speechCode: string }[] = [
  { id: "es", label: "Español",  flag: "🇪🇸", speechCode: "es-ES" },
  { id: "en", label: "English",  flag: "🇬🇧", speechCode: "en-US" },
  { id: "fr", label: "Français", flag: "🇫🇷", speechCode: "fr-FR" },
  { id: "it", label: "Italiano", flag: "🇮🇹", speechCode: "it-IT" },
];

type Mascot = {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  personality: string;
  reactions: Record<MascotMood, string>;
};

function isLoopbackApiUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url.trim());
}

function getDetectedWebApiBaseUrl(): string | null {
  if (Platform.OS !== "web" || typeof globalThis.location === "undefined") {
    return null;
  }

  const { hostname, protocol } = globalThis.location;
  if (!hostname) {
    return null;
  }

  const normalizedProtocol = protocol === "https:" ? "https:" : "http:";
  return `${normalizedProtocol}//${hostname}:4000`;
}

function getInitialApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  return getDetectedWebApiBaseUrl() || "http://localhost:4000";
}

const API_BASE_URL = getInitialApiBaseUrl();
const USER_ID_KEY = "gaia-user-id";
const API_BASE_URL_KEY = "gaia-api-base-url";
const MASCOT_KEY = "gaia-mascot-id";
const ADS_CONSENT_KEY = "gaia-ads-consent";
const CHILD_AGE_KEY = "gaia-child-age";
const LANGUAGE_KEY = "gaia-language";
const DEFAULT_CHILD_AGE = 9;
const AUTH_TOKEN_KEY = "gaia-auth-token";
const AUTH_USERID_KEY = "gaia-auth-userid";
const AUTH_USERNAME_KEY = "gaia-auth-username";
const AUTH_ROLE_KEY = "gaia-auth-role";
const ONBOARDING_KEY = "gaia-onboarded";
const OFFLINE_CACHE_KEY = "gaia-offline-cache";
const MAX_OFFLINE_ENTRIES = 50;
const FONT_SIZE_KEY = "gaia-font-size";
const TTS_KEY = "gaia-tts-enabled";
const ACCENT_KEY = "gaia-accent-color";
const DEFAULT_MASCOT: Mascot = {
  id: "panda",
  name: "Pandi",
  emoji: "🐼",
  bg: "#ffe8f1",
  personality: "Tierna y protectora",
  reactions: {
    idle: "Estoy contigo para aprender jugando.",
    listening: "Te escucho con mucha atencion.",
    thinking: "Estoy pensando una gran respuesta...",
    speaking: "Estoy contandotelo con energia.",
    happy: "Listo, te traje una idea brillante.",
  },
};
const MASCOTS: Mascot[] = [
  DEFAULT_MASCOT,
  {
    id: "fox",
    name: "Foxy",
    emoji: "🦊",
    bg: "#ffe9da",
    personality: "Curiosa y aventurera",
    reactions: {
      idle: "Tengo ideas nuevas para explorar contigo.",
      listening: "Estoy captando cada palabra.",
      thinking: "Estoy hilando pistas como detective.",
      speaking: "Te lo cuento con chispa y movimiento.",
      happy: "Aja, ya lo tengo. Vamos con todo.",
    },
  },
  {
    id: "bunny",
    name: "Nubi",
    emoji: "🐰",
    bg: "#f2eaff",
    personality: "Dulce y creativa",
    reactions: {
      idle: "Vamos a imaginar algo bonito.",
      listening: "Te escucho suavecito y con calma.",
      thinking: "Estoy armando una respuesta con magia.",
      speaking: "Te lo explico con dulzura y ritmo.",
      happy: "Terminado. Te va a encantar.",
    },
  },
  {
    id: "otter",
    name: "Otis",
    emoji: "🦦",
    bg: "#e3f6ff",
    personality: "Jugueton y optimista",
    reactions: {
      idle: "Hoy toca aprender y divertirnos.",
      listening: "Oidos listos. Te sigo.",
      thinking: "Estoy buceando por la mejor respuesta.",
      speaking: "Voy soltando ideas mientras juego contigo.",
      happy: "Listo, mision completada.",
    },
  },
  {
    id: "koala",
    name: "Koko",
    emoji: "🐨",
    bg: "#e9f4ff",
    personality: "Paciente y calmada",
    reactions: {
      idle: "Respiramos y avanzamos paso a paso.",
      listening: "Te escucho con calma total.",
      thinking: "Estoy ordenando todo despacito y bien.",
      speaking: "Te lo explico con calma y claridad.",
      happy: "Perfecto. Ya tengo una respuesta clara.",
    },
  },
  {
    id: "owl",
    name: "Lumi",
    emoji: "🦉",
    bg: "#efe9ff",
    personality: "Sabia y estratega",
    reactions: {
      idle: "Estoy lista para descubrir contigo.",
      listening: "Atenta y enfocada. Continua.",
      thinking: "Analizando todo con mirada de buho.",
      speaking: "Estoy compartiendo la respuesta con precision.",
      happy: "Respuesta afinada y lista para ti.",
    },
  },
  {
    id: "cat",
    name: "Mishi",
    emoji: "🐱",
    bg: "#fff1db",
    personality: "Picarona y agil",
    reactions: {
      idle: "Tengo energia para resolver retos.",
      listening: "Miau-listening activado.",
      thinking: "Estoy afinando una respuesta rapida.",
      speaking: "Voy soltando la respuesta con estilo.",
      happy: "Hecho. Te quedo genial.",
    },
  },
  {
    id: "dolphin",
    name: "Dori",
    emoji: "🐬",
    bg: "#ddf4ff",
    personality: "Inteligente y alegre",
    reactions: {
      idle: "Saltamos juntos a nuevas ideas.",
      listening: "Recibi tu mensaje con claridad.",
      thinking: "Nadando entre ideas para darte lo mejor.",
      speaking: "Te lo digo fluyendo, paso a paso.",
      happy: "Ya esta. Respuesta fresca y brillante.",
    },
  },
];

export default function App() {
  const isWeb = Platform.OS === "web";
  const { height } = useWindowDimensions();
  const isCompactLayout = height < 780;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const mascotBounceAnim = useRef(new Animated.Value(1)).current;
  const mascotHappyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechPulseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechPhaseRef = useRef(0);
  const webRecognitionRef = useRef<any>(null);
  const mascotMoodRef = useRef<MascotMood>("idle");
  const recordingIntentRef = useRef<RecordingIntent>("chat");
  const lastUserActivityRef = useRef<number>(Date.now());
  const spontaneousTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const isProcessingRef   = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; type: string; uri: string; fileObject?: File } | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingIntent, setRecordingIntent] = useState<RecordingIntent>("chat");
  const [userId, setUserId] = useState<string>("anon");
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(API_BASE_URL);
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState<string>(API_BASE_URL);
  const [isSavingApiUrl, setIsSavingApiUrl] = useState(false);
  const [adsConsent, setAdsConsent] = useState(false);
  const [isSyncingAdsConsent, setIsSyncingAdsConsent] = useState(false);
  const [childAge, setChildAge] = useState<number>(DEFAULT_CHILD_AGE);
  const [childMode, setChildMode] = useState<ChildMode>("teacher");
  const [conversationId, setConversationId] = useState<string>(
    () => `conv_${Date.now()}_${Math.floor(Math.random() * 100000)}`
  );
  const [appLanguage, setAppLanguage] = useState<AppLanguage>("es");
  const [appScreen, setAppScreen] = useState<AppScreen>("login");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUsername, setAuthUsername] = useState<string>("");
  const [userRole, setUserRole] = useState<UserRole>("normal");
  const [loginUsernameInput, setLoginUsernameInput] = useState<string>("");
  const [loginPasswordInput, setLoginPasswordInput] = useState<string>("");
  const [registerUsernameInput, setRegisterUsernameInput] = useState<string>("");
  const [registerPasswordInput, setRegisterPasswordInput] = useState<string>("");
  const [registerAdminCodeInput, setRegisterAdminCodeInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [selectedMascotId, setSelectedMascotId] = useState<string>(DEFAULT_MASCOT.id);
    const [mascotMood, setMascotMood] = useState<MascotMood>("idle");
  const [speechLevel, setSpeechLevel] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "¡Hola! Soy tu asistente de aprendizaje. ¿Qué quieres descubrir hoy?",
    },
  ]);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [conversationList, setConversationList] = useState<{ id: string; startedAt: string; mode: string; preview: string }[]>([]);

  // ── Gamificación / Gamification ───────────────────────────────────────────
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [newAchievementToast, setNewAchievementToast] = useState<Achievement | null>(null);

  // ── Vocabulario / Vocabulary ───────────────────────────────────────────────
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);
  const [showVocabPanel, setShowVocabPanel] = useState(false);

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const [showQuizPanel, setShowQuizPanel] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);

  // ── Dashboard parental / Parental dashboard ───────────────────────────────
  const [showParentalPanel, setShowParentalPanel] = useState(false);
  const [parentalStats, setParentalStats] = useState<{ totalMessages: number; streak: number; coins: number; vocabCount: number; achievementsUnlocked: number; totalAchievements: number; lastActive: string | null } | null>(null);

  // ── Preferencias UI / UI Preferences ─────────────────────────────────────
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [accentColor, setAccentColor] = useState<AccentColor>("blue");

  // ── Minijuegos / Minigames ─────────────────────────────────────────────────
  const [showHangman, setShowHangman] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  const accent = ACCENT_COLORS[accentColor];

  const canTalk = useMemo(() => Boolean(apiBaseUrl.trim()), [apiBaseUrl]);
  const selectedMascot = useMemo(
    () => MASCOTS.find((mascot) => mascot.id === selectedMascotId) || DEFAULT_MASCOT,
    [selectedMascotId]
  );
  const isLikelyLocalhost = useMemo(
    () => apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1"),
    [apiBaseUrl]
  );

    const mascotReaction = useMemo(
      () => selectedMascot.reactions[mascotMood],
      [mascotMood, selectedMascot]
    );

    const mascotMoodBadge = useMemo(() => {
      switch (mascotMood) {
        case "thinking": return "🤔";
        case "happy": return "🌟";
        case "listening": return "👂";
        case "speaking": return "🗣️";
        default: return null;
      }
    }, [mascotMood]);

    function setMood(mood: MascotMood) {
      mascotMoodRef.current = mood;
      setMascotMood(mood);
    }

    function setMoodHappy() {
      if (mascotHappyTimer.current) clearTimeout(mascotHappyTimer.current);
      setMood("happy");
      mascotHappyTimer.current = setTimeout(() => setMood("idle"), 3000);
    }

    function stopSpeechPulse() {
      if (speechPulseTimer.current) {
        clearInterval(speechPulseTimer.current);
        speechPulseTimer.current = null;
      }
      speechPhaseRef.current = 0;
      setSpeechLevel(0);
    }

    function startSpeechPulse(text: string) {
      stopSpeechPulse();

      const words = Math.max(text.trim().split(/\s+/).length, 1);
      const cadenceMs = Math.max(70, Math.min(140, 130 - Math.floor(words / 4)));
      setSpeechLevel(0.18);

      speechPulseTimer.current = setInterval(() => {
        speechPhaseRef.current += 0.36;
        const wave = (Math.sin(speechPhaseRef.current * 2.9) + 1) / 2;
        const jitter = Math.random() * 0.24;
        const next = Math.min(1, 0.2 + wave * 0.55 + jitter);
        setSpeechLevel(next);
      }, cadenceMs);
    }

    // Voz por mascota: masculina para Otis, femenina para el resto
    const MASCOT_VOICE: Record<string, { webName: string; pitch: number; rate: number }> = {
      panda:   { webName: "Microsoft Elvira Online (Natural) - Spanish (Spain)",   pitch: 1.0,  rate: 0.95 },
      fox:     { webName: "Microsoft Elvira Online (Natural) - Spanish (Spain)",   pitch: 1.1,  rate: 1.05 },
      bunny:   { webName: "Microsoft Elvira Online (Natural) - Spanish (Spain)",   pitch: 1.15, rate: 0.90 },
      otter:   { webName: "Microsoft Alvaro Online (Natural) - Spanish (Spain)",   pitch: 1.0,  rate: 1.05 },
      koala:   { webName: "Microsoft Elvira Online (Natural) - Spanish (Spain)",   pitch: 0.95, rate: 0.85 },
      owl:     { webName: "Microsoft Elvira Online (Natural) - Spanish (Spain)",   pitch: 0.92, rate: 0.90 },
      cat:     { webName: "Microsoft Elvira Online (Natural) - Spanish (Spain)",   pitch: 1.12, rate: 1.08 },
      dolphin: { webName: "Microsoft Elvira Online (Natural) - Spanish (Spain)",   pitch: 1.05, rate: 1.00 },
    };

    function speakWithMascot(text: string, doneMood: MascotMood = "idle") {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (mascotHappyTimer.current) clearTimeout(mascotHappyTimer.current);
      stopSpeechPulse();

      const voiceCfg = MASCOT_VOICE[selectedMascotId] ?? MASCOT_VOICE["panda"];
      const langCode = LANGUAGES.find((l) => l.id === appLanguage)?.speechCode ?? "es-ES";

      const onStartCb = () => { setMood("speaking"); startSpeechPulse(trimmed); };
      const onDoneCb  = () => {
        stopSpeechPulse();
        if (doneMood === "happy") { setMoodHappy(); return; }
        if (mascotMoodRef.current === "speaking") setMood(doneMood);
      };
      const onStopCb  = () => { stopSpeechPulse(); if (mascotMoodRef.current === "speaking") setMood("idle"); };

      // En web usamos speechSynthesis nativo para acceder a las voces Microsoft
      if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(trimmed);
        utter.lang = langCode;
        utter.rate = voiceCfg.rate;
        utter.pitch = voiceCfg.pitch;

        const setVoiceAndSpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          const match =
            voices.find((v) => v.name === voiceCfg.webName) ||
            voices.find((v) => v.name.includes("Elvira") && (voiceCfg.webName.includes("Elvira"))) ||
            voices.find((v) => v.name.includes("Alvaro") && (voiceCfg.webName.includes("Alvaro"))) ||
            voices.find((v) => v.lang === langCode && v.name.toLowerCase().includes("natural")) ||
            voices.find((v) => v.lang === langCode) ||
            null;
          if (match) utter.voice = match;
          utter.onstart   = onStartCb;
          utter.onend     = onDoneCb;
          utter.onpause   = onStopCb;
          utter.onerror   = onStopCb;
          window.speechSynthesis.speak(utter);
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoiceAndSpeak();
        } else {
          window.speechSynthesis.addEventListener("voiceschanged", setVoiceAndSpeak, { once: true });
        }
        return;
      }

      // Móvil: expo-speech con pitch/rate por mascota
      Speech.stop();
      Speech.speak(trimmed, {
        language: langCode,
        rate: voiceCfg.rate,
        pitch: voiceCfg.pitch,
        onStart: onStartCb,
        onDone: onDoneCb,
        onStopped: onStopCb,
        onError: () => {
          stopSpeechPulse();
          if (mascotMoodRef.current === "speaking") {
            setMood("idle");
          }
        },
      });
    }

    function triggerMascotBounce() {
      Animated.sequence([
        Animated.timing(mascotBounceAnim, { toValue: 1.25, duration: 110, useNativeDriver: true }),
        Animated.spring(mascotBounceAnim, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
      ]).start();
    }

  useEffect(() => {
    void initUser();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 4200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, pulseAnim]);

    useEffect(() => {
      return () => {
        if (mascotHappyTimer.current) clearTimeout(mascotHappyTimer.current);
        if (speechPulseTimer.current) clearInterval(speechPulseTimer.current);
        if (spontaneousTimer.current) clearInterval(spontaneousTimer.current);
      };
    }, []);

  // ES: Modo amigo — la IA manda un mensaje espontáneo si el usuario
  //     lleva más de 90 segundos sin escribir.
  // EN: Friend mode — the AI sends a spontaneous message if the user
  //     has been inactive for more than 90 seconds.
  useEffect(() => {
    if (spontaneousTimer.current) {
      clearInterval(spontaneousTimer.current);
      spontaneousTimer.current = null;
    }

    if (childMode !== "friend" || appScreen !== "app") return;

    spontaneousTimer.current = setInterval(async () => {
      const inactiveSec = (Date.now() - lastUserActivityRef.current) / 1000;
      if (inactiveSec < 90 || isThinking || isRecording) return;
      // Reset so it doesn't spam
      lastUserActivityRef.current = Date.now();
      try {
        const response = await apiFetch("/spontaneous");
        if (!response.ok) return;
        const data = await response.json() as { message?: string };
        if (data.message) {
          pushMessage("assistant", data.message);
          speakWithMascot(data.message, "happy");
        }
      } catch {
        // No interrumpir UX si falla
      }
    }, 30_000); // check every 30 s

    return () => {
      if (spontaneousTimer.current) clearInterval(spontaneousTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childMode, appScreen]);

  async function initUser() {
    try {
      const savedApiUrl = await AsyncStorage.getItem(API_BASE_URL_KEY);
      if (savedApiUrl?.trim()) {
        const nextApiUrl =
          isLoopbackApiUrl(savedApiUrl) && !isLoopbackApiUrl(API_BASE_URL)
            ? API_BASE_URL
            : savedApiUrl.trim();

        if (nextApiUrl !== savedApiUrl.trim()) {
          await AsyncStorage.setItem(API_BASE_URL_KEY, nextApiUrl);
        }

        setApiBaseUrl(nextApiUrl);
        setApiBaseUrlInput(nextApiUrl);
      }

      const savedMascotId = await AsyncStorage.getItem(MASCOT_KEY);
      if (savedMascotId && MASCOTS.some((mascot) => mascot.id === savedMascotId)) {
        setSelectedMascotId(savedMascotId);
      }

      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage && LANGUAGES.some((l) => l.id === savedLanguage)) {
        setAppLanguage(savedLanguage as AppLanguage);
      }

      const savedAgeRaw = await AsyncStorage.getItem(CHILD_AGE_KEY);
      const parsedAge = Number.parseInt(savedAgeRaw || "", 10);
      const safeAge = Number.isFinite(parsedAge) ? Math.min(14, Math.max(3, parsedAge)) : DEFAULT_CHILD_AGE;
      setChildAge(safeAge);

      const savedAdsConsent = await AsyncStorage.getItem(ADS_CONSENT_KEY);
      const consent = savedAdsConsent === "1";
      setAdsConsent(consent);

      // ES: Cargar preferencias de UI / EN: Load UI preferences
      const savedFontSize = await AsyncStorage.getItem(FONT_SIZE_KEY);
      if (savedFontSize) setFontSize(Number(savedFontSize) || 15);
      const savedTts = await AsyncStorage.getItem(TTS_KEY);
      if (savedTts === "1") setIsTtsEnabled(true);
      const savedAccent = await AsyncStorage.getItem(ACCENT_KEY);
      if (savedAccent && savedAccent in ACCENT_COLORS) setAccentColor(savedAccent as AccentColor);

      // ES: Verificar si hay una sesión de autenticación guardada
      // EN: Check for a saved authentication session
      const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const savedAuthUserId = await AsyncStorage.getItem(AUTH_USERID_KEY);
      const savedAuthUsername = await AsyncStorage.getItem(AUTH_USERNAME_KEY);
      const savedAuthRole = await AsyncStorage.getItem(AUTH_ROLE_KEY);

      if (savedToken && savedAuthUserId) {
        setAuthToken(savedToken);
        setUserId(savedAuthUserId);
        setAuthUsername(savedAuthUsername || "");
        setUserRole((savedAuthRole as UserRole) || "normal");
        setAppScreen("app");
        await refreshCredits(savedAuthUserId);
        await syncLearningSettings(savedAuthUserId, safeAge, consent);
        void loadGamification(savedAuthUserId);
        void loadVocab(savedAuthUserId);
        void scheduleDailyNotification();
        return;
      }

      // Sin sesión guardada → mostrar pantalla de login
      setAppScreen("login");
    } catch (error) {
      setAppScreen("login");
    }
  }

  async function syncLearningSettings(currentUserId: string, age: number, consentAds: boolean) {
    try {
      const payload = {
        userId: currentUserId,
        age,
        consent: {
          dataCollection: true,
          personalization: true,
          adsTargeting: consentAds,
          consentedBy: "parent",
        },
      };

      const createResponse = await apiFetch("/learning/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (createResponse.ok) return;

      await apiFetch("/learning/age", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, age }),
      });

      await apiFetch("/learning/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          consent: {
            adsTargeting: consentAds,
            consentedBy: "parent",
          },
        }),
      });
    } catch {
      // Si learning no esta disponible, no bloqueamos la app.
    }
  }

  async function onToggleAdsConsent(next: boolean) {
    setAdsConsent(next);
    try {
      setIsSyncingAdsConsent(true);
      await AsyncStorage.setItem(ADS_CONSENT_KEY, next ? "1" : "0");
      await syncLearningSettings(userId, childAge, next);
    } catch {
      Alert.alert("Consentimiento", "No se pudo guardar el consentimiento ahora mismo.");
    } finally {
      setIsSyncingAdsConsent(false);
    }
  }

  async function onSelectAge(nextAge: number) {
    if (nextAge === childAge) return;
    setChildAge(nextAge);
    try {
      await AsyncStorage.setItem(CHILD_AGE_KEY, String(nextAge));
      await syncLearningSettings(userId, nextAge, adsConsent);
    } catch {
      Alert.alert("Edad", "No se pudo guardar la edad en este momento.");
    }
  }

  async function refreshCredits(currentUserId: string) {
    try {
      const response = await apiFetch(
        `/credits?userId=${encodeURIComponent(currentUserId)}`,
        undefined
      );
      if (!response.ok) return;

      const data = (await response.json()) as { remaining: number };
      setRemainingCredits(data.remaining);
    } catch (error) {
      // Evita bloquear la experiencia si el backend no esta accesible.
    }
  }

  async function handleRecognizedText(userText: string, currentIntent: RecordingIntent) {
    if (currentIntent === "dictation") {
      setTextInput((prev) => {
        const prefix = prev.trim();
        return prefix ? `${prefix} ${userText}` : userText;
      });
      return;
    }

    setMood("thinking");
    const historySnapshot = messages;
    pushMessage("user", userText);
    const placeholderMsgId = pushStreamingPlaceholder();
    try {
      const { answer, webSearchUsed } = await askAssistantStream(userText, historySnapshot, placeholderMsgId);
      setMessages((prev) => prev.map((m) => m.id === placeholderMsgId ? { ...m, webSearchUsed } : m));
      speakWithMascot(answer, "happy");
    } catch (error) {
      setMessages((prev) => prev.map((m) => m.id === placeholderMsgId ? { ...m, text: toUserFriendlyError(error) } : m));
    } finally {
      setMessages((prev) => prev.map((m) => m.id === placeholderMsgId ? { ...m, isStreaming: false } : m));
    }
  }

  async function startRecording(intent: RecordingIntent = "chat") {
    if (!canTalk) {
      Alert.alert(
        "Falta URL del backend",
        "Configura la URL del backend en la cabecera para activar la asistente."
      );
      return;
    }

    try {
      recordingIntentRef.current = intent;
      setRecordingIntent(intent);

      if (isWeb) {
        const WebSpeech = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
        if (!WebSpeech) {
          Alert.alert("Micrófono no compatible", "Tu navegador no soporta reconocimiento de voz.");
          return;
        }

        const recognition = new WebSpeech();
        recognition.lang = "es-ES";
        recognition.continuous = false;
        recognition.interimResults = true;

        let transcript = "";

        recognition.onresult = (event: any) => {
          let next = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            next += event.results[i][0]?.transcript || "";
          }
          transcript = next.trim();
        };

        recognition.onerror = () => {
          setIsRecording(false);
          if (mascotMoodRef.current !== "happy") setMood("idle");
          Alert.alert("Error", "No pude escuchar el audio del navegador.");
        };

        recognition.onend = async () => {
          setIsRecording(false);
          recordingIntentRef.current = "chat";
          setRecordingIntent("chat");

          const finalText = transcript.trim();
          if (!finalText) {
            if (mascotMoodRef.current !== "happy") setMood("idle");
            return;
          }

          setIsThinking(true);
          try {
            await handleRecognizedText(finalText, intent);
          } catch (error) {
            const message = error instanceof Error ? error.message : "No pude procesar tu audio.";
            Alert.alert("Error", message);
          } finally {
            if (mascotMoodRef.current !== "happy") setMood("idle");
            setIsThinking(false);
          }
        };

        webRecognitionRef.current = recognition;
        setIsRecording(true);
        setMood("listening");
        recognition.start();
        return;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso denegado", "Necesito acceso al micrófono.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      setMood("listening");
    } catch (error) {
      Alert.alert("Error", "No pude iniciar la grabación.");
    }
  }

  async function stopRecording() {
    if (isWeb) {
      const webRecognition = webRecognitionRef.current;
      if (webRecognition) {
        try {
          webRecognition.stop();
        } catch {
          // Ignorar si ya se detuvo.
        }
      }
      return;
    }

    if (!recording) return;

    try {
      const currentIntent = recordingIntentRef.current;
      setIsRecording(false);
      setIsThinking(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) throw new Error("No se obtuvo el audio");

      const userText = await transcribeAudio(uri);
      await handleRecognizedText(userText, currentIntent);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pude procesar tu audio.";
      Alert.alert("Error", message);
    } finally {
      recordingIntentRef.current = "chat";
      setRecordingIntent("chat");
      if (mascotMoodRef.current !== "happy") setMood("idle");
      setIsThinking(false);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    }
  }

  function pushMessage(role: "user" | "assistant", text: string, webSearchUsed?: boolean) {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, webSearchUsed },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function pushStreamingPlaceholder(): string {
    const id = `stream-${Date.now()}-${Math.random()}`;
    setMessages((prev) => [...prev, { id, role: "assistant", text: "", isStreaming: true }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return id;
  }

  async function sendTextMessage() {
    const trimmed = textInput.trim();
    if (!trimmed && !pendingFile) return;
    if (isThinking || isRecording || isAnalyzingDoc || isProcessingRef.current) return;
    isProcessingRef.current = true;
    lastUserActivityRef.current = Date.now();
    setTextInput("");

    // ES: Si hay archivo adjunto, usar el endpoint de análisis de documentos
    // EN: If a file is attached, use the document analysis endpoint
    if (pendingFile) {
      const fileToAnalyze = pendingFile;
      setPendingFile(null);
      const userLabel = trimmed ? `📎 ${fileToAnalyze.name}: ${trimmed}` : `📎 ${fileToAnalyze.name}`;
      pushMessage("user", userLabel);
      setIsAnalyzingDoc(true);
      setIsThinking(true);
      setMood("thinking");
      try {
        const answer = await analyzeFile(fileToAnalyze, trimmed);
        pushMessage("assistant", answer);
        speakWithMascot(answer, "happy");
      } catch (error) {
        pushMessage("assistant", toUserFriendlyError(error));
      } finally {
        if (mascotMoodRef.current !== "happy") setMood("idle");
        setIsThinking(false);
        setIsAnalyzingDoc(false);
        isProcessingRef.current = false;
      }
      return;
    }

    const historySnapshot = messages;
    pushMessage("user", trimmed);
    setIsThinking(true);
    setMood("thinking");
    const placeholderMsgId = pushStreamingPlaceholder();
    streamingMsgIdRef.current = placeholderMsgId;
    try {
      const { answer, webSearchUsed } = await askAssistantStream(trimmed, historySnapshot, placeholderMsgId);
      setMessages((prev) => prev.map((m) => m.id === placeholderMsgId ? { ...m, webSearchUsed } : m));
      speakWithMascot(answer, "happy");
      void trackMessage(userId);
      if (isTtsEnabled) speakWithMascot(answer, "speaking");
    } catch (error) {
      setMessages((prev) => prev.map((m) => m.id === placeholderMsgId ? { ...m, text: toUserFriendlyError(error) } : m));
    } finally {
      streamingMsgIdRef.current = null;
      isProcessingRef.current = false;
      if (mascotMoodRef.current !== "happy") setMood("idle");
      setIsThinking(false);
      setMessages((prev) => prev.map((m) => m.id === placeholderMsgId ? { ...m, isStreaming: false } : m));
    }
  }

  function speakTextAloud(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert("Texto vacio", "Escribe un texto para leerlo en voz alta.");
      return;
    }

    speakWithMascot(trimmed, "idle");
  }

  // ES: Abre el selector de archivos. En web usa <input type="file">,
  //     en nativo usa expo-document-picker.
  // EN: Opens the file picker. On web uses <input type="file">,
  //     on native uses expo-document-picker.
  function openFilePicker() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,image/*";
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        setPendingFile({
          name: file.name,
          type: file.type,
          uri: URL.createObjectURL(file),
          fileObject: file,
        });
      };
      input.click();
      return;
    }
    // Nativo
    void (async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ["application/pdf", "image/*"],
          copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        setPendingFile({
          name: asset.name,
          type: asset.mimeType ?? "application/octet-stream",
          uri:  asset.uri,
        });
      } catch {
        Alert.alert("Error", "No se pudo abrir el selector de archivos.");
      }
    })();
  }

  // ES: Envía el archivo al endpoint /analyze-document con la pregunta opcional.
  // EN: Sends the file to the /analyze-document endpoint with the optional question.
  async function analyzeFile(
    file: { name: string; type: string; uri: string; fileObject?: File },
    question: string
  ): Promise<string> {
    const form = new FormData();
    form.append("userId", userId);
    form.append("mode",   childMode);
    if (question) form.append("question", question);

    if (Platform.OS === "web" && file.fileObject) {
      form.append("file", file.fileObject, file.name);
    } else {
      form.append("file", {
        uri:  file.uri,
        name: file.name,
        type: file.type,
      } as unknown as Blob);
    }

    const response = await apiFetch("/analyze-document", { method: "POST", body: form }, 90000);

    if (!response.ok) {
      const details = await readApiError(response, "No se pudo analizar el documento.");
      throw new Error(details);
    }

    const data = await response.json() as { answer?: string; remainingCredits?: number };
    if (typeof data.remainingCredits === "number") setRemainingCredits(data.remainingCredits);
    return data.answer?.trim() || "No pude analizar el documento.";
  }

  function speakCurrentText() {
    if (textInput.trim()) {
      speakTextAloud(textInput);
      return;
    }

    const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
    if (lastAssistantMessage) {
      speakTextAloud(lastAssistantMessage.text);
      return;
    }

    Alert.alert("Sin texto", "Escribe algo o genera una respuesta para poder leerla.");
  }

  function toUserFriendlyError(error: unknown): string {
    const raw = error instanceof Error ? error.message : "No pude procesar tu mensaje.";

    if (/timeout|tiempo de espera/i.test(raw)) {
      return "Estoy tardando demasiado en responder. Verifica que el backend este activo y vuelve a intentarlo.";
    }

    if (/Failed to fetch|NetworkError|network/i.test(raw)) {
      if (!isWeb && isLikelyLocalhost) {
        return "No puedo conectarme porque en movil 'localhost' no apunta a tu PC. Cambia la URL por la IP local (ejemplo: http://192.168.1.25:4000).";
      }
      return "No pude conectar con el backend. Revisa la URL y que el servidor este encendido.";
    }

    if (/Sin creditos diarios|Sin creditos/i.test(raw)) {
      return "Te has quedado sin creditos por hoy. Podemos seguir con respuestas cortas o volver manana.";
    }

    return `No pude responder ahora mismo: ${raw}`;
  }

  async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 15000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("timeout");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function apiFetch(path: string, options?: RequestInit, timeoutMs = 18000): Promise<Response> {
    const base = apiBaseUrl.trim();
    if (!base) {
      throw new Error("Configura la URL del backend.");
    }

    // ES: Inyectar token JWT en cada llamada si está disponible
    // EN: Inject JWT token into each call if available
    const authedOptions: RequestInit | undefined = authToken
      ? {
          ...options,
          headers: {
            ...(options?.headers as Record<string, string> | undefined),
            Authorization: `Bearer ${authToken}`,
          },
        }
      : options;

    // ES: Sin reintentos para SSE (cuerpo ya consumido) ni DELETE
    // EN: No retries for SSE (body already consumed) or DELETE
    const noRetry = path.includes("stream") || options?.method === "DELETE";
    const maxAttempts = noRetry ? 1 : 3;
    let lastError: Error = new Error("No se pudo conectar al servidor.");

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 600 * attempt));
      }
      try {
        const v1 = await fetchWithTimeout(`${base}/api/v1${path}`, authedOptions, timeoutMs);
        if (v1.status !== 404) return v1;
        return await fetchWithTimeout(`${base}/api${path}`, authedOptions, timeoutMs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isRetryable =
          lastError.message === "timeout" ||
          lastError.message.toLowerCase().includes("network") ||
          lastError.message.toLowerCase().includes("fetch") ||
          lastError.message.toLowerCase().includes("failed");
        if (!isRetryable) throw lastError;
      }
    }
    throw lastError;
  }

  async function saveApiBaseUrl() {
    const nextUrl = apiBaseUrlInput.trim();
    if (!nextUrl) {
      Alert.alert("URL invalida", "Introduce la URL base del backend.");
      return;
    }

    if (!/^https?:\/\//i.test(nextUrl)) {
      Alert.alert("URL invalida", "La URL debe empezar por http:// o https://");
      return;
    }

    try {
      setIsSavingApiUrl(true);
      await AsyncStorage.setItem(API_BASE_URL_KEY, nextUrl);
      setApiBaseUrl(nextUrl);
      await refreshCredits(userId);
      Alert.alert("Backend actualizado", "La app usara esta URL para las llamadas API.");
    } catch {
      Alert.alert("Error", "No pude guardar la URL del backend.");
    } finally {
      setIsSavingApiUrl(false);
    }
  }

  // ── Autenticación / Authentication ──────────────────────────────────────

  async function applyAuthSession(token: string, uid: string, uname: string, role: UserRole) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(AUTH_USERID_KEY, uid);
    await AsyncStorage.setItem(AUTH_USERNAME_KEY, uname);
    await AsyncStorage.setItem(AUTH_ROLE_KEY, role);
    setAuthToken(token);
    setUserId(uid);
    setAuthUsername(uname);
    setUserRole(role);
    // ES: Mostrar onboarding solo en el primer inicio de sesión
    // EN: Show onboarding only on the very first login
    const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
    setAppScreen(onboarded ? "app" : "onboarding");
    await refreshCredits(uid);
    await syncLearningSettings(uid, childAge, adsConsent);
    void loadGamification(uid);
    void loadVocab(uid);
    void scheduleDailyNotification();
  }

  async function doLogin() {
    const trimUser = loginUsernameInput.trim();
    if (!trimUser || !loginPasswordInput) {
      setAuthError("Rellena el nombre de usuario y la contraseña.");
      return;
    }
    setIsAuthLoading(true);
    setAuthError("");
    try {
      const base = (apiBaseUrl.trim() || API_BASE_URL).replace(/\/$/, "");
      const response = await fetchWithTimeout(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimUser, password: loginPasswordInput }),
      }, 12000);
      const data = await response.json() as { token?: string; userId?: string; username?: string; role?: string; error?: string };
      if (!response.ok) {
        setAuthError(data.error || "Error al iniciar sesión.");
        return;
      }
      await applyAuthSession(data.token!, data.userId!, data.username!, (data.role || "normal") as UserRole);
    } catch {
      setAuthError("No se pudo conectar. Comprueba la URL del backend.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function doRegister() {
    const trimUser = registerUsernameInput.trim();
    if (!trimUser || !registerPasswordInput) {
      setAuthError("Rellena el nombre de usuario y la contraseña.");
      return;
    }
    setIsAuthLoading(true);
    setAuthError("");
    try {
      const base = (apiBaseUrl.trim() || API_BASE_URL).replace(/\/$/, "");
      const response = await fetchWithTimeout(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimUser,
          password: registerPasswordInput,
          adminCode: registerAdminCodeInput.trim(),
        }),
      }, 12000);
      const data = await response.json() as { token?: string; userId?: string; username?: string; role?: string; error?: string };
      if (!response.ok) {
        setAuthError(data.error || "Error al crear la cuenta.");
        return;
      }
      await applyAuthSession(data.token!, data.userId!, data.username!, (data.role || "normal") as UserRole);
    } catch {
      setAuthError("No se pudo conectar. Comprueba la URL del backend.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function doLogout() {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USERID_KEY, AUTH_USERNAME_KEY, AUTH_ROLE_KEY]);
    setAuthToken(null);
    setUserId("anon");
    setAuthUsername("");
    setUserRole("normal");
    setMessages([{ id: "welcome", role: "assistant", text: "¡Hasta pronto! Vuelve cuando quieras." }]);
    setAppScreen("login");
  }

  async function selectMascot(mascotId: string) {
    setSelectedMascotId(mascotId);
      triggerMascotBounce();
    try {
      await AsyncStorage.setItem(MASCOT_KEY, mascotId);
    } catch {
      // No interrumpir UX si no se puede persistir la mascota.
    }
  }

  async function readApiError(response: Response, fallback: string): Promise<string> {
    try {
      const data = (await response.json()) as { error?: string; details?: string };
      return data.details || data.error || fallback;
    } catch {
      return fallback;
    }
  }

  async function transcribeAudio(audioUri: string): Promise<string> {
    const form = new FormData();
    form.append("userId", userId);
    form.append("file", {
      uri: audioUri,
      name: "speech.m4a",
      type: "audio/m4a",
    } as unknown as Blob);

    const response = await apiFetch("/transcribe", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const details = await readApiError(response, "No se pudo transcribir audio.");
      throw new Error(details);
    }

    const data = (await response.json()) as { text: string; remainingCredits?: number };
    if (typeof data.remainingCredits === "number") {
      setRemainingCredits(data.remainingCredits);
    }
    return data.text?.trim() || "No entendí claramente el audio.";
  }

  async function askAssistant(
    userText: string,
    history: ChatMessage[]
  ): Promise<{ answer: string; webSearchUsed: boolean }> {
    const response = await apiFetch(
      "/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          text: userText,
          mode: childMode,
          conversationId,
          history: history
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      },
      35000
    );

    if (!response.ok) {
      const details = await readApiError(response, "No se pudo generar respuesta.");
      throw new Error(details);
    }

    const data = (await response.json()) as {
      answer?: string;
      remainingCredits?: number;
      webSearchUsed?: boolean;
    };

    if (typeof data.remainingCredits === "number") {
      setRemainingCredits(data.remainingCredits);
    }

    return {
      answer: data.answer?.trim() || "No pude generar una respuesta en este momento.",
      webSearchUsed: Boolean(data.webSearchUsed),
    };
  }

  async function askAssistantStream(
    userText: string,
    history: ChatMessage[],
    placeholderMsgId: string
  ): Promise<{ answer: string; webSearchUsed: boolean }> {
    const response = await apiFetch(
      "/chat/stream",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          text: userText,
          mode: childMode,
          conversationId,
          history: history
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      },
      10000
    );

    if (!response.ok) {
      const details = await readApiError(response, "No se pudo generar respuesta.");
      throw new Error(details);
    }

    // ES: Fallback si el cuerpo de respuesta no es streameable (ej: native fetch)
    // EN: Fallback if the response body is not streamable (e.g. native fetch)
    if (!response.body) {
      const data = (await response.json()) as { answer?: string; remainingCredits?: number; webSearchUsed?: boolean };
      const answer = data.answer?.trim() || "No pude responder ahora mismo.";
      setMessages((prev) => prev.map((m) => m.id === placeholderMsgId ? { ...m, text: answer } : m));
      if (typeof data.remainingCredits === "number") setRemainingCredits(data.remainingCredits);
      return { answer, webSearchUsed: Boolean(data.webSearchUsed) };
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullAnswer = "";
    let webSearchUsed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith("data: ")) continue;
        let payload: { token?: string; done?: boolean; webSearchUsed?: boolean; remainingCredits?: number; error?: string };
        try { payload = JSON.parse(trimmedLine.slice(6)); } catch { continue; }
        if (payload.error) throw new Error(payload.error);
        if (payload.token) {
          const tok = payload.token;
          fullAnswer += tok;
          setMessages((prev) => prev.map((m) =>
            m.id === placeholderMsgId ? { ...m, text: m.text + tok } : m
          ));
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 20);
        }
        if (payload.done) {
          webSearchUsed = Boolean(payload.webSearchUsed);
          if (typeof payload.remainingCredits === "number") setRemainingCredits(payload.remainingCredits);
        }
      }
    }

    if (fullAnswer) void saveOfflineEntry(userText, fullAnswer);
    return { answer: fullAnswer || "No pude responder ahora mismo.", webSearchUsed };
  }

  // ── Caché offline / Offline cache ─────────────────────────────────────────
  // ES: Guarda respuestas en AsyncStorage para usarlas sin conexión.
  // EN: Saves responses in AsyncStorage for offline use.
  async function saveOfflineEntry(question: string, answer: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
      const cache: Record<string, string> = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      const key = question.trim().toLowerCase().slice(0, 100);
      cache[key] = answer;
      const trimmed = Object.fromEntries(Object.entries(cache).slice(-MAX_OFFLINE_ENTRIES));
      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(trimmed));
    } catch { /* best-effort */ }
  }

  async function getOfflineEntry(question: string): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw) as Record<string, string>;
      return cache[question.trim().toLowerCase().slice(0, 100)] ?? null;
    } catch { return null; }
  }

  // ── Regenerar respuesta / Regenerate response ──────────────────────────────
  async function regenerateMessage(assistantMsgId: string) {
    if (isThinking || isProcessingRef.current) return;
    const idx = messages.findIndex((m) => m.id === assistantMsgId);
    if (idx <= 0) return;
    const userMsg = [...messages].slice(0, idx).reverse().find((m) => m.role === "user");
    if (!userMsg) return;
    const historySnapshot = messages.slice(0, Math.max(0, idx - 1));
    isProcessingRef.current = true;
    setIsThinking(true);
    setMood("thinking");
    streamingMsgIdRef.current = assistantMsgId;
    setMessages((prev) =>
      prev.map((m) => m.id === assistantMsgId ? { ...m, text: "", isStreaming: true, webSearchUsed: false } : m)
    );
    try {
      const { answer, webSearchUsed } = await askAssistantStream(userMsg.text, historySnapshot, assistantMsgId);
      setMessages((prev) => prev.map((m) => m.id === assistantMsgId ? { ...m, webSearchUsed, isStreaming: false } : m));
      speakWithMascot(answer, "happy");
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsgId ? { ...m, text: toUserFriendlyError(error), isStreaming: false } : m)
      );
    } finally {
      streamingMsgIdRef.current = null;
      isProcessingRef.current = false;
      if (mascotMoodRef.current !== "happy") setMood("idle");
      setIsThinking(false);
    }
  }

  // ── Historial de conversaciones / Conversation history ────────────────────
  async function fetchConversationList() {
    try {
      const response = await apiFetch(`/history/${encodeURIComponent(userId)}`);
      if (!response.ok) return;
      const data = await response.json() as Array<{ id: string; startedAt: string; mode: string; messages?: Array<{ text: string }> }>;
      setConversationList(data.map((conv) => ({
        id: conv.id,
        startedAt: conv.startedAt,
        mode: conv.mode,
        preview: conv.messages?.[0]?.text?.slice(0, 60) ?? "(sin mensajes)",
      })));
    } catch { /* no interrumpir UX */ }
  }

  async function loadConversation(convId: string) {
    try {
      const response = await apiFetch(`/history/${encodeURIComponent(userId)}/${encodeURIComponent(convId)}`);
      if (!response.ok) return;
      const conv = await response.json() as { id: string; mode: string; messages: Array<{ role: "user" | "assistant"; text: string }> };
      const loaded: ChatMessage[] = conv.messages.map((m, i) => ({
        id: `loaded-${convId}-${i}`,
        role: m.role,
        text: m.text,
      }));
      setMessages(loaded.length > 0 ? loaded : [{ id: "welcome", role: "assistant", text: "Conversación vacía." }]);
      setConversationId(convId);
      setChildMode(conv.mode === "friend" ? "friend" : "teacher");
      setShowHistoryPanel(false);
    } catch {
      Alert.alert("Error", "No se pudo cargar la conversación.");
    }
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────
  async function finishOnboarding() {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "1");
      await syncLearningSettings(userId, childAge, adsConsent);
    } catch { /* no critical */ }
    setAppScreen("app");
  }

  // ── Gamificación / Gamification ───────────────────────────────────────────
  async function loadGamification(uid: string) {
    try {
      const res = await apiFetch(`/gamification/${uid}`);
      if (!res.ok) return;
      const data = await res.json() as { streak?: number; coins?: number; achievements?: Achievement[] };
      if (typeof data.streak === "number") setStreak(data.streak);
      if (typeof data.coins === "number") setCoins(data.coins);
      if (Array.isArray(data.achievements)) setAchievements(data.achievements);
    } catch { /* best-effort */ }
  }

  async function trackMessage(uid: string) {
    try {
      const res = await apiFetch(`/gamification/${uid}/message`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json() as { user?: { streak: number; coins: number }; newAchievements?: Achievement[] };
      if (data.user) {
        setStreak(data.user.streak);
        setCoins(data.user.coins);
      }
      if (data.newAchievements && data.newAchievements.length > 0) {
        setNewAchievementToast(data.newAchievements[0]);
        setTimeout(() => setNewAchievementToast(null), 4000);
      }
    } catch { /* best-effort */ }
  }

  // ── Vocabulario / Vocabulary ───────────────────────────────────────────────
  async function loadVocab(uid: string) {
    try {
      const res = await apiFetch(`/vocabulary/${uid}`);
      if (!res.ok) return;
      const words = await res.json() as VocabWord[];
      setVocabWords(Array.isArray(words) ? words : []);
    } catch { /* best-effort */ }
  }

  async function saveVocabWord(word: string, definition: string, context: string) {
    try {
      const res = await apiFetch(`/vocabulary/${userId}/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, definition, context }),
      });
      if (!res.ok) return;
      const data = await res.json() as { words?: VocabWord[] };
      if (data.words) setVocabWords(data.words);
      void loadGamification(userId);
    } catch { /* best-effort */ }
  }

  async function deleteVocabWord(wordId: string) {
    try {
      const res = await apiFetch(`/vocabulary/${userId}/words/${wordId}`, { method: "DELETE" });
      if (!res.ok) return;
      const data = await res.json() as { words?: VocabWord[] };
      if (data.words) setVocabWords(data.words);
    } catch { /* best-effort */ }
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  async function startQuiz() {
    setShowQuizPanel(true);
    setQuizQuestion(null);
    setQuizAnswer(null);
    setIsQuizLoading(true);
    try {
      const context = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => `${m.role === "user" ? "Niño" : "Asistente"}: ${m.text}`)
        .join("\n");
      const res = await apiFetch("/chat/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, language: appLanguage }),
      });
      if (!res.ok) throw new Error("No se pudo generar el quiz");
      const q = await res.json() as QuizQuestion;
      setQuizQuestion(q);
    } catch {
      setQuizQuestion({ question: "¿Cuántos continentes tiene la Tierra?", options: ["A) 5", "B) 6", "C) 7", "D) 8"], answer: "C) 7" });
    } finally {
      setIsQuizLoading(false);
    }
  }

  // ── Compartir / Share ─────────────────────────────────────────────────────
  async function shareConversation() {
    const text = messages
      .filter((m) => m.id !== "welcome")
      .slice(-8)
      .map((m) => `${m.role === "user" ? "Yo" : selectedMascot.name}: ${m.text}`)
      .join("\n\n");
    if (!text) { Alert.alert("Nada que compartir", "Empieza una conversación primero."); return; }
    try {
      if (Platform.OS === "web") {
        if (navigator.share) {
          await navigator.share({ title: `Aprendí con ${selectedMascot.name} en GaIA`, text });
        } else {
          await navigator.clipboard.writeText(text);
          Alert.alert("Copiado", "Conversación copiada al portapapeles.");
        }
      } else {
        await Share.share({ message: `Aprendí con ${selectedMascot.name} en GaIA:\n\n${text}`, title: "GaIA – Conversación" });
      }
    } catch { /* user cancelled or not supported */ }
  }

  // ── Notificación diaria / Daily notification ──────────────────────────────
  async function scheduleDailyNotification() {
    if (Platform.OS === "web") return;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${selectedMascot.emoji} ¡${selectedMascot.name} te espera!`,
          body: "¿Qué vas a descubrir hoy? Entra a GaIA y aprende algo nuevo.",
          sound: true,
        },
        trigger: { hour: 18, minute: 0, repeats: true } as Notifications.DailyTriggerInput,
      });
    } catch { /* notifications not available */ }
  }

  // ── Preferencias UI / UI Preferences ─────────────────────────────────────
  async function changeFontSize(size: number) {
    setFontSize(size);
    await AsyncStorage.setItem(FONT_SIZE_KEY, String(size));
  }

  async function toggleTts(val: boolean) {
    setIsTtsEnabled(val);
    await AsyncStorage.setItem(TTS_KEY, val ? "1" : "0");
  }

  async function changeAccent(color: AccentColor) {
    setAccentColor(color);
    await AsyncStorage.setItem(ACCENT_KEY, color);
  }

  // ES: Cuando un minijuego termina en victoria, sumamos monedas localmente
  // EN: When a minigame is won, add coins locally
  function handleMiniGameWin(bonusCoins: number) {
    setCoins((c) => c + bonusCoins);
    setNewAchievementToast({ id: "minigame_win", label: "¡Victoria!", emoji: "🏆", desc: `+${bonusCoins} monedas`, target: 0, metric: "", unlocked: true });
    setTimeout(() => setNewAchievementToast(null), 3000);
  }

  // ── Dashboard parental / Parental dashboard ───────────────────────────────
  async function openParentalDashboard() {
    try {
      const res = await apiFetch(`/gamification/${userId}/parental`);
      if (res.ok) {
        const stats = await res.json() as typeof parentalStats;
        setParentalStats(stats);
      }
    } catch { /* best-effort */ }
    setShowParentalPanel(true);
  }

  async function generateImage() {
    try {
      const prompt = textInput.trim();
      if (!prompt) {
        Alert.alert("Prompt vacio", "Escribe un texto para generar la imagen.");
        return;
      }

      setIsGeneratingImage(true);
      const response = await apiFetch("/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          prompt,
        }),
      });

      if (!response.ok) {
        const details = await readApiError(response, "No se pudo generar imagen.");
        throw new Error(details);
      }

      const data = (await response.json()) as {
        imageBase64?: string;
        remainingCredits?: number;
      };

      if (typeof data.remainingCredits === "number") {
        setRemainingCredits(data.remainingCredits);
      }

      if (data.imageBase64) {
        setImageUri(`data:image/png;base64,${data.imageBase64}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar imagen ahora mismo.";
      Alert.alert("Imagen", message);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function generateVideo() {
    try {
      const prompt = textInput.trim();
      if (!prompt) {
        Alert.alert("Prompt vacío", "Escribe un texto para generar el video.");
        return;
      }
      setIsGeneratingVideo(true);
      const response = await apiFetch("/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, prompt }),
      });
      if (!response.ok) {
        const details = await readApiError(response, "No se pudo generar el video.");
        throw new Error(details);
      }
      const data = (await response.json()) as {
        videoBase64?: string;
        mimeType?: string;
        remainingCredits?: number;
      };
      if (typeof data.remainingCredits === "number") {
        setRemainingCredits(data.remainingCredits);
      }
      if (data.videoBase64) {
        const mime = data.mimeType ?? "video/mp4";
        setVideoUri(`data:${mime};base64,${data.videoBase64}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el video ahora mismo.";
      Alert.alert("Video", message);
    } finally {
      setIsGeneratingVideo(false);
    }
  }

  // ── Pantalla de onboarding (primera vez) / First-launch onboarding screen ──
  if (appScreen === "onboarding") {
    const steps = [
      { emoji: "🌱", title: "¡Bienvenido a GaIA!", subtitle: "¿Cuántos años tienes? Eso ayuda a tu mascota a explicar las cosas mejor." },
      { emoji: "🐾", title: "¿Cuál es tu mascota favorita?", subtitle: "Ella será tu compañera de aprendizaje en cada conversación." },
      { emoji: "🌟", title: "¡Todo listo!", subtitle: `Hola, ${authUsername || "aventurero"}. Tu mascota ${MASCOTS.find((m) => m.id === selectedMascotId)?.name ?? "Pandi"} y tú aprenderéis juntos.` },
    ];
    const step = steps[onboardingStep - 1];
    return (
      <SafeAreaView style={styles.onboardingContainer}>
        <StatusBar style="dark" />
        <View style={styles.onboardingCard}>
          <View style={styles.onboardingStepDots}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={[styles.onboardingDot, onboardingStep === s && styles.onboardingDotActive]} />
            ))}
          </View>
          <Text style={styles.onboardingEmoji}>{step.emoji}</Text>
          <Text style={styles.onboardingTitle}>{step.title}</Text>
          <Text style={styles.onboardingSubtitle}>{step.subtitle}</Text>

          {onboardingStep === 1 && (
            <View style={styles.ageRow}>
              {[5, 6, 7, 8, 9, 10, 11, 12].map((age) => (
                <Pressable
                  key={age}
                  onPress={() => setChildAge(age)}
                  style={[styles.ageChip, childAge === age && styles.ageChipActive]}
                >
                  <Text style={[styles.ageChipText, childAge === age && styles.ageChipTextActive]}>{age}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {onboardingStep === 2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
              {MASCOTS.map((mascot) => (
                <Pressable
                  key={mascot.id}
                  onPress={() => setSelectedMascotId(mascot.id)}
                  style={[styles.mascotChip, selectedMascotId === mascot.id && styles.mascotChipActive]}
                >
                  <Text style={styles.mascotChipEmoji}>{mascot.emoji}</Text>
                  <Text style={[styles.mascotChipText, selectedMascotId === mascot.id && styles.mascotChipTextActive]}>{mascot.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable
            style={styles.onboardingNextBtn}
            onPress={() => {
              if (onboardingStep < 3) {
                setOnboardingStep((s) => (s + 1) as 1 | 2 | 3);
              } else {
                void finishOnboarding();
              }
            }}
          >
            <Text style={styles.onboardingNextBtnText}>
              {onboardingStep < 3 ? "Siguiente →" : "¡Empezar!"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pantalla de autenticación / Auth screen ──────────────────────────
  if (appScreen !== "app") {
    const isLogin = appScreen === "login";
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      >
        <SafeAreaView style={styles.authContainer}>
          <StatusBar style="dark" />
          <View style={styles.authCard}>
            <Text style={styles.authLogo}>🌿 GaIA</Text>
            <Text style={styles.authTitle}>{isLogin ? "Iniciar sesión" : "Crear cuenta"}</Text>

            <TextInput
              style={styles.authInput}
              placeholder="URL del backend (ej: http://192.168.1.25:4000)"
              placeholderTextColor="#888"
              value={apiBaseUrlInput}
              onChangeText={(t) => { setApiBaseUrlInput(t); setApiBaseUrl(t.trim()); }}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.authInput}
              placeholder="Nombre de usuario"
              placeholderTextColor="#888"
              value={isLogin ? loginUsernameInput : registerUsernameInput}
              onChangeText={isLogin ? setLoginUsernameInput : setRegisterUsernameInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.authInput}
              placeholder="Contraseña"
              placeholderTextColor="#888"
              value={isLogin ? loginPasswordInput : registerPasswordInput}
              onChangeText={isLogin ? setLoginPasswordInput : setRegisterPasswordInput}
              secureTextEntry
            />

            {!isLogin && (
              <TextInput
                style={styles.authInput}
                placeholder="Código de administrador (opcional)"
                placeholderTextColor="#888"
                value={registerAdminCodeInput}
                onChangeText={setRegisterAdminCodeInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}

            {authError ? <Text style={styles.authError}>{authError}</Text> : null}

            <Pressable
              style={[styles.authButton, isAuthLoading && styles.authButtonDisabled]}
              onPress={isLogin ? () => void doLogin() : () => void doRegister()}
              disabled={isAuthLoading}
            >
              <Text style={styles.authButtonText}>
                {isAuthLoading ? "Cargando..." : isLogin ? "Entrar" : "Crear cuenta"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.authLinkButton}
              onPress={() => { setAuthError(""); setAppScreen(isLogin ? "register" : "login"); }}
            >
              <Text style={styles.authLinkText}>
                {isLogin ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Iniciar sesión"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.animatedBg} pointerEvents="none">
        <Animated.View
          style={[
            styles.bgOrb,
            styles.bgOrbOne,
            {
              transform: [
                {
                  translateY: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -18],
                  }),
                },
              ],
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0.75],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bgOrb,
            styles.bgOrbTwo,
            {
              transform: [
                {
                  translateY: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 10],
                  }),
                },
              ],
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.45, 0.7],
              }),
            },
          ]}
        />
      </View>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>GaIA Voice</Text>
          <View style={styles.headerActions}>
            {userRole === "admin" && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>👑 LÍDER</Text>
              </View>
            )}
            {/* Streak + coins */}
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥{streak}</Text>
              </View>
            )}
            <Pressable onPress={() => setShowAchievements(true)} style={styles.coinBadge}>
              <Text style={styles.coinText}>🪙{coins}</Text>
            </Pressable>
            <Pressable
              onPress={() => { void fetchConversationList(); setShowHistoryPanel(true); }}
              style={styles.historyButton}
            >
              <Text style={styles.historyButtonText}>📚</Text>
            </Pressable>
            <Pressable onPress={() => void doLogout()} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Salir</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {authUsername ? `Hola, ${authUsername}` : "Asistente para aprender y jugar"}
        </Text>
        <Text style={styles.credits}>Creditos restantes: {remainingCredits ?? "..."}</Text>
        {/* Quick-action row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row", gap: 8, paddingVertical: 6 }}
        >
          <Pressable onPress={() => void startQuiz()} style={[styles.quickChip, { backgroundColor: accent.primary }]}>
            <Text style={styles.quickChipText}>🧩 Quiz</Text>
          </Pressable>
          <Pressable onPress={() => setShowVocabPanel(true)} style={[styles.quickChip, { backgroundColor: accent.primary }]}>
            <Text style={styles.quickChipText}>📖 Vocab</Text>
          </Pressable>
          <Pressable onPress={() => setShowHangman(true)} style={[styles.quickChip, { backgroundColor: accent.primary }]}>
            <Text style={styles.quickChipText}>🎯 Ahorcado</Text>
          </Pressable>
          <Pressable onPress={() => setShowMemory(true)} style={[styles.quickChip, { backgroundColor: accent.primary }]}>
            <Text style={styles.quickChipText}>🧠 Memoria</Text>
          </Pressable>
          <Pressable onPress={() => void shareConversation()} style={[styles.quickChip, { backgroundColor: accent.primary }]}>
            <Text style={styles.quickChipText}>🔗 Compartir</Text>
          </Pressable>
          <Pressable onPress={() => void openParentalDashboard()} style={[styles.quickChip, { backgroundColor: accent.primary }]}>
            <Text style={styles.quickChipText}>👨‍👩‍👧 Padres</Text>
          </Pressable>
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.modeRow}
          contentContainerStyle={styles.modeRowContent}
        >
          {SPEECH_MODES.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setChildMode(m.id)}
              style={[styles.modeChip, childMode === m.id && styles.modeChipActive]}
            >
              <Text style={styles.modeChipEmoji}>{m.emoji}</Text>
              <Text style={[styles.modeChipText, childMode === m.id && styles.modeChipTextActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.languageRow}
          contentContainerStyle={styles.modeRowContent}
        >
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.id}
              onPress={() => {
                setAppLanguage(lang.id);
                void AsyncStorage.setItem(LANGUAGE_KEY, lang.id);
              }}
              style={[styles.modeChip, appLanguage === lang.id && styles.modeChipActive]}
            >
              <Text style={styles.modeChipEmoji}>{lang.flag}</Text>
              <Text style={[styles.modeChipText, appLanguage === lang.id && styles.modeChipTextActive]}>
                {lang.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          style={styles.leaderCommandChip}
          onPress={() => {
            setTextInput("/lider");
          }}
        >
          <Text style={styles.leaderCommandChipText}>👑 /lider — Formación como líder</Text>
        </Pressable>
        <View style={styles.adsConsentRow}>
          <View style={styles.adsConsentTextBlock}>
            <Text style={styles.adsConsentTitle}>Publicidad personalizada</Text>
            <Text style={styles.adsConsentSubtitle}>
              Activa solo con consentimiento parental. Puedes desactivarla cuando quieras.
            </Text>
          </View>
          <Switch
            value={adsConsent}
            onValueChange={(next) => void onToggleAdsConsent(next)}
            disabled={isSyncingAdsConsent}
            trackColor={{ false: "#a6b5d8", true: "#4e9a5d" }}
            thumbColor={adsConsent ? "#f3fff4" : "#eef1fb"}
          />
        </View>
        {/* TTS toggle */}
        <View style={styles.adsConsentRow}>
          <View style={styles.adsConsentTextBlock}>
            <Text style={styles.adsConsentTitle}>🔊 Lectura en voz alta automática</Text>
            <Text style={styles.adsConsentSubtitle}>La mascota leerá cada respuesta en voz alta.</Text>
          </View>
          <Switch
            value={isTtsEnabled}
            onValueChange={(v) => void toggleTts(v)}
            trackColor={{ false: "#a6b5d8", true: accent.primary }}
            thumbColor={isTtsEnabled ? "#fff" : "#eef1fb"}
          />
        </View>
        {/* Font size */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>🔡 Tamaño de texto: {fontSize}px</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[13, 15, 17, 19].map((s) => (
              <Pressable key={s} onPress={() => void changeFontSize(s)} style={[styles.fontChip, fontSize === s && { backgroundColor: accent.primary }]}>
                <Text style={[styles.fontChipText, fontSize === s && { color: "white" }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {/* Accent color */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>🎨 Color de la app</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(Object.entries(ACCENT_COLORS) as [AccentColor, { primary: string }][]).map(([key, val]) => (
              <Pressable
                key={key}
                onPress={() => void changeAccent(key)}
                style={[styles.accentDot, { backgroundColor: val.primary }, accentColor === key && styles.accentDotActive]}
              />
            ))}
          </View>
        </View>
        <View style={styles.backendRow}>
          <TextInput
            style={styles.backendInput}
            placeholder="http://192.168.1.25:4000"
            placeholderTextColor="#888"
            value={apiBaseUrlInput}
            onChangeText={setApiBaseUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSavingApiUrl}
          />
          <Pressable
            onPress={saveApiBaseUrl}
            style={[styles.backendSaveButton, isSavingApiUrl && styles.backendSaveButtonDisabled]}
            disabled={isSavingApiUrl}
          >
            <Text style={styles.backendSaveButtonText}>{isSavingApiUrl ? "..." : "Guardar"}</Text>
          </Pressable>
        </View>
      </View>

      {!isCompactLayout && (
        <View style={styles.mascotCenterSection}>
          <MascotRoom
            mascot={selectedMascot}
            mood={mascotMood}
            bounceAnim={mascotBounceAnim}
            speakingLevel={speechLevel}
          />

          <View style={styles.mascotInfoBar}>
            <Text style={styles.mascotTitleLarge}>{selectedMascot.name}</Text>
            <Text style={styles.mascotPersonalityLarge}>{selectedMascot.personality}</Text>
            <Text style={styles.mascotSubtitleLarge}>{mascotReaction}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mascotSelector}
          >
            {MASCOTS.map((mascot) => (
              <Pressable
                key={mascot.id}
                onPress={() => selectMascot(mascot.id)}
                style={[
                  styles.mascotChip,
                  selectedMascotId === mascot.id && styles.mascotChipActive,
                ]}
              >
                <Text style={styles.mascotChipEmoji}>{mascot.emoji}</Text>
                <Text style={[styles.mascotChipText, selectedMascotId === mascot.id && styles.mascotChipTextActive]}>
                  {mascot.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {isCompactLayout && (
        <View style={styles.compactMascotBar}>
          <Text style={styles.compactMascotText}>{selectedMascot.emoji} {selectedMascot.name}: {mascotReaction}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.chatList}
        contentContainerStyle={styles.chat}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.role === "user" ? styles.userBubble : styles.assistantBubble,
              message.role === "user" ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            <Text style={styles.bubbleLabel}>
              {message.role === "user" ? "Tú" : message.webSearchUsed ? `${selectedMascot.name} 🌐` : selectedMascot.name}
            </Text>
            <Text style={[styles.bubbleText, { fontSize }]}>
              {message.text}{message.isStreaming ? "▋" : ""}
            </Text>
            {message.role === "assistant" && !message.isStreaming && message.id !== "welcome" && (
              <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                <Pressable
                  onPress={() => void regenerateMessage(message.id)}
                  style={styles.regenerateButton}
                  disabled={isThinking}
                >
                  <Text style={styles.regenerateButtonText}>🔄 Regenerar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const words = message.text.trim().split(/\s+/).slice(0, 3).join(" ");
                    void saveVocabWord(words, message.text.slice(0, 120), message.text.slice(0, 60));
                    Alert.alert("📖 Vocabulario", `"${words}" guardado en tu vocabulario.`);
                  }}
                  style={styles.vocabSaveButton}
                >
                  <Text style={styles.vocabSaveButtonText}>📖 Guardar</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={generateImage}
          style={[styles.imageButton, isGeneratingImage && styles.imageButtonActive]}
          disabled={isGeneratingImage || isThinking}
        >
          <Text style={styles.imageButtonText}>
            {isGeneratingImage ? "Generando imagen..." : "Texto a imagen"}
          </Text>
        </Pressable>

        <Pressable
          onPress={generateVideo}
          style={[styles.imageButton, styles.videoButton, isGeneratingVideo && styles.imageButtonActive]}
          disabled={isGeneratingVideo || isGeneratingImage || isThinking}
        >
          <Text style={styles.imageButtonText}>
            {isGeneratingVideo ? "Generando video..." : "Texto a video 🎬"}
          </Text>
        </Pressable>

        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}

        {videoUri && isWeb && React.createElement("video", {
          src: videoUri,
          controls: true,
          style: { width: "100%", maxHeight: 200, marginTop: 6, borderRadius: 10 },
        })}

        {pendingFile && (
          <View style={styles.attachedFileBadge}>
            <Text style={styles.attachedFileText} numberOfLines={1}>
              📎 {pendingFile.name}
            </Text>
            <Pressable onPress={() => setPendingFile(null)} style={styles.attachedFileClear}>
              <Text style={styles.attachedFileClearText}>✕</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.textRow}>
          <Pressable
            onPress={openFilePicker}
            style={styles.attachButton}
            disabled={isThinking || isAnalyzingDoc}
          >
            <Text style={styles.attachButtonText}>📎</Text>
          </Pressable>
          <TextInput
            style={styles.textInputField}
            placeholder="Escribe para chatear, leer o generar imagen..."
            placeholderTextColor="#999"
            value={textInput}
            onChangeText={(text) => {
              setTextInput(text);
              if (text.length > 0 && mascotMoodRef.current === "speaking") {
                if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                } else if (Platform.OS !== "web") {
                  Speech.stop();
                }
                stopSpeechPulse();
                setMood("idle");
              }
            }}
            onSubmitEditing={sendTextMessage}
            returnKeyType="send"
            editable={!isThinking && !isRecording}
            multiline={false}
          />
          <Pressable
            onPress={sendTextMessage}
            style={[styles.sendButton, ((!textInput.trim() && !pendingFile) || isThinking) && styles.sendButtonDisabled]}
            disabled={(!textInput.trim() && !pendingFile) || isThinking || isRecording || isAnalyzingDoc}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </Pressable>
          <Pressable
            onPress={speakCurrentText}
            style={[styles.utilityButton, isRecording && styles.utilityButtonDisabled]}
            disabled={isRecording}
          >
            <Text style={styles.utilityButtonText}>Leer</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={
            isWeb
              ? () =>
                  isRecording && recordingIntent === "chat"
                    ? void stopRecording()
                    : void startRecording("chat")
              : undefined
          }
          onPressIn={!isWeb ? () => startRecording("chat") : undefined}
          onPressOut={!isWeb ? stopRecording : undefined}
          style={[styles.button, isRecording && recordingIntent === "chat" && styles.buttonActive]}
          disabled={isThinking}
        >
          <Text style={styles.buttonText}>
            {isWeb
              ? isRecording && recordingIntent === "chat"
                ? "Detener escucha"
                : "Tocar para hablar"
              : isRecording && recordingIntent === "chat"
                ? "Escuchando..."
                : "Mantener para hablar"}
          </Text>
        </Pressable>

        <Pressable
          onPress={
            isWeb
              ? () =>
                  isRecording && recordingIntent === "dictation"
                    ? void stopRecording()
                    : void startRecording("dictation")
              : undefined
          }
          onPressIn={!isWeb ? () => startRecording("dictation") : undefined}
          onPressOut={!isWeb ? stopRecording : undefined}
          style={[
            styles.secondaryButton,
            isRecording && recordingIntent === "dictation" && styles.secondaryButtonActive,
          ]}
          disabled={isThinking}
        >
          <Text style={styles.secondaryButtonText}>
            {isWeb
              ? isRecording && recordingIntent === "dictation"
                ? "Detener dictado"
                : "Tocar para dictar"
              : isRecording && recordingIntent === "dictation"
                ? "Dictando..."
                : "Mantener para dictar texto"}
          </Text>
        </Pressable>

        {(isThinking || isAnalyzingDoc) && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>
              {isAnalyzingDoc ? "Analizando documento..." : "Pensando respuesta..."}
            </Text>
          </View>
        )}

        {!canTalk && (
          <Text style={styles.warning}>
            Configura una URL de backend valida para conectar la app.
          </Text>
        )}

        {isWeb && (
          <Text style={styles.warning}>
            En web, usa Chrome o Edge y permite acceso al microfono cuando lo pida el navegador.
          </Text>
        )}

        {isLikelyLocalhost && (
          <Text style={styles.warning}>
            En Android fisico, localhost no apunta a tu PC. Usa la IP local de tu equipo.
          </Text>
        )}

        <AdBanner enabled={adsConsent} />
      </View>

      {/* ES: Panel lateral de historial de conversaciones / EN: Conversation history side panel */}
      <Modal
        visible={showHistoryPanel}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHistoryPanel(false)}
      >
        <View style={styles.historyOverlay}>
          <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyCardTitle}>📚 Historial</Text>
              <Pressable onPress={() => setShowHistoryPanel(false)} style={styles.historyCloseBtn}>
                <Text style={styles.historyCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.historyNewBtn}
              onPress={() => {
                const newId = `conv_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
                setConversationId(newId);
                setMessages([{ id: "welcome", role: "assistant", text: "¡Hola de nuevo! ¿Qué quieres descubrir hoy?" }]);
                setShowHistoryPanel(false);
              }}
            >
              <Text style={styles.historyNewBtnText}>＋ Nueva conversación</Text>
            </Pressable>
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {conversationList.length === 0 ? (
                <Text style={styles.historyEmptyText}>No hay conversaciones guardadas aún.</Text>
              ) : (
                conversationList.map((conv) => (
                  <Pressable
                    key={conv.id}
                    style={styles.historyItem}
                    onPress={() => void loadConversation(conv.id)}
                  >
                    <Text style={styles.historyItemPreview} numberOfLines={2}>{conv.preview}</Text>
                    <Text style={styles.historyItemMeta}>
                      {conv.mode === "friend" ? "🎮 Amigo" : "📚 Profe"} · {new Date(conv.startedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Achievement toast ─────────────────────────────────────────── */}
      {newAchievementToast && (
        <View style={styles.achievementToast}>
          <Text style={styles.achievementToastEmoji}>{newAchievementToast.emoji}</Text>
          <View>
            <Text style={styles.achievementToastTitle}>{newAchievementToast.label}</Text>
            <Text style={styles.achievementToastDesc}>{newAchievementToast.desc}</Text>
          </View>
        </View>
      )}

      {/* ── Achievements Modal ────────────────────────────────────────── */}
      <Modal visible={showAchievements} animationType="slide" transparent onRequestClose={() => setShowAchievements(false)}>
        <View style={styles.historyOverlay}>
          <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyCardTitle}>🏆 Logros · {coins} 🪙 · 🔥{streak}</Text>
              <Pressable onPress={() => setShowAchievements(false)} style={styles.historyCloseBtn}>
                <Text style={styles.historyCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {achievements.length === 0 ? (
                <Text style={styles.historyEmptyText}>Completa conversaciones para desbloquear logros.</Text>
              ) : (
                achievements.map((ach) => (
                  <View key={ach.id} style={[styles.achItem, !ach.unlocked && { opacity: 0.4 }]}>
                    <Text style={styles.achEmoji}>{ach.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.achLabel}>{ach.label}</Text>
                      <Text style={styles.achDesc}>{ach.desc}</Text>
                    </View>
                    {ach.unlocked && <Text style={styles.achCheck}>✓</Text>}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Vocabulary Modal ──────────────────────────────────────────── */}
      <Modal visible={showVocabPanel} animationType="slide" transparent onRequestClose={() => setShowVocabPanel(false)}>
        <View style={styles.historyOverlay}>
          <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyCardTitle}>📖 Mi Vocabulario ({vocabWords.length})</Text>
              <Pressable onPress={() => setShowVocabPanel(false)} style={styles.historyCloseBtn}>
                <Text style={styles.historyCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {vocabWords.length === 0 ? (
                <Text style={styles.historyEmptyText}>Pulsa "📖 Guardar" en cualquier respuesta para guardar palabras aquí.</Text>
              ) : (
                vocabWords.map((w) => (
                  <View key={w.id} style={styles.vocabItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vocabWord}>{w.word}</Text>
                      {!!w.definition && <Text style={styles.vocabDef} numberOfLines={2}>{w.definition}</Text>}
                    </View>
                    <Pressable onPress={() => void deleteVocabWord(w.id)} style={styles.vocabDeleteBtn}>
                      <Text style={styles.vocabDeleteTxt}>✕</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Quiz Modal ────────────────────────────────────────────────── */}
      <Modal visible={showQuizPanel} animationType="slide" transparent onRequestClose={() => setShowQuizPanel(false)}>
        <View style={styles.historyOverlay}>
          <View style={[styles.historyCard, { paddingBottom: 40 }]}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyCardTitle}>🧩 Quiz rápido</Text>
              <Pressable onPress={() => setShowQuizPanel(false)} style={styles.historyCloseBtn}>
                <Text style={styles.historyCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            {isQuizLoading ? (
              <View style={{ alignItems: "center", padding: 24 }}>
                <ActivityIndicator size="large" color={accent.primary} />
                <Text style={{ marginTop: 12, color: "#4a5890" }}>Generando pregunta...</Text>
              </View>
            ) : quizQuestion ? (
              <>
                <Text style={styles.quizQuestion}>{quizQuestion.question}</Text>
                {quizQuestion.options.map((opt) => {
                  const isCorrect = opt === quizQuestion.answer;
                  const isSelected = quizAnswer === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => { if (!quizAnswer) setQuizAnswer(opt); }}
                      style={[
                        styles.quizOption,
                        quizAnswer && isCorrect && { backgroundColor: "#d1fae5", borderColor: "#10b981" },
                        quizAnswer && isSelected && !isCorrect && { backgroundColor: "#fee2e2", borderColor: "#ef4444" },
                      ]}
                    >
                      <Text style={styles.quizOptionText}>{opt}</Text>
                    </Pressable>
                  );
                })}
                {quizAnswer && (
                  <Text style={[styles.quizResult, { color: quizAnswer === quizQuestion.answer ? "#059669" : "#ef4444" }]}>
                    {quizAnswer === quizQuestion.answer ? "✅ ¡Correcto!" : `❌ Era: ${quizQuestion.answer}`}
                  </Text>
                )}
                <Pressable onPress={() => void startQuiz()} style={[styles.historyNewBtn, { backgroundColor: accent.primary, marginTop: 12 }]}>
                  <Text style={styles.historyNewBtnText}>Nueva pregunta</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── Parental Dashboard Modal ──────────────────────────────────── */}
      <Modal visible={showParentalPanel} animationType="slide" transparent onRequestClose={() => setShowParentalPanel(false)}>
        <View style={styles.historyOverlay}>
          <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyCardTitle}>👨‍👩‍👧 Panel de Padres</Text>
              <Pressable onPress={() => setShowParentalPanel(false)} style={styles.historyCloseBtn}>
                <Text style={styles.historyCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            {parentalStats ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.parentalGrid}>
                  <View style={styles.parentalCard}>
                    <Text style={styles.parentalCardEmoji}>💬</Text>
                    <Text style={styles.parentalCardValue}>{parentalStats.totalMessages}</Text>
                    <Text style={styles.parentalCardLabel}>Mensajes</Text>
                  </View>
                  <View style={styles.parentalCard}>
                    <Text style={styles.parentalCardEmoji}>🔥</Text>
                    <Text style={styles.parentalCardValue}>{parentalStats.streak}</Text>
                    <Text style={styles.parentalCardLabel}>Racha días</Text>
                  </View>
                  <View style={styles.parentalCard}>
                    <Text style={styles.parentalCardEmoji}>🪙</Text>
                    <Text style={styles.parentalCardValue}>{parentalStats.coins}</Text>
                    <Text style={styles.parentalCardLabel}>Monedas</Text>
                  </View>
                  <View style={styles.parentalCard}>
                    <Text style={styles.parentalCardEmoji}>📖</Text>
                    <Text style={styles.parentalCardValue}>{parentalStats.vocabCount}</Text>
                    <Text style={styles.parentalCardLabel}>Palabras</Text>
                  </View>
                  <View style={styles.parentalCard}>
                    <Text style={styles.parentalCardEmoji}>🏆</Text>
                    <Text style={styles.parentalCardValue}>{parentalStats.achievementsUnlocked}/{parentalStats.totalAchievements}</Text>
                    <Text style={styles.parentalCardLabel}>Logros</Text>
                  </View>
                  <View style={styles.parentalCard}>
                    <Text style={styles.parentalCardEmoji}>📅</Text>
                    <Text style={styles.parentalCardValue}>
                      {parentalStats.lastActive
                        ? new Date(parentalStats.lastActive).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                        : "—"}
                    </Text>
                    <Text style={styles.parentalCardLabel}>Último día</Text>
                  </View>
                </View>
                <Text style={styles.parentalNote}>
                  GaIA utiliza IA para adaptar las explicaciones a la edad y el nivel del niño. Las conversaciones son privadas y los datos se guardan localmente en tu servidor.
                </Text>
              </ScrollView>
            ) : (
              <ActivityIndicator size="large" color={accent.primary} style={{ marginTop: 24 }} />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Minigames ─────────────────────────────────────────────────── */}
      <HangmanGame
        visible={showHangman}
        onClose={() => setShowHangman(false)}
        vocabWords={vocabWords}
        onWin={handleMiniGameWin}
        accentPrimary={accent.primary}
      />
      <MemoryGame
        visible={showMemory}
        onClose={() => setShowMemory(false)}
        vocabWords={vocabWords}
        onWin={handleMiniGameWin}
        accentPrimary={accent.primary}
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dff6ff",
  },
  animatedBg: {
    ...StyleSheet.absoluteFillObject,
  },
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  bgOrbOne: {
    width: 260,
    height: 260,
    top: -30,
    left: -70,
    backgroundColor: "#8be1ff",
  },
  bgOrbTwo: {
    width: 300,
    height: 300,
    top: 110,
    right: -90,
    backgroundColor: "#a991ff",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1b2754",
  },
  subtitle: {
    marginTop: 4,
    color: "#33427a",
    fontSize: 14,
  },
  credits: {
    marginTop: 6,
    color: "#5f44c4",
    fontSize: 13,
    fontWeight: "700",
  },
  mascotCenterSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: "center",
  },
  mascotInfoBar: {
    marginTop: 10,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  mascotTitleLarge: {
    color: "#24376c",
    fontSize: 22,
    fontWeight: "900",
  },
  mascotPersonalityLarge: {
    marginTop: 2,
    color: "#2c4a88",
    fontSize: 13,
    fontWeight: "700",
  },
  mascotSubtitleLarge: {
    marginTop: 5,
    color: "#334b85",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  mascotSelector: {
    marginTop: 12,
    gap: 8,
    paddingRight: 6,
  },
  mascotChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(98, 108, 190, 0.35)",
    backgroundColor: "rgba(255,255,255,0.76)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mascotChipActive: {
    backgroundColor: "#37a5f1",
    borderColor: "#37a5f1",
  },
  mascotChipEmoji: {
    fontSize: 17,
  },
  mascotChipText: {
    color: "#2f3f76",
    fontSize: 12,
    fontWeight: "700",
  },
  mascotChipTextActive: {
    color: "white",
  },
  modeRow: {
    marginTop: 10,
  },
  modeRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingRight: 8,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(88, 98, 180, 0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  modeChipActive: {
    backgroundColor: "#2f82e8",
    borderColor: "#2f82e8",
  },
  modeChipEmoji: {
    fontSize: 13,
  },
  modeChipText: {
    color: "#304074",
    fontSize: 11,
    fontWeight: "700",
  },
  modeChipTextActive: {
    color: "white",
  },
  languageRow: {
    marginTop: 8,
  },
  ageRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  ageLabel: {
    color: "#304074",
    fontSize: 12,
    fontWeight: "700",
  },
  ageChip: {
    borderWidth: 1,
    borderColor: "rgba(88, 98, 180, 0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  ageChipActive: {
    backgroundColor: "#3c8f6a",
    borderColor: "#3c8f6a",
  },
  ageChipText: {
    color: "#304074",
    fontSize: 12,
    fontWeight: "700",
  },
  ageChipTextActive: {
    color: "#ffffff",
  },
  adsConsentRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(88, 98, 180, 0.25)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  adsConsentTextBlock: {
    flex: 1,
  },
  adsConsentTitle: {
    color: "#2f3f76",
    fontSize: 12,
    fontWeight: "800",
  },
  adsConsentSubtitle: {
    marginTop: 2,
    color: "#4c5b8b",
    fontSize: 11,
  },
  backendRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backendInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(111, 79, 255, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#26325f",
  },
  backendSaveButton: {
    backgroundColor: "#3f78e0",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backendSaveButtonDisabled: {
    backgroundColor: "#8cb2ed",
  },
  backendSaveButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  chat: {
    padding: 16,
    gap: 12,
    paddingBottom: 18,
    flexGrow: 1,
  },
  chatList: {
    flex: 1,
  },
  bubble: {
    borderRadius: 18,
    padding: 13,
    maxWidth: "92%",
  },
  bubbleLeft: {
    alignSelf: "flex-start",
  },
  bubbleRight: {
    alignSelf: "flex-end",
  },
  userBubble: {
    backgroundColor: "rgba(124, 94, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(124, 94, 255, 0.28)",
  },
  assistantBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  bubbleLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    color: "#4a5384",
  },
  bubbleText: {
    fontSize: 15,
    color: "#1f2747",
    lineHeight: 23,
    flexShrink: 1,
  },
  compactMascotBar: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(88, 98, 180, 0.22)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  compactMascotText: {
    color: "#2f3f76",
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.8)",
    backgroundColor: "rgba(228, 235, 255, 0.88)",
  },
  button: {
    backgroundColor: "#6f4fff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonActive: {
    backgroundColor: "#4f34ca",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#34406f",
  },
  warning: {
    marginTop: 10,
    color: "#7f2f7b",
    fontSize: 13,
  },
  imageButton: {
    backgroundColor: "#449be0",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  videoButton: {
    backgroundColor: "#7a48cc",
    marginTop: 6,
  },
  imageButtonActive: {
    backgroundColor: "#2e7fc0",
  },
  imageButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  previewImage: {
    marginTop: 10,
    width: "100%",
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
  },
  textRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  textInputField: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "rgba(139, 149, 227, 0.45)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1e2a4d",
  },
  sendButton: {
    backgroundColor: "#6f4fff",
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#b3a5ea",
  },
  sendButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  utilityButton: {
    backgroundColor: "#1c8c7f",
    minWidth: 58,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  utilityButtonDisabled: {
    backgroundColor: "#85bdb6",
  },
  utilityButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "rgba(28, 140, 127, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(28, 140, 127, 0.35)",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonActive: {
    backgroundColor: "rgba(28, 140, 127, 0.2)",
  },
  secondaryButtonText: {
    color: "#17675f",
    fontSize: 15,
    fontWeight: "700",
  },
  // ── Auth screens ──────────────────────────────────────────────────────────
  authContainer: {
    flex: 1,
    backgroundColor: "#dff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  authCard: {
    width: "90%",
    maxWidth: 360,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  authLogo: {
    fontSize: 40,
    textAlign: "center",
    marginBottom: 6,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1b2754",
    textAlign: "center",
    marginBottom: 18,
  },
  authInput: {
    backgroundColor: "#f0f4ff",
    borderWidth: 1,
    borderColor: "rgba(111, 79, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#26325f",
    marginBottom: 10,
  },
  authError: {
    color: "#d32f2f",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  authButton: {
    backgroundColor: "#3f78e0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  authButtonDisabled: {
    backgroundColor: "#8cb2ed",
  },
  authButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  authLinkButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  authLinkText: {
    color: "#3f78e0",
    fontSize: 14,
  },
  // ── Header upgrades ───────────────────────────────────────────────────────
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adminBadge: {
    backgroundColor: "#ffd700",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adminBadgeText: {
    color: "#7a5000",
    fontSize: 11,
    fontWeight: "800",
  },
  logoutButton: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(88,98,180,0.3)",
  },
  logoutButtonText: {
    color: "#33427a",
    fontSize: 12,
    fontWeight: "700",
  },
  leaderCommandChip: {
    marginTop: 10,
    backgroundColor: "rgba(255, 215, 0, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(180, 130, 0, 0.4)",
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  leaderCommandChipText: {
    color: "#7a5000",
    fontSize: 12,
    fontWeight: "700",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8f0fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  attachButtonText: {
    fontSize: 18,
  },
  attachedFileBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f0fe",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    gap: 6,
  },
  attachedFileText: {
    flex: 1,
    fontSize: 12,
    color: "#3a5a9c",
    fontWeight: "600",
  },
  attachedFileClear: {
    paddingHorizontal: 4,
  },
  attachedFileClearText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "700",
  },
  // ── Streaming cursor / Regenerate ─────────────────────────────────────────
  regenerateButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(111, 79, 255, 0.10)",
  },
  regenerateButtonText: {
    color: "#6f4fff",
    fontSize: 11,
    fontWeight: "700",
  },
  // ── History panel ──────────────────────────────────────────────────────────
  historyButton: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(88,98,180,0.3)",
    marginRight: 4,
  },
  historyButtonText: {
    fontSize: 16,
  },
  historyOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  historyCard: {
    backgroundColor: "#f0f6ff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: "75%",
  },
  historyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1b2754",
  },
  historyCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(88,98,180,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyCloseBtnText: {
    fontSize: 15,
    color: "#4a5384",
    fontWeight: "700",
  },
  historyNewBtn: {
    backgroundColor: "#3f78e0",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  historyNewBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  historyList: {
    flex: 1,
  },
  historyEmptyText: {
    color: "#7a8ab8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
  historyItem: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(88,98,180,0.15)",
  },
  historyItemPreview: {
    color: "#1f2747",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  historyItemMeta: {
    marginTop: 4,
    color: "#7a8ab8",
    fontSize: 11,
  },
  // ── Onboarding ─────────────────────────────────────────────────────────────
  onboardingContainer: {
    flex: 1,
    backgroundColor: "#dff6ff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  onboardingCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  onboardingStepDots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  onboardingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(63,120,224,0.25)",
  },
  onboardingDotActive: {
    backgroundColor: "#3f78e0",
  },
  onboardingEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  onboardingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1b2754",
    textAlign: "center",
    marginBottom: 8,
  },
  onboardingSubtitle: {
    fontSize: 14,
    color: "#4a5890",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  onboardingNextBtn: {
    backgroundColor: "#3f78e0",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  onboardingNextBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  // ── Quick action chips ────────────────────────────────────────────────────
  quickChip: {
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickChipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  // ── Streak / Coins badges ─────────────────────────────────────────────────
  streakBadge: {
    backgroundColor: "rgba(255,120,0,0.12)",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,120,0,0.3)",
    marginRight: 2,
  },
  streakText: { fontSize: 12, fontWeight: "700", color: "#c2410c" },
  coinBadge: {
    backgroundColor: "rgba(234,179,8,0.15)",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.4)",
    marginRight: 4,
  },
  coinText: { fontSize: 12, fontWeight: "700", color: "#854d0e" },
  // ── Vocab save button ─────────────────────────────────────────────────────
  vocabSaveButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(5,150,105,0.1)",
  },
  vocabSaveButtonText: { color: "#059669", fontSize: 11, fontWeight: "700" },
  // ── Achievement toast ─────────────────────────────────────────────────────
  achievementToast: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#1b2754",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
  },
  achievementToastEmoji: { fontSize: 32 },
  achievementToastTitle: { color: "white", fontWeight: "800", fontSize: 15 },
  achievementToastDesc: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  // ── Achievement list item ─────────────────────────────────────────────────
  achItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(88,98,180,0.15)",
  },
  achEmoji: { fontSize: 28 },
  achLabel: { fontWeight: "700", color: "#1b2754", fontSize: 14 },
  achDesc: { color: "#7a8ab8", fontSize: 12 },
  achCheck: { color: "#059669", fontWeight: "800", fontSize: 18 },
  // ── Vocabulary panel ──────────────────────────────────────────────────────
  vocabItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(88,98,180,0.15)",
  },
  vocabWord: { fontWeight: "700", color: "#1b2754", fontSize: 14 },
  vocabDef: { color: "#7a8ab8", fontSize: 12, marginTop: 2 },
  vocabDeleteBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(239,68,68,0.12)", alignItems: "center", justifyContent: "center" },
  vocabDeleteTxt: { color: "#ef4444", fontWeight: "700", fontSize: 13 },
  // ── Quiz ─────────────────────────────────────────────────────────────────
  quizQuestion: { fontSize: 16, fontWeight: "700", color: "#1b2754", lineHeight: 22, marginBottom: 16 },
  quizOption: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "rgba(88,98,180,0.2)",
  },
  quizOptionText: { color: "#1f2747", fontSize: 14, fontWeight: "600" },
  quizResult: { fontSize: 15, fontWeight: "800", textAlign: "center", marginTop: 8 },
  // ── Parental dashboard ────────────────────────────────────────────────────
  parentalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  parentalCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    width: "30%",
    borderWidth: 1,
    borderColor: "rgba(88,98,180,0.15)",
  },
  parentalCardEmoji: { fontSize: 24, marginBottom: 4 },
  parentalCardValue: { fontSize: 20, fontWeight: "800", color: "#1b2754" },
  parentalCardLabel: { fontSize: 11, color: "#7a8ab8", marginTop: 2, textAlign: "center" },
  parentalNote: { fontSize: 12, color: "#7a8ab8", lineHeight: 17, textAlign: "center", marginTop: 8 },
  // ── Settings rows ─────────────────────────────────────────────────────────
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(88,98,180,0.1)",
  },
  settingLabel: { fontSize: 13, color: "#1b2754", fontWeight: "600" },
  fontChip: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(88,98,180,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  fontChipText: { fontSize: 12, fontWeight: "700", color: "#1b2754" },
  accentDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  accentDotActive: {
    borderColor: "#1b2754",
    transform: [{ scale: 1.2 }],
  },
});
