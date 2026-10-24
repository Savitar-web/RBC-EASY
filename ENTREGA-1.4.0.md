# RBC EASY 1.4.0

Producción: https://rbc-easy-lyart.vercel.app

## Biblioteca y edición

- Biblioteca compartida en Biblias Maker y Modo Escritor: 720 separadores, 480 marcos, 7.190 símbolos, 109 estilos de letras y 10.919 diseños de arte, incluidos kaomojis, ASCII, Unicode, puntos y monoespaciado.
- Inserción en el cursor, marcos alrededor de la selección, selección múltiple de símbolos, búsqueda, categorías, favoritos y recientes. Los estilos de texto pueden aplicarse a una selección o activarse al escribir, sin transformar importaciones ni pegados completos.
- Conversor local de imágenes a ASCII o puntos: anchura, contraste, inversión y recorte automático de márgenes vacíos. Permite guardar diseños propios sin subir las imágenes.
- Los nombres y presentaciones de perfiles admiten Unicode y emojis. La vista previa y los perfiles interpretan los prefijos compatibles de Amino/Kyodo y el formato de WhatsApp mediante el renderizador seguro existente. Migración de perfiles aplicada en Supabase.
- La lectura en voz alta normaliza las letras decoradas sin modificar el documento. La exportación PDF conserva los glifos decorativos y permite recuperar el contenido original mediante sus metadatos.

## Recursos sin conexión

Se incluyen nueve fuentes locales WOFF2 de Noto y Unifont, aproximadamente 5,17 MB. Su cobertura fue contrastada con los 8.667 caracteres distintos usados por la colección y las muestras de letras: ninguno quedó sin una fuente de respaldo. Se incluyen sus licencias y los créditos de las colecciones MIT.

La instalación inicial incluye las fuentes, los catálogos y el código de las funciones. Los paquetes Electron y Capacitor llevan estos mismos recursos dentro de la aplicación. No necesitan instalar paquetes de fuentes del sistema ni consultar un proveedor externo para mostrarlos. La forma o el color de algunos emojis puede variar con el motor del dispositivo; no se promete cobertura de cualquier carácter Unicode ajeno a esta colección.

## Archivos

- Instalador: `C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.0\RBC-EASY-Setup.exe`
- Portable: `C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.0\RBC-EASY-Portable.exe`
- APK firmado: `C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.0\RBC-EASY-1.4.0.apk`
- Proyecto Android: `C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\android`

## Verificación y límites

TypeScript y compilación de producción correctos. Pruebas de cursor UTF-16, acentos, escritura automática, composición de teclado, marcos, catálogo, formato escapado, lectura y codificación MP3 correctas. PDF con Unicode y recuperación del texto comprobados en navegador. Las nueve fuentes se decodificaron correctamente en Electron 45. Diseño revisado en móvil y escritorio.

La configuración pública de correo de Supabase sigue necesitando un SMTP para registros y recuperación de usuarios externos; su correo de prueba no equivale a un servicio de correo público. Esta entrega no configura un proveedor nuevo. Las pruebas realizadas no sustituyen una prueba física en cada versión de Android o iOS.

Evidencias y comprobaciones están en `work/`, incluidos los informes de cobertura de fuentes, integridad de producción y las capturas de la biblioteca. Los cambios anteriores de seguridad, almacenamiento local, publicación y accesos directos se conservan.
