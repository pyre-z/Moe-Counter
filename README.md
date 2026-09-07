# Moe Counter! - 多种风格可选的萌萌计数器

> 🌐 [中文](./README.md) | [English](./README.en.md)

**Moe Counter!** 是一个可自托管的图片计数器徽章服务：每次请求自动 +1，并把计数渲染为可爱的图片徽章，适合放在个人博客、GitHub README 或个人主页中。

本仓库是 [journey-ad/Moe-Counter](https://github.com/journey-ad/Moe-Counter) 的 fork，在保留上游全部主题与功能的基础上，新增了 **PostgreSQL 存储支持**、**计数名白名单管理**、**页面 i18n 国际化**与一套可直接使用的 **Docker Compose 生产部署配置**。

<p align="center">
  <img alt="Moe Counter!" src="https://count.pyre-z.me/@Moe-counter.github?name=Moe-counter.github&theme=moebooru&padding=7&offset=0&align=top&scale=1&pixelated=1&darkmode=auto">
</p>

## ✨ 功能特性

- **多种萌系主题**：内置 56 种数字图片主题，包括初音、A-SOUL、Minecraft、Capoo 与专属的 **sylvie** 等多种风格
- **SVG 徽章输出**：每次请求动态生成 SVG 图片，数字图片内嵌 base64，无需额外静态资源请求
- **内存优先计数**：计数在内存中自增，通过可配置间隔批量落库，对高并发友好
- **多数据库支持**：SQLite（默认）、MongoDB、PostgreSQL（本 fork 新增）
- **实时落库可选**：设置 `DB_INTERVAL=0` 即可每次请求实时写入，避免容器重启丢失计数
- **参数丰富**：支持补零位数、间距、缩放、对齐、暗色模式、像素风格、前缀等
- **计数名白名单（可选）**：设置 `ADMIN_TOKEN` 即可锁定只允许指定计数名被访问，支持 Web 管理页 / API 动态增删
- **页面国际化**：内置中英文（默认中文），支持 `?lang=` 参数与浏览器语言自动检测
- **零前端依赖**：只需在 HTML 中放一个 `<img>` 标签即可嵌入

## 🌈 主题预览

以下为部分主题效果，完整 56 种主题可访问 [在线 Demo](https://count.pyre-z.me) 切换查看，也欢迎在 [上游仓库](https://github.com/journey-ad/Moe-Counter) 提交新主题。

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

## 🎨 sylvie 主题

`sylvie` 是本仓库作者 **PyreZ** 原创设计的专属主题，以哥特暗黑 Q 版少女形象绘制 0-9 数字角色（举牌、眨眼、盘坐等十种不同姿态），并配有猫耳兜帽、链条配饰、紫色星芒等细节。

- 预览：`https://count.pyre-z.me/@demo?theme=sylvie`
- 使用：`https://count.pyre-z.me/@<counter-name>?theme=sylvie`
- **著作权与所有权归 PyreZ 所有**，未经授权不得用于其他项目或商业用途。

> 上游主题（moebooru、miku 等）版权归其各自原作者，`sylvie` 为 PyreZ 独立创作的原创主题。

## 🚀 快速开始

### Docker Compose（推荐）

#### 使用 PostgreSQL（本 fork 支持）

```shell
# 1. 克隆本项目
git clone https://github.com/pyre-z/Moe-Counter.git
cd Moe-Counter

# 2. 创建数据库（PostgreSQL 13+）
# CREATE DATABASE moe_counter;

# 3. 编写 deploy/.env（compose 的 env_file 是相对 compose 目录的）
cat > deploy/.env <<'EOF'
APP_PORT=3000
APP_SITE=https://count.example.com
DB_TYPE=postgres
DB_URL=postgres://user:password@127.0.0.1:5432/moe_counter
DB_INTERVAL=0
LOG_LEVEL=info
EOF

# 4. 构建并启动
docker compose -f deploy/docker-compose.yml up -d --build
```

> 本项目已附带 `deploy/docker-compose.yml`，默认挂载 `1panel-network` 网络以连接 1Panel PostgreSQL；若需在其他环境使用，请按需修改网络名与 `DB_URL`。

#### 使用 SQLite（最简）

```shell
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e APP_PORT=3000 \
  -e DB_TYPE=sqlite \
  -e DB_INTERVAL=0 \
  --name moe-counter \
  moe-counter:local
```

### 从源码运行

要求 Node.js >= 22 与 pnpm >= 10。

```shell
git clone https://github.com/pyre-z/Moe-Counter.git
cd Moe-Counter
pnpm install

# SQLite 模式
pnpm start

# 环境变量示例
APP_PORT=3000 DB_TYPE=postgres DB_URL=postgres://user:password@127.0.0.1:5432/moe_counter pnpm start
```

### 部署到反向代理

服务默认监听 `3000` 端口，反代配置示例：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## ⚙️ 配置说明

复制 `.env.example` 为 `.env` 并修改对应变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `APP_PORT` | 服务监听端口 | `3000` |
| `APP_SITE` | 站点地址，用于页面生成链接 | 请求 Host |
| `DB_TYPE` | 数据库类型：`sqlite` / `mongodb` / `postgres` | `sqlite` |
| `DB_URL` | 数据库连接串（MongoDB / PostgreSQL） | 本地默认地址 |
| `DB_INTERVAL` | 批量落库间隔（秒），`0` 表示实时落库 | `60` |
| `LOG_LEVEL` | 日志级别：`debug` / `info` / `warn` / `error` / `none` | `info` |
| `ADMIN_TOKEN` | 管理令牌。设置后开启计数名白名单（仅允许 `tb_allow` 表内名字 + `demo`），并启用 `/admin` 管理页与 `/admin/allow` API；留空则不限制且管理路由不可用 | 空 |
| `GA_ID` | Google Analytics 站点 G-Tag ID（可选） | 空 |

> 连接串示例中 `***` 为密码占位，请替换为真实密码。

## 📖 使用方法

### 计数器图片

请求格式：

```
https://count.pyre-z.me/@<counter-name>?theme=<theme>&padding=<n>&offset=<n>&scale=<n>&darkmode=<auto|0|1>
```

示例：

```markdown
![Moe Counter](https://count.pyre-z.me/@my-blog?theme=miku)
```

### 查询 JSON 数据（不会渲染图片）

```shell
curl https://count.pyre-z.me/record/@my-blog
# {"name":"my-blog","num":42}
```

### 健康检查

```shell
curl https://count.pyre-z.me/heart-beat
# alive
```

## 🔒 白名单管理（可选）

设置 `ADMIN_TOKEN` 即开启计数名白名单。开启后，只有 `tb_allow` 表中的计数名（以及用于主题预览的 `demo`）可以被访问，其余名字一律返回 `404`，从而防止他人占用或刷取你的计数器。

**管理页**（推荐）：浏览器打开 `https://count.pyre-z.me/admin`，输入 `ADMIN_TOKEN` 即可直观地查看、添加、删除白名单计数名。

**管理 API**：

```shell
# 查看当前白名单
curl -H "Authorization: Bearer <ADMIN_TOKEN>" https://count.pyre-z.me/admin/allow

# 添加计数名
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://count.pyre-z.me/admin/allow/<counter-name>

# 删除计数名
curl -X DELETE -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://count.pyre-z.me/admin/allow/<counter-name>
```

管理操作会立即生效并写入数据库；如果清空 `ADMIN_TOKEN`，则恢复为「允许任意计数名」的上游行为。

## 🌐 页面国际化

首页支持中英文双语，默认中文：

- 手动切换：`https://count.pyre-z.me/?lang=zh`（中文）或 `?lang=en`（英文）
- 自动检测：未指定 `lang` 时，优先读取浏览器 `Accept-Language` 请求头，全部不支持时回退中文
- 页面右上角提供「English / 中文」一键切换按钮

新增语言只需在 `locales/` 目录添加对应 JSON 文件（与现有 `zh.json` / `en.json` 同结构），并在 `index.js` 的 `SUPPORTED_LANGS` 中注册即可。

## 🗄️ 数据库说明

PostgreSQL 表结构由应用启动时自动创建：

```sql
CREATE TABLE IF NOT EXISTS tb_count (
    name VARCHAR(32) PRIMARY KEY,
    num  BIGINT NOT NULL DEFAULT 0
);

-- 白名单表（启用 ADMIN_TOKEN 后使用）
CREATE TABLE IF NOT EXISTS tb_allow (
    name VARCHAR(32) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> 数据库变量 `DB_URL` 使用标准 PostgreSQL 连接串，例如：`postgres://user:password@127.0.0.1:5432/moe_counter`。

## 📝 与上游的差异

- 新增 `db/postgres.js`，支持 `DB_TYPE=postgres`
- 新增 `deploy/docker-compose.yml` 与 `deploy/.env.template` 生产部署模板
- 新增原创主题 **sylvie**（著作权归 PyreZ）
- README 中文文档与英文版（`README.en.md`）
- 已移除上游 HelloGitHub 徽章与 Star History 徽章

## 🙏 致谢

- 上游作者 [journey-ad](https://github.com/journey-ad)
- [A-SOUL_Official](https://space.bilibili.com/703007996)
- [moebooru](https://github.com/moebooru/moebooru)
- gelbooru.com NSFW
- [Icons8](https://icons8.com/icon/80355/star)
- 以及所有 booru 站点

## 📄 开源协议

本项目遵循 [MIT License](./LICENSE)，**但所有主题资源除外**。

- 上游主题（`moebooru`、`miku`、`minecraft` 等）版权归其各自原作者所有。
- **`sylvie` 主题著作权与所有权归 PyreZ 所有**，保留所有权利，未经授权不得复制、修改、分发或用于商业用途。