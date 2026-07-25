const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes
} = require("discord.js");

const lobbies = new Map();
const matches = new Map();

const QUESTIONS = [
  { q: "شنو هي عاصمة المغرب؟", a: ["الرباط", "الدار البيضاء", "مراكش", "فاس"], c: 0 },
  { q: "شحال من لاعب كاين ففريق كرة القدم داخل الملعب؟", a: ["9", "10", "11", "12"], c: 2 },
  { q: "شنو هو الكوكب المعروف بالكوكب الأحمر؟", a: ["الأرض", "المريخ", "الزهرة", "المشتري"], c: 1 },
  { q: "شنو هو أكبر محيط فالعالم؟", a: ["الأطلسي", "الهندي", "الهادئ", "المتجمد الشمالي"], c: 2 },
  { q: "شحال كيساوي 7 × 8؟", a: ["54", "56", "64", "48"], c: 1 },
  { q: "شنو هي اللغة الرسمية الأكثر استعمالاً فبرمجة Discord bots مع discord.js؟", a: ["JavaScript", "HTML", "CSS", "SQL"], c: 0 },
  { q: "شنو هو الحيوان المعروف بملك الغابة؟", a: ["النمر", "الأسد", "الفهد", "الذئب"], c: 1 },
  { q: "كم عدد أيام الأسبوع؟", a: ["5", "6", "7", "8"], c: 2 }
];

function pickQuestions() {
  return [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
}

function lobbyEmbed(lobby) {
  return new EmbedBuilder()
    .setTitle("🧠 QUIZ BATTLE — Lobby")
    .setDescription(
      "جاوب بسرعة قبل المنافسين! أول لاعب يجاوب صحيح كياخذ النقطة.\n\n" +
      `👥 **اللاعبين: ${lobby.players.length}/10**\n` +
      (lobby.players.length ? lobby.players.map((id, i) => `${i + 1}. <@${id}>`).join("\n") : "مازال حتى لاعب") +
      "\n\n⏳ خاصكم جوج لاعبين على الأقل باش تبدا المباراة."
    )
    .setFooter({ text: "Quiz Battle • 5 Rounds" });
}

function lobbyRows(id, started = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`qb_join_${id}`).setLabel("🎮 دخول").setStyle(ButtonStyle.Success).setDisabled(started),
    new ButtonBuilder().setCustomId(`qb_leave_${id}`).setLabel("🚪 خروج").setStyle(ButtonStyle.Danger).setDisabled(started),
    new ButtonBuilder().setCustomId(`qb_start_${id}`).setLabel("▶️ بدء").setStyle(ButtonStyle.Primary).setDisabled(started),
    new ButtonBuilder().setCustomId(`qb_cancel_${id}`).setLabel("❌ إلغاء").setStyle(ButtonStyle.Secondary).setDisabled(started)
  );
}

function questionEmbed(match) {
  const q = match.questions[match.round];
  return new EmbedBuilder()
    .setTitle(`🧠 QUIZ BATTLE — السؤال ${match.round + 1}/5`)
    .setDescription(`**${q.q}**\n\n⚡ أول إجابة صحيحة كتاخذ النقطة!`)
    .addFields({
      name: "🏆 الترتيب الحالي",
      value: match.players.map(id => `<@${id}> — **${match.scores[id] || 0}** نقطة`).join("\n")
    });
}

function answerRows(match) {
  const q = match.questions[match.round];
  return new ActionRowBuilder().addComponents(
    q.a.map((answer, i) => new ButtonBuilder()
      .setCustomId(`qb_answer_${match.id}_${i}`)
      .setLabel(`${String.fromCharCode(65 + i)}. ${answer}`)
      .setStyle(ButtonStyle.Primary))
  );
}

async function finishMatch(match, channel) {
  const max = Math.max(...match.players.map(id => match.scores[id] || 0));
  const winners = match.players.filter(id => (match.scores[id] || 0) === max);
  const result = new EmbedBuilder()
    .setTitle("🏆 QUIZ BATTLE — GAME OVER")
    .setDescription(
      winners.length > 1
        ? `🤝 تعادل بين ${winners.map(id => `<@${id}>`).join(" و ")} بـ **${max}** نقطة!`
        : `👑 الفائز هو <@${winners[0]}> بـ **${max}** نقطة!`
    )
    .addFields({
      name: "📊 النتائج النهائية",
      value: [...match.players].sort((a, b) => (match.scores[b] || 0) - (match.scores[a] || 0))
        .map((id, i) => `${i + 1}. <@${id}> — **${match.scores[id] || 0}** نقطة`).join("\n")
    })
    .setFooter({ text: "Quiz Battle • شكراً على اللعب!" });

  await channel.send({ embeds: [result] });
  matches.delete(match.id);
}

