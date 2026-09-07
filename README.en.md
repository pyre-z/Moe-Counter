# Moe Counter! - An Anime-Style Counter Badge

> 🌐 [English](./README.en.md) | [中文](./README.md)

**Moe Counter!** is a self-hostable image counter badge service: each request increments the count and renders it as a cute image badge. It is designed for personal blogs, GitHub READMEs, and personal homepages.

This repository is a fork of [journey-ad/Moe-Counter](https://github.com/journey-ad/Moe-Counter), keeping all upstream themes and features while adding **PostgreSQL storage support**, **counter-name whitelist management**, **i18n (Chinese/English)** and a production-ready **Docker Compose** deployment configuration.

<p align="center">
  <img alt="Moe Counter!" src="https://count.pyre-z.me/@Moe-counter.github?name=Moe-counter.github&theme=moebooru&padding=7&offset=0&align=top&scale=1&pixelated=1&darkmode=auto">
</p>

## ✨ Features

- **Many anime themes**: 56 built-in digit image themes, including Hatsune Miku, A-SOUL, Minecraft, Capoo and the exclusive **sylvie** theme
- **SVG badge output**: dynamically generates SVG images per request; digit images are base64-embedded — no extra static asset requests
- **Memory-first counting**: counts increment in memory and flush to the database in batches at a configurable interval — friendly to high concurrency
- **Multiple database backends**: SQLite (default), MongoDB, PostgreSQL (added in this fork)
- **Real-time flush option**: set `DB_INTERVAL=0` to persist on every request, avoiding count loss on container restarts
- **Rich parameters**: zero-padding, spacing, scaling, alignment, dark mode, pixelated style, prefix and more
- **Counter-name whitelist (optional)**: set `ADMIN_TOKEN` to lock down which counter names may be accessed; manage entries dynamically via a Web admin page or API
- **i18n**: built-in Chinese and English (Chinese by default), supports `?lang=` and browser-language auto detection
- **Zero frontend dependency**: just drop an `<img>` tag into your HTML

## 🌈 Theme Preview

A subset of themes is shown below. Visit the [live demo](https://count.pyre-z.me) to browse and switch among all 56 themes. New themes are welcome at the [upstream repository](https://github.com/journey-ad/Moe-Counter).

<p align="center">
  <img alt="sylvie" src="https://count.pyre-z.me/@demo?theme=sylvie">
  <img alt="moebooru" src="https://count.pyre-z.me/@demo?theme=moebooru">
  <img alt="miku" src="https://count.pyre-z.me/@demo?theme=miku">
  <img alt="minecraft" src="https://count.pyre-z.me/@demo?theme=minecraft">
  <img alt="3d-num" src="https://count.pyre-z.me/@demo?theme=3d-num">
  <img alt="asoul" src="https://count.pyre-z.me/@demo?theme=asoul">
  <img alt="capoo-1" src="https://count.pyre-z.me/@demo?theme=capoo-1">
  <img alt="sketch-1" src="https://count.pyre-z.me/@demo?theme=sketch-1">
  <img alt="normal-1" src="https://count.pyre-z.me/@demo?theme=normal-1">
</p>

## 🎨 The sylvie Theme

`sylvie` is an original theme designed by **PyreZ**, the author of this repository. It draws a gothic dark chibi girl as the 0-9 digit characters (ten different poses such as holding a sign, winking, and sitting cross-legged), complete with cat-ear hoods, chain accessories, and purple star details.

- Preview: `https://count.pyre-z.me/@demo?theme=sylvie`
- Usage: `https://count.pyre-z.me/@<counter-name>?theme=sylvie`
- **Copyright and ownership belong to PyreZ. Unauthorized use in other projects or commercial use is prohibited.**

> Upstream themes (moebooru, miku, etc.) belong to their respective authors; `sylvie` is an original theme independently created by PyreZ.

## 🚀 Quick Start

### Docker Compose (Recommended)

#### Using PostgreSQL (this fork)

```shell
# 1. Clone this repository
git clone https://github.com/pyre-z/Moe-Counter.git
cd Moe-Counter

# 2. Create the database (PostgreSQL 13+)
# CREATE DATABASE moe_counter;

# 3. Write deploy/.env (compose reads env_file relative to the compose directory)
cat > deploy/.env <<'EOF'
APP_PORT=3000
APP_SITE=https://count.example.com
DB_TYPE=postgres
DB_URL=postgres://user:password@127.0.0.1:5432/moe_counter
DB_INTERVAL=0
LOG_LEVEL=info
EOF

# 4. Build and start
docker compose -f deploy/docker-compose.yml up -d --build
```

> This repository ships `deploy/docker-compose.yml`, which attaches to the `1panel-network` network by default to reach a 1Panel-managed PostgreSQL. Adjust the network name and `DB_URL` for other environments.

#### Using SQLite (simplest)

```shell
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e APP_PORT=3000 \
  -e DB_TYPE=sqlite \
  -e DB_INTERVAL=0 \
  --name moe-counter \
  moe-counter:local
```

### Run from Source

Requires Node.js >= 22 and pnpm >= 10.

```shell
git clone https://github.com/pyre-z/Moe-Counter.git
cd Moe-Counter
pnpm install

# SQLite mode
pnpm start

# Environment variable example
APP_PORT=3000 DB_TYPE=postgres DB_URL=postgres://user:password@127.0.0.1:5432/moe_counter pnpm start
```

### Reverse Proxy

The service listens on port `3000` by default:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and adjust the variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PORT` | Service listen port | `3000` |
| `APP_SITE` | Site URL used for page links | Request Host |
| `DB_TYPE` | Database type: `sqlite` / `mongodb` / `postgres` | `sqlite` |
| `DB_URL` | Database connection string (MongoDB / PostgreSQL) | Local default |
| `DB_INTERVAL` | Batch flush interval (seconds); `0` = real-time | `60` |
| `LOG_LEVEL` | Log level: `debug` / `info` / `warn` / `error` / `none` | `info` |
| `ADMIN_TOKEN` | Admin token. When set, enables the counter-name whitelist (only names in `tb_allow` plus `demo` are allowed) and exposes `/admin` page and `/admin/allow` API; empty = no restriction and admin routes disabled | empty |
| `GA_ID` | Google Analytics G-Tag ID (optional) | empty |

## 📖 Usage

### Counter Image

Request format:

```
https://count.pyre-z.me/@<counter-name>?theme=<theme>&padding=<n>&offset=<n>&scale=<n>&darkmode=<auto|0|1>
```

Example:

```markdown
![Moe Counter](https://count.pyre-z.me/@my-blog?theme=miku)
```

### Query JSON Data (no rendering)

```shell
curl https://count.pyre-z.me/record/@my-blog
# {"name":"my-blog","num":42}
```

### Health Check

```shell
curl https://count.pyre-z.me/heart-beat
# alive
```

## 🔒 Whitelist Management (optional)

Setting `ADMIN_TOKEN` enables the counter-name whitelist. When enabled, only counter names stored in the `tb_allow` table (plus the `demo` preview counter) can be requested; any other name returns `404`, preventing others from occupying or flooding your counters.

**Admin page** (recommended): open `https://count.pyre-z.me/admin` in a browser, enter `ADMIN_TOKEN`, and you can view/add/delete whitelisted names visually.

**Admin API**:

```shell
# List current whitelist
curl -H "Authorization: Bearer <ADMIN_TOKEN>" https://count.pyre-z.me/admin/allow

# Add a counter name
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://count.pyre-z.me/admin/allow/<counter-name>

# Remove a counter name
curl -X DELETE -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://count.pyre-z.me/admin/allow/<counter-name>
```

Admin changes take effect immediately and are persisted to the database. If you clear `ADMIN_TOKEN`, the service falls back to upstream behavior (any counter name allowed).

## 🌐 Internationalization

The homepage supports Chinese and English, defaulting to Chinese:

- Manual switch: `https://count.pyre-z.me/?lang=zh` (Chinese) or `?lang=en` (English)
- Auto detection: when `lang` is absent, the `Accept-Language` request header is used; unsupported browsers fall back to Chinese
- A one-click switch button ("English / 中文") is available at the top-right corner

To add a language, drop a JSON file into `locales/` (same structure as `zh.json` / `en.json`) and register it in `SUPPORTED_LANGS` in `index.js`.

## 🗄️ Database

The PostgreSQL tables are created automatically on startup:

```sql
CREATE TABLE IF NOT EXISTS tb_count (
    name VARCHAR(32) PRIMARY KEY,
    num  BIGINT NOT NULL DEFAULT 0
);

-- Whitelist table (used when ADMIN_TOKEN is enabled)
CREATE TABLE IF NOT EXISTS tb_allow (
    name VARCHAR(32) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> `DB_URL` uses the standard PostgreSQL connection string, e.g. `postgres://user:password@127.0.0.1:5432/moe_counter`.

## 📝 Differences from Upstream

- Added `db/postgres.js`; supports `DB_TYPE=postgres`
- Added counter-name whitelist (`tb_allow` table + `/admin` page + `/admin/allow` API) behind an optional `ADMIN_TOKEN`
- Added server-side i18n (`locales/zh.json` + `locales/en.json`), Chinese by default
- Added production deployment templates: `deploy/docker-compose.yml` and `deploy/.env.template`
- Added the original **sylvie** theme (copyright owned by PyreZ)
- Bilingual README (Chinese + English)
- Removed upstream HelloGitHub badge and Star History chart

## 🙏 Credits

- Upstream author [journey-ad](https://github.com/journey-ad)
- [A-SOUL_Official](https://space.bilibili.com/703007996)
- [moebooru](https://github.com/moebooru/moebooru)
- gelbooru.com NSFW
- [Icons8](https://icons8.com/icon/80355/star)
- And all the booru sites

## 📄 License

Licensed under the [MIT License](./LICENSE), **excluding all themes**.

- Upstream themes (`moebooru`, `miku`, `minecraft`, etc.) belong to their respective copyright owners.
- **The `sylvie` theme is copyrighted by and owned by PyreZ. All rights reserved. Unauthorized copying, modification, distribution, or commercial use is prohibited.**
