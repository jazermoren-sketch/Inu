const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}\n   ${error.message}`);
    failed++;
  }
}

function asyncTest(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    console.log(`✅ ${name}`);
    passed++;
  }).catch(error => {
    console.error(`❌ ${name}\n   ${error.message}`);
    failed++;
  });
}

const files = [
  'src/index.js',
  'games/game-center-batch.js',
  'games/channel-config.js',
  'games/board-games.js',
  'games/text-games.js',
  'games/arcade-games.js',
  'games/solo-games.js',
  'games/extra-games.js'
];

for (const file of files) {
  test(`Syntax check: ${file}`, () => {
    const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    assert.strictEqual(result.status, 0, result.stderr || 'syntax check failed');
  });
}

test('All core modules load', () => {
  const modules = [
    '../games/game-center-batch',
    '../games/channel-config',
    '../games/board-games',
    '../games/text-games',
    '../games/arcade-games',
    '../games/solo-games',
    '../games/extra-games'
  ];
  for (const modulePath of modules) assert.doesNotThrow(() => require(modulePath));
});

test('Game Center exports are complete', () => {
  const center = require('../games/game-center-batch');
  assert.strictEqual(typeof center.setupGameCenterBatch, 'function');
  assert.ok(Object.keys(center.GAME_DEFINITIONS).length >= 15);
  assert.ok(Object.keys(center.SOLO_GAMES).length >= 5);
  assert.ok(center.lobbies instanceof Map);
  assert.ok(center.games instanceof Map);
});

test('Channel restrictions work and clear restores unrestricted mode', () => {
  const config = require('../games/channel-config');
  const guild = `runtime-test-${Date.now()}`;
  assert.strictEqual(config.isAllowed(guild, 'channel-a'), true);
  assert.deepStrictEqual(config.set(guild, ['channel-a', 'channel-a', 'channel-b']), ['channel-a', 'channel-b']);
  assert.strictEqual(config.isAllowed(guild, 'channel-a'), true);
  assert.strictEqual(config.isAllowed(guild, 'channel-x'), false);
  config.clear(guild);
  assert.strictEqual(config.isAllowed(guild, 'channel-x'), true);
});

test('Board games start with valid state', () => {
  const board = require('../games/board-games');
  const ttt = board.startBoardGame({ id: 'test-ttt', type: 'tictactoe', channelId: 'c', players: ['a', 'b'] });
  const c4 = board.startBoardGame({ id: 'test-c4', type: 'connect4', channelId: 'c', players: ['a', 'b'] });
  assert.strictEqual(ttt.board.length, 9);
  assert.strictEqual(c4.board.length, 6);
  assert.strictEqual(c4.board[0].length, 7);
  board.activeBoardGames.delete('test-ttt');
  board.activeBoardGames.delete('test-c4');
});

test('Text games start with valid state', () => {
  const text = require('../games/text-games');
  const math = text.startTextGame({ id: 'test-math', type: 'math', channelId: 'c', players: ['a', 'b'] });
  const hangman = text.startTextGame({ id: 'test-hangman', type: 'hangman', channelId: 'c2', players: ['a', 'b'] });
  const chain = text.startTextGame({ id: 'test-chain', type: 'wordchain', channelId: 'c3', players: ['a', 'b'] });
  assert.strictEqual(typeof math.round.answer, 'number');
  assert.ok(typeof hangman.word === 'string' && hangman.word.length > 0);
  assert.strictEqual(chain.turn, 0);
  text.activeTextGames.clear();
});

test('Arcade games start with valid state', () => {
  const arcade = require('../games/arcade-games');
  for (const type of ['higherlower', 'dice', 'memory', 'blackjack']) {
    const game = arcade.startArcadeGame({ id: `test-${type}`, type, channelId: 'c', players: ['a', 'b'] });
    assert.strictEqual(game.type, type);
    assert.ok(arcade.activeArcadeGames.has(game.id));
  }
  arcade.activeArcadeGames.clear();
});

test('Extra games start with valid questions and cleanup map', () => {
  const extra = require('../games/extra-games');
  for (const type of ['impostor', 'reaction', 'emoji', 'trivia', 'treasure', 'speedquiz']) {
    const game = extra.startExtraGame({ id: `test-${type}`, type, channelId: 'c', players: ['a', 'b'] });
    assert.strictEqual(game.type, type);
    assert.ok(game.question && game.question.q);
    assert.ok(extra.activeExtraGames.has(game.id));
    extra.activeExtraGames.delete(game.id);
  }
});

(async () => {
  const solo = require('../games/solo-games');
  const sent = [];
  const startMessage = {
    channelId: 'solo-test-channel',
    author: { id: 'starter', username: 'Starter', bot: false },
    content: '!math',
    channel: { send: async payload => sent.push(payload) },
    reply: async () => {}
  };

  await asyncTest('Solo command starts immediately', async () => {
    await solo.handleSoloMessage(startMessage);
    assert.strictEqual(solo.activeSoloGames.size, 1);
  });

  await asyncTest('Solo correct answer awards and cleans up', async () => {
    const game = [...solo.activeSoloGames.values()][0];
    const answerMessage = {
      channelId: game.channelId,
      author: { id: 'winner', username: 'Winner', bot: false },
      content: String(game.question.answer),
      channel: { send: async payload => sent.push(payload) }
    };
    await solo.handleSoloMessage(answerMessage);
    assert.strictEqual(solo.activeSoloGames.size, 0);
    assert.ok(sent.length >= 2);
  });

  test('Solo scoring stays within the 15-second limit', () => {
    assert.strictEqual(solo.MAX_TIME_MS, 15000);
    assert.strictEqual(solo.scoreFor(0), 100);
    assert.strictEqual(solo.scoreFor(15000), 1);
    assert.ok(solo.scoreFor(7500) > 1 && solo.scoreFor(7500) < 100);
  });

  console.log(`\n🧪 Runtime smoke tests: ${passed} passed, ${failed} failed.`);
  if (failed) process.exit(1);
  console.log('🎮 All local runtime smoke tests passed.');
})();
