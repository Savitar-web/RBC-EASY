# RBC EASY — qué cambió

Los fondos siguen siendo los de `public/images/backgrounds/`, en este orden, sin regenerarlos:

1. `FCC.png` — inicio
2. `FNP.png` — proyectos y calculadora
3. `FSH.png` — contacto
4. `FT.png` — Biblias Maker
5. `FMA.png` — modo ascendido
6. `MA.png` — balística
7. `TA.png` — conversión

No se tocó el diseño de Home, Contacto, Biblias Maker ni Writer.

## Sin conexión

En Proyectos → Datos → **Guardar sin conexión**, o dentro de Accesos directos. Eso mete en la caché del navegador la app y esas imágenes. El service worker está en `public/sw.js`. `index.html` enlaza `public/manifest.webmanifest`.

La primera visita tiene que poder leer las imágenes desde `public/`. Si una falta, no se inventa otra.

## Accesos directos

En Proyectos → **Accesos directos**:

- **Añadir a inicio**: usa el aviso del navegador (Chrome, Edge, Android). En iPhone indica Compartir → Añadir a pantalla de inicio.
- **Crear acceso**: descarga `.url` (Windows), `.desktop` (Linux) o `.webloc` (Mac). En el móvil copia o comparte el enlace.
- **Descargar todos** arma un ZIP con los tres formatos.
- En la app de Electron el acceso se escribe directo en el escritorio.
- En la APK, mantener pulsado el icono muestra Calculadora, Balística, Conversión, Ascendido y Biblias (`android/.../xml/shortcuts.xml`).

Las rutas viejas (`/Projects`, `/Biblias`, `/conversor`, `/ascendido`) redirigen a las reales.

## Android (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
```

Si `npx cap add android` pisa `android/`, vuelve a copiar `AndroidManifest.xml`, `shortcuts.xml`, `MainActivity.java` y `strings.xml` de este paquete. Abre la carpeta `android/` en Android Studio y genera el APK.

`capacitor.config.ts` usa `webDir: dist` y `androidScheme: https`.

## Escritorio (Electron)

```bash
npm install --save-dev electron electron-builder
npm run build
npx electron electron/main.cjs
npx electron-builder --win
```

`electron-builder.yml` crea el instalador con acceso en el escritorio y en el menú inicio. El protocolo interno es `app://local/` para que las rutas absolutas (`/calcular`, `/images/...`) funcionen offline dentro del exe.

## Scripts útiles para package.json

```json
{
  "main": "electron/main.cjs",
  "scripts": {
    "desktop": "electron electron/main.cjs",
    "desktop:dist": "npm run build && electron-builder"
  }
}
```
