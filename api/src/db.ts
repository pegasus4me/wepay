import Database from 'better-sqlite3';

const db: Database.Database = new Database('wepay.db');
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    recipient TEXT NOT NULL,
    status TEXT NOT NULL,
    hash TEXT,
    memo TEXT,
    gas_used TEXT,
    gas_price TEXT,
    product_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id) REFERENCES agents(id)
  );
`);

export default db;
