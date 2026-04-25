# Pasos Guardados - GaIA

Fecha: 2026-04-08

## Estado actual (local, sin subir a git)

1. Se subieron previamente cambios a GitHub con commit `916974e` (novedades movil + backend multi-proveedor).
2. Despues de ese push, se agrego configuracion infantil en la app:
- Selector de modo `maestra` / `amiga` en la UI.
- El modo se envia al backend (`mode`) y ajusta el prompt del asistente.
3. Se agrego mascota infantil personalizable tipo companero virtual:
- Selector de animalito (panda, zorro, conejo, nutria).
- Persistencia local de la mascota elegida con AsyncStorage.
4. Se actualizo documentacion en README con:
- Modos infantiles.
- Mascota personalizable.

## Siguiente paso sugerido cuando quieras

1. Revisar visualmente en movil (Expo Go) que el selector de mascota y modo funcione bien.
2. Si todo esta correcto, hacer commit local de estos ultimos cambios.
3. Subir a GitHub solo cuando lo confirmes.

## Paso nuevo: instalador movil + publicidad

1. Instalar dependencias nuevas en raiz:
	- `npm install`
2. Generar instalador APK interno para movil:
	- `npm run build:android:apk`
3. Generar paquete AAB para Google Play:
	- `npm run build:android:aab`
4. Configurar IDs reales de AdMob antes de produccion:
	- `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID`
	- `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`
5. Verificar en app movil:
	- Selector de edad infantil (6/9/12/14)
	- Switch de consentimiento parental para anuncios
	- Carga de banner AdMob en el footer

## Nota

- Peticion del usuario aplicada: no subir aun al git.
