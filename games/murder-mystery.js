const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, REST, Routes } = require("discord.js");

const lobbies = new Map();
const games = new Map();

const CASES = [
  { title: "جريمة فالقصر القديم", story: "فليلة ممطرة، تلقى صاحب القصر مقتولاً فالمكتبة. كانو 4 أشخاص حاضرين فالدار.", suspects: ["الطباخ", "الحارس", "الخادم", "الوارث"], clues: ["🔑 مفتاح المكتبة كان عند الحارس.", "👞 آثار طين كانت قريبة من النافذة.", "🕯️ الشاهد سمع صوت نقاش قبل انقطاع الكهرباء.", "📜 رسالة ممزقة كانت مخبأة داخل الكتاب.", "⏰ ساعة الحائط توقفت في 23:15."], culprit: 1 },
  { title: "جريمة فالفندق", story: "اختفى ملف مهم من غرفة الفندق، وبعد دقائق تم العثور على صاحبه فاقداً للوعي.", suspects: ["مدير الفندق", "المصور", "الحارس الليلي", "رجل الأعمال"], clues: ["📹 الكاميرا توقفت لمدة 3 دقائق.", "🧤 قفاز أسود وجد قرب الباب.", "🛗 المصعد توقف في الطابق 7.", "📱 هاتف مجهول اتصل بالغرفة.", "🗝️ بطاقة دخول استعملت بعد منتصف الليل."], culprit: 2 }
];

function lobbyEmbed(lobby) {
  return new EmbedBuilder().setTitle("🕵️ MURDER MYSTERY — Lobby").setDescription("تعاونوا باش تحلو القضية وتكتاشفو المجرم!\n\n" + `👥 **اللاعبين: ${lobby.players.length}/8**\n` + (lobby.players.length ? lobby.players.map((id, i) => `${i + 1}. <@${id}>`).join("\n") : "مازال حتى لاعب") + "\n\n🔎 خاص على الأقل **3 لاعبين** باش تبدا القضية.").setFooter({ text: "Murder Mystery • تعاونوا قبل ما يسالي الوقت" });
}

function lobbyRows(id, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mm_join_${id}`).setLabel("🎮 دخول").setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`mm_leave_${id}`).setLabel("🚪 خروج").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`mm_start_${id}`).setLabel("🔎 بدء التحقيق").setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`mm_cancel_${id}`).setLabel("❌ إلغاء").setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );
}

function caseEmbed(game) {
  const c = game.case;
  return new EmbedBuilder().setTitle(`🕵️ ${c.title}`).setDescription(`${c.story}\n\n📌 **الهدف:** ناقشوا الأدلة واكتاشفوا شكون المجرم.`).addFields(
    { name: "👥 المحققون", value: game.players.map(id => `<@${id}>`).join(" • ") },
    { name: "📊 الأدلة المكتشفة", value: `${game.clueIndex}/${c.clues.length}` }
  );
}

function actionRows(game) {
  const c = game.case;
  const suspectRow = new ActionRowBuilder().addComponents(c.suspects.map((name, i) => new ButtonBuilder().setCustomId(`mm_suspect_${game.id}_${i}`).setLabel(`🔍 ${name}`).setStyle(ButtonStyle.Primary)));
  const clueRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mm_clue_${game.id}`).setLabel("📜 كشف دليل").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`mm_vote_${game.id}`).setLabel("⚖️ تأكيد الاتهام").setStyle(ButtonStyle.Danger)
  );
  return [suspectRow, clueRow];
}

async function finishGame(game, channel, success) {
  const c = game.case;
  const result = new EmbedBuilder().setTitle(success ? "🎉 القضية تحلات!" : "💀 التحقيق فشل").setDescription(success ? `👑 المحققون اكتاشفو المجرم الصحيح: **${c.suspects[c.culprit]}**!` : `❌ المجرم الحقيقي كان: **${c.suspects[c.culprit]}**.`).addFields({ name: "📜 الأدلة المكتشفة", value: `${game.clueIndex}/${c.clues.length}` }).setFooter({ text: "Murder Mystery • القضية سالات" });
  await channel.send({ embeds: [result] });
  games.delete(game.id);
}

