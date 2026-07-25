const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes } = require("discord.js");

const lobbies = new Map();
const games = new Map();

function lobbyEmbed(lobby) {
  return new EmbedBuilder().setTitle("⚔️ DUEL ARENA — Lobby").setDescription(`تحدّى لاعب آخر فـ Duel سريع!\n\n👥 **اللاعبين: ${lobby.players.length}/2**\n${lobby.players.map((id, i) => `${i + 1}. <@${id}>`).join("\n")}\n\n⚔️ خاص جوج لاعبين باش تبدا المبارزة.`).setFooter({ text: "Duel Arena • Best of 3" });
}

function lobbyRows(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`da_join_${id}`).setLabel("⚔️ تحدى / دخول").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`da_leave_${id}`).setLabel("🚪 خروج").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`da_start_${id}`).setLabel("▶️ بدء المبارزة").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`da_cancel_${id}`).setLabel("❌ إلغاء").setStyle(ButtonStyle.Secondary)
  );
}

function gameEmbed(game, message = "اختار الحركة ديالك!") {
  return new EmbedBuilder().setTitle(`⚔️ DUEL ARENA — Round ${game.round}/3`).setDescription(`${message}\n\n🎯 **Best of 3**\n${game.players.map(id => `<@${id}> — **${game.scores[id] || 0}** wins`).join("\n")}`).setFooter({ text: "⚡ Rock • Paper • Scissors" });
}

function actionRows(game) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`da_move_${game.id}_rock`).setLabel("🪨 Rock").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`da_move_${game.id}_paper`).setLabel("📄 Paper").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`da_move_${game.id}_scissors`).setLabel("✂️ Scissors").setStyle(ButtonStyle.Primary)
  )];
}

function winner(a, b) {
  if (a === b) return 0;
  if ((a === "rock" && b === "scissors") || (a === "paper" && b === "rock") || (a === "scissors" && b === "paper")) return 1;
  return 2;
}

async function finishGame(game, channel) {
  const [a, b] = game.players;
  const scoreA = game.scores[a] || 0;
  const scoreB = game.scores[b] || 0;
  const winnerId = scoreA === scoreB ? null : (scoreA > scoreB ? a : b);
  const embed = new EmbedBuilder().setTitle("🏆 DUEL ARENA — GAME OVER").setDescription(winnerId ? `👑 الفائز هو <@${winnerId}>!` : "🤝 المبارزة سالات بالتعادل!").addFields({ name: "📊 النتيجة", value: `<@${a}> — **${scoreA}**\n<@${b}> — **${scoreB}**` }).setFooter({ text: "Duel Arena • GG!" });
  await channel.send({ embeds: [embed] });
  games.delete(game.id);
}

function setupDuelArena(client) {
  client.once("ready", async () => {
    if (!process.env.DISCORD_TOKEN || !process.env.GUILD_ID) return;
    try {
      const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
      await rest.post(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: { name: "duel", description: "تحدّى لاعباً في Duel Arena" } });
    } catch (err) { console.error("Duel Arena command registration error:", err.message); }
  });

  client.on("interactionCreate", async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === "duel") {
      const id = `${interaction.guildId}-${Date.now()}`;
      const lobby = { id, host: interaction.user.id, players: [interaction.user.id] };
      lobbies.set(id, lobby);
      return interaction.reply({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
    }
    if (!interaction.isButton()) return;
    const p = interaction.customId.split("_");
    if (p[0] !== "da") return;

    if (["join", "leave", "start", "cancel"].includes(p[1])) {
      const id = p.slice(2).join("_");
      const lobby = lobbies.get(id);
      if (!lobby) return interaction.reply({ content: "❌ هاد الـ Lobby سالات.", ephemeral: true });
      if (p[1] === "join") {
        if (lobby.players.length >= 2) return interaction.reply({ content: "❌ المبارزة عامرة بجوج لاعبين.", ephemeral: true });
        if (!lobby.players.includes(interaction.user.id)) lobby.players.push(interaction.user.id);
        return interaction.update({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
      }
      if (p[1] === "leave") {
        lobby.players = lobby.players.filter(id => id !== interaction.user.id);
        if (!lobby.players.length) { lobbies.delete(id); return interaction.update({ content: "❌ تسد الـ Lobby.", embeds: [], components: [] }); }
        return interaction.update({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
      }
      if (p[1] === "cancel") {
        if (interaction.user.id !== lobby.host) return interaction.reply({ content: "❌ غير الـ Host يقدر يلغي.", ephemeral: true });
        lobbies.delete(id);
        return interaction.update({ content: "❌ تلغات المبارزة.", embeds: [], components: [] });
      }
      if (lobby.players.length < 2) return interaction.reply({ content: "❌ خاص جوج لاعبين.", ephemeral: true });
      if (interaction.user.id !== lobby.host) return interaction.reply({ content: "❌ غير الـ Host يقدر يبدا.", ephemeral: true });
      const game = { id, players: [...lobby.players], scores: {}, round: 1, moves: new Map() };
      game.players.forEach(id => { game.scores[id] = 0; });
      games.set(id, game); lobbies.delete(id);
      await interaction.update({ content: "⚔️ **المبارزة بدات!**", embeds: [], components: [] });
      return interaction.channel.send({ embeds: [gameEmbed(game)], components: actionRows(game) });
    }

    if (p[1] === "move") {
      const game = games.get(p[2]);
      if (!game) return interaction.reply({ content: "❌ هاد المبارزة سالات.", ephemeral: true });
      if (!game.players.includes(interaction.user.id)) return interaction.reply({ content: "❌ ماشي لاعب فهاد المبارزة.", ephemeral: true });
      if (game.moves.has(interaction.user.id)) return interaction.reply({ content: "⏳ اخترتي الحركة ديالك ديجا.", ephemeral: true });
      game.moves.set(interaction.user.id, p[3]);
      await interaction.reply({ content: "✅ تسجلات الحركة ديالك! تسنى المنافس.", ephemeral: true });
      if (game.moves.size < 2) return;
      const [a, b] = game.players;
      const result = winner(game.moves.get(a), game.moves.get(b));
      let text;
      if (result === 0) text = "🤝 Round تعادل!";
      else { const id = result === 1 ? a : b; game.scores[id]++; text = `🏆 ربح هاد الـ Round: <@${id}>`; }
      game.moves.clear();
      if (game.scores[a] >= 2 || game.scores[b] >= 2 || game.round >= 3) return finishGame(game, interaction.channel);
      game.round++;
      return interaction.channel.send({ embeds: [gameEmbed(game, text)], components: actionRows(game) });
    }
  });
}

module.exports = { setupDuelArena };
