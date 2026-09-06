"use strict";

const { Pool } = require("pg");

const connectionString =
  process.env.DB_URL ||
  "postgres://pyre-z:password@127.0.0.1:5432/moe_counter";

const pool = new Pool({ connectionString, max: 10 });

pool.on("error", (err) => {
  console.error("pg pool error:", err);
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tb_count (
      name VARCHAR(32) PRIMARY KEY,
      num  BIGINT NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tb_allow (
      name VARCHAR(32) PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

const initPromise = init();

function getNum(name) {
  return initPromise.then(() =>
    pool
      .query("SELECT name, num FROM tb_count WHERE name = $1", [name])
      .then((res) => {
        // NOTE: node-postgres returns BIGINT as string to preserve precision;
        // cast to Number here so upstream `counter.num + 1` does arithmetic,
        // not string concatenation (would produce 1, 11, 111...).
        const row = res.rows[0];
        return row ? { name: row.name, num: Number(row.num) } : { name, num: 0 };
      })
  );
}

function getAll() {
  return initPromise.then(() =>
    pool
      .query("SELECT name, num FROM tb_count ORDER BY name")
      .then((res) => res.rows.map((r) => ({ name: r.name, num: Number(r.num) })))
  );
}

function setNum(name, num) {
  return initPromise.then(() =>
    pool.query(
      `INSERT INTO tb_count (name, num) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET num = EXCLUDED.num`,
      [name, num]
    )
  );
}

async function setNumMulti(counters) {
  await initPromise;
  if (!counters || counters.length === 0) return;

  const values = [];
  const params = [];
  counters.forEach((c, i) => {
    const base = i * 2;
    params.push(c.name, c.num);
    values.push(`($${base + 1}, $${base + 2})`);
  });
  await pool.query(
    `INSERT INTO tb_count (name, num) VALUES ${values.join(", ")}
     ON CONFLICT (name) DO UPDATE SET num = EXCLUDED.num`,
    params
  );
}

// ---- tb_allow (counter name whitelist) ----
function allowGetAll() {
  return initPromise.then(() =>
    pool.query("SELECT name FROM tb_allow ORDER BY name").then((res) => res.rows.map((r) => r.name))
  );
}

function allowAdd(name) {
  return initPromise.then(() =>
    pool.query(
      `INSERT INTO tb_allow (name) VALUES ($1)
       ON CONFLICT (name) DO NOTHING`,
      [name]
    )
  );
}

function allowRemove(name) {
  return initPromise.then(() =>
    pool.query("DELETE FROM tb_allow WHERE name = $1", [name])
  );
}

module.exports = {
  getNum,
  getAll,
  setNum,
  setNumMulti,
  allowGetAll,
  allowAdd,
  allowRemove,
};
