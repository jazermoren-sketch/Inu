const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const activeArcadeGames = new Map();
const SYMBOLS = ['🍎', '🍌', '🍇', '🍒'];

function buttons(id, type, disabled = false) {
  if (type === 'higherlower') return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ag_higher_${id}`).setLabel('📈 Higher').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`ag_lower_${id}`).setLabel('📉 Lower').setStyle(ButtonStyle.Danger).setDisabled(disabled)
  );
  if (type === 'dice') return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ag_roll_${id}`).setLabel('🎲 Roll Dice').setStyle(ButtonStyle.Primary).setDisabled(disabled)
  );
  if (type === 'memory') return new ActionRowBuilder().addComponents(
    [0, 1, 2, 3].map(i => new ButtonBuilder().setCustomId(`ag_memory_${id}_${i}`).setLabel('❓').setStyle(ButtonStyle.Primary).setDisabled(disabled))
  );
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ag_hit_${id}`).setLabel('🃏 Hit').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`ag_stand_${id}`).setLabel('✋ Stand').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );
}

function embed(game, notice = '') {
  const prefix = notice ? `${notice}\n\n` : '';
  if (game.type === 'higherlower') return new EmbedBuilder().setTitle('📈 HIGHER OR LOWER').setDescription(`${prefix}🔢 الرقم الحالي: **${game.current}**\n\n👥 الدور: <@${game.players[game.turn]}>\n🏆 النقاط: ${game.players.map(id => `<@${id}>: ${game.scores[id] || 0}`).join(' | ')}`);
  if (game.type === 'dice') return new EmbedBuilder().setTitle('🎲 DICE ARENA').setDescription(`${prefix}كل لاعب خاصو يدير Roll.\n\n${game.players.map(id => `👤 <@${id}>: ${game.rolls[id] == null ? '⏳' : `**${game.rolls[id]}**`}`).join('\n')}\n\n🏆 الجولة: **${game.round}/3**`);
  if (game.type === 'memory') return new EmbedBuilder().setTitle('🧠 MEMORY MATCH').setDescription(`${prefix}قلب على الزوج المتطابق!\n\n${game.cards.map((card, i) => game.revealed[i] || game.matched[i] ? `**${card}**` : '❓').join('  ')}\n\n👤 الدور: <@${game.players[game.turn]}>`);
  return new EmbedBuilder().setTitle('🃏 21 CARDS').setDescription(`${prefix}🎴 مجموعك: **${game.total}**\n\n👤 اللاعب: <@${game.players[0]}>\n\nوصل لـ21 بلا ما تفوتها.`);
}

function newCard() { return Math.floor(Math.random() * 10) + 1; }

function startArcadeGame({ id, type, channelId, players }) {
  const game = { id, type, channelId, players: [...players], turn: 0, startedAt: Date.now() };
  if (type === 'higherlower') { game.current = Math.floor(Math.random() * 100) + 1; game.scores = Object.fromEntries(players.map(id => [id, 0])); }
  if (type === 'dice') { game.round = 1; game.rolls = Object.fromEntries(players.map(id => [id, null])); }
  if (type === 'memory') { const pair = [...SYMBOLS, ...SYMBOLS].sort(() => Math.random() - 0.5); game.cards = pair; game.revealed = [false, false, false, false, false, false, false, false]; game.matched = [...game.revealed]; game.first = null; }
  if (type === 'blackjack') game.total = newCard() + newCard();
  activeArcadeGames.set(id, game);
  return game;
}

function endGame(id) { activeArcadeGames.delete(id); }

async function handleArcadeInteraction(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('ag_')) return false;
  const [, action, id, position] = interaction.customId.split('_');
  const game = activeArcadeGames.get(id);
  if (!game) { await interaction.reply({ content: '❌ هاد اللعبة سالات.', ephemeral: true }); return true; }
  const playerIndex = game.players.indexOf(interaction.user.id);
  if (playerIndex === -1) { await interaction.reply({ content: '❌ ماشي لاعب فهاد اللعبة.', ephemeral: true }); return true; }

  if (game.type === 'higherlower') {
    if (playerIndex !== game.turn) return interaction.reply({ content: '⏳ مازال ما جاكش الدور.', ephemeral: true });
    const next = Math.floor(Math.random() * 100) + 1;
    const correct = action === 'higher' ? next > game.current : next < game.current;
    if (correct) game.scores[interaction.user.id] += 1;
    game.current = next;
    if (game.scores[interaction.user.id] >= 3) { endGame(id); return interaction.update({ embeds: [embed(game, `🏆 <@${interaction.user.id}> ربح بـ **3 نقاط**!`)], components: [] }); }
    game.turn = (game.turn + 1) % game.players.length;
    return interaction.update({ embeds: [embed(game, correct ? `✅ صحيح! الرقم الجديد هو **${next}**.` : `❌ خطأ! الرقم الجديد هو **${next}**.`)], components: [buttons(id, game.type)] });
  }

  if (game.type === 'dice') {
    if (game.rolls[interaction.user.id] !== null) return interaction.reply({ content: '❌ رميتي النرد ديجا.', ephemeral: true });
    game.rolls[interaction.user.id] = Math.floor(Math.random() * 6) + 1;
    if (Object.values(game.rolls).every(value => value !== null)) {
      const max = Math.max(...Object.values(game.rolls));
      const winners = game.players.filter(player => game.rolls[player] === max);
      if (game.round >= 3) { endGame(id); return interaction.update({ embeds: [embed(game, `🏆 الفائز: ${winners.map(id => `<@${id}>`).join(', ')}`)], components: [] }); }
      game.round += 1; game.rolls = Object.fromEntries(game.players.map(id => [id, null]));
      return interaction.update({ embeds: [embed(game, `🎲 الجولة سالات! أعلى نتيجة: **${max}**. الجولة الجاية بدات.`)], components: [buttons(id, game.type)] });
    }
    return interaction.update({ embeds: [embed(game, `🎲 <@${interaction.user.id}> دار **${game.rolls[interaction.user.id]}**.`)], components: [buttons(id, game.type)] });
  }

  if (game.type === 'blackjack') {
    if (action === 'hit') {
      game.total += newCard();
      if (game.total > 21) { endGame(id); return interaction.update({ embeds: [embed(game, `💥 فاتك 21! المجموع: **${game.total}**.`)], components: [] }); }
      if (game.total === 21) { endGame(id); return interaction.update({ embeds: [embed(game, '🏆 وصلتي لـ **21**! ربحتي!')], components: [] }); }
      return interaction.update({ embeds: [embed(game, '🃏 خديتي كارت جديدة.')], components: [buttons(id, game.type)] });
    }
    endGame(id);
    return interaction.update({ embeds: [embed(game, `✋ وقفتي بـ **${game.total}** نقطة.`)], components: [] });
  }

  if (game.type === 'memory') {
    const index = Number(position);
    if (!Number.isInteger(index) || index < 0 || index >= game.cards.length || game.matched[index] || game.revealed[index]) return interaction.reply({ content: '❌ هاد الكارت ما متاحةش.', ephemeral: true });
    game.revealed[index] = true;
    if (game.first === null) { game.first = index; return interaction.update({ embeds: [embed(game, `🔎 <@${interaction.user.id}> قلب كارت.`)], components: [buttons(id, game.type)] }); }
    const first = game.first; game.first = null;
    if (game.cards[first] === game.cards[index]) { game.matched[first] = game.matched[index] = true; }
    else { game.revealed[first] = game.revealed[index] = false; game.turn = (game.turn + 1) % game.players.length; }
    if (game.matched.every(Boolean)) { endGame(id); return interaction.update({ embeds: [embed(game, `🏆 <@${interaction.user.id}> لقا جميع الأزواج!`)], components: [] }); }
    return interaction.update({ embeds: [embed(game, game.cards[first] === game.cards[index] ? '✅ زوج صحيح!' : '❌ ماشي نفس الزوج.')], components: [buttons(id, game.type)] });
  }
  return false;
}

function arcadeComponents(game) { return [buttons(game.id, game.type)]; }
function arcadeEmbed(game) { return embed(game, '🎮 اللعبة بدات!'); }

module.exports = { startArcadeGame, handleArcadeInteraction, arcadeEmbed, arcadeComponents, activeArcadeGames };
