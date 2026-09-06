"use strict";

require('dotenv').config();
const express = require("express");
const compression = require("compression");
const { z } = require("zod");

const db = require("./db");
const { themeList, getCountImage } = require("./utils/themify");
const { cors, ZodValid } = require("./utils/middleware");
const { randomArray, logger } = require("./utils");

// ---- i18n (server-side, lightweight) ----
const locales = {
  zh: require("./locales/zh.json"),
  en: require("./locales/en.json"),
};
const DEFAULT_LANG = "zh";
const SUPPORTED_LANGS = Object.keys(locales);

function pickLang(req) {
  // 1. explicit ?lang=
  const q = String(req.query.lang || "").toLowerCase();
  if (SUPPORTED_LANGS.includes(q)) return q;
  // 2. Accept-Language header (zh first)
  const accept = String(req.get("Accept-Language") || "");
  for (const part of accept.split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    if (SUPPORTED_LANGS.includes(code)) return code;
  }
  // 3. default
  return DEFAULT_LANG;
}

const app = express();

app.use(express.static("assets"));
app.use(compression());
app.use(cors());
app.use(express.json());
app.set("view engine", "pug");

// ---- Counter name whitelist (tb_allow) ----
// If ADMIN_TOKEN is set, access control is ENABLED:
//   only names listed in tb_allow (plus the "demo" counter used by the
//   homepage theme preview) may be requested. Anything else -> 404.
// If ADMIN_TOKEN is NOT set, whitelist is DISABLED (any name allowed,
// upstream behavior) and admin routes are unreachable.
const adminToken = process.env.ADMIN_TOKEN || "";
const whitelistEnabled = adminToken.length > 0;

// In-memory cache of allowed names (hot path: no DB hit per request).
let allowedNames = new Set();

async function reloadAllowed() {
  const list = await db.allowGetAll();
  allowedNames = new Set(list);
  logger.info("Allowed counter names:", list.join(", ") || "(empty)");
}

function nameAllowed(req, res, next) {
  if (!whitelistEnabled) return next();
  const { name } = req.params;
  if (name === "demo" || allowedNames.has(name)) return next();
  return res.status(404).send("Not Found");
}

function authAdmin(req, res, next) {
  if (!whitelistEnabled) return res.status(404).send("Not Found");
  const auth = req.get("Authorization") || "";
  if (auth !== `Bearer ${adminToken}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get('/', (req, res) => {
  const site = process.env.APP_SITE || `${req.protocol}://${req.get('host')}`
  const ga_id = process.env.GA_ID || null
  const lang = pickLang(req)
  const t = locales[lang]
  const altLang = lang === 'zh' ? 'en' : 'zh'
  res.render('index', {
    site,
    ga_id,
    themeList,
    lang,
    t,
    altLang,
  })
});

// get the image
app.get(["/@:name", "/get/@:name"],
  nameAllowed,
  ZodValid({
    params: z.object({
      name: z.string().max(32),
    }),
    query: z.object({
      theme: z.string().default("moebooru"),
      padding: z.coerce.number().int().min(0).max(16).default(7),
      offset: z.coerce.number().min(-500).max(500).default(0),
      align: z.enum(["top", "center", "bottom"]).default("top"),
      scale: z.coerce.number().min(0.1).max(2).default(1),
      pixelated: z.enum(["0", "1"]).default("1"),
      darkmode: z.enum(["0", "1", "auto"]).default("auto"),

      // Unusual Options
      num: z.coerce.number().int().min(0).max(1e15).default(0), // a carry-safe integer, less than `2^53-1`, and aesthetically pleasing in decimal.
      prefix: z.coerce.number().int().min(-1).max(999999).default(-1)
    })
  }),
  async (req, res) => {
    const { name } = req.params;
    let { theme = "moebooru", num = 0, ...rest } = req.query;

    // This helps with GitHub's image cache
    res.set({
      "content-type": "image/svg+xml",
      "cache-control": "max-age=0, no-cache, no-store, must-revalidate",
    });

    const data = await getCountByName(String(name), Number(num));

    if (name === "demo") {
      res.set("cache-control", "max-age=31536000");
    }

    if (theme === "random") {
      theme = randomArray(Object.keys(themeList));
    }

    // Send the generated SVG as the result
    const renderSvg = getCountImage({
      count: data.num,
      theme,
      ...rest
    });

    res.send(renderSvg);

    logger.debug(
      data,
      { theme, ...req.query },
      `ip: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`,
      `ref: ${req.get("Referrer") || null}`,
      `ua: ${req.get("User-Agent") || null}`
    );
  }
);

// JSON record
app.get("/record/@:name", nameAllowed, async (req, res) => {
  const { name } = req.params;

  const data = await getCountByName(name);

  res.json(data);
});

app.get("/heart-beat", (req, res) => {
  res.set("cache-control", "max-age=0, no-cache, no-store, must-revalidate");
  res.send("alive");
  logger.debug("heart-beat");
});

// ---- Admin: manage whitelist (only when ADMIN_TOKEN is set) ----
app.get("/admin", (req, res) => {
  if (!whitelistEnabled) return res.status(404).send("Not Found");
  res.sendFile("admin.html", { root: __dirname });
});

app.get("/admin/allow", authAdmin, async (req, res) => {
  try {
    res.json({ names: [...allowedNames].sort() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/admin/allow/:name", authAdmin, async (req, res) => {
  try {
    const name = String(req.params.name || "").trim();
    if (!name || name.length > 32) {
      return res.status(400).json({ error: "Invalid name (1-32 chars)" });
    }
    if (name === "demo") {
      return res.status(400).json({ error: "demo is always allowed" });
    }
    await db.allowAdd(name);
    await reloadAllowed();
    res.json({ ok: true, names: [...allowedNames].sort() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete("/admin/allow/:name", authAdmin, async (req, res) => {
  try {
    const name = String(req.params.name || "").trim();
    await db.allowRemove(name);
    await reloadAllowed();
    res.json({ ok: true, names: [...allowedNames].sort() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const listener = app.listen(process.env.APP_PORT || 3000, async () => {
  logger.info("Your app is listening on port " + listener.address().port);
  try {
    await reloadAllowed();
  } catch (e) {
    logger.error("Failed to load allowed names:", e);
  }
});

let __cache_counter = {};
let enablePushDelay = process.env.DB_INTERVAL > 0
let needPush = false;

if (enablePushDelay) {
  setInterval(() => {
    needPush = true;
  }, 1000 * process.env.DB_INTERVAL);
}

async function pushDB() {
  if (Object.keys(__cache_counter).length === 0) return;
  if (enablePushDelay && !needPush) return;

  try {
    needPush = false;
    logger.info("pushDB", __cache_counter);

    const counters = Object.keys(__cache_counter).map((key) => {
      return {
        name: key,
        num: __cache_counter[key],
      };
    });

    await db.setNumMulti(counters);
    __cache_counter = {};
  } catch (error) {
    logger.error("pushDB is error: ", error);
  }
}

async function getCountByName(name, num) {
  const defaultCount = { name, num: 0 };

  if (name === "demo") return { name, num: "0123456789" };

  if (num > 0) { return { name, num } };

  try {
    if (!(name in __cache_counter)) {
      const counter = (await db.getNum(name)) || defaultCount;
      __cache_counter[name] = counter.num + 1;
    } else {
      __cache_counter[name]++;
    }

    pushDB();

    return { name, num: __cache_counter[name] };
  } catch (error) {
    logger.error("get count by name is error: ", error);
    return defaultCount;
  }
}
