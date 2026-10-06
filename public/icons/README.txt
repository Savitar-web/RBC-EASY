ROLPLAY — ICONOS PARA public/

Este ZIP contiene DIRECTAMENTE el interior de `public/`.
No necesitas crear otra carpeta `public`.

Estructura:
public/
├── favicon.svg
├── icons.svg
├── manifest.json
└── icons/
    ├── android/       Capacitor / Android APK
    ├── ios/           iPhone/iPad
    ├── linux/         Electron Linux
    ├── macos/         Electron macOS
    ├── master/        Master 2048 + transparentes
    ├── pwa/           PWA
    └── windows/       Electron Windows

Paleta:
NEGRO + ROJO NEÓN. Se eliminó el azul/cian del diseño original.

PWA:
manifest.json ya apunta a /icons/pwa/...

iOS:
<link rel="apple-touch-icon" href="/icons/ios/apple-touch-icon-180x180.png">

Electron:
Windows: icons/windows/icon.ico
macOS: icons/macos/icon.icns
Linux: icons/linux/icon-512x512.png

Capacitor:
Los iconos Android están organizados por densidad en icons/android/.