async function nextQuestion(match, channel) {
  if (match.round >= 5) return finishMatch(match, channel);
  match.round += 1;
  match.answered = false;
  await channel.send({ embeds: [questionEmbed(match)], components: [answerRows(match)] });
}

function setupQuizBattle(client) {
  client.once("ready", async () => {
    if (!process.env.DISCORD_TOKEN) return;
    try {
      const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
      const command = {
        name: "quizbattle",
        description: "لعبة Quiz Battle جماعية"
      };
      if (process.env.GUILD_ID) {
        await rest.post(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: command });
      }
    } catch (err) {
      console.error("Quiz Battle command registration error:", err.message);
    }
  });

  client.on("interactionCreate", async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === "quizbattle") {
      const id = `${interaction.guildId}-${Date.now()}`;
      const lobby = { id, host: interaction.user.id, channelId: interaction.channelId, players: [interaction.user.id] };
      lobbies.set(id, lobby);
      return interaction.reply({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
    }

    if (!interaction.isButton()) return;
    const parts = interaction.customId.split("_");
    if (parts[0] !== "qb") return;

    if (parts[1] === "join" || parts[1] === "leave" || parts[1] === "start" || parts[1] === "cancel") {
      const id = parts.slice(2).join("_");
      const lobby = lobbies.get(id);
      if (!lobby) return interaction.reply({ content: "❌ هاد الـ Lobby سالات.", ephemeral: true });

      if (parts[1] === "join") {
        if (!lobby.players.includes(interaction.user.id)) lobby.players.push(interaction.user.id);
        return interaction.update({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
      }
      if (parts[1] === "leave") {
        lobby.players = lobby.players.filter(x => x !== interaction.user.id);
        if (!lobby.players.length) {
          lobbies.delete(id);
          return interaction.update({ content: "❌ تسد الـ Lobby حيث ما بقا حتى لاعب.", embeds: [], components: [] });
        }
        return interaction.update({ embeds: [lobbyEmbed(lobby)], components: [lobbyRows(id)] });
      }
      if (parts[1] === "cancel") {
        if (interaction.user.id !== lobby.host) return interaction.reply({ content: "❌ غير الـ Host يقدر يلغي.", ephemeral: true });
        lobbies.delete(id);
        return interaction.update({ content: "❌ تلغات Quiz Battle.", embeds: [], components: [] });
      }
      if (lobby.players.length < 2) return interaction.reply({ content: "❌ خاص على الأقل جوج لاعبين.", ephemeral: true });
      if (interaction.user.id !== lobby.host) return interaction.reply({ content: "❌ غير الـ Host يقدر يبدا.", ephemeral: true });

      const match = { id, players: [...lobby.players], scores: {}, questions: pickQuestions(), round: 0, answered: false };
      match.players.forEach(id => { match.scores[id] = 0; });
      matches.set(id, match);
      lobbies.delete(id);
      await interaction.update({ content: "🎮 **Quiz Battle بدات!**", embeds: [], components: [] });
      return interaction.channel.send({ embeds: [questionEmbed(match)], components: [answerRows(match)] });
    }

    if (parts[1] === "answer") {
      const match = matches.get(parts[2]);
      if (!match) return interaction.reply({ content: "❌ هاد المباراة سالات.", ephemeral: true });
      if (!match.players.includes(interaction.user.id)) return interaction.reply({ content: "❌ ماشي لاعب فهاد المباراة.", ephemeral: true });
      if (match.answered) return interaction.reply({ content: "⏳ هاد السؤال تجاوب عليه ديجا.", ephemeral: true });

      const choice = Number(parts[3]);
      const q = match.questions[match.round];
      if (choice !== q.c) return interaction.reply({ content: "❌ جواب خاطئ! تسنى السؤال الجاي.", ephemeral: true });

      match.answered = true;
      match.scores[interaction.user.id] += 1;
      await interaction.reply({ content: "✅ جواب صحيح! +1 نقطة 🎉", ephemeral: true });
      return nextQuestion(match, interaction.channel);
    }
  });
}

module.exports = { setupQuizBattle };
