# RBC EASY 1.4.1

Web y PWA: https://rbc-easy-lyart.vercel.app

## Cambios

- Ocho opciones de voz neural local: David (España), Claude (México), Daniela (Argentina), Sharvard masculina y femenina (España), MLS 10246 y MLS 9972 (compactas, España), y Ald (México). Sharvard comparte un modelo entre sus dos voces. No requieren cuenta, clave de API ni pagos por caracteres. Las voces compactas tienen menor fidelidad que las de mayor calidad; no se presentan como equivalentes a Speechify.
- El lector procesa primero un fragmento corto y prepara el siguiente mientras reproduce el actual. Reutiliza la preparación en curso y permite elegir lectura directa con voces del dispositivo. El tamaño del documento ya no determina cuánto texto debe sintetizarse antes de empezar. La primera carga del modelo y la generación completa de un MP3 siguen dependiendo del equipo.
- Integración nativa con el TTS de Android, incluidos motores Google o Samsung instalados. Se añadieron instrucciones y un botón para abrir sus ajustes. El manifiesto permite descubrir servicios TTS; no solicita acceso al micrófono. En web/iOS/Windows se muestran las voces que el sistema exponga al navegador.
- Las letras decoradas se normalizan para la lectura sin modificar el original. El corrector conserva las decoraciones, figuras y bloques de arte, incluso cuando están junto a signos de puntuación.
- Ambiente: composiciones normalizadas a un volumen más audible, conservando estéreo y 192 kbps. Salida con ganancia controlada para iOS, recuperación tras una interacción del usuario y al volver a la app, y protección frente a cambios de estado durante la preparación nativa. Se mantiene el límite del 40 % y el silencio durante la lectura.
- Arranque: pantalla inicial de comprobación antes de Inicio en la primera instalación. El panel cabe dentro de la pantalla y conserva su propio desplazamiento en pantallas cortas. Los inicios posteriores no repiten el instalador completo. Desde Datos, una instalación completa muestra «Tu espacio está al día»; una incompleta recupera el porcentaje guardado.
- Descargas: más conexiones paralelas, dos modelos en paralelo cuando el dispositivo lo permite, segmentos persistentes y velocidad reciente. Los archivos fallidos se omiten y quedan pendientes de reintento; los demás se conservan. La aplicación sólo instala los recursos compilados necesarios, no el repositorio de desarrollo.
- Inicio de sesión: acceso directo a Proyectos para sesiones recordadas y para quienes ya eligieron trabajar localmente. Cuenta sigue disponible desde Proyectos. Se evita mostrar brevemente el perfil durante el acceso desde Empezar.
- Explorar utiliza su fondo propio sin dejar aparecer el de Proyectos mientras se carga. Android reciente ajusta el área del WebView a las barras del sistema mediante la opción nativa de Capacitor.
- Selección móvil: iconos centrados, botones de tamaño táctil y posición compatible con el teclado. La pulsación larga vuelve a servir para seleccionar; los comentarios de párrafo tienen una acción explícita en Opciones. Decoración permanece en Opciones en móvil y conserva el acceso rápido en escritorio.
- Cerrar una pestaña conserva la hoja y su nombre en Hojas. Las pestañas visibles se numeran por orden, y una misma hoja no se duplica al abrirla. Se corrigieron los cambios a la hoja ya activa y el alta de una hoja mientras había texto sin consolidar.
- Pestañas compactas de 30 px, cierre discreto y desplazamiento negro translúcido de 3 px. Doble clic para renombrar; el panel Hojas de ambos editores permite editar nombres y reabrir hojas conservadas, con nombres Unicode y sin duplicar borradores. El acceso rápido a Decoraciones se oculta también en dispositivos táctiles en horizontal.
- Se incorporaron seis ilustraciones no explícitas aportadas en ASCIIArt.txt, conservando sus espacios y saltos. Las ilustraciones sexuales del archivo no se incluyeron.
- Guardado agrupado con vaciado al salir o suspender la página, evitando escrituras grandes en cada pulsación y evitando guardar el estado vacío antes de recuperar los borradores.
- Catálogo ampliado a 325 bloques Unicode, con unos 80.000 caracteres respaldados por las fuentes incluidas. Carga bajo demanda y paginación. Los créditos se abren dentro del estudio, también en las aplicaciones nativas.

La biblioteca de la versión 1.4.0 se conserva: 720 separadores, 480 marcos, 109 estilos de letras y 10.925 diseños de arte, además del conversor local de imágenes y los diseños propios. Los nueve archivos de fuentes WOFF2 permanecen disponibles sin conexión.

## Archivos finales

- Instalador: `C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.1\RBC-EASY-Setup.exe`
- Portable: `C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.1\RBC-EASY-Portable.exe`
- APK firmado: `C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.1\RBC-EASY-1.4.1.apk`
- Salida original de Gradle: `C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\android\app\build\outputs\apk\release\app-release.apk`

## Verificación y límites

Panel Hojas revisado en navegador y con pruebas de renombrado Unicode, validación y reapertura. Compilación de producción con comprobación TypeScript; pruebas de reanudación de segmentos, archivos truncados, integridad, fallos parciales, estados del instalador, lector minimizado, controles de reproducción, codificación MP3 y protección Unicode del corrector. Los informes y comprobaciones de los artefactos están en `work/`.

Se conserva Triskelion en los iconos. El APK usa la clave de publicación existente; las credenciales privadas no se incorporan al frontend ni se publican. Los instaladores contienen el mismo frontend compilado que la web.

La velocidad de una descarga depende también del servidor y de la conexión. No se puede garantizar una velocidad equivalente a la tarifa del wifi ni sintetizar un documento entero instantáneamente. iOS y los navegadores pueden exigir una interacción para activar el audio o suspenderlo en segundo plano; la app permite retomarlo. Hace falta comprobar los resultados en dispositivos físicos Android/iOS: una compilación correcta no sustituye esa prueba.

Speechify no está integrado: su [API gratuita](https://speechify.ai/pricing) requiere cuenta y tiene un cupo mensual. Tampoco se redistribuyen las voces propietarias de Microsoft, Apple o Samsung. Las alternativas incluidas proceden del [catálogo oficial de Piper](https://github.com/rhasspy/piper/blob/master/VOICES.md), con atribuciones y licencias en la aplicación. Las instrucciones Android siguen la [ayuda oficial de texto a voz](https://support.google.com/accessibility/android/answer/6006983?hl=es).

Como pendiente previo del proyecto, el registro y la recuperación por correo para usuarios externos siguen necesitando un SMTP: el correo de prueba de Supabase no lo sustituye.

Android: mínimo API 28 (Android 9), compilado y dirigido a API 36. No se declara un máximo de SDK. No se afirma compatibilidad verificada con Android 17 ni con versiones futuras; requiere pruebas en esos dispositivos.

Vista del nuevo panel compartido: ![Panel Hojas](work/sheets-panel-desktop.png)

Verificación final: Vercel dpl_Et6Pj9viT6cZznGMRuLpMBC35AeZ (READY); 205 recursos verificados por SHA256, siete modelos accesibles; assembleRelease + lintRelease correctos; firma APK v2 válida con el certificado existente; los 205 recursos coinciden dentro del APK; icono Triskelion verificado en Setup, Portable y ejecutable interno; Android Studio abierto mediante Capacitor. SHA256SUMS.txt acompaña los tres artefactos.
