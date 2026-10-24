# RBC EASY 1.3.2 — 24 de octubre de 2026

Producción: https://rbc-easy-lyart.vercel.app

## Entrega

Archivos bajo `C:/Users/SavitarXeno/Documents/reactProjects/rbc-easy/release/1.3.2/`:

- `RBC-EASY-1.3.2.apk`: firmado con el certificado existente; código 6, Android mínimo 9, objetivo Android 16.
- `RBC-EASY-Setup.exe`: instalador de Windows x64.
- `RBC-EASY-Portable.exe`: portable de Windows x64.
- `SHA256SUMS.txt`: comprobación de integridad de los tres archivos.

Los EXE usan Electron 45.0.0. El empaquetador comprueba la versión del motor antes de reutilizar un runtime, evitando incluir un Electron anterior por error. No hay certificado Authenticode de Windows configurado; el APK sí está firmado. Android Studio se abrió con el proyecto sincronizado.

## Cambios de esta actualización

- Descarga de archivos grandes mediante segmentos de 4 MiB, con hasta cuatro conexiones según el dispositivo. Se conservan los segmentos terminados al pausar o fallar. Los servidores sin soporte de rangos usan descarga normal.
- Cada archivo se valida antes de guardarlo. Los fallos se reintentan y después se omiten automáticamente, continuando con los demás. Los pendientes se muestran y pueden recuperarse; una instalación incompleta nunca se presenta como completa. No se borran documentos ni modelos terminados al reintentar.
- Accesos Android sin duplicar los ya fijados, protocolo `rbceasy://open?route=...` para abrir módulos en APK/EXE, destinos limitados a pantallas conocidas y reutilización de la instancia. El instalador registra el protocolo en Windows. El portable crea accesos .lnk hacia su propio ejecutable; si se mueve, hay que recrearlos.
- La preparación offline deja de bloquear la instalación de una PWA. Se conservan las instrucciones y el traslado local para entornos con almacenamientos separados.
- Auditoría privada de accesos denegados al panel: usuario/correo verificados cuando hay sesión; IP y ubicación aproximada cuando el proveedor las facilita, dispositivo declarado, fechas, horas y contador agrupado por minuto. Los visitantes anónimos no reciben una identidad inventada.
- Migración `202610240003_access_audit.sql` aplicada y función `admin-gate` desplegada. Sólo el servidor escribe registros. La consulta exige el administrador existente. Limpieza automática cada hora de entradas con más de 30 días; la consulta sólo muestra los últimos 30 días. Límite de registro por identidad y ventana, con tope global de nuevas entradas por hora.
- Restricciones CSP, bloqueo de marcos externos y protección de los IPC de Electron. El evaluador de la calculadora usa un analizador numérico sin ejecutar JavaScript introducido por el usuario. Código de producción sin mapas de fuentes; Android usa R8 y desactiva depuración del WebView en release.

## Comprobaciones

TypeScript/Vite y Gradle `assembleRelease lintRelease` correctos. Pruebas de rangos paralelos, ensamblado exacto, recuperación de segmentos, fallback, cancelación, archivos truncados, reintentos y continuación tras fallo. Pruebas de parser y rechazo de código ejecutable, guardado Electron, transporte de archivos Android, navegación, lector minimizado y codificación PCM16/MP3. Prueba real de síntesis local dentro de Electron 45 con la CSP activada.

La API del registro devuelve «Acceso restringido» a visitantes. Las funciones de lectura/escritura privadas rechazan llamadas anónimas. La ruta pública de administración muestra el bloqueo correcto. `work/audit-test.sql` contiene una comprobación transaccional adicional para ejecutarla en SQL Editor; no se pudo completar esa prueba adicional porque se desconectó la sesión del navegador. La migración y el receptor sí quedaron desplegados y sus rechazos fueron comprobados por HTTP.

Auditoría npm de dependencias de producción: cero vulnerabilidades reportadas tras actualizar Electron y fast-uri. Los recursos publicados se comprobaron mediante tamaño y SHA256 y los cuatro modelos de voz se comprobaron accesibles.

## Límites reales y pendientes

- No existe cifrado de JavaScript que impida inspeccionar o reconstruir un cliente entregado al usuario. Las decisiones de autorización se toman en Supabase, no en el código oculto. R8/minificación dificultan la inspección, pero no sustituyen el control de permisos. Los documentos locales mantienen su almacenamiento y autoguardado existentes; no se añadió un cifrado de documentos con contraseña.
- Vercel incluye mitigación DDoS. Ningún sistema puede garantizar inmunidad absoluta. La limitación del registro reduce abuso de esa operación; no equivale a una protección global de todas las APIs de Supabase.
- La velocidad depende de la red y del servidor de modelos; no se promete un mínimo de MB/s. Las tareas pueden pausarse si el sistema suspende la aplicación.
- iOS exige confirmar Añadir a Inicio y puede aislar datos entre instalaciones PWA distintas. No se puede forzar silenciosamente un icono ni compartir siempre su almacenamiento. Se incluye traslado local de documentos.
- Falta configurar SMTP para que el registro y la recuperación envíen correos a usuarios públicos fuera del correo de prueba de Supabase.
- Pendientes pruebas en Android/iOS físicos, actualización automática firmada de escritorio, reportes de contenido y cuotas/alertas de consumo antes de una apertura masiva. La IPA sigue pendiente del entorno macOS/Xcode acordado.

Referencias: https://vercel.com/docs/vercel-firewall · https://supabase.com/docs/guides/functions/auth · https://www.electronjs.org/blog/electron-45-0
