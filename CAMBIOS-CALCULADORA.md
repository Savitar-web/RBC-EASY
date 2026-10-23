# Calculadora, accesos y offline

- La calculadora, Ascendido, Conversión y Balística respetan el área segura superior. Sus controles conservan al menos 44 px y las pantallas pequeñas permiten desplazamiento.
- Ascendido incorpora navegación visible entre sus ocho herramientas. Los archivos de fondo y sus capas originales permanecen intactos. Biblias Maker y Escritor no cambian de diseño.
- Projects → Accesos permite fijar cada módulo con su icono original de RBC EASY.

## Instalación

Web: publicar `dist` en HTTPS, con fallback de rutas a `index.html`. Chrome/Edge ofrecen instalación donde esté disponible. Safari iOS requiere Compartir → Añadir a pantalla de inicio; Safari macOS, Archivo → Añadir al Dock. Cada módulo tiene manifest, identidad, icono y destino propios. El navegador o sistema confirma la instalación; una web no puede colocar iconos silenciosamente.

Electron: `npm run desktop:dist`. Los accesos lanzan el ejecutable con `--rbc-route=...`, en una nueva ventana de la aplicación aunque ya esté abierta. Windows usa `.lnk`, Linux `.desktop` y macOS un lanzador `.app`. Mantener el ejecutable en su ubicación después de crear accesos; en Linux el escritorio puede pedir marcar el lanzador como confiable.

Android: `npm run android:sync`, después compilar el APK. El plugin local RbcShortcuts solicita accesos fijados (Android 8+ y launcher compatible), con rutas en arranque frío o con la app abierta. No necesita permisos adicionales.

## Offline

El build genera un inventario de todos los recursos publicados y una versión por contenido. En la primera visita el service worker descarga el conjunto completo, incluyendo JS, CSS, imágenes, iconos y manifests, con cuatro descargas simultáneas. Se debe mantener la primera visita abierta hasta completar la descarga. Una actualización incompleta conserva la versión anterior. Electron y Capacitor incluyen los recursos en su paquete.

Los datos existentes continúan en IndexedDB/localStorage. La persistencia del almacenamiento depende del navegador; borrar los datos del sitio elimina sus datos y caché. Servicios externos, como la revisión gramatical remota y enlaces a otras webs, requieren Internet.

## Validación

Build TypeScript/Vite correcto; compilación Java de Android correcta. Chrome: 187 archivos precargados desde la primera visita, cinco rutas abiertas sin red, ocho herramientas de Ascendido y anchuras de 320/390/1440 px. Pruebas de generación de accesos para Windows/Linux/macOS con el sistema simulado; instalación real pendiente de verificar en cada dispositivo.

Los archivos heredados de TanStack Router, que no participan en la entrada activa React Router, se excluyen del chequeo. El build deja de ignorar errores de TypeScript.

Se restauraron los iconos originales para web, Android y Electron. No se regeneran imágenes de fondo.

La corrección de pantalla usa una sola altura dinámica y un único contenedor de desplazamiento en las páginas que no son editores. Se retiraron los desplazamientos fijos del nav y la superposición de la barra de estado de iOS.

Ascendido incorpora navegación lateral adaptable, superficies de cristal, entrada editable, historial persistente, desarrollo real de operaciones, porcentajes, validación del dominio real, multiplicación implícita, matrices persistentes, plantilla identidad, exportación PNG y de desarrollos, búsqueda de fórmulas y guías específicas.
