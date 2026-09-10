# cost-tracking-family — VPS deploy next to QuickDish

This app shares the QuickDish VPS edge (`nginx-proxy` on ports 80/443). It does **not** bind public ports. Traffic for **`https://ai-eos.it`** (and **`www.ai-eos.it`**) is routed by QuickDish nginx with **HTTP Basic Auth**.

## Prerequisites

1. QuickDish production stack is already running (`quickdish_default` Docker network exists).
2. DNS: create **A** records for **`ai-eos.it`** and **`www.ai-eos.it`** → same VPS IP as QuickDish (this is a separate domain; both can share one server).
3. Docker Compose v2 on the VPS.
4. Repo on the server next to QuickDish (or anywhere; compose only needs this project + the external network).

## Architecture

```
Internet :80/:443
        │
   nginx-proxy (QuickDish)
        ├── quickdishapp.com     → QuickDish
        └── ai-eos.it (+ www) + Basic Auth
                ├── /api/ → cost-tracking-backend:3000
                └── /     → cost-tracking-frontend:80
                            └── SQLite volume
```

## 1 — Create Basic Auth password (QuickDish deploy)

On the VPS, in the **QuickDish** `deploy/` directory:

```bash
cd /path/to/QuickDish/deploy

# Install apache2-utils if needed (htpasswd)
sudo apt-get install -y apache2-utils

htpasswd -c nginx/.htpasswd-family family
# Enter a strong shared family password when prompted.
# To add another user later (without -c): htpasswd nginx/.htpasswd-family otheruser
```

`nginx/.htpasswd-family` is gitignored. Compose mounts it into `nginx-proxy`.

## 2 — Start the family app

```bash
cd /path/to/cost-tracking-family/deploy
docker compose -f docker-compose-prod.yml up -d --build
```

Confirm containers are on the shared network:

```bash
docker network inspect quickdish_default --format '{{range .Containers}}{{.Name}} {{end}}'
# should list cost-tracking-backend and cost-tracking-frontend among QuickDish services
```

## 3 — Enable family routing on nginx (HTTP bootstrap)

Create Basic Auth (step 1), then apply the **family overlay** so QuickDish nginx mounts the family config without changing the base compose for other hosts:

```bash
cd /path/to/QuickDish/deploy

# Optional in deploy/.env (default is family.http-bootstrap.conf):
# FAMILY_NGINX_CONF=family.http-bootstrap.conf

docker compose -f docker-compose-prod.yml -f docker-compose.family.yml up -d nginx
```

Test HTTP (expect Basic Auth challenge, then the app):

```bash
curl -I http://ai-eos.it/
curl -u family:'YOUR_PASSWORD' http://ai-eos.it/api/health
```

## 4 — Issue Let’s Encrypt certificate

```bash
cd /path/to/QuickDish/deploy
set -a && source .env && set +a

docker compose -f docker-compose-prod.yml --profile certbot run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d ai-eos.it -d www.ai-eos.it \
  --email "$CERTBOT_EMAIL" --agree-tos --non-interactive
```

Cert files land under `live/ai-eos.it/` (first `-d` name).

## 5 — Switch family nginx to HTTPS

In QuickDish `deploy/.env`:

```bash
FAMILY_NGINX_CONF=family.conf
```

Then:

```bash
cd /path/to/QuickDish/deploy
docker compose -f docker-compose-prod.yml -f docker-compose.family.yml up -d nginx
```

Verify:

```bash
curl -I https://ai-eos.it/
curl -u family:'YOUR_PASSWORD' https://ai-eos.it/api/health
# expect {"status":"ok"}
```

Also confirm QuickDish is still healthy on `https://quickdishapp.com`.

## Redeploy family app only

```bash
cd /path/to/cost-tracking-family/deploy
docker compose -f docker-compose-prod.yml up -d --build
```

## Backup SQLite

```bash
docker run --rm -v cost-tracking-family_sqlite_data:/data -v "$(pwd)":/backup alpine \
  cp /data/transactions.db /backup/transactions-$(date +%Y%m%d).db
```

(Also back up `transactions.db-wal` / `transactions.db-shm` if present while the app is stopped, or use SQLite `.backup` for a consistent copy.)

## Security notes

| Layer | Control |
|-------|---------|
| Edge | Only `nginx-proxy` publishes 80/443 |
| Access | HTTP Basic Auth on the whole family site (SPA + API) |
| TLS | Separate Let’s Encrypt cert for `ai-eos.it` / `www.ai-eos.it` |
| API | Swagger disabled when `NODE_ENV=production`; no mock seed data |
| Data | Named Docker volume `sqlite_data` |

Change the Basic Auth password periodically with `htpasswd` and restart `nginx-proxy`.
