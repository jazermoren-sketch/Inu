const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'games', 'game-center-batch.js');
const code = fs.readFileSync(file, 'utf8');

const expectedGames = [
  'impostor','connect4','tictactoe','hangman','reaction','math','emoji','trivia',
  'higherlower','treasure','blackjack','dice','memory','wordchain','speedquiz'
];

let failed = false;
const checks = [
  ['Central batch marker exists', code.includes('GAMINGHUB_BATCH_V1')],
  ['Central lobby registry exists', code.includes('const lobbies = new Map()')],
  ['Central active-game registry exists', code.includes('const games = new Map()')],
  ['Server-game definitions exist', expectedGames.every(name => code.includes(`${name}:`))],
  ['Solo-game definitions exist', code.includes('const SOLO_GAMES')],
  ['Games list command support exists', code.includes("name === 'games'")],
  ['Game lobby command support exists', code.includes("name !== 'game'")],
  ['Minimum-player validation exists', code.includes('lobby.players.length < definition.min')],
  ['Maximum-player validation exists', code.includes('lobby.players.length >= definition.max')],
  ['Lobby cleanup exists', code.includes('lobbies.delete(id)')],
  ['Game registry creation exists', code.includes('games.set(id')]
];

for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\n❌ GamingHub batch verification failed.');
  process.exit(1);
}

console.log(`\n🎮 GamingHub batch verification passed: ${expectedGames.length} server games + solo registry.`);
