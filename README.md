# 🌿 GaIA — Asistente de Aprendizaje con IA para Niños

> *"GaIA no es solo un chatbot. Es un compañero de aventuras que aprende contigo, celebra tus logros, te reta con juegos y se adapta a tu edad y a tu forma de hablar. Cada conversación planta una semilla de conocimiento."*

GaIA es una app educativa móvil (Android/iOS/Web) construida con Expo y React Native. Usa IA generativa local o en la nube para acompañar a niños en su aprendizaje: responde preguntas, narra historias, propone retos, genera imágenes, juega con ellos y avanza con ellos cada día.

---

## ✨ Funcionalidades principales

### 🤖 Chat inteligente adaptado por edad
- Motor IA enchufable: **Ollama** (local, gratis), **Gemini 2.0 Flash**, **Groq Llama 3.3 70B**
- Detección automática de idioma — la IA responde en el idioma del niño
- Dos modos: **Profesora** (explica con rigor) y **Amiga** (juega y bromea)
- Mensajes espontáneos cuando el niño lleva más de 90 segundos inactivo
- Compresión automática del historial largo
- Retry con backoff exponencial
- Cursor de escritura ▋ en streaming en tiempo real

### 🐾 Mascotas con personalidad
- 5 mascotas: **Pandi** 🐼, **Zorro** 🦊, **León** 🦁, **Buho** 🦉, **Conejo** 🐰
- Soporte GLB 3D con animaciones (web) + fallback procedural
- Lip sync en modo habla sincronizado con TTS

### 🎮 Gamificación completa
- **Racha diaria** 🔥 — contador estilo Duolingo
- **Monedas de conocimiento** 🪙 — +2 por mensaje, +5 vocabulario, +10/15 minijuegos
- **11 logros desbloqueables** con toast animado al desbloquear

### 🎯 Minijuegos educativos
- **Ahorcado** — con las palabras de tu propio vocabulario
- **Memoria de Palabras** — empareja palabra ↔ definición
- **Quiz con IA** — pregunta de opción múltiple generada desde el chat reciente

### 📖 Vocabulario personal
- Guarda palabras/conceptos desde cualquier respuesta
- Límite 200 palabras/usuario
- Las palabras guardadas alimentan los minijuegos

### 👨‍👩‍👧 Panel de Padres
- Mensajes totales, racha, monedas, vocabulario, logros
- Datos guardados en tu propio servidor

### 🔊 Accesibilidad
- TTS automático configurable
- Tamaño de texto ajustable (13/15/17/19px)
- Color de acento personalizable (Azul, Púrpura, Verde, Naranja)

### 🌐 Modo offline
- Caché de últimas 50 respuestas en AsyncStorage

### 📅 Onboarding + Notificaciones diarias
- Onboarding de 3 pasos (una sola vez)
- Recordatorio diario a las 18:00 con nombre y emoji de la mascota

---

## 🏗️ Arquitectura

```
GaIA/
├── App.tsx                       ← App principal React Native/Expo
├── components/
│   ├── MascotRoom.tsx / .web.tsx ← Mascota 3D
│   ├── Minigames.tsx             ← Ahorcado + Memoria
│   └── AdBanner.tsx              ← Banner AdMob
└── backend/
    ├── src/controllers/
    │   ├── aiController.js       ← Chat, imagen, vídeo, quiz
    │   ├── gamificationController.js
    │   └── vocabularyController.js
    ├── src/services/
    │   ├── gamificationService.js
    │   ├── vocabularyService.js
    │   └── openaiService.js
    └── data/                     ← JSONs persistentes
        ├── gamification.json
        ├── vocabulary.json
        └── chat-history/
```

---

## 🚀 Instalación

```bash
npm install
npm --prefix backend install
cp backend/.env.example backend/.env
npm run start:all
```

### Modo local gratuito (Ollama)
```bash
ollama serve
ollama pull llama3.2
```

### Google Gemini 2.0 Flash
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=tu_clave
```

### IP del backend para móvil físico
```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.25:4000"
```

---

## 📡 API Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/chat` | Chat con historial |
| POST | `/api/chat/stream` | Chat streaming SSE |
| POST | `/api/chat/quiz` | Quiz generado por IA |
| GET | `/api/gamification/:userId` | Racha, monedas, logros |
| POST | `/api/gamification/:userId/message` | +2 monedas por mensaje |
| GET | `/api/gamification/:userId/parental` | Estadísticas para padres |
| GET | `/api/vocabulary/:userId` | Lista de palabras |
| POST | `/api/vocabulary/:userId/words` | Guardar palabra |
| DELETE | `/api/vocabulary/:userId/words/:id` | Eliminar palabra |
| GET | `/api/history/:userId` | Conversaciones |
| POST | `/api/images` | Generar imagen |
| POST | `/api/transcribe` | Audio a texto |

---

## 📦 Build

```bash
npm run build:android:apk   # APK instalable
npm run build:android:aab   # Google Play
```

---

## 🛡️ Privacidad

- Consentimiento parental explícito (COPPA/GDPR)
- Datos guardados en **tu propio servidor** (sin nube de terceros)
- Revocación y borrado de datos desde la app

---

*GaIA — Porque aprender debería sentirse como jugar.*
