const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { startBoardGame, handleBoardInteraction, boardEmbed, boardComponents } = require('./board-games');
const { startTextGame, handleTextMessage, textGameEmbed } = require('./text-games');
const { startArcadeGame, handleArcadeInteraction, arcadeEmbed, arcadeComponents } = require('./arcade-games');
const { handleSoloMessage } = require('./solo-games');
const extraGames = require('./extra-games');
const { startExtraGame, handleExtraMessage, finishExtraGame, extraEmbed } = extraGames;
const channelConfig = require('./channel-config');

// GAMINGHUB_BATCH_V6
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

function channelConfigCommand() {
  return {
    name: 'gamechannels',
    description: 'تحديد القنوات المسموح فيها بألعاب GamingHub',
    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    options: [
      { type: 1, name: 'set', description: 'تحديد القنوات المسموح فيها', options: [
        ...Array.from({ length: 10 }, (_, i) => ({ type: 7, name: `channel${i + 1}`, description: `القناة ${i + 1}`, required: i === 0, channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }))
      ] },
      { type: 1, name: 'list', description: 'عرض القنوات المحددة' },
      { type: 1, name: 'clear', description: 'إلغاء تحديد القنوات والسماح في جميع القنوات' }
    ]
  };
}

function mainHubEmbed() {
  return new EmbedBuilder().setTitle('🎮 Gaming Hub').setDescription('اختار شنو بغيتي تشوف:\n\n👥 **ألعاب السيرفر** — ألعاب جماعية مع Lobby.\n🧍 **ألعاب فردية** — ألعاب كتبدأ مباشرة.');
}

function mainHubRows() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('v15_server_games').setLabel('👥 ألعاب السيرفر').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('v15_solo_games').setLabel('🧍 ألعاب فردية').setStyle(ButtonStyle.Secondary)
  );
}

function soloRows() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('v15_solo_quiz').setLabel('🧠 Trivia').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('v15_solo_number').setLabel('🔢 Number').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('v15_solo_word').setLabel('🔤 Word').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('v15_solo_reaction').setLabel('⚡ Reaction').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('v15_back_main').setLabel('🔙 رجوع').setStyle(ButtonStyle.Secondary)
  );
}

function serverRows() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('v15_game_mafia').setLabel('🕵️ Mafia').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('v15_game_duel').setLabel('⚔️ Duel').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('v15_game_ttt').setLabel('❌⭕ Tic Tac Toe').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('v15_game_connect4').setLabel('🔴🟡 Connect 4').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('v15_back_main').setLabel('🔙 رجوع').setStyle(ButtonStyle.Secondary)
  );
}

