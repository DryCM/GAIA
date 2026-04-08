import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";
const USER_ID_KEY = "gaia-user-id";
const API_BASE_URL_KEY = "gaia-api-base-url";

export default function App() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [userId, setUserId] = useState<string>("anon");
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(API_BASE_URL);
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState<string>(API_BASE_URL);
  const [isSavingApiUrl, setIsSavingApiUrl] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hola, soy GaIA. Mantén pulsado el botón y háblame.",
    },
  ]);

  const canTalk = useMemo(() => Boolean(apiBaseUrl.trim()), [apiBaseUrl]);
  const isLikelyLocalhost = useMemo(
    () => apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1"),
    [apiBaseUrl]
  );

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

  async function initUser() {
    try {
      const savedApiUrl = await AsyncStorage.getItem(API_BASE_URL_KEY);
      if (savedApiUrl?.trim()) {
        setApiBaseUrl(savedApiUrl.trim());
        setApiBaseUrlInput(savedApiUrl.trim());
      }

      const saved = await AsyncStorage.getItem(USER_ID_KEY);
      if (saved) {
        setUserId(saved);
        await refreshCredits(saved);
        return;
      }

      const generated = `u-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await AsyncStorage.setItem(USER_ID_KEY, generated);
      setUserId(generated);
      await refreshCredits(generated);
    } catch (error) {
      setUserId("anon");
      await refreshCredits("anon");
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

  async function startRecording() {
    if (!canTalk) {
      Alert.alert(
        "Falta URL del backend",
        "Configura la URL del backend en la cabecera para activar la asistente."
      );
      return;
    }

    try {
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
    } catch (error) {
      Alert.alert("Error", "No pude iniciar la grabación.");
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsThinking(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) throw new Error("No se obtuvo el audio");

      const userText = await transcribeAudio(uri);
      const historySnapshot = messages;
      pushMessage("user", userText);

      const answer = await askAssistant(userText, historySnapshot);
      pushMessage("assistant", answer);

      Speech.stop();
      Speech.speak(answer, {
        language: "es-ES",
        rate: 0.95,
        pitch: 1.0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pude procesar tu audio.";
      Alert.alert("Error", message);
    } finally {
      setIsThinking(false);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    }
  }

  function pushMessage(role: "user" | "assistant", text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  async function sendTextMessage() {
    const trimmed = textInput.trim();
    if (!trimmed || isThinking || isRecording) return;

    setTextInput("");
    const historySnapshot = messages;
    pushMessage("user", trimmed);
    setIsThinking(true);
    try {
      const answer = await askAssistant(trimmed, historySnapshot);
      pushMessage("assistant", answer);
      Speech.stop();
      Speech.speak(answer, { language: "es-ES", rate: 0.95, pitch: 1.0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pude procesar tu mensaje.";
      Alert.alert("Error", message);
    } finally {
      setIsThinking(false);
    }
  }

  async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
    const base = apiBaseUrl.trim();
    const v1 = await fetch(`${base}/api/v1${path}`, options);
    if (v1.status !== 404) {
      return v1;
    }

    return fetch(`${base}/api${path}`, options);
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

  async function askAssistant(userText: string, history: ChatMessage[]): Promise<string> {
    const response = await apiFetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        text: userText,
        history: history
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, text: m.text })),
      }),
    });

    if (!response.ok) {
      const details = await readApiError(response, "No se pudo generar respuesta.");
      throw new Error(details);
    }

    const data = (await response.json()) as {
      answer?: string;
      remainingCredits?: number;
    };

    if (typeof data.remainingCredits === "number") {
      setRemainingCredits(data.remainingCredits);
    }

    return data.answer?.trim() || "No pude generar una respuesta en este momento.";
  }

  async function generateImage() {
    try {
      setIsGeneratingImage(true);
      const response = await apiFetch("/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          prompt: "Un bosque mediterraneo al atardecer con estilo cinematografico",
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
        <Text style={styles.title}>GaIA Voice</Text>
        <Text style={styles.subtitle}>Asistente virtual con voz</Text>
        <Text style={styles.credits}>Creditos restantes: {remainingCredits ?? "..."}</Text>
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

      <ScrollView ref={scrollRef} contentContainerStyle={styles.chat}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.role === "user" ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={styles.bubbleLabel}>
              {message.role === "user" ? "Tu" : "GaIA"}
            </Text>
            <Text style={styles.bubbleText}>{message.text}</Text>
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
            {isGeneratingImage ? "Generando imagen..." : "Generar imagen"}
          </Text>
        </Pressable>

        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}

        <View style={styles.textRow}>
          <TextInput
            style={styles.textInputField}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            value={textInput}
            onChangeText={setTextInput}
            onSubmitEditing={sendTextMessage}
            returnKeyType="send"
            editable={!isThinking && !isRecording}
            multiline={false}
          />
          <Pressable
            onPress={sendTextMessage}
            style={[styles.sendButton, (!textInput.trim() || isThinking) && styles.sendButtonDisabled]}
            disabled={!textInput.trim() || isThinking || isRecording}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </Pressable>
        </View>

        <Pressable
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={[styles.button, isRecording && styles.buttonActive]}
          disabled={isThinking}
        >
          <Text style={styles.buttonText}>
            {isRecording ? "Escuchando..." : "Mantener para hablar"}
          </Text>
        </Pressable>

        {isThinking && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Pensando respuesta...</Text>
          </View>
        )}

        {!canTalk && (
          <Text style={styles.warning}>
            Configura una URL de backend valida para conectar la app.
          </Text>
        )}

        {isLikelyLocalhost && (
          <Text style={styles.warning}>
            En Android fisico, localhost no apunta a tu PC. Usa la IP local de tu equipo.
          </Text>
        )}

        <View style={styles.adSlot}>
          <Text style={styles.adLabel}>Espacio publicitario</Text>
          <Text style={styles.adText}>Aqui se integrara AdMob Banner en la version Play Store.</Text>
        </View>
      </View>
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
    paddingBottom: 8,
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
  },
  bubble: {
    borderRadius: 18,
    padding: 13,
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
    fontSize: 16,
    color: "#1f2747",
    lineHeight: 22,
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
  adSlot: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(140, 134, 219, 0.4)",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.62)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  adLabel: {
    fontWeight: "700",
    color: "#46518a",
    marginBottom: 2,
  },
  adText: {
    color: "#516091",
    fontSize: 12,
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
});
