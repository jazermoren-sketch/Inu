const { EmbedBuilder } = require('discord.js');

const activeExtraGames = new Map();

const QUESTION_BANK = [
  { q: 'شنو هي عاصمة المغرب؟', a: ['الرباط', 'rabat'] },
  { q: 'شحال كيساوي 2 + 2؟', a: ['4', 'أربعة', 'اربعة'] },
  { q: 'شنو هو أكبر كوكب فالمجموعة الشمسية؟', a: ['المشتري', 'jupiter'] },
  { q: 'شحال عدد أيام الأسبوع؟', a: ['7', 'سبعة', 'سبعه'] },
  { q: 'شنو هو الحيوان المعروف بملك الغابة؟', a: ['الاسد', 'الأسد', 'lion'] }
];

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, ' ');
}

function question() { return QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)]; }

function startExtraGame({ id, type, channelId, players }) {
  const game = {
    id, type, channelId, players: [...players], startedAt: Date.now(),
    question: question(), scores: new Map(players.map(player => [player, 0])),
    answers: new Set()
  };
  activeExtraGames.set(id, game);
  return game;
}

function extraEmbed(game, notice = '') {
  const titles = {
    impostor: '🕵️ IMPOSTOR', reaction: '⚡ REACTION RACE', emoji: '😀 EMOJI GUESS',
    trivia: '❓ TRIVIA', treasure: '🗺️ TREASURE HUNT', speedquiz: '⏱️ SPEED QUIZ'
  };
  return new EmbedBuilder().setTitle(titles[game.type] || '🎮 GAME').setDescription(`${notice ? `${notice}\n\n` : ''}**${game.question.q}**\n\n👥 اللاعبون: ${game.players.map(id => `<@${id}>`).join(', ')}\n⏱️ الجولة مفتوحة حتى يجاوب لاعب صحيح.`);
}

function handleExtraMessage(message) {
  if (!message || message.author?.bot) return false;
  const game = [...activeExtraGames.values()].find(item => item.channelId === message.channelId);
  if (!game) return false;
  const answer = normalize(message.content);
  if (!game.question.a.some(value => normalize(value) === answer)) return false;
  if (game.answers.has(message.author.id)) return false;
  game.answers.add(message.author.id);
  const elapsed = Date.now() - game.startedAt;
  const points = Math.max(10, Math.ceil(100 * (1 - Math.min(elapsed, 15000) / 15000)));
  activeExtraGames.delete(game.id);
  message.channel.send({ embeds: [extraEmbed(game, `🏆 **<@${message.author.id}> ربح الجولة!**\n⚡ الوقت: **${(elapsed / 1000).toFixed(2)}s**\n💰 النقاط: **+${points}**`)] }).catch(() => {});
  return true;
}

function finishExtraGame(client, game) {
  setTimeout(() => {
    if (!activeExtraGames.has(game.id)) return;
    activeExtraGames.delete(game.id);
    const channel = client.channels.cache.get(game.channelId);
    if (channel) channel.send({ embeds: [extraEmbed(game, '⏰ سالا الوقت وما جاوب حتى واحد بشكل صحيح.')] }).catch(() => {});
  }, 15000);
}

module.exports = { startExtraGame, handleExtraMessage, finishExtraGame, extraEmbed, activeExtraGames };
