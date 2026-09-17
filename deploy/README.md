# Despliegue de MercaMaquinarias en un VPS

Ubuntu 24.04. El dominio ya está puesto en todos los archivos: `mercamaquinarias.com` (antes `tuequipord.com`).

El sitio corre como un proceso Node en el puerto 8080, escuchando solo
en local. Nginx lo publica hacia fuera en los puertos 80 y 443 y se
encarga del certificado.

**Requisito importante:** Node 22.5 o superior. La base usa el módulo
integrado `node:sqlite`, que no existe en versiones anteriores. Estos
pasos instalan Node 24 LTS.

---

## 1. Servidor y usuario

```bash
# Como root, recién creado el VPS
apt update && apt upgrade -y
apt install -y curl git nginx

# Node 24 LTS
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node --version   # debe decir v24.x

# Usuario sin privilegios para el sitio
adduser --system --group --home /var/www/tuequipord tuequipord

# Base de datos y fotografías de los anuncios. Fuera del proyecto: así
# un `git pull` no las toca y se respaldan aparte.
mkdir -p /var/lib/tuequipord/fotos
chown -R tuequipord:tuequipord /var/lib/tuequipord
```

## 2. Código

```bash
git clone https://github.com/victoremilio27-code/TuEquipoRD-website.git /var/www/tuequipord
chown -R tuequipord:tuequipord /var/www/tuequipord
```

El repositorio es **público**, así que `git clone` no pide credenciales.
Si algún día pasa a privado, hará falta una *deploy key* de solo lectura:
genera una clave en el servidor con `ssh-keygen -t ed25519 -C tuequipord-vps`,
copia `~/.ssh/id_ed25519.pub` y añádelo en GitHub bajo
**Settings → Deploy keys**. Luego clona por SSH:
`git@github.com:victoremilio27-code/TuEquipoRD-website.git`.

**Ese `chown` no es opcional.** Todo lo que toque este directorio después
—incluido cualquier `git` que se ejecute a mano— tiene que ser como
`tuequipord`, nunca como root: git escribe los objetos nuevos con el dueño
de quien lo ejecuta, y un solo `git pull` hecho como root deja el
repositorio inservible para el despliegue automático.

No hace falta `npm install`: el servidor y la API no usan dependencias.
Puppeteer es solo para capturas en desarrollo.

## 3. Secretos

```bash
# Genera un secreto de sesión largo y aleatorio
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Crea `/etc/tuequipord.env` con ese valor:

```
TUEQUIPO_SECRETO=<el valor generado arriba>

TUEQUIPO_CORREO=brevo
BREVO_API_KEY=<la clave de Brevo>
TUEQUIPO_REMITENTE=MercaMaquinarias <no-reply@mercamaquinarias.com>
TUEQUIPO_REVISION=dealers@mercamaquinarias.com
TUEQUIPO_SITIO=https://mercamaquinarias.com
```

Ciérralo para que solo root lo lea:

```bash
chmod 600 /etc/tuequipord.env
chown root:root /etc/tuequipord.env
```

`TUEQUIPO_SECRETO` firma las sesiones. Si cambia, todo el mundo pierde
la sesión iniciada; si se filtra, cualquiera puede falsificar una. No
lo pongas nunca en el repositorio.

## 4. Servicio

```bash
cp /var/www/tuequipord/deploy/tuequipord.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now tuequipord
systemctl status tuequipord
```

La base se crea sola en `/var/lib/tuequipord/tuequipord.db` a partir de
`db/schema.sql` la primera vez que arranca.

Comprueba que responde en local antes de seguir:

```bash
curl -I http://127.0.0.1:8080/
```

### Inventario de partida

La base nace vacía. Hay que sembrar la flota propia —los equipos de
alquiler y las camas de transporte—, que es inventario real y no
demostración:

```bash
sudo -u tuequipord TUEQUIPO_DB=/var/lib/tuequipord/tuequipord.db \
  node /var/www/tuequipord/tools/seed.js --solo-flota
