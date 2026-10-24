# RBC EASY — entrega web y comunidad

Proyecto Supabase: hjoxqzlmrlzwidffvpnt (RBC EASY, SOMAbody).
Sitio: https://rbc-easy-lyart.vercel.app

## Incorporado
- Cuenta por correo, perfil, avatar WebP y recuperación de contraseña/usuario mediante Supabase Auth.
- Acceso local sin cuenta; los borradores, música y fondos personales no se suben.
- Explorar por título, usuario y etiquetas; publicación explícita de hojas/carpetas o imágenes.
- Permisos de lectura, copia/descarga y edición; códigos distintos por alcance, rotación, solicitudes y revocación.
- Control de concurrencia al editar y restauración de las últimas diez revisiones.
- Imágenes de publicación convertidas a WebP (1920 px, máximo 700 KB); avatares 512 px, máximo 150 KB.
- Respaldo/restauración local con interfaz nueva, validación y exclusión de credenciales.
- MP3 reales con Piper neural: DaveFX (España) y Ald (México), sin API de pago. Modelos descargados bajo demanda y guardados en el dispositivo. Microsoft y otras voces del sistema disponibles para escuchar.
- Lectura neural en los dos editores, con fragmentos, pausa, posición y velocidad; exportación reanudable por fragmentos.
- TypeScript y configuración Java 21 de Android/VS Code corregidos.

## Único servicio externo pendiente
Supabase SMTP de prueba no permite enviar correo a usuarios ajenos al equipo y tiene un límite de dos correos por hora. Registro público, enlaces de recuperación y confirmación requieren configurar SMTP (puede ser un proveedor gratuito). No se desactivó la confirmación del correo. No hay una cuenta SMTP ni credenciales del proveedor disponibles.
Documentación: https://supabase.com/docs/guides/auth/auth-smtp
Site URL y redirect de producción ya están configurados.

## Límites reales
- Ocultar selección/copiar es una restricción de interfaz, no DRM: un lector puede capturar lo que ve. RLS sí protege el acceso a publicaciones privadas y la edición.
- Los modelos se descargan una vez por voz y origen. Borrar los datos del navegador borra sus descargas.
- El sistema operativo puede suspender la web/PWA: los trabajos guardan fragmentos y se reanudan al volver. No se promete ejecución ilimitada con el navegador cerrado.
- Versión 1.2.0: se generaron instalador, portable y APK release sin firmar; Android Studio se abrió mediante cap open android.

## Verificación
- `npm run build`: TypeScript y paquete de producción.
- `android/gradlew.bat -p android help`: Gradle 8.14.3 con Java 21, correcto.
- SQL transaccional en `work/community-rls-test.sql`: aislamiento privado, propietario, lectura por código, prohibición de escalada a copia/edición y revocación. Datos de prueba revertidos.
- MP3 neural decodificado por AudioContext; prueba de voz guardada bloqueando red externa y velocidad 1.5x correcta.
- Archivos de prueba en `work/`, excluidos del despliegue.

Las migraciones de `supabase/migrations/` ya se aplicaron al proyecto. No volver a ejecutar la migración inicial sobre tablas existentes.


