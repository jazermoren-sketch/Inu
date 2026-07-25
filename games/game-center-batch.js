const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { startBoardGame, handleBoardInteraction, boardEmbed, boardComponents } = require('./board-games');
const { startTextGame, handleTextMessage, textGameEmbed } = require('./text-games');
const { startArcadeGame, handleArcadeInteraction, arcadeEmbed, arcadeComponents } = require('./arcade-games');
const { handleSoloMessage } = require('./solo-games');

// GAMINGHUB_BATCH_V3
const lobbies = new Map();
const games = new Map();

const GAME_DEFINITIONS = {
  impostor: { name: 'Impostor', emoji: '🕵️', min: 3, max: 10, description: 'لقا الإمبوستر بين اللاعبين.' },
  connect4: { name: 'Connect Four', emoji: '🔴', min: 2, max: 2, description: 'ربط أربعة قبل الخصم.' },
  tictactoe: { name: 'Tic Tac Toe', emoji: '❌', min: 2, max: 2, description: 'إكس أو ضد لاعب آخر.' },
  hangman: { name: 'Hangman', emoji: '🔤', min: 2, max: 8, description: 'خمن الكلمة حرفاً بحرف.' },
  reaction: { name: 'Reaction Race', emoji: '⚡', min: 2, max: 8, description: 'أسرع لاعب يتفاعل يفوز.' },
  math: { name: 'Math Battle', emoji: '➗', min: 2, max: 8, description: 'حل العمليات بسرعة.' },
  emoji: { name: 'Emoji Guess', emoji: '😀', min: 2, max: 8, description: 'خمن الفيلم أو اللعبة من الإيموجيات.' },
  trivia: { name: 'Trivia', emoji: '❓', min: 2, max: 8, description: 'أسئلة معلومات عامة.' },
  higherlower: { name: 'Higher or Lower', emoji: '📈', min: 2, max: 8, description: 'توقع الرقم الأعلى أو الأقل.' },
  treasure: { name: 'Treasure Hunt', emoji: '🗺️', min: 2, max: 10, description: 'ابحث عن الكنز قبل الآخرين.' },
  blackjack: { name: '21 Cards', emoji: '🃏', min: 2, max: 6, description: 'قرب للـ21 بلا ما تفوتها.' },
  dice: { name: 'Dice Arena', emoji: '🎲', min: 2, max: 8, description: 'جولات نرد وحظ.' },
  memory: { name: 'Memory Match', emoji: '🧠', min: 2, max: 8, description: 'اختبر الذاكرة ديالك.' },
  wordchain: { name: 'Word Chain', emoji: '🔗', min: 2, max: 8, description: 'كل كلمة تبدأ بآخر حرف.' },
  speedquiz: { name: 'Speed Quiz', emoji: '⏱️', min: 2, max: 8, description: 'أسئلة سريعة ضد الوقت.' }
};

const SOLO_GAMES = {
  daily: { name: 'Daily Challenge', emoji: '📅', description: 'تحدي يومي فردي.' },
  reactionSolo: { name: 'Solo Reaction', emoji: '⚡', description: 'حطم الرقم القياسي ديالك.' },
  mathSolo: { name: 'Solo Math', emoji: '🧮', description: 'تحدي رياضيات فردي.' },
  emojiSolo: { name: 'Solo Emoji Guess', emoji: '🎭', description: 'خمن من الإيموجيات.' },
  memorySolo: { name: 'Solo Memory', emoji: '🧠', description: 'تحدي الذاكرة الفردي.' }
};

function listEmbed() {
  const multiplayer = Object.entries(GAME_DEFINITIONS).map(([id, g]) => `${g.emoji} **${g.name}** — ${g.description}`).join('\n');
  const solo = Object.values(SOLO_GAMES).map(g => `${g.emoji} **${g.name}** — ${g.description}`).join('\n');
  return new EmbedBuilder().setTitle('🎮 GamingHub — Game Center').setDescription(`## 🎮 ألعاب السيرفر\n${multiplayer}\n\n## 🧍 ألعاب فردية\n${solo}\n\n⚡ الألعاب الفردية كتبدأ مباشرة بالاختصار ديالها، وأول جواب صحيح فـ15 ثانية كيربح نقاط حسب السرعة.`).setFooter({ text: 'GamingHub Game Center' });
}

function lobbyEmbed(lobby) {
  const g = GAME_DEFINITIONS[lobby.game];
  return new EmbedBuilder().setTitle(`${g.emoji} ${g.name} — Lobby`).setDescription(`${g.description}\n\n👥 **اللاعبين: ${lobby.players.length}/${g.max}**\n${lobby.players.map((id, i) => `${i + 1}. <@${id}>`).join('\n')}\n\n🎯 الحد الأدنى: **${g.min}** لاعبين`);
}

