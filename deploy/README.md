# Despliegue de TuEquipoRD en un VPS

Ubuntu 24.04. Sustituye `DOMINIO` por el dominio real en todos los pasos.

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
mkdir -p /var/lib/tuequipord
chown tuequipord:tuequipord /var/lib/tuequipord
```

## 2. Código

```bash
git clone https://github.com/victoremilio27-code/TuEquipoRD-website.git /var/www/tuequipord
chown -R tuequipord:tuequipord /var/www/tuequipord
```

El repositorio es privado, así que `git clone` pedirá credenciales. Lo
más limpio es una *deploy key*: genera una clave en el servidor con
`ssh-keygen -t ed25519 -C tuequipord-vps`, copia el contenido de
`~/.ssh/id_ed25519.pub` y añádelo en GitHub bajo
**Settings → Deploy keys** del repositorio. Luego clona por SSH:
`git@github.com:victoremilio27-code/TuEquipoRD-website.git`.

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
TUEQUIPO_CORREO=contacto@DOMINIO
TUEQUIPO_REMITENTE=TuEquipoRD <contacto@DOMINIO>
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

## 5. Nginx

```bash
cp /var/www/tuequipord/deploy/nginx.conf /etc/nginx/sites-available/tuequipord
sed -i 's/DOMINIO/tudominio.com/g' /etc/nginx/sites-available/tuequipord
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
`dig +short tudominio.com`.

## 7. HTTPS

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tudominio.com -d www.tudominio.com
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

## Actualizar el sitio

```bash
cd /var/www/tuequipord
sudo -u tuequipord git pull
systemctl restart tuequipord
```

Las migraciones de `tools/db.js` se aplican solas al arrancar.

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
