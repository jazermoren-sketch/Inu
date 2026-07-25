const { EmbedBuilder } = require('discord.js');

const activeTextGames = new Map();
const WORDS = ['discord', 'gaming', 'football', 'champion', 'minecraft', 'javascript', 'morocco', 'challenge'];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function makeMathRound() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const op = Math.random() > 0.5 ? '+' : '-';
  return { question: `${a} ${op} ${b}`, answer: op === '+' ? a + b : a - b };
}

function maskWord(game) {
  return game.word.split('').map(letter => game.guessed.has(letter) ? letter : '＿').join(' ');
}

function renderTextGame(game, notice = '') {
  if (game.type === 'math') {
    return new EmbedBuilder().setTitle('➗ MATH BATTLE').setDescription(`${notice ? `${notice}\n\n` : ''}🧮 **حل العملية:**\n\n# ${game.round.question}\n\n👥 اللاعبون: ${game.players.map(id => `<@${id}>`).join(' ')}`);
  }
  if (game.type === 'hangman') {
    return new EmbedBuilder().setTitle('🔤 HANGMAN').setDescription(`${notice ? `${notice}\n\n` : ''}الكلمة:\n\n# ${maskWord(game)}\n\n❌ المحاولات الخاطئة: **${game.misses}/6**\n🔤 الحروف المجربة: ${[...game.guessed].join(', ') || 'لا شيء'}`);
  }
  return new EmbedBuilder().setTitle('🔗 WORD CHAIN').setDescription(`${notice ? `${notice}\n\n` : ''}🔤 آخر حرف مطلوب: **${game.lastLetter || 'أي حرف'}**\n\n📖 آخر كلمة: **${game.lastWord || 'لا توجد'}**\n\n👥 الدور: <@${game.players[game.turn]}>`);
}

function startTextGame({ id, type, channelId, players }) {
  const game = { id, type, channelId, players: [...players], startedAt: Date.now() };
  if (type === 'math') {
    game.round = makeMathRound();
    game.scores = new Map(players.map(player => [player, 0]));
  } else if (type === 'hangman') {
    game.word = WORDS[Math.floor(Math.random() * WORDS.length)];
    game.guessed = new Set();
    game.misses = 0;
  } else if (type === 'wordchain') {
    game.turn = 0;
    game.lastWord = null;
    game.lastLetter = null;
    game.usedWords = new Set();
  }
  activeTextGames.set(id, game);
  return game;
}

async function handleTextMessage(message) {
  if (!message || message.author?.bot) return false;
  const game = [...activeTextGames.values()].find(item => item.channelId === message.channelId);
  if (!game || !game.players.includes(message.author.id)) return false;

  const input = normalize(message.content);
  if (!input) return false;

  if (game.type === 'math') {
    if (!/^[-+]?\d+$/.test(input)) return false;
    if (Number(input) !== game.round.answer) return false;
    const score = (game.scores.get(message.author.id) || 0) + 1;
    game.scores.set(message.author.id, score);
    if (score >= 3) {
      activeTextGames.delete(game.id);
      await message.channel.send({ embeds: [renderTextGame(game, `🏆 الفائز هو <@${message.author.id}> بـ **${score} نقاط**!`)] });
      return true;
    }
    game.round = makeMathRound();
    await message.channel.send({ embeds: [renderTextGame(game, `✅ نقطة لـ <@${message.author.id}>! **${score}/3**`)] });
    return true;
  }

  if (game.type === 'hangman') {
    if (input.length !== 1 || !/^[a-z]$/.test(input)) return false;
    if (game.guessed.has(input)) return false;
    game.guessed.add(input);
    if (!game.word.includes(input)) game.misses += 1;
    if (game.word.split('').every(letter => game.guessed.has(letter))) {
      activeTextGames.delete(game.id);
      await message.channel.send({ embeds: [renderTextGame(game, `🏆 <@${message.author.id}> ربح! الكلمة كانت **${game.word}**.`)] });
      return true;
    }
    if (game.misses >= 6) {
      activeTextGames.delete(game.id);
      await message.channel.send({ embeds: [renderTextGame(game, `💀 سالات المحاولات! الكلمة كانت **${game.word}**.`)] });
      return true;
    }
    await message.channel.send({ embeds: [renderTextGame(game, `🔤 <@${message.author.id}> جرب الحرف **${input}**.`)] });
    return true;
  }

  if (game.type === 'wordchain') {
    if (game.players[game.turn] !== message.author.id) return false;
    if (!/^[a-z]+$/.test(input)) return false;
    if (game.usedWords.has(input)) {
      await message.reply('❌ هاد الكلمة تستعملات من قبل.');
      return true;
    }
    if (game.lastLetter && input[0] !== game.lastLetter) {
      await message.reply(`❌ خاص الكلمة تبدا بالحرف **${game.lastLetter}**.`);
      return true;
    }
    game.usedWords.add(input);
    game.lastWord = input;
    game.lastLetter = input[input.length - 1];
    game.turn = (game.turn + 1) % game.players.length;
    await message.channel.send({ embeds: [renderTextGame(game, `✅ كلمة صحيحة: **${input}**`)] });
    return true;
  }
  return false;
}

function textGameEmbed(game) {
  return renderTextGame(game, '🎮 اللعبة بدات! كتب الإجابة فهاد القناة.');
}

module.exports = { startTextGame, handleTextMessage, textGameEmbed, activeTextGames };
