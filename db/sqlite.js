'use strict'

const path = require('path')
const Database = require('better-sqlite3')

const db = new Database(path.resolve(__dirname, '../data/count.db'))

db.exec(`CREATE TABLE IF NOT EXISTS tb_count (
    id    INTEGER      PRIMARY KEY AUTOINCREMENT
                       NOT NULL
                       UNIQUE,
    name  VARCHAR (32) NOT NULL
                       UNIQUE,
    num   BIGINT       NOT NULL
                       DEFAULT (0) 
);

CREATE TABLE IF NOT EXISTS tb_allow (
    name VARCHAR (32) NOT NULL PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);`)

function getNum(name) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('SELECT `name`, `num` from tb_count WHERE `name` = ?')
    const row = stmt.get(name)
    resolve(row || { name, num: 0 })
  })
}

function getAll(name) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('SELECT * from tb_count')
    const rows = stmt.all()
    resolve(rows)
  })
}

function setNum(name, num) {
  return new Promise((resolve, reject) => {
    db.exec(`INSERT INTO tb_count(\`name\`, \`num\`)
            VALUES($name, $num)
            ON CONFLICT(name) DO
            UPDATE SET \`num\` = $num;`
      ,
      { $name: name, $num: num }
    )

    resolve()
  })
}

function setNumMulti(counters) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO tb_count(\`name\`, \`num\`)
    VALUES($name, $num)
    ON CONFLICT(name) DO
    UPDATE SET \`num\` = $num;`)

    const setMany = db.transaction((counters) => {
      for (const counter of counters) stmt.run(counter)
    })

    setMany(counters)
    resolve()
  })
}

// ---- tb_allow (counter name whitelist) ----
function allowGetAll() {
  return new Promise((resolve) => {
    const stmt = db.prepare('SELECT `name` FROM tb_allow ORDER BY `name`')
    resolve(stmt.all().map((r) => r.name))
  })
}

function allowAdd(name) {
  return new Promise((resolve) => {
    db.exec('INSERT INTO tb_allow(`name`) VALUES($name) ON CONFLICT(`name`) DO NOTHING', { $name: name })
    resolve()
  })
}

function allowRemove(name) {
  return new Promise((resolve) => {
    db.exec('DELETE FROM tb_allow WHERE `name` = $name', { $name: name })
    resolve()
  })
}

module.exports = {
  getNum,
  getAll,
  setNum,
  setNumMulti,
  allowGetAll,
  allowAdd,
  allowRemove
}
