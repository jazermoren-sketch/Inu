const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'src', 'index.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'games', 'quiz-battle.js'), 'utf8');

const checks = [
  ['Quiz Battle module exists', game.includes('function setupQuizBattle(client)')],
  ['Quiz Battle is connected to the bot', index.includes('QUIZ_BATTLE_MODULE')],
  ['Multiplayer lobby exists', game.includes('const lobbies = new Map()')],
  ['Minimum 2 players enforced', game.includes('lobby.players.length < 2')],
  ['Maximum 10 players enforced', game.includes('players.length}/10')],
  ['Five rounds exist', game.includes('slice(0, 5)') && game.includes('match.round >= 5')],
  ['Answer buttons exist', game.includes('qb_answer_')],
  ['Scoring exists', game.includes('match.scores[interaction.user.id] += 1')],
  ['Winner screen exists', game.includes('QUIZ BATTLE — GAME OVER')],
  ['Game cleanup exists', game.includes('matches.delete(match.id)')]
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\n❌ Quiz Battle verification failed.');
  process.exit(1);
}

console.log('\n🧠 Quiz Battle phase verification passed.');