function lobbyButtons(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`gh_join_${id}`).setLabel('🎮 دخول').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`gh_leave_${id}`).setLabel('🚪 خروج').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`gh_start_${id}`).setLabel('▶️ بدء').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`gh_cancel_${id}`).setLabel('❌ إلغاء').setStyle(ButtonStyle.Secondary)
  );
}

function setupGameCenterBatch(client) {
  client.on('messageCreate', async message => {
    try {
      if (await handleSoloMessage(message)) return;
      await handleTextMessage(message);
    } catch (error) { console.error('Game message error:', error); }
  });

  client.on('interactionCreate', async interaction => {
    if (await handleBoardInteraction(interaction)) return;
    if (await handleArcadeInteraction(interaction)) return;
    if (!interaction.isChatInputCommand()) return;
    const name = interaction.commandName;
    if (name === 'games' || name === 'العاب' || name === 'ألعاب') return interaction.reply({ embeds: [listEmbed()], ephemeral: true });
    if (name !== 'game') return;
    const gameId = interaction.options.getString('name', true).toLowerCase();
    const game = GAME_DEFINITIONS[gameId];
    if (!game) return interaction.reply({ content: '❌ اللعبة غير موجودة فـ Game Center.', ephemeral: true });
    const id = `${interaction.guildId}-${gameId}-${Date.now()}`;
    const lobby = { id, game: gameId, host: interaction.user.id, channelId: interaction.channelId, players: [interaction.user.id] };
    lobbies.set(id, lobby);
    return interaction.reply({ embeds: [lobbyEmbed(lobby)], components: [lobbyButtons(id)] });
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith('gh_')) return;
    const [, action, id] = interaction.customId.split('_');
    const lobby = lobbies.get(id);
    if (!lobby) return interaction.reply({ content: '❌ هاد الـLobby سالات.', ephemeral: true });
    const definition = GAME_DEFINITIONS[lobby.game];

    if (action === 'join') {
      if (lobby.players.length >= definition.max) return interaction.reply({ content: '❌ الـLobby عامرة.', ephemeral: true });
      if (!lobby.players.includes(interaction.user.id)) lobby.players.push(interaction.user.id);
      return interaction.update({ embeds: [lobbyEmbed(lobby)], components: [lobbyButtons(id)] });
    }
    if (action === 'leave') {
      lobby.players = lobby.players.filter(x => x !== interaction.user.id);
      if (!lobby.players.length) { lobbies.delete(id); return interaction.update({ content: '❌ تسدات الـLobby.', embeds: [], components: [] }); }
      return interaction.update({ embeds: [lobbyEmbed(lobby)], components: [lobbyButtons(id)] });
    }
    if (action === 'cancel') {
      if (interaction.user.id !== lobby.host) return interaction.reply({ content: '❌ غير الـHost يقدر يلغي.', ephemeral: true });
      lobbies.delete(id);
      return interaction.update({ content: '❌ تلغات اللعبة.', embeds: [], components: [] });
    }
    if (action === 'start') {
      if (interaction.user.id !== lobby.host) return interaction.reply({ content: '❌ غير الـHost يقدر يبدا.', ephemeral: true });
      if (lobby.players.length < definition.min) return interaction.reply({ content: `❌ خاص على الأقل ${definition.min} لاعبين.`, ephemeral: true });
      const gameState = { id, game: lobby.game, channelId: lobby.channelId, players: [...lobby.players], startedAt: Date.now() };
      games.set(id, gameState);
      lobbies.delete(id);

      if (lobby.game === 'connect4' || lobby.game === 'tictactoe') {
        const boardGame = startBoardGame({ id, type: lobby.game, channelId: lobby.channelId, players: [...lobby.players] });
        return interaction.update({ content: '', embeds: [boardEmbed(boardGame, '🎮 اللعبة بدات!')], components: boardComponents(boardGame) });
      }
      if (lobby.game === 'math' || lobby.game === 'hangman' || lobby.game === 'wordchain') {
        const textGame = startTextGame({ id, type: lobby.game, channelId: lobby.channelId, players: [...lobby.players] });
        return interaction.update({ content: '', embeds: [textGameEmbed(textGame)], components: [] });
      }
      if (lobby.game === 'higherlower' || lobby.game === 'dice' || lobby.game === 'memory' || lobby.game === 'blackjack') {
        const arcadeGame = startArcadeGame({ id, type: lobby.game, channelId: lobby.channelId, players: [...lobby.players] });
        return interaction.update({ content: '', embeds: [arcadeEmbed(arcadeGame)], components: arcadeComponents(arcadeGame) });
      }
      return interaction.update({ content: `${definition.emoji} **${definition.name} بدات!**`, embeds: [], components: [] });
    }
  });
}

module.exports = { setupGameCenterBatch, GAME_DEFINITIONS, SOLO_GAMES, lobbies, games };
