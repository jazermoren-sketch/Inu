const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'src', 'index.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'games', 'word-battle.js'), 'utf8');

const checks = [
  ['Word Battle module exists', game.includes('function setupWordBattle(client)')],
  ['Word Battle is connected to the bot', index.includes('WORD_BATTLE_MODULE')],
  ['Slash command exists', index.includes('.setName("wordbattle")')],
  ['Lobby exists', game.includes('const lobbies = new Map()')],
  ['Maximum 8 players enforced', game.includes('lobby.players.length >= 8')],
  ['Minimum 2 players enforced', game.includes('lobby.players.length < 2')],
  ['Five rounds exist', game.includes('Round ${game.round}/5') && game.includes('game.round >= 5')],
  ['Answer checking exists', game.includes('message.content.trim().toLowerCase()')],
  ['Scoring exists', game.includes('game.scores[message.author.id] += 1')],
  ['Winner screen exists', game.includes('WORD BATTLE — GAME OVER')],
  ['Game cleanup exists', game.includes('games.delete(game.id)')]
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\n❌ Word Battle verification failed.');
  process.exit(1);
}

console.log('\n🧠 Word Battle phase verification passed.');