function setupGameCenterBatch(client) {
  client.once('ready', async () => {
    try {
      await client.application.commands.create(channelConfigCommand());
      console.log('✅ /gamechannels registered');
    } catch (error) { console.error('Game channel command registration error:', error); }
  });

  client.on('messageCreate', async message => {
    try {
      if (!message.guildId || !channelConfig.isAllowed(message.guildId, message.channelId)) return;
      if (await handleSoloMessage(message)) return;
      if (handleExtraMessage(message)) return;
      await handleTextMessage(message);
    } catch (error) { console.error('Game message error:', error); }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.guildId) return;

    if (interaction.isChatInputCommand() && interaction.commandName === 'gamechannels') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ خاصك Administrator باش تستعمل هاد الأمر.', ephemeral: true });
      const sub = interaction.options.getSubcommand();
      if (sub === 'set') {
        const ids = [];
        for (let i = 1; i <= 10; i++) {
          const channel = interaction.options.getChannel(`channel${i}`);
          if (channel) ids.push(channel.id);
        }
        const saved = channelConfig.set(interaction.guildId, ids);
        return interaction.reply({ content: `✅ تحددات **${saved.length}** قنوات للألعاب.\n\n${saved.map(id => `• <#${id}>`).join('\n')}\n\n🎮 دابا أوامر وألعاب GamingHub غادي تخدم غير فهاد القنوات.`, ephemeral: true });
      }
      if (sub === 'list') {
        const ids = channelConfig.get(interaction.guildId);
        return interaction.reply({ content: ids.length ? `📋 القنوات المسموح فيها GamingHub:\n${ids.map(id => `• <#${id}>`).join('\n')}` : '🌐 ماكاين حتى تحديد. GamingHub خدام فـ **جميع القنوات**.', ephemeral: true });
      }
      channelConfig.clear(interaction.guildId);
      return interaction.reply({ content: '✅ تلغا تحديد القنوات. GamingHub رجع خدام فـ جميع القنوات.', ephemeral: true });
    }

    if (!channelConfig.isAllowed(interaction.guildId, interaction.channelId)) {
      if (interaction.isButton() && interaction.customId.startsWith('gh_')) return interaction.reply({ content: '❌ GamingHub ما مسموحش فهاد القناة.', ephemeral: true });
      return;
    }

    if (await handleBoardInteraction(interaction)) return;
    if (await handleArcadeInteraction(interaction)) return;

    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id === 'v15_server_games') return interaction.update({ embeds: [new EmbedBuilder().setTitle('👥 ألعاب السيرفر').setDescription('اختار اللعبة الجماعية اللي بغيتي تبدأها.')], components: [serverRows()] });
      if (id === 'v15_solo_games') return interaction.update({ embeds: [new EmbedBuilder().setTitle('🧍 ألعاب فردية').setDescription('اختار لعبة فردية. اللعبة كتبدأ مباشرة بلا Lobby.')], components: [soloRows()] });
      if (id === 'v15_back_main') return interaction.update({ embeds: [mainHubEmbed()], components: [mainHubRows()] });
      if (id === 'v15_solo_quiz') return interaction.reply({ content: '🧠 Trivia كتخدم من Game Center /game.', ephemeral: true });
      if (id === 'v15_solo_number') return interaction.reply({ content: '🔢 Number كتخدم من Game Center /game.', ephemeral: true });
      if (id === 'v15_solo_word') return interaction.reply({ content: '🔤 Word كتخدم من Game Center /game.', ephemeral: true });
      if (id === 'v15_solo_reaction') return interaction.reply({ content: '⚡ Reaction كتخدم بالاختصار !reaction أو من Game Center.', ephemeral: true });
      if (id === 'v15_game_mafia') {
        const lobbyId = `mafia-${interaction.guildId}-${Date.now()}`;
        const lobby = { id: lobbyId, info: GAME_DEFINITIONS.impostor ? { name: '🕵️ MAFIA', max: 15, desc: 'لعبة اجتماعية: المافيا تختبئ، والمواطنون يحاولون اكتشافها.' } : null, host: interaction.user.id, players: [interaction.user.id], started: false };
        visualLobbies.set(lobbyId, lobby);
        return interaction.update({ embeds: [new EmbedBuilder().setTitle('🕵️ MAFIA — Lobby').setDescription(`لعبة المافيا بدات كـLobby بلا دابا.\n\n👥 **المشاركون: 1/15**\n1. <@${interaction.user.id}>\n\n👑 **Host:** <@${interaction.user.id}>\n⏳ **الحالة:** في انتظار اللاعبين`)], components: [lobbyButtons(lobbyId)] });
      }
      if (id === 'v15_game_duel') return interaction.reply({ content: '⚔️ Duel غادي نكملوه فمرحلة لاحقة.', ephemeral: true });
      if (id === 'v15_game_ttt') return interaction.reply({ content: '❌⭕ Tic Tac Toe راه خدام من Game Center /game.', ephemeral: true });
      if (id === 'v15_game_connect4') return interaction.reply({ content: '🔴🟡 Connect 4 راه خدام من Game Center /game.', ephemeral: true });
      if (id.startsWith('v15_join_') || id.startsWith('v15_leave_') || id.startsWith('v15_start_') || id.startsWith('v15_cancel_')) {
        const lobbyId = id.split('_').slice(2).join('_');
        const lobby = visualLobbies.get(lobbyId);
        if (!lobby) return interaction.reply({ content: '❌ هاد Lobby سالات.', ephemeral: true });
        if (id.startsWith('v15_join_')) {
          if (!lobby.players.includes(interaction.user.id)) lobby.players.push(interaction.user.id);
          return interaction.update({ embeds: [new EmbedBuilder().setTitle('🕵️ MAFIA — Lobby').setDescription(`لعبة المافيا بدات كـLobby بلا دابا.\n\n👥 **المشاركون: ${lobby.players.length}/15**\n${lobby.players.map((pid, i) => `${i + 1}. <@${pid}>`).join('\n')}\n\n👑 **Host:** <@${lobby.host}>\n⏳ **الحالة:** في انتظار اللاعبين`)], components: [lobbyButtons(lobbyId)] });
        }
        if (id.startsWith('v15_leave_')) {
          lobby.players = lobby.players.filter(pid => pid !== interaction.user.id);
          if (!lobby.players.length) { visualLobbies.delete(lobbyId); return interaction.update({ content: '❌ تسدات الـLobby.', embeds: [], components: [] }); }
          return interaction.update({ embeds: [new EmbedBuilder().setTitle('🕵️ MAFIA — Lobby').setDescription(`لعبة المافيا بدات كـLobby بلا دابا.\n\n👥 **المشاركون: ${lobby.players.length}/15**\n${lobby.players.map((pid, i) => `${i + 1}. <@${pid}>`).join('\n')}\n\n👑 **Host:** <@${lobby.host}>\n⏳ **الحالة:** في انتظار اللاعبين`)], components: [lobbyButtons(lobbyId)] });
        }
        if (id.startsWith('v15_cancel_')) {
          if (interaction.user.id !== lobby.host) return interaction.reply({ content: '❌ غير الـHost يقدر يلغي.', ephemeral: true });
          visualLobbies.delete(lobbyId);
          return interaction.update({ content: '❌ تلغات اللعبة.', embeds: [], components: [] });
        }
        if (id.startsWith('v15_start_')) {
          if (interaction.user.id !== lobby.host) return interaction.reply({ content: '❌ غير الـHost يقدر يبدا.', ephemeral: true });
          if (lobby.players.length < 5) return interaction.reply({ content: '❌ Mafia خاصها على الأقل 5 لاعبين.', ephemeral: true });
          lobby.started = true;
          visualLobbies.delete(lobbyId);
          await interaction.update({ content: '🎮 اللعبة بدات!', embeds: [], components: [] });
          await startExtraGame({ id: lobbyId, type: 'trivia', channelId: interaction.channelId, players: lobby.players });
          return;
        }
      }
    }

    if (!interaction.isChatInputCommand()) return;
    const name = interaction.commandName;
    if (name === 'games' || name === 'العاب' || name === 'ألعاب') return interaction.reply({ embeds: [listEmbed()], ephemeral: true });
    if (name !== 'game') return;
    const gameId = interaction.options.getString('name', true).toLowerCase();
    const game = GAME_DEFINITIONS[gameId];
    if (!game) return interaction.reply({ content: '❌ اللعبة غير موجودة فـ Game Center.', ephemeral: true });
    const id = `${interaction.guildId}-${gameId}-${Date.now()}`;
    const lobby = { id, game: gameId, host: interaction.user.id, channelId: interaction.channelId, players: [interaction.user.id], startedAt: Date.now() };
    lobbies.set(id, lobby);
    return interaction.reply({ embeds: [lobbyEmbed(lobby)], components: [lobbyButtons(id)] });
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith('gh_')) return;
    if (!interaction.guildId || !channelConfig.isAllowed(interaction.guildId, interaction.channelId)) return interaction.reply({ content: '❌ GamingHub ما مسموحش فهاد القناة.', ephemeral: true });
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
      if (['impostor', 'reaction', 'emoji', 'trivia', 'treasure', 'speedquiz'].includes(lobby.game)) {
        const extraGame = startExtraGame({ id, type: lobby.game, channelId: lobby.channelId, players: [...lobby.players] });
        finishExtraGame(client, extraGame);
        return interaction.update({ content: '', embeds: [extraEmbed(extraGame, '🎮 اللعبة بدات! أول جواب صحيح كيربح الجولة.')], components: [] });
      }
      return interaction.update({ content: `${definition.emoji} **${definition.name} بدات!**`, embeds: [], components: [] });
    }
  });
}

module.exports = { setupGameCenterBatch, GAME_DEFINITIONS, SOLO_GAMES, lobbies, games };
