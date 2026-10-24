# RBC EASY 1.4.2

Producción: https://rbc-easy-lyart.vercel.app
Despliegue: dpl_9gLgREQNTgBGmHJ66BPFdQEtepCN

## Cambios

- Estudio con una única superficie de desplazamiento: cabecera, filtros, diseños y aviso de Unicode. El aviso y los créditos están al final; sólo flota la paginación. Controles compactos en móvil.
- Filas y columnas visibles en cada dibujo. Las tarjetas muestran un extracto acotado; los dibujos pequeños se muestran más grandes. La vista completa permite desplazarse en ambos ejes.
- Conversión local a imagen temporal con zoom. Los patrones Braille se rasterizan directamente para evitar glifos con cuadrículas artificiales. Se espera a las fuentes incluidas, se acota la memoria del lienzo y se libera el blob al cerrar. No se guarda una imagen ni se sustituye el texto original. Se conserva la elección de insertar con o sin bloque monoespaciado.
- El acceso rápido Decoración queda oculto en pantallas de hasta 700 px y en dispositivos de puntero táctil sin hover, también en horizontal. Permanece visible en escritorio; Opciones conserva su acceso en ambos editores. Se corrigió la clase ausente en el botón de Biblias Maker y se agregó un selector de respaldo por su etiqueta accesible.
- Descargas de modelos: se resuelve una vez la dirección final y se reutiliza para los tramos, evitando la redirección de cada segmento. Si expira o falla su acceso, se recupera la dirección original. Se conserva la validación de versión, rangos, tamaños y caché de segmentos de 4 MiB compatible con las descargas anteriores.
- Paralelismo acotado por dispositivo: hasta ocho tramos por modelo en escritorio, seis en móvil, dos en equipos de poca memoria y uno cuando se detecta ahorro de datos o 2G. Recursos pequeños: hasta diez peticiones; se conserva la continuación tras fallos y la reanudación.
- Escritura: contador derivado del texto, evitando un segundo renderizado por pulsación. Metadatos de figuras, acciones y comentarios sólo se serializan cuando cambian. El autoguardado usa espacios libres entre fotogramas, con plazo máximo y vaciado inmediato al salir/suspender. Las imágenes, animaciones y funciones se conservan.
- Las tarjetas fuera de la vista usan content-visibility y los extractos de arte limitan el trabajo de texto del navegador; las colecciones siguen completas y paginadas.

## Comprobaciones

TypeScript y compilación de Vercel; pruebas de dimensiones Unicode, guardado ocioso cancelable, metadatos por cambios, tramos paralelos, reanudación, redirección única, ensamblado exacto, archivos truncados, fallos parciales, corrector Unicode y liberación de la imagen temporal. Revisión visual a 390 px: sin desbordamiento horizontal; la imagen completa se genera y desaparece al cerrar.

## Descargas: alcance real

La prueba de red de este equipo obtuvo aproximadamente 1,7 s para la primera respuesta redirigida de un modelo y 341 ms para una petición directa al destino final. Son latencias de respuesta, no una promesa de multiplicar la velocidad total. La velocidad final depende de la red y del servidor/CDN; no se infla el indicador ni se puede garantizar saturar cualquier Wi-Fi. Los aproximadamente 563 MiB completos se conservan para incluir todas las voces; no se elimina contenido para aparentar más velocidad.

Referencias técnicas: [rangos HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Range), [descarga y caché oficial de Hugging Face](https://huggingface.co/docs/huggingface_hub/main/en/guides/download). El acelerador Python/Rust hf_xet no puede instalarse como una dependencia del navegador; se usa descarga HTTP compatible con las cinco plataformas.

## Entregables

- C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.2\RBC-EASY-Setup.exe
- C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.2\RBC-EASY-Portable.exe
- C:\Users\SavitarXeno\Documents\reactProjects\rbc-easy\release\1.4.2\RBC-EASY-1.4.2.apk

Android: mínimo 9 (API 28), target 36, versionCode 9. Las versiones futuras y el audio en segundo plano de iOS requieren pruebas físicas. Se mantienen los límites y pendientes previos documentados en ENTREGA-1.4.1.md.
Verificación final: assembleRelease + lintRelease correctos (6 min 16 s), APK v2 firmado con el certificado existente, versión 1.4.2 / código 9, 205 recursos idénticos a producción dentro del APK, HTML y motor actuales en Electron, Triskelion verificado en Setup/Portable/ejecutable interno. SHA256SUMS.txt generado y Android Studio abierto.
