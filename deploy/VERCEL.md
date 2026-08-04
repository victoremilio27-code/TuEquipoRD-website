# Por qué hay un vercel.json y cuándo hay que borrarlo

## El problema que resuelve

El repositorio está conectado a un proyecto de Vercel que despliega
solo cada vez que se sube algo a `main`. Vercel sirve archivos
estáticos: **nunca ejecuta `tools/serve.js`**.

Eso dejaba el dominio en un estado peor que estar caído. Comprobado
contra el sitio en vivo:

```
https://www.tuequipord.com               → 200   las páginas se ven
https://www.tuequipord.com/api/planes    → 404
https://www.tuequipord.com/api/anuncios  → 404
https://www.tuequipord.com/api/sesion    → 404
```

Las páginas cargaban, pero el catálogo salía vacío y nadie podía
registrarse, entrar ni publicar. Quien entrara se llevaría la
impresión de que la plataforma no funciona, y Google indexaría páginas
sin contenido antes del lanzamiento.

## Qué hace

`vercel.json` manda cualquier ruta a `proximamente.html`, salvo
`/assets/`, que se deja pasar para el favicon. Añade además
`X-Robots-Tag: noindex` para que no se indexe la espera: una página de
«próximamente» posicionada sigue apareciendo en el buscador semanas
después de abrir.

`proximamente.html` es autónomo a propósito —los estilos y el logotipo
van dentro del archivo— porque la reescritura atrapa todas las rutas y
la página no puede depender de nada más.

**Nada de esto toca el sitio real.** Los archivos siguen en su sitio y
`npm start` en local funciona exactamente igual.

## Cómo revertirlo el día del lanzamiento

El sitio real no vive en Vercel, sino en el VPS (ver `README.md` de
esta misma carpeta). Cuando el VPS esté sirviendo:

1. En Vercel: **Settings → Domains**, quitar `tuequipord.com` y
   `www.tuequipord.com` del proyecto.
2. Apuntar el DNS a la IP del VPS:

   | Tipo | Nombre | Valor      |
   |------|--------|------------|
   | A    | `@`    | IP del VPS |
   | A    | `www`  | IP del VPS |

3. Borrar `vercel.json` y `proximamente.html` del repositorio.

Los pasos 1 y 2 son los que importan. El 3 es limpieza: mientras el
dominio no apunte a Vercel, ese despliegue deja de recibir visitas.

## Si en el futuro se quiere alojar todo en Vercel

Haría falta reescribir la API como funciones serverless y cambiar
SQLite por una base alojada, porque en Vercel no hay disco persistente
entre invocaciones. Es una reescritura del backend, no un ajuste de
configuración. Hoy no compensa: el servidor son 130 líneas sin
dependencias y un VPS de 5 dólares al mes lo sostiene de sobra.