function setupMurderMystery(client) {
  client.once("ready", async () => {
    if (!process.env.DISCORD_TOKEN || !process.env.GUILD_ID) return;
    try {
      const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
      await rest.post(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: { name: "murdermystery", description: "لعبة تحقيق جماعية وحل قضية" } });
    } catch (err) { console.error("Murder Mystery command registration error:", err.message); }
  });

  client.on("interactionCreate", async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === "murdermystery") {
      const id = `${interaction.guildId}-${Date.now()}`;
      const lobby = { id, host: interaction.user.id, players: [interaction.user.id] };
      lobbies.set(id, lobby);
      return interaction.reply({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
    }
    if (!interaction.isButton()) return;
    const p = interaction.customId.split("_");
    if (p[0] !== "mm") return;

    if (["join", "leave", "start", "cancel"].includes(p[1])) {
      const id = p.slice(2).join("_");
      const lobby = lobbies.get(id);
      if (!lobby) return interaction.reply({ content: "❌ هاد الـ Lobby سالات.", ephemeral: true });
      if (p[1] === "join") {
        if (lobby.players.length >= 8) return interaction.reply({ content: "❌ الـ Lobby عامرة.", ephemeral: true });
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
        return interaction.update({ content: "❌ تلغات القضية.", embeds: [], components: [] });
      }
      if (lobby.players.length < 3) return interaction.reply({ content: "❌ خاص على الأقل 3 لاعبين.", ephemeral: true });
      if (interaction.user.id !== lobby.host) return interaction.reply({ content: "❌ غير الـ Host يقدر يبدا.", ephemeral: true });
      const game = { id, players: [...lobby.players], case: CASES[Math.floor(Math.random() * CASES.length)], clueIndex: 0, accused: null, votes: new Set() };
      games.set(id, game); lobbies.delete(id);
      await interaction.update({ content: "🔎 **التحقيق بدا!**", embeds: [], components: [] });
      return interaction.channel.send({ embeds: [caseEmbed(game)], components: actionRows(game) });
    }

    const game = games.get(p[2]);
    if (!game) return interaction.reply({ content: "❌ هاد التحقيق سالا.", ephemeral: true });
    if (!game.players.includes(interaction.user.id)) return interaction.reply({ content: "❌ ماشي محقق فهاد القضية.", ephemeral: true });

    if (p[1] === "clue") {
      if (game.clueIndex >= game.case.clues.length) return interaction.reply({ content: "📜 سالاو الأدلة المتاحة.", ephemeral: true });
      const clue = game.case.clues[game.clueIndex++];
      await interaction.reply({ content: `🔎 **دليل جديد:** ${clue}` });
      return interaction.message.edit({ embeds: [caseEmbed(game)], components: actionRows(game) });
    }
    if (p[1] === "suspect") {
      game.accused = Number(p[3]);
      return interaction.reply({ content: `⚖️ تسجل الاتهام ديالك ضد **${game.case.suspects[game.accused]}**. دابا ضغطو على تأكيد الاتهام.`, ephemeral: true });
    }
    if (p[1] === "vote") {
      if (game.accused === null) return interaction.reply({ content: "❌ اختاروا مشتبهاً به أولاً.", ephemeral: true });
      game.votes.add(interaction.user.id);
      if (game.votes.size < Math.ceil(game.players.length / 2)) return interaction.reply({ content: `🗳️ تسجل صوتك. باقي ${Math.ceil(game.players.length / 2) - game.votes.size} صوت.`, ephemeral: true });
      return finishGame(game, interaction.channel, game.accused === game.case.culprit);
    }
  });
}

module.exports = { setupMurderMystery };
