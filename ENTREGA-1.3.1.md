# RBC EASY 1.3.1

Web y PWA: https://rbc-easy-lyart.vercel.app

## Archivos

- APK firmado: `release/1.3.1/RBC-EASY-1.3.1.apk`.
- Original de Gradle: `android/app/build/outputs/apk/release/app-release.apk`.
- Instalador Windows: `release/1.3.1/RBC-EASY-Setup.exe`.
- Portable Windows: `release/1.3.1/RBC-EASY-Portable.exe`.
- Integridad: `release/1.3.1/SHA256SUMS.txt`.

Todos están dentro de C:/Users/SavitarXeno/Documents/reactProjects/rbc-easy.
El APK usa el certificado existente (SHA256 comienza 07c76b177c2ec48a), versión 1.3.1, código 5, Android mínimo 9 y objetivo Android 16. Se comprobó con apksigner y con los archivos finales incluidos. Los dos EXE y el ejecutable interno contienen el icono Triskelion verificado byte por byte contra el ICO del proyecto. No se ha aportado un certificado de firma de código de Windows.

## Cambios

- El instalador verifica tamaño e integridad antes de Cache.put, elimina encabezados de compresión incompatibles y evita recibir imágenes de una caché antigua al actualizar. Reintenta tres veces y conserva los archivos completos.
- Descarga tres recursos pequeños a la vez y limita a uno los modelos grandes para contener la memoria. APK y EXE aprovechan los recursos que ya incluyen. Indicador de bytes y velocidad real.
- David (España), Claude (México), Daniela (Argentina), Ald (México), en ese orden; David es la primera opción si no hay una preferencia guardada.
- Retroceso de perfiles/publicaciones hacia Explorar, Projects e Inicio. Módulos hacia calculadora, Projects e Inicio. Un modal abierto se cierra antes de salir. Se conserva el autoguardado y la hoja activa de Biblias Maker.
- Empezar abre Projects cuando hay una sesión guardada. Cerrar sesión permite volver a identificarse.
- Fondo de Explorar en una capa fija; en móvil se repite verticalmente sin cortes al desplazar.
- Comentarios y respuestas en perfiles, contador agregado de visitas, borrado por autor o dueño del perfil, límites de envío y moderación administrativa. Migración 202610240002_profile_social.sql aplicada y verificada en Supabase el 24 de octubre de 2026.
- Accesos nativos para Cuenta y Explorar, además de los módulos existentes; reutilizan la instancia de la app y sus documentos. Se consume correctamente el destino de los nuevos accesos en Android.
- Manifestos PWA con preferencia de reutilizar ventana cuando el navegador la admite.
- Firma Android separada del código en android/signing.properties, ignorado por Git. No compartas ese archivo ni el almacén de claves.
- Gradle fijado a 8.14.3, Java 21, paralelismo limitado y recarga automática de Gradle en Android Studio. Se abrió el proyecto y el registro confirma que terminó de indexar.

## Verificación

Compilación TypeScript/Vite correcta. Gradle assembleRelease y lintRelease correctos: cero errores, 20 advertencias. Firma APK verificada. Pruebas de descarga incompleta, reintento, integridad, conservación de caché, claves nativas, lector minimizado, ausencia de Web Speech, transporte Android, guardado Electron y PCM16/MP3. Navegación comprobada con las cadenas de regreso y el cierre de modales.
No se ha probado esta versión en un teléfono físico ni en un iPhone real.

## Límites y siguientes mejoras recomendadas

1. Configurar y probar un proveedor SMTP para registro/recuperación de usuarios públicos; el correo de prueba de Supabase no sustituye el envío público.
2. Probar instalación, descarga, reproducción y restauración en Android 9/actual e iOS reales. Los navegadores pueden pausar tareas al suspender una app.
3. iOS exige confirmar Añadir a Inicio y puede aislar los datos de iconos PWA distintos. No existe una instalación silenciosa que pueda garantizarse desde la web: se incluyen instrucciones y traslado local de documentos.
4. Añadir reportes de contenido, cuotas por usuario y alertas de almacenamiento/consumo de Supabase antes de abrir la comunidad a muchas personas.
5. Incorporar actualizaciones automáticas firmadas para escritorio y una distribución mantenida del APK. Si mueves el portable, crea de nuevo sus accesos directos.
6. Mantener respaldos locales periódicos y verificar restauración en otro dispositivo. Los escritos y la música siguen siendo locales; borrar los datos de la app puede eliminarlos.
7. La IPA requiere un entorno macOS/Xcode y queda fuera de esta entrega, según lo acordado.

## Cierre de Supabase — 24 de octubre de 2026

Comentarios y vistas de perfiles activos. Prueba transaccional superada: deduplicación de visitas, exclusión de visitas propias, creación y respuesta de comentarios, borrado autorizado, rechazo de borrado ajeno, antispam y permisos de tablas. Los datos de ensayo se revirtieron. La API pública también confirmó el esquema, la relación de avatares y el rechazo de operaciones de comentario/administración sin sesión. No fue necesario regenerar los instaladores ni desplegar otra vez: la versión 1.3.1 ya incluía el cliente.
