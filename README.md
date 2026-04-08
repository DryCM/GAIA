# GaIA Voice Assistant

Arquitectura lista para escalar a Google Play:
1. App movil Expo (voz, chat, preview de imagen y slot de anuncios).
2. Backend Node/Express para controlar creditos y enrutar proveedores IA.
3. Modo local gratis por defecto con Ollama (sin API key).

## Requisitos

- Node.js 20+
- npm 10+
- Expo Go en el movil (Android/iOS)
- Ollama instalado para chat local gratis

## Instalacion

```bash
npm install
npm --prefix backend install
```

## Configuracion

1. Copia [backend/.env.example](backend/.env.example) a [backend/.env](backend/.env).
2. Por defecto usa `AI_PROVIDER=ollama` (gratis local).
3. Opcional: configura `GEMINI_API_KEY` solo si quieres usar Gemini.
3. Configura URL del backend para Expo:

PowerShell:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://TU_IP_LOCAL:4000"
```

Para movil fisico, usa la IP local de tu PC (por ejemplo `http://192.168.1.25:4000`).
Para emulador Android de Android Studio, usa `http://10.0.2.2:4000`.

Tambien puedes configurarla directamente desde la app movil: en la cabecera hay un campo URL + boton Guardar, y queda persistida en el dispositivo.

Opcional para persistencia de creditos:

- `CREDITS_STORE_FILE` en `backend/.env` para definir ruta del archivo JSON.
- Si se deja vacio, usa `backend/data/credits-store.json` por defecto.

Opcional para funciones gratis locales en modo Ollama:

- `LOCAL_STT_BASE_URL`: endpoint local compatible con `POST /v1/audio/transcriptions` (voz a texto).
- `LOCAL_STT_MODEL`: modelo STT local (por defecto `base`).
- `LOCAL_IMAGE_BASE_URL`: endpoint local de Automatic1111 (`/sdapi/v1/txt2img`) para imagenes.

## Ejecutar

```bash
npm run backend
npm start
```

O en paralelo:

```bash
npm run start:all
```

Luego escanea el QR con Expo Go.

Para chat local gratis, asegúrate de tener Ollama levantado:

```bash
ollama serve
```

Y al menos un modelo instalado (ejemplo):

```bash
ollama pull llama3.2
```

## Endpoints backend

- `GET /health`
- `GET /api/version`
- `GET /api/v1/version`
- `GET /api/credits?userId=...` y `GET /api/v1/credits?userId=...`
- `POST /api/transcribe` y `POST /api/v1/transcribe` (multipart audio)
- `POST /api/chat` y `POST /api/v1/chat` (texto)
- `POST /api/images` y `POST /api/v1/images` (generacion de imagen)

La app intenta usar `/api/v1` y, si no existe, hace fallback automatico a `/api`.

## Monetizacion preparada

La app incluye un bloque visual de anuncio en UI para reemplazar por AdMob Banner al pasar a build de tienda.

## Notas backend

- Los creditos se persisten en disco (JSON), por lo que no se pierden al reiniciar el servidor.
- En modo `ollama`, chat funciona local y gratis; voz/imagen requieren `LOCAL_STT_BASE_URL` y `LOCAL_IMAGE_BASE_URL` para funcionar tambien gratis en local.
