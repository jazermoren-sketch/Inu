const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
let code = fs.readFileSync(file, 'utf8');

if (code.includes('DUEL_ARENA_MODULE')) {
  console.log('ℹ️ Duel Arena phase already applied.');
  process.exit(0);
}

const importMarker = 'const { setupMurderMystery } = require("../games/murder-mystery"); // MURDER_MYSTERY_MODULE\n';
if (!code.includes(importMarker)) throw new Error('Murder Mystery import marker not found.');
code = code.replace(importMarker, importMarker + 'const { setupDuelArena } = require("../games/duel-arena"); // DUEL_ARENA_MODULE\n', 1);

const setupMarker = 'setupMurderMystery(client); // MURDER_MYSTERY_MODULE\n';
if (!code.includes(setupMarker)) throw new Error('Murder Mystery setup marker not found.');
code = code.replace(setupMarker, setupMarker + 'setupDuelArena(client); // DUEL_ARENA_MODULE\n', 1);

fs.writeFileSync(file, code);
console.log('✅ Duel Arena module connected to the bot.');
console.log('✅ Two-player lobby, Best-of-3 rounds and RPS combat enabled.');
