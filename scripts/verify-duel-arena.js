const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'src', 'index.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'games', 'duel-arena.js'), 'utf8');

const checks = [
  ['Duel Arena module exists', game.includes('function setupDuelArena(client)')],
  ['Duel Arena is connected to the bot', index.includes('DUEL_ARENA_MODULE')],
  ['Two-player lobby exists', game.includes('const lobbies = new Map()')],
  ['Maximum 2 players enforced', game.includes('lobby.players.length >= 2')],
  ['Minimum 2 players enforced', game.includes('lobby.players.length < 2')],
  ['Three moves exist', game.includes('rock') && game.includes('paper') && game.includes('scissors')],
  ['Best-of-3 scoring exists', game.includes('game.scores[id]++') && game.includes('>= 2')],
  ['Winner screen exists', game.includes('DUEL ARENA — GAME OVER')],
  ['Game cleanup exists', game.includes('games.delete(game.id)')]
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\n❌ Duel Arena verification failed.');
  process.exit(1);
}

console.log('\n⚔️ Duel Arena phase verification passed.');