```

**Nunca ejecutes `node tools/seed.js` sin `--solo-flota` en
producción**: sin esa bandera crea cinco anunciantes falsos con sus
anuncios, y limpiarlos después es una molestia evitable.

Repetirlo no duplica nada: si la flota ya está, no la toca.

### Cuentas del equipo

Se crean desde el servidor, con el correo ya verificado:

```bash
cd /var/www/tuequipord

sudo -u tuequipord node tools/admin.js crear principal@mercamaquinarias.com \
  "Administración MercaMaquinarias" --admin --exenta --empresa "MercaMaquinarias"

sudo -u tuequipord node tools/admin.js crear <tu-correo> "<Tu nombre>" --exenta
sudo -u tuequipord node tools/admin.js crear <correo-socio> "<Nombre>" --exenta
```

Cada comando imprime la contraseña generada **una sola vez**. Anótalas
antes de cerrar la terminal.

`--admin` da acceso a `/admin.html`; `--exenta` permite publicar sin
pagar. Ninguna de las dos se puede conceder desde el sitio.

Para ver quién tiene permisos internos: `node tools/admin.js listar`.

## 5. Nginx

```bash
cp /var/www/tuequipord/deploy/nginx.conf /etc/nginx/sites-available/tuequipord
# El archivo ya trae mercamaquinarias.com; no hace falta sustituir nada
ln -s /etc/nginx/sites-available/tuequipord /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 6. DNS

En el panel del registrador, apuntando a la IP del VPS:

| Tipo | Nombre | Valor        |
|------|--------|--------------|
| A    | `@`    | IP del VPS   |
| A    | `www`  | IP del VPS   |

Espera a que propague antes del paso siguiente; certbot falla si el
dominio todavía no resuelve al servidor. Verifica con
`dig +short mercamaquinarias.com`.

## 7. HTTPS

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d mercamaquinarias.com -d www.mercamaquinarias.com
```

Certbot reescribe la configuración de nginx para servir por HTTPS y
redirigir el HTTP. La renovación queda automática por temporizador.

El servicio ya arranca con `TUEQUIPO_HTTPS=1`, que marca las cookies de
sesión como `Secure`. Eso **solo funciona una vez que el certificado
está puesto**: si entras por HTTP puro con esa variable activa, el
navegador descarta la cookie y no se puede iniciar sesión. Por eso este
paso va antes de dar el sitio por publicado.

## 8. Cortafuegos

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## 9. Correo saliente (Brevo)

Sin esto no salen ni los códigos de verificación: nadie puede crear
una cuenta. Es el paso que más se olvida y el que más rápido se nota.

1. Crea la cuenta en [brevo.com](https://www.brevo.com) y añade el
   dominio en **Senders, Domains & Dedicated IPs → Domains**.
2. Brevo da tres registros DNS —**DKIM**, **DMARC** y un TXT de
   verificación—. Añádelos en el registrador junto al SPF:

   ```
   TXT  @   v=spf1 include:spf.brevo.com ~all
   ```

   Los tres son necesarios. Sin ellos el correo sale, pero Gmail y
   Outlook lo mandan a spam, que a efectos prácticos es lo mismo que
   no enviarlo.
3. Genera la clave en **SMTP & API → API Keys** y ponla en
   `/etc/tuequipord.env` como `BREVO_API_KEY`.
4. Comprueba que sale de verdad:

   ```bash
   sudo -u tuequipord TUEQUIPO_CORREO=brevo \
     node -e "require('./tools/correo').enviarBienvenida({para:'tucorreo@gmail.com',nombre:'Prueba'})"
   ```

El plan gratuito son 300 correos al día. Con el volumen inicial sobra;
si se queda corto, se nota porque la API empieza a devolver 402 y el
registro del servicio lo anota.

## 10. Mantenimiento automático

Caducar anuncios, avisar de vencimientos, purgar y respaldar la base:

```bash
mkdir -p /var/backups/tuequipord
chown tuequipord:tuequipord /var/backups/tuequipord

