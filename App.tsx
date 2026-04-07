import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";
const USER_ID_KEY = "gaia-user-id";

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [userId, setUserId] = useState<string>("anon");
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hola, soy GaIA. Mantén pulsado el botón y háblame.",
    },
  ]);

  const canTalk = useMemo(() => Boolean(API_BASE_URL), []);
  const isLikelyLocalhost = useMemo(
    () => API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1"),
    []
  );

  useEffect(() => {
    void initUser();
  }, []);

  async function initUser() {
    try {
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
        "Configura EXPO_PUBLIC_API_BASE_URL para activar la asistente."
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
      pushMessage("user", userText);

      const answer = await askAssistant(userText);
      pushMessage("assistant", answer);

      Speech.stop();
      Speech.speak(answer, {
        language: "es-ES",
        rate: 0.95,
        pitch: 1.0,
      });
    } catch (error) {
      Alert.alert("Error", "No pude procesar tu audio.");
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
  }

  async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
    const v1 = await fetch(`${API_BASE_URL}/api/v1${path}`, options);
    if (v1.status !== 404) {
      return v1;
    }

    return fetch(`${API_BASE_URL}/api${path}`, options);
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

    if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);

    const data = (await response.json()) as { text: string; remainingCredits?: number };
    if (typeof data.remainingCredits === "number") {
      setRemainingCredits(data.remainingCredits);
    }
    return data.text?.trim() || "No entendí claramente el audio.";
  }

  async function askAssistant(userText: string): Promise<string> {
    const response = await apiFetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        text: userText,
      }),
    });

    if (!response.ok) throw new Error(`Assistant failed: ${response.status}`);

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
        throw new Error(`Image failed: ${response.status}`);
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
      Alert.alert("Imagen", "No se pudo generar imagen ahora mismo.");
    } finally {
      setIsGeneratingImage(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>GaIA Voice</Text>
        <Text style={styles.subtitle}>Asistente virtual con voz</Text>
        <Text style={styles.credits}>Creditos restantes: {remainingCredits ?? "..."}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.chat}>
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
            {isGeneratingImage ? "Generando imagen..." : "Generar imagen (demo)"}
          </Text>
        </Pressable>

        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}

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
            Configura EXPO_PUBLIC_API_BASE_URL para conectar con el backend.
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1e8",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#2a2a2a",
  },
  subtitle: {
    marginTop: 4,
    color: "#5b5b5b",
    fontSize: 14,
  },
  credits: {
    marginTop: 6,
    color: "#124a34",
    fontSize: 13,
    fontWeight: "700",
  },
  chat: {
    padding: 16,
    gap: 12,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: "#d3efe0",
  },
  assistantBubble: {
    backgroundColor: "#fff9ee",
    borderWidth: 1,
    borderColor: "#e2d8c3",
  },
  bubbleLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    color: "#555",
  },
  bubbleText: {
    fontSize: 16,
    color: "#202020",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#dfd8ca",
    backgroundColor: "#efe8d8",
  },
  button: {
    backgroundColor: "#1d7f5c",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonActive: {
    backgroundColor: "#0f5e42",
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
    color: "#3f3f3f",
  },
  warning: {
    marginTop: 10,
    color: "#8a3a3a",
    fontSize: 13,
  },
  imageButton: {
    backgroundColor: "#2a5aa0",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  imageButtonActive: {
    backgroundColor: "#20457b",
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
    borderColor: "#d9cfb8",
  },
  adSlot: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d6c9ac",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "#f7f1e2",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  adLabel: {
    fontWeight: "700",
    color: "#6b5f43",
    marginBottom: 2,
  },
  adText: {
    color: "#6f6756",
    fontSize: 12,
  },
});
