/* ================================================================
   GaIA Minigames / Minijuegos
   ES: Componentes de minijuegos para la app GaIA:
       - Ahorcado (con vocabulario del usuario)
       - Memoria de Palabras (emparejar palabra ↔ definición)
   EN: Minigame components for the GaIA app:
       - Hangman (using user vocabulary)
       - Word Memory (match word ↔ definition)
   ================================================================ */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
type VocabWord = { id: string; word: string; definition: string };

type HangmanProps = {
  visible: boolean;
  onClose: () => void;
  vocabWords: VocabWord[];
  onWin: (coins: number) => void;
  accentPrimary: string;
};

type MemoryProps = {
  visible: boolean;
  onClose: () => void;
  vocabWords: VocabWord[];
  onWin: (coins: number) => void;
  accentPrimary: string;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Hangman / Ahorcado
// ─────────────────────────────────────────────────────────────────────────────
const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const MAX_WRONG = 6;

const HANGMAN_STAGES = [
  "😶", "😟", "😰", "😨", "😱", "💀", "☠️",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getHangmanWord(vocabWords: VocabWord[]): { word: string; hint: string } {
  if (vocabWords.length > 0) {
    const pick = pickRandom(vocabWords);
    return { word: pick.word.toUpperCase(), hint: pick.definition || "Una palabra de tu vocabulario" };
  }
  const fallback = [
    { word: "MARIPOSA",   hint: "Insecto que vuela con alas de colores" },
    { word: "TELESCOPIO", hint: "Sirve para mirar las estrellas" },
    { word: "DINOSAURIO", hint: "Reptil gigante que vivió hace millones de años" },
    { word: "VOLCAN",     hint: "Montaña que expulsa lava" },
    { word: "FOTOSINTESIS", hint: "Proceso por el que las plantas fabrican su comida con luz solar" },
    { word: "GALAXIA",    hint: "Conjunto de miles de millones de estrellas" },
    { word: "ECOSISTEMA", hint: "Comunidad de seres vivos que comparten un mismo entorno" },
  ];
  return pickRandom(fallback);
}

export function HangmanGame({ visible, onClose, vocabWords, onWin, accentPrimary }: HangmanProps) {
  const [target, setTarget] = useState({ word: "", hint: "" });
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");

  const reset = useCallback(() => {
    setTarget(getHangmanWord(vocabWords));
    setGuessed(new Set());
    setGameState("playing");
  }, [vocabWords]);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const wrongCount = useMemo(() => {
    return [...guessed].filter((l) => !target.word.includes(l)).length;
  }, [guessed, target]);

  const displayWord = useMemo(() => {
    if (!target.word) return [];
    return target.word.split("").map((l) => (l === " " ? " " : guessed.has(l) ? l : "_"));
  }, [target, guessed]);

  const isWon = displayWord.length > 0 && displayWord.every((l) => l !== "_");
  const isLost = wrongCount >= MAX_WRONG;

  useEffect(() => {
    if (isWon && gameState === "playing") {
      setGameState("won");
      onWin(10);
    } else if (isLost && gameState === "playing") {
      setGameState("lost");
    }
  }, [isWon, isLost, gameState, onWin]);

  function guess(letter: string) {
    if (gameState !== "playing") return;
    setGuessed((prev) => new Set([...prev, letter]));
  }

  const wrongLetters = [...guessed].filter((l) => !target.word.includes(l));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mg.overlay}>
        <View style={mg.card}>
          <View style={mg.header}>
            <Text style={mg.title}>🎯 Ahorcado</Text>
            <Pressable onPress={onClose} style={mg.closeBtn}><Text style={mg.closeTxt}>✕</Text></Pressable>
          </View>

          {/* Stage face */}
          <Text style={mg.stageFace}>{HANGMAN_STAGES[wrongCount]}</Text>
          <Text style={mg.wrongCount}>{wrongCount}/{MAX_WRONG} errores</Text>

          {/* Hint */}
          <Text style={mg.hint}>💡 {target.hint}</Text>

          {/* Word display */}
          <View style={mg.wordRow}>
            {displayWord.map((l, i) => (
              <View key={i} style={mg.letterBox}>
                <Text style={mg.letterText}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Wrong letters */}
          {wrongLetters.length > 0 && (
            <Text style={mg.wrongLetters}>Letras falladas: {wrongLetters.join(" ")}</Text>
          )}

          {/* Result */}
          {gameState === "won" && (
            <View style={mg.resultBox}>
              <Text style={mg.resultEmoji}>🏆</Text>
              <Text style={mg.resultText}>¡Genial! +10 monedas</Text>
            </View>
          )}
          {gameState === "lost" && (
            <View style={[mg.resultBox, { backgroundColor: "#ffe0e0" }]}>
              <Text style={mg.resultEmoji}>😞</Text>
              <Text style={mg.resultText}>Era: {target.word}</Text>
            </View>
          )}

          {/* Alphabet */}
          {gameState === "playing" && (
            <View style={mg.alphabetGrid}>
              {ALPHABET.map((l) => {
                const used = guessed.has(l);
                const isWrong = used && !target.word.includes(l);
                const isRight = used && target.word.includes(l);
                return (
                  <Pressable
                    key={l}
                    onPress={() => guess(l)}
                    disabled={used}
                    style={[
                      mg.letterBtn,
                      isWrong && mg.letterBtnWrong,
                      isRight && { backgroundColor: accentPrimary },
                    ]}
                  >
                    <Text style={[mg.letterBtnTxt, (isWrong || isRight) && { color: "white" }]}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={reset}
            style={[mg.newGameBtn, { backgroundColor: accentPrimary }]}
          >
            <Text style={mg.newGameTxt}>{gameState === "playing" ? "Nueva palabra" : "Jugar otra vez"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Word Memory / Memoria de Palabras
// ─────────────────────────────────────────────────────────────────────────────
type MemoryCard = {
  id: string;
  content: string;
  pairId: string;
  type: "word" | "def";
  flipped: boolean;
  matched: boolean;
};

const FALLBACK_PAIRS = [
  { word: "Fotosíntesis", def: "Plantas fabrican comida con luz solar" },
  { word: "Gravedad",     def: "Fuerza que atrae los objetos hacia la Tierra" },
  { word: "Evaporación",  def: "El agua líquida se convierte en vapor" },
  { word: "Átomo",        def: "Partícula más pequeña de un elemento" },
  { word: "Ecosistema",   def: "Seres vivos y su entorno interactuando" },
  { word: "Volcán",       def: "Abertura en la Tierra que expulsa lava" },
];

function buildMemoryCards(vocabWords: VocabWord[]): MemoryCard[] {
  const source = vocabWords
    .filter((w) => w.definition)
    .slice(0, 6)
    .map((w) => ({ word: w.word, def: w.definition }));
  const pairs = source.length >= 3 ? source.slice(0, 6) : FALLBACK_PAIRS.slice(0, 6);

  const cards: MemoryCard[] = [];
  pairs.forEach((p, i) => {
    const pairId = `pair_${i}`;
    cards.push({ id: `w_${i}`, content: p.word, pairId, type: "word", flipped: false, matched: false });
    cards.push({ id: `d_${i}`, content: p.def,  pairId, type: "def",  flipped: false, matched: false });
  });
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function MemoryGame({ visible, onClose, vocabWords, onWin, accentPrimary }: MemoryProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);

  function reset() {
    setCards(buildMemoryCards(vocabWords));
    setFlipped([]);
    setMoves(0);
    setWon(false);
    setLocked(false);
  }

  useEffect(() => {
    if (visible) reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function flip(cardId: string) {
    if (locked) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.flipped || card.matched) return;

    const newFlipped = [...flipped, cardId];
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, flipped: true } : c));
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setLocked(true);
      const [a, b] = newFlipped.map((id) => cards.find((c) => c.id === id)!);
      if (a.pairId === b.pairId) {
        // Match!
        setCards((prev) => prev.map((c) =>
          c.pairId === a.pairId ? { ...c, matched: true } : c
        ));
        setFlipped([]);
        setLocked(false);
      } else {
        // No match → flip back after delay
        setTimeout(() => {
          setCards((prev) => prev.map((c) =>
            newFlipped.includes(c.id) ? { ...c, flipped: false } : c
          ));
          setFlipped([]);
          setLocked(false);
        }, 1000);
      }
    }
  }

  // Check win
  useEffect(() => {
    if (cards.length > 0 && cards.every((c) => c.matched)) {
      setWon(true);
      onWin(15);
    }
  }, [cards, onWin]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mg.overlay}>
        <ScrollView contentContainerStyle={mg.scrollCard}>
          <View style={mg.header}>
            <Text style={mg.title}>🧠 Memoria de Palabras</Text>
            <Pressable onPress={onClose} style={mg.closeBtn}><Text style={mg.closeTxt}>✕</Text></Pressable>
          </View>
          <Text style={mg.hint}>Empareja cada palabra con su definición · Turnos: {moves}</Text>

          {won && (
            <View style={mg.resultBox}>
              <Text style={mg.resultEmoji}>🏆</Text>
              <Text style={mg.resultText}>¡Lo conseguiste en {moves} turnos! +15 monedas</Text>
            </View>
          )}

          <View style={mg.memoryGrid}>
            {cards.map((card) => (
              <Pressable
                key={card.id}
                onPress={() => flip(card.id)}
                style={[
                  mg.memoryCard,
                  card.matched && { backgroundColor: accentPrimary, borderColor: accentPrimary },
                  card.flipped && !card.matched && { backgroundColor: "#fff9e6", borderColor: "#f59e0b" },
                ]}
              >
                <Text
                  style={[
                    mg.memoryCardTxt,
                    card.type === "def" && { fontSize: 11 },
                    (card.matched) && { color: "white" },
                  ]}
                  numberOfLines={3}
                >
                  {card.flipped || card.matched ? card.content : "?"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={reset} style={[mg.newGameBtn, { backgroundColor: accentPrimary }]}>
            <Text style={mg.newGameTxt}>{won ? "Jugar otra vez" : "Nueva partida"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────
const mg = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  card:         { backgroundColor: "#f8faff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: "92%" },
  scrollCard:   { backgroundColor: "#f8faff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title:        { fontSize: 18, fontWeight: "800", color: "#1b2754" },
  closeBtn:     { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(88,98,180,0.15)", alignItems: "center", justifyContent: "center" },
  closeTxt:     { fontSize: 15, color: "#4a5384", fontWeight: "700" },
  stageFace:    { fontSize: 56, textAlign: "center", marginVertical: 8 },
  wrongCount:   { textAlign: "center", color: "#e53e3e", fontWeight: "700", marginBottom: 4 },
  hint:         { fontSize: 13, color: "#4a5890", textAlign: "center", marginBottom: 12, lineHeight: 18 },
  wordRow:      { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginBottom: 12 },
  letterBox:    { minWidth: 24, borderBottomWidth: 2, borderColor: "#3f78e0", paddingBottom: 2, alignItems: "center" },
  letterText:   { fontSize: 20, fontWeight: "700", color: "#1b2754", minWidth: 16, textAlign: "center" },
  wrongLetters: { textAlign: "center", color: "#e53e3e", fontSize: 12, marginBottom: 8 },
  resultBox:    { backgroundColor: "#e6fef0", borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 12, flexDirection: "row", gap: 8 },
  resultEmoji:  { fontSize: 28 },
  resultText:   { fontSize: 14, fontWeight: "700", color: "#1b2754" },
  alphabetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 12 },
  letterBtn:    { width: 34, height: 34, borderRadius: 8, backgroundColor: "#eef1fb", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(88,98,180,0.2)" },
  letterBtnWrong: { backgroundColor: "#e53e3e" },
  letterBtnTxt: { fontSize: 13, fontWeight: "700", color: "#1b2754" },
  newGameBtn:   { borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  newGameTxt:   { color: "white", fontWeight: "700", fontSize: 15 },
  // Memory
  memoryGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 },
  memoryCard:   { width: "44%", minHeight: 72, backgroundColor: "#eef1fb", borderRadius: 12, padding: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(88,98,180,0.25)" },
  memoryCardTxt: { fontSize: 13, fontWeight: "600", color: "#1b2754", textAlign: "center" },
});
