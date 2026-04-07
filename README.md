# GaIA Voice Assistant

Arquitectura lista para escalar a Google Play:
1. App movil Expo (voz, chat, preview de imagen y slot de anuncios).
2. Backend Node/Express para proteger claves y controlar creditos.
3. OpenAI solo desde backend (nunca desde cliente).

## Requisitos

- Node.js 20+
- npm 10+
- Expo Go en el movil (Android/iOS)
- API key de OpenAI (solo backend)

## Instalacion

```bash
npm install
npm --prefix backend install
```

## Configuracion

1. Copia [backend/.env.example](backend/.env.example) a [backend/.env](backend/.env).
2. Añade tu clave en `OPENAI_API_KEY`.
3. Configura URL del backend para Expo:

PowerShell:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://TU_IP_LOCAL:4000"
```

Para movil fisico, usa la IP local de tu PC (por ejemplo `http://192.168.1.25:4000`).

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

## Endpoints backend

- `GET /health`
- `GET /api/credits?userId=...`
- `POST /api/transcribe` (multipart audio)
- `POST /api/chat` (texto)
- `POST /api/images` (generacion de imagen)

## Monetizacion preparada

La app incluye un bloque visual de anuncio en UI para reemplazar por AdMob Banner al pasar a build de tienda.
