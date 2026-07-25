const { EmbedBuilder } = require('discord.js');

const activeSoloGames = new Map();
const MAX_TIME_MS = 15000;
const POINTS_MAX = 100;

const SOLO_ALIASES = {
  math: ['!math', '!ماث', '!رياضيات'],
  emoji: ['!emoji', '!ايموجي', '!إيموجي'],
  reaction: ['!reaction', '!react', '!رياكشن'],
  memory: ['!memory', '!ميموري', '!ذاكرة']
};

const EMOJI_QUESTIONS = [
  { prompt: '🦁👑', answer: ['lion king', 'الاسد الملك', 'الأسد الملك'] },
  { prompt: '🕷️🧑', answer: ['spiderman', 'spider man', 'سبايدرمان'] },
  { prompt: '🧊👸', answer: ['frozen', 'فروزن'] },
  { prompt: '🚢💔🌊', answer: ['titanic', 'تايتانيك'] },
  { prompt: '🧙‍♂️⚡', answer: ['harry potter', 'هاري بوتر'] }
];

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, ' ');
}

function makeMathQuestion() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const op = Math.random() < 0.5 ? '+' : '*';
  return { prompt: `${a} ${op} ${b}`, answer: String(op === '+' ? a + b : a * b) };
}

function makeGame(type, channelId) {
  const game = { id: `${channelId}-${type}-${Date.now()}`, type, channelId, startedAt: Date.now() };
  if (type === 'math') game.question = makeMathQuestion();
  if (type === 'emoji') game.question = EMOJI_QUESTIONS[Math.floor(Math.random() * EMOJI_QUESTIONS.length)];
  if (type === 'reaction') game.answer = String(Math.floor(Math.random() * 900) + 100);
  if (type === 'memory') {
    const values = ['🍎', '🍌', '🍇', '🍒', '🥝', '🍉'];
    game.sequence = values.sort(() => Math.random() - 0.5).slice(0, 4).join('');
  }
  activeSoloGames.set(game.id, game);
  return game;
}

function aliasesFor(type) { return SOLO_ALIASES[type] || []; }
function getTypeFromCommand(content) {
  const command = normalize(content).split(/\s+/)[0];
  return Object.entries(SOLO_ALIASES).find(([, aliases]) => aliases.includes(command))?.[0] || null;
}

function scoreFor(elapsedMs) {
  const elapsed = Math.min(Math.max(elapsedMs, 0), MAX_TIME_MS);
  return Math.max(1, Math.ceil(POINTS_MAX * (1 - elapsed / MAX_TIME_MS)));
}

function render(game, notice = '') {
  const prefix = notice ? `${notice}\n\n` : '';
  if (game.type === 'math') return new EmbedBuilder().setTitle('🧮 SOLO MATH').setDescription(`${prefix}حل العملية بأسرع ما يمكن:\n\n# ${game.question.prompt}\n\n⏱️ عندك **15 ثانية** فقط.\n🏆 النقاط: من **100** حتى **1** حسب السرعة.`);
  if (game.type === 'emoji') return new EmbedBuilder().setTitle('🎭 SOLO EMOJI GUESS').setDescription(`${prefix}خمن شنو كتمثل هاد الإيموجيات:\n\n# ${game.question.prompt}\n\n⏱️ عندك **15 ثانية** فقط.`);
  if (game.type === 'reaction') return new EmbedBuilder().setTitle('⚡ SOLO REACTION').setDescription(`${prefix}كتب الرقم اللي بان قدامك:\n\n# ${game.answer}\n\n⏱️ عندك **15 ثانية** فقط.`);
  return new EmbedBuilder().setTitle('🧠 SOLO MEMORY').setDescription(`${prefix}حفظ هاد السلسلة، ومن بعد كتبها بالترتيب:\n\n# ${game.sequence}\n\n⏱️ عندك **15 ثانية** فقط.`);
}

async function startSoloGame(message, type) {
  const existing = [...activeSoloGames.values()].find(game => game.channelId === message.channelId);
  if (existing) return message.reply('❌ كاينة لعبة فردية خدامة دابا فهاد القناة.');
  const game = makeGame(type, message.channelId);
  await message.channel.send({ embeds: [render(game, `🎮 **${message.author.username}** بدا ${type} — أي لاعب يقدر يجاوب!`)] });
  setTimeout(async () => {
    const current = activeSoloGames.get(game.id);
    if (!current) return;
    activeSoloGames.delete(game.id);
    try { await message.channel.send({ embeds: [render(game, '⏰ سالا الوقت! ما جاوب حتى واحد بالجواب الصحيح فـ 15 ثانية.')] }); } catch {}
  }, MAX_TIME_MS);
  return true;
}

async function handleSoloMessage(message) {
  if (!message || message.author?.bot) return false;
  const commandType = getTypeFromCommand(message.content);
  if (commandType && ![...activeSoloGames.values()].some(game => game.channelId === message.channelId)) {
    await startSoloGame(message, commandType);
    return true;
  }

  const game = [...activeSoloGames.values()].find(item => item.channelId === message.channelId);
  if (!game) return false;
  const input = normalize(message.content);
  const elapsed = Date.now() - game.startedAt;
  if (elapsed > MAX_TIME_MS) return false;

  let correct = false;
  if (game.type === 'math' || game.type === 'reaction' || game.type === 'memory') correct = input === normalize(game.type === 'math' ? game.question.answer : game.type === 'reaction' ? game.answer : game.sequence);
  if (game.type === 'emoji') correct = game.question.answer.some(answer => normalize(answer) === input);
  if (!correct) return false;

  const points = scoreFor(elapsed);
  activeSoloGames.delete(game.id);
  await message.channel.send({ embeds: [render(game, `🏆 **<@${message.author.id}> ربح!**\n⚡ الوقت: **${(elapsed / 1000).toFixed(2)}s**\n💰 النقاط: **+${points}**`)] });
  return true;
}

module.exports = { handleSoloMessage, startSoloGame, activeSoloGames, SOLO_ALIASES, MAX_TIME_MS, scoreFor };
