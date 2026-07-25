const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes } = require("discord.js");

const lobbies = new Map();
const games = new Map();

const WORDS = [
  { word: "مغرب", hint: "بلاد جميلة فشمال إفريقيا" },
  { word: "كرة القدم", hint: "رياضة كيلعبوها 22 لاعب" },
  { word: "ديسكورد", hint: "منصة فيها السيرفرات والـ bots" },
  { word: "مافيا", hint: "لعبة فيها مواطنين وأدوار سرية" },
  { word: "روبوت", hint: "كيقدر ينفذ أوامر ويتفاعل مع الناس" },
  { word: "بطولة", hint: "منافسة فيها فائز" }
];

function lobbyEmbed(lobby) {
  return new EmbedBuilder().setTitle("🧠 WORD BATTLE — Lobby").setDescription(`تنافسوا باش تكتاشفو الكلمة السرية!\n\n👥 **اللاعبين: ${lobby.players.length}/8**\n${lobby.players.map((id, i) => `${i + 1}. <@${id}>`).join("\n")}\n\n🎯 خاص على الأقل **2 لاعبين**.`).setFooter({ text: "Word Battle • أسرع واحد يجاوب يربح النقاط" });
}

function lobbyRows(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`wb_join_${id}`).setLabel("🎮 دخول").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wb_leave_${id}`).setLabel("🚪 خروج").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wb_start_${id}`).setLabel("▶️ بدء").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wb_cancel_${id}`).setLabel("❌ إلغاء").setStyle(ButtonStyle.Secondary)
  );
}

function gameEmbed(game, extra = "") {
  return new EmbedBuilder().setTitle(`🧠 WORD BATTLE — Round ${game.round}/5`).setDescription(`${extra}\n\n💡 **التلميح:** ${game.current.hint}\n\n🏆 **النقاط:**\n${game.players.map(id => `<@${id}> — **${game.scores[id] || 0}** نقطة`).join("\n")}\n\n✍️ كتب الجواب ديالك فالشات!`).setFooter({ text: "أول جواب صحيح كيربح الجولة" });
}

function setupWordBattle(client) {
  client.once("ready", async () => {
    if (!process.env.DISCORD_TOKEN || !process.env.GUILD_ID) return;
    try {
      const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
      await rest.post(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: { name: "wordbattle", description: "لعبة تخمين الكلمات الجماعية" } });
    } catch (err) { console.error("Word Battle command registration error:", err.message); }
  });

  client.on("interactionCreate", async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === "wordbattle") {
      const id = `${interaction.guildId}-${Date.now()}`;
      const lobby = { id, host: interaction.user.id, players: [interaction.user.id] };
      lobbies.set(id, lobby);
      return interaction.reply({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
    }
    if (!interaction.isButton()) return;
    const p = interaction.customId.split("_");
    if (p[0] !== "wb") return;
    const id = p.slice(2).join("_");
    const lobby = lobbies.get(id);
    if (!lobby) return interaction.reply({ content: "❌ هاد الـ Lobby سالات.", ephemeral: true });

    if (p[1] === "join") {
      if (lobby.players.length >= 8) return interaction.reply({ content: "❌ الـ Lobby عامرة.", ephemeral: true });
      if (!lobby.players.includes(interaction.user.id)) lobby.players.push(interaction.user.id);
      return interaction.update({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
    }
    if (p[1] === "leave") {
      lobby.players = lobby.players.filter(x => x !== interaction.user.id);
      if (!lobby.players.length) { lobbies.delete(id); return interaction.update({ content: "❌ تسد الـ Lobby.", embeds: [], components: [] }); }
      return interaction.update({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
    }
    if (p[1] === "cancel") {
      if (interaction.user.id !== lobby.host) return interaction.reply({ content: "❌ غير الـ Host يقدر يلغي.", ephemeral: true });
      lobbies.delete(id);
      return interaction.update({ content: "❌ تلغات اللعبة.", embeds: [], components: [] });
    }
    if (p[1] !== "start") return;
    if (interaction.user.id !== lobby.host) return interaction.reply({ content: "❌ غير الـ Host يقدر يبدا.", ephemeral: true });
    if (lobby.players.length < 2) return interaction.reply({ content: "❌ خاص على الأقل جوج لاعبين.", ephemeral: true });

    const game = { id, channelId: interaction.channelId, players: [...lobby.players], scores: {}, round: 1, current: WORDS[Math.floor(Math.random() * WORDS.length)] };
    game.players.forEach(x => game.scores[x] = 0);
    games.set(id, game);
    lobbies.delete(id);
    await interaction.update({ content: "🧠 **Word Battle بدات!**", embeds: [], components: [] });
    return interaction.channel.send({ embeds: [gameEmbed(game)] });
  });

  client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const game = [...games.values()].find(g => g.players.includes(message.author.id) && g.channelId === message.channelId);
    if (!game) return;
    if (message.content.trim().toLowerCase() !== game.current.word.toLowerCase()) return;

    game.scores[message.author.id] += 1;
    if (game.round >= 5) {
      const winner = game.players.reduce((a, b) => game.scores[a] >= game.scores[b] ? a : b);
      await message.channel.send({ embeds: [new EmbedBuilder().setTitle("🏆 WORD BATTLE — GAME OVER").setDescription(`👑 الفائز هو <@${winner}>!`).addFields({ name: "📊 النتيجة", value: game.players.map(id => `<@${id}> — **${game.scores[id]}** نقطة`).join("\n") })] });
      games.delete(game.id);
      return;
    }
    game.round++;
    game.current = WORDS[Math.floor(Math.random() * WORDS.length)];
    await message.channel.send({ embeds: [gameEmbed(game, `🎉 <@${message.author.id}> ربح الجولة! +1 نقطة`)] });
  });
}

module.exports = { setupWordBattle };
