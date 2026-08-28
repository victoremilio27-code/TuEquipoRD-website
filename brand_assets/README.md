# MercaMaquinarias — paquete web

Todo lo necesario para el rebranding del sitio: logotipos, hero con la foto real,
imágenes para redes y la guía de marca.

## Estructura

```
img/  hero-limpio.jpg      foto sin texto → fondo del hero (el texto lo pone el HTML)
      hero-1600.jpg        foto + logotipo quemado, 16:9 (anuncios, presentaciones)
      hero-2400.jpg        igual, resolución alta
      og-1200x630.jpg      preview de WhatsApp, Facebook, X
      social-1080.jpg      cuadrado para Instagram
svg/  mercamaquinarias-horizontal-oscuro.svg    header del sitio
      mercamaquinarias-horizontal-claro.svg     fondo claro / documentos
      mercamaquinarias-horizontal-xzt-*.svg     facturas, contratos, firma corporativa
      mercamaquinarias-apilado-*.svg            móvil, rotulación
      lockup-sobre-foto.svg                     texto para superponer en el hero
      isotipo-tuerca.svg                        avatar, marca de agua
      favicon-512.svg                           favicon y app icon
      *-mono-blanco.svg / *-mono-negro.svg      un solo color
hero.html            hero listo para copiar
guia-de-marca.html   guía completa (colores, tipografía, botones, sellos)
```

## Cómo montar el hero

El texto **no** va quemado en la foto del sitio. El fondo es `img/hero-limpio.jpg` y encima
va `svg/lockup-sobre-foto.svg` como SVG inline. Así queda nítido en cualquier pantalla,
se puede cambiar sin reexportar la imagen y los buscadores leen el `<h1>`.

Las tres capas del hero, en orden: foto → velo oscuro (`.hero__scrim`) → contenido.
El velo no es decorativo: sin él el texto se pierde sobre la tierra iluminada.

Para SEO, envuelve el SVG en un `<h1>` con `aria-label` o pon un `<h1 class="sr-only">`
con el nombre.

## Tokens

```css
:root{
  --mm-noche:#071A2B;   /* fondo, header, footer */
  --mm-ambar:#F2A900;   /* marca, botón primario, precios */
  --mm-ambar-2:#C98A00; /* hover del primario */
  --mm-hueso:#F7F5EF;   /* secciones claras */
  --mm-neutro:#E7E6E0;  /* placeholders de imagen */
  --mm-acero:#60717D;   /* texto secundario, bordes */
  --mm-verde:#157A4B;   /* solo vendedor verificado */
}
```

Tipografía: **Archivo** 700/800 en titulares, cifras y precios · **Inter** 400/600 en
cuerpo e interfaz.

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Meta tags

```html
<meta property="og:image" content="https://TUDOMINIO/img/og-1200x630.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/svg/favicon-512.svg" type="image/svg+xml">
```

## Rendimiento

`hero-limpio.jpg` pesa unos 300 KB. Antes de publicar, conviértela a WebP o AVIF
(`cwebp -q 82`) y sirve la versión ligera con `<picture>`. Déjala con
`fetchpriority="high"` porque es el LCP de la página.

## Reglas de marca

- El logotipo no lleva biselado, degradado ni sombra dura. Solo la sombra suave del
  `lockup-sobre-foto.svg`, que existe únicamente para despegarlo de la foto.
- Ancho mínimo del lockup horizontal: 180 px digital · 35 mm impreso. Por debajo, isotipo.
- No recolorear el ámbar, no deformar, no usar el verde como color decorativo.
- El texto siempre sobre el tercio inferior de la foto, nunca sobre las máquinas.