cp /var/www/tuequipord/deploy/tuequipord-tareas.* /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now tuequipord-tareas.timer
systemctl list-timers tuequipord-tareas.timer
```

Corre a las 5:00. Para ver qué haría sin hacer nada:

```bash
sudo -u tuequipord node tools/tareas.js --seco
```

Cada tarea es idempotente: repetirla no manda dos veces el mismo aviso.

**Saca los respaldos del servidor.** Un respaldo en la misma máquina no
protege del fallo que más importa, que es perder la máquina. Con
`rclone` a cualquier almacenamiento remoto:

```bash
rclone sync /var/backups/tuequipord remoto:tuequipord-respaldos
rclone sync /var/lib/tuequipord/fotos remoto:tuequipord-fotos
```

**Las fotos van en su propia línea a propósito.** La tarea de
mantenimiento respalda la base, que es donde están las rutas, pero no
las imágenes: son archivos y crecen mucho más rápido que la base.
Restaurar solo la base dejaría cada anuncio apuntando a una foto que
ya no existe.

## Actualizar el sitio

**No hace falta entrar al servidor.** Al fusionar un Pull Request en `main`,
GitHub Actions despliega solo: ver `.github/workflows/desplegar.yml`. El
resultado se mira en la pestaña **Actions** del repositorio, o con
`gh run list --workflow=desplegar.yml`.

Las migraciones de `tools/db.js` se aplican solas al arrancar.

### Qué hace el despliegue

`/usr/local/bin/desplegar-mercamaquinarias`, como root:

0. `chown -R tuequipord:tuequipord` sobre el repositorio. **No es decorativo:**
   si alguien entra al servidor y hace `git pull` como root, git deja objetos
   nuevos con dueño root y el siguiente despliegue falla con *insufficient
   permission for adding an object*. Pasó exactamente eso la primera vez.
1. `git fetch` y, si no hay nada nuevo, termina sin tocar el servicio.
2. `git merge --ff-only origin/main` — a propósito: si alguien hubiera
   hecho un commit a mano en el servidor, es preferible que el despliegue
   falle a que se fusione a ciegas.
3. Reinicia `tuequipord` y espera hasta 15 s a que el sitio responda.
4. **Si no responde, vuelve solo a la versión anterior** y la reinicia.
   Ojo: eso devuelve el código, no la base. Las migraciones son de ida;
   como solo añaden, una versión anterior sigue arrancando, pero una
   migración que borrara o renombrara algo rompería esa suposición.

### Cómo está montado el acceso

- Usuario `deploy`, sin contraseña, y una regla en `/etc/sudoers.d/deploy`
  que le deja ejecutar ese script y nada más.
- La llave de GitHub Actions vive en `/home/deploy/.ssh/authorized_keys`
  con la orden **forzada**: `command="sudo -n /usr/local/bin/desplegar-mercamaquinarias"`,
  sin pty ni reenvíos. Aunque el secreto se filtrara, esa llave no sirve
  para leer nada de la máquina — se comprobó pidiéndole
  `cat /etc/tuequipord.env` y ejecutó el despliegue igualmente.
- Los secretos del repositorio son `VPS_HOST` y `VPS_SSH_KEY`. La llave
  privada no queda en ningún PC.

### A mano, si alguna vez hace falta

```bash
cd /var/www/tuequipord
sudo -u tuequipord git pull
systemctl restart tuequipord
```

## Copias de seguridad

Toda la información vive en un archivo. Cópialo fuera del servidor con
regularidad; SQLite necesita `.backup` en vez de `cp` para no capturar
una escritura a medias:

```bash
sqlite3 /var/lib/tuequipord/tuequipord.db ".backup '/tmp/respaldo.db'"
```

## Ver qué pasa

```bash
journalctl -u tuequipord -f      # registro del sitio
tail -f /var/log/nginx/error.log # registro de nginx
```
