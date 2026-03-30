#!/usr/bin/env node
/**
 * ErgoAnálise - Script de Backup
 *
 * Exporta todos os dados do Supabase para um arquivo JSON local.
 *
 * Uso:
 *   node scripts/backup.js
 *
 * O arquivo será salvo em: backups/ergoanalise-backup-YYYY-MM-DD.json
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://gbciphzoqjhgsnuqdwjr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiY2lwaHpvcWpoZ3NudXFkd2pyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkwMTUyMSwiZXhwIjoyMDkwNDc3NTIxfQ.0qUaWhQzLe3o4srh7bujyErHv0it7MCZYFlzG5xW-uA";

const TABLES = [
  "companies", "sectors", "positions", "surveys",
  "assessments", "actions", "blocks", "templates",
  "anthro_ranges", "profiles",
];

function fetchTable(table) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?select=*`);
    const options = {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    }).on("error", (e) => reject(e));
  });
}

async function main() {
  console.log("ErgoAnálise - Backup");
  console.log("====================\n");

  const backup = {
    exportDate: new Date().toISOString(),
    version: "1.0",
    supabaseProject: "gbciphzoqjhgsnuqdwjr",
    data: {},
  };

  for (const table of TABLES) {
    process.stdout.write(`  ${table}... `);
    try {
      const rows = await fetchTable(table);
      backup.data[table] = rows;
      console.log(`${Array.isArray(rows) ? rows.length : 0} registros`);
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
      backup.data[table] = [];
    }
  }

  // Salva o arquivo
  const backupDir = path.join(__dirname, "..", "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const filename = `ergoanalise-backup-${date}.json`;
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

  const sizeMB = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
  console.log(`\nBackup salvo: ${filepath} (${sizeMB} MB)`);
}

main().catch((e) => {
  console.error("Erro fatal:", e.message);
  process.exit(1);
});