## Entrega final 1.2.0
- Producción verificada: https://rbc-easy-lyart.vercel.app (despliegue dpl_Esz3kQTXxJ2hdPwHHhujAepbpDU4).
- Electron portable: release/1.2.0/RBC-EASY-Portable.exe
- Electron instalador: release/1.2.0/RBC-EASY-Setup.exe
- Android sin firmar: android/app/build/outputs/apk/release/app-release-unsigned.apk
- APK y Electron contienen el mismo bundle index-BXpXsPmZ.js publicado en Vercel.
- Iconos de aplicación Triskelion; iconos extraídos del instalador y portable coinciden.
- Cuenta con Cuenta.png, recorte/zoom/tamaño/autoajuste de avatar, términos y cuentas recordadas locales sin contraseñas.
- Perfil público del autor, presentación y avatar, fechas originales y fecha de actualización de publicaciones.
- Formato seguro compartido entre vistas previas y publicaciones, con figuras en posición.
- Likes, vistas por visitante/día, comentarios, respuestas, moderación, cierre de comentarios y eliminación de publicación.
- Mis Biblias permite seleccionar hojas al guardar, crear carpetas, mover, renombrar, eliminar y publicar carpetas completas.
- Nuevo interior del panel Datos; deslizador de balística con el control temático común.
- Exportación PDF real verificada con centrado, código, figuras y comentarios. Un PDF exportado por RBC incluye los datos para recuperar el formato al importarlo. Los PDF externos se importan conservando cada página como imagen con sus anotaciones, en orden; no se promete reconstrucción editable exacta de documentos externos.
- Voces neurales: México (Ald y Claude), Argentina (Daniela), España (David). Otras variantes como Colombia dependen de las voces instaladas disponibles para lectura; no se etiquetaron modelos de otros países como colombianos.
- Explorar está preparado para public/images/backgrounds/BE.png; mientras falta esa imagen utiliza el fondo alternativo. Hay que agregarla y desplegarla para verla en producción.
- Fondos verticales personalizados: mosaico de 697 × 1159 px con la capa de oscurecimiento existente.
- Las migraciones 202610230003_roles_social y 202610230004_publication_dates se aplicaron y sus pruebas de permisos pasaron.

El único servicio de cuenta pendiente de configurar es SMTP para correo público. La confirmación no fue desactivada.

## Actualización web: instalación local y moderación
- Producción READY: https://rbc-easy-lyart.vercel.app · dpl_6ukbdpoSjp5iGyyftrMVTdVE13GH.
- Bundle principal index-CRd26NCx.js. Tamaño inicial reducido de ~1,95 MB a ~0,77 MB mediante módulos diferidos; todos sus archivos se incluyen en el paquete offline.
- Instalación con consentimiento, FCC.png, progreso por bytes recibidos, pausa y reintento por archivos completos. Paquete publicado: 380859409 bytes (~363,2 MiB), 172 recursos internos y cuatro modelos neurales con sus configuraciones.
- La instalación se verifica en Cache Storage, sin depender de una bandera localStorage. Se solicita persistencia al navegador, se reutilizan archivos iguales y se comprueba que los recursos siguen presentes. Las actualizaciones se preparan en segundo plano y conservan temporalmente scripts anteriores para pestañas abiertas.
- Panel recuperable desde Datos > Datos sin conexión. La comunidad requiere conexión; el sistema puede liberar almacenamiento si falta espacio.
- Se aplicó 202610240001_install_moderation.sql. Administrador activado para la cuenta verificada savitarxeno@gmail.com (@SavitarInfinity), mediante registro privado de identificador de usuario, sin conceder privilegios por metadatos del cliente.
- Cuenta > Administración permite suspender/restablecer participación, retirar publicaciones e imágenes y ocultar comentarios, con registro de motivos. Las suspensiones bloquean publicación, edición en línea y comentarios mediante triggers del servidor, pero conservan lectura y trabajo local.
- Términos versión 2026-10-24: reglas contra pornografía, spam, acoso, amenazas, insultos, suplantación y divulgación de datos ajenos; se describe la moderación y revisión por Contacto.
- Verificación: compilación completa; integridad/tamaño de todos los archivos locales; HTTP correcto de todos los recursos declarados en producción; descarga completa; panel ausente tras recargar/actualizar; calculadora operativa con servidor detenido, (17+25)*2=84; cuatro MP3 sintetizados y decodificados con la red de modelos bloqueada; pruebas SQL de permisos, suspensión, restablecimiento y moderación aprobadas, con fixtures revertidos; acceso a Administración rechazado para otra cuenta en producción; revisión móvil 390×844.
- Los binarios nativos anteriores permanecen en la versión de la entrega precedente; esta solicitud actualizó la web/PWA y el backend, sin generar nuevos EXE/APK.
