// src/db.js
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS message_audit (
    message_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    processed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS failed_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT,
    queue TEXT NOT NULL,
    payload TEXT,
    error TEXT,
    failed_at TEXT NOT NULL
  );
`);

const upsertAuditStmt = db.prepare(`
  INSERT INTO message_audit (message_id, status, processed_at)
  VALUES (@message_id, @status, @processed_at)
  ON CONFLICT(message_id) DO UPDATE SET
    status = excluded.status,
    processed_at = excluded.processed_at
`);

function recordAudit(messageId, status) {
  upsertAuditStmt.run({
    message_id: messageId,
    status,
    processed_at: new Date().toISOString(),
  });
}

const insertFailedStmt = db.prepare(`
  INSERT INTO failed_messages (message_id, queue, payload, error, failed_at)
  VALUES (@message_id, @queue, @payload, @error, @failed_at)
`);

function recordFailedMessage({ messageId, queue, payload, error }) {
  insertFailedStmt.run({
    message_id: messageId || null,
    queue,
    payload: payload || null,
    error: error || null,
    failed_at: new Date().toISOString(),
  });
}

module.exports = { db, recordAudit, recordFailedMessage };
