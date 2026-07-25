const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'src', 'index.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'games', 'murder-mystery.js'), 'utf8');

const checks = [
  ['Murder Mystery module exists', game.includes('function setupMurderMystery(client)')],
  ['Murder Mystery is connected to the bot', index.includes('MURDER_MYSTERY_MODULE')],
  ['Investigation lobby exists', game.includes('const lobbies = new Map()')],
  ['Minimum 3 players enforced', game.includes('lobby.players.length < 3')],
  ['Maximum 8 players enforced', game.includes('lobby.players.length >= 8')],
  ['Case clues exist', game.includes('clues: [')],
  ['Suspect selection exists', game.includes('mm_suspect_')],
  ['Evidence reveal exists', game.includes('mm_clue_')],
  ['Voting exists', game.includes('game.votes.add(interaction.user.id)')],
  ['Winner and failure screens exist', game.includes('القضية تحلات!') && game.includes('التحقيق فشل')],
  ['Game cleanup exists', game.includes('games.delete(game.id)')]
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\n❌ Murder Mystery verification failed.');
  process.exit(1);
}

console.log('\n🕵️ Murder Mystery phase verification passed.');
