const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const required = [
  'src/index.js',
  'package.json',
  'games/game-center-batch.js',
  'games/channel-config.js',
  'games/board-games.js',
  'games/text-games.js',
  'games/arcade-games.js',
  'games/solo-games.js'
];

let failed = false;
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed = true;
}

for (const file of required) check(`Required file: ${file}`, fs.existsSync(path.join(root, file)));

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check('discord.js dependency exists', Boolean(packageJson.dependencies?.['discord.js']));
check('dotenv dependency exists', Boolean(packageJson.dependencies?.dotenv));

const center = fs.readFileSync(path.join(root, 'games/game-center-batch.js'), 'utf8');
const definitions = [...center.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\{/gm)].map(m => m[1]);
const routes = {
  board: ['connect4', 'tictactoe'],
  text: ['math', 'hangman', 'wordchain'],
  arcade: ['higherlower', 'dice', 'memory', 'blackjack']
};
const routed = new Set(Object.values(routes).flat());
const uncovered = definitions.filter(id => !routed.has(id));

check('Game definitions discovered', definitions.length > 0, `${definitions.length} games`);
check('All registered games have a concrete gameplay route', uncovered.length === 0, uncovered.length ? `uncovered: ${uncovered.join(', ')}` : 'all routed');

const channelConfig = fs.readFileSync(path.join(root, 'games/channel-config.js'), 'utf8');
check('Optional channel restriction storage exists', channelConfig.includes('game-channels.json'));
check('Unrestricted mode is preserved', channelConfig.includes('channels.length === 0'));

const solo = fs.readFileSync(path.join(root, 'games/solo-games.js'), 'utf8');
check('Solo message handler exists', solo.includes('function handleSoloMessage'));
check('Solo timeout limit is present', /15\s*\*\s*1000|15000/.test(solo));

const board = fs.readFileSync(path.join(root, 'games/board-games.js'), 'utf8');
const text = fs.readFileSync(path.join(root, 'games/text-games.js'), 'utf8');
const arcade = fs.readFileSync(path.join(root, 'games/arcade-games.js'), 'utf8');
check('Board game cleanup exists', board.includes('activeBoardGames.delete(id)'));
check('Text game cleanup exists', text.includes('activeTextGames.delete(game.id)'));
check('Arcade game cleanup exists', arcade.includes('activeArcadeGames.delete(id)'));

console.log('');
if (failed) {
  console.error('❌ FINAL AUDIT FAILED. Do not deploy yet.');
  process.exit(1);
}
console.log('🎮 FINAL AUDIT PASSED. GamingHub core is structurally ready.');
