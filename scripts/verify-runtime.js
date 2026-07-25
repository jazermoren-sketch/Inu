const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const checks = [
  ['src/index.js', 'Main entry file exists'],
  ['games/game-center-batch.js', 'Central Game Center module exists'],
  ['games/quiz-battle.js', 'Quiz Battle module exists'],
  ['games/murder-mystery.js', 'Murder Mystery module exists'],
  ['games/duel-arena.js', 'Duel Arena module exists'],
  ['games/word-battle.js', 'Word Battle module exists']
];

let failed = false;

for (const [relative, name] of checks) {
  const file = path.join(root, relative);
  const ok = fs.existsSync(file);
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

const requiredModules = [
  ['games/game-center-batch.js', 'setupGameCenterBatch'],
  ['games/game-center-batch.js', 'GAME_DEFINITIONS'],
  ['games/game-center-batch.js', 'SOLO_GAMES'],
  ['games/game-center-batch.js', 'lobbies'],
  ['games/game-center-batch.js', 'games'],
  ['games/quiz-battle.js', 'setupQuizBattle'],
  ['games/murder-mystery.js', 'setupMurderMystery'],
  ['games/duel-arena.js', 'setupDuelArena'],
  ['games/word-battle.js', 'setupWordBattle']
];

for (const [relative, exportName] of requiredModules) {
  try {
    const mod = require(path.join(root, relative));
    const ok = Object.prototype.hasOwnProperty.call(mod, exportName);
    console.log(`${ok ? '✅' : '❌'} ${relative} exports ${exportName}`);
    if (!ok) failed = true;
  } catch (error) {
    console.log(`❌ ${relative} failed to load: ${error.message}`);
    failed = true;
  }
}

try {
  const batch = require(path.join(root, 'games/game-center-batch.js'));
  const serverCount = Object.keys(batch.GAME_DEFINITIONS || {}).length;
  const soloCount = Object.keys(batch.SOLO_GAMES || {}).length;
  const valid = serverCount >= 15 && soloCount >= 5;
  console.log(`${valid ? '✅' : '❌'} Game Center registry counts: ${serverCount} server games + ${soloCount} solo games`);
  if (!valid) failed = true;
} catch (error) {
  console.log(`❌ Game Center registry could not be inspected: ${error.message}`);
  failed = true;
}

if (failed) {
  console.error('\n❌ Runtime verification failed.');
  process.exit(1);
}

console.log('\n🎮 Runtime verification passed: Game Center modules are loadable and registered.');
