require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");

const fs = require("fs");
const { setupQuizBattle } = require("../games/quiz-battle"); // QUIZ_BATTLE_MODULE
const { setupMurderMystery } = require("../games/murder-mystery"); // MURDER_MYSTERY_MODULE
const { setupDuelArena } = require("../games/duel-arena"); // DUEL_ARENA_MODULE
const { setupWordBattle } = require("../games/word-battle"); // WORD_BATTLE_MODULE
const { setupGameCenterBatch } = require("../games/game-center-batch"); // GAMINGHUB_BATCH_V1
const path = require("path");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
setupQuizBattle(client); // QUIZ_BATTLE_MODULE
setupMurderMystery(client); // MURDER_MYSTERY_MODULE
setupDuelArena(client); // DUEL_ARENA_MODULE
setupWordBattle(client); // WORD_BATTLE_MODULE
setupGameCenterBatch(client); // GAMINGHUB_BATCH_V1

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: {}, challenges: {} }, null, 2));

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { users: {}, challenges: {} }; }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getUser(id) {
  const db = loadDB();
  if (!db.users[id]) {
    db.users[id] = {
      xp: 0, level: 1, coins: 0, wins: 0, games: 0,
      achievements: [], lastDaily: null
    };
    saveDB(db);
  }
  return db.users[id];
}

function addProgress(id, xp, coins, win = false) {
  const db = loadDB();
  if (!db.users[id]) db.users[id] = { xp: 0, level: 1, coins: 0, wins: 0, games: 0, achievements: [], lastDaily: null };
  const u = db.users[id];
  u.xp += xp;
  u.coins += coins;
  u.games += 1;
  if (win) u.wins += 1;

  const oldLevel = u.level;
  u.level = Math.floor(u.xp / 100) + 1;
  saveDB(db);
  return { user: u, levelUp: u.level > oldLevel };
}

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function embed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

const trivia = [
  { q: "شنو هو الكوكب المعروف بالكوكب الأحمر؟", a: ["المريخ", "mars"] },
  { q: "شحال من لاعب كاين ففريق كرة القدم داخل الملعب؟", a: ["11", "11 لاعب"] },
  { q: "شنو هي عاصمة المغرب؟", a: ["الرباط", "rabat"] },
  { q: "شنو هو أكبر محيط في العالم؟", a: ["المحيط الهادئ", "الهادئ", "pacific"] },
  { q: "شنو هو الحيوان المعروف بملك الغابة؟", a: ["الأسد", "الاسد", "lion"] }
];

const words = ["discord", "gaming", "football", "minecraft", "champion", " المغرب", "بطولة", "سيرفر"];
const emojiQuestions = [
  { e: "⚽🏆🇪🇺", a: "دوري أبطال أوروبا" },
  { e: "🦁👑", a: "الأسد الملك" },
  { e: "🕷️👨", a: "سبايدرمان" },
  { e: "🚢🧊", a: "تايتانيك" },
  { e: "🧙‍♂️💍", a: "سيد الخواتم" }
];

const commands = [
  new SlashCommandBuilder().setName("games").setDescription("عرض جميع الألعاب"),
  new SlashCommandBuilder().setName("profile").setDescription("عرض بروفايلك"),
  new SlashCommandBuilder().setName("leaderboard").setDescription("عرض المتصدرين"),
  new SlashCommandBuilder().setName("daily").setDescription("خذ الجائزة اليومية"),
  new SlashCommandBuilder().setName("challenge").setDescription("تحدي اليوم"),
  new SlashCommandBuilder().setName("quiz").setDescription("Trivia Quiz"),
  new SlashCommandBuilder().setName("guessnumber").setDescription("خمن الرقم"),
  new SlashCommandBuilder().setName("guessword").setDescription("خمن الكلمة"),
  new SlashCommandBuilder().setName("emojiguess").setDescription("خمن من الإيموجي"),
  new SlashCommandBuilder().setName("reaction").setDescription("اختبار سرعة الرياكشن"),
  new SlashCommandBuilder().setName("math").setDescription("Math Race"),
  new SlashCommandBuilder().setName("tictactoe").setDescription("لعبة XO ضد البوت"),
  new SlashCommandBuilder().setName("connect4").setDescription("Connect 4 ضد البوت"),
  new SlashCommandBuilder().setName("rps").setDescription("حجر ورق مقص"),
  new SlashCommandBuilder().setName("dice").setDescription("Dice Duel"),
  new SlashCommandBuilder().setName("tournament").setDescription("إنشاء بطولة ألعاب سريعة"),
  new SlashCommandBuilder().setName("duel").setDescription("تحدي لاعب آخر في لعبة"),
  new SlashCommandBuilder().setName("coinflip").setDescription("اختيار عشوائي بين لاعبين"),
  new SlashCommandBuilder().setName("help").setDescription("مساعدة"),
  new SlashCommandBuilder().setName("mafiavote").setDescription("صوت على لاعب في Mafia").addUserOption(o => o.setName("player").setDescription("اللاعب").setRequired(true)),
  new SlashCommandBuilder().setName("mafiastatus").setDescription("عرض حالة لعبة Mafia"),
  new SlashCommandBuilder().setName("game").setDescription("إنشاء لعبة من Game Center").addStringOption(o => o.setName("name").setDescription("اسم اللعبة").setRequired(true))
].map(c => c.toJSON());

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
        { body: commands }
      );
      console.log("✅ Guild slash commands registered");
    } else {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      console.log("✅ Global slash commands registered");
    }
  } catch (err) {
    console.error("Command registration error:", err);
  }
});

// ==================== VISUAL GAME CENTER / MAFIA V1.5 ====================
const visualLobbies = new Map();
const visualMafiaGames = new Map();

const mafiaGameInfo = {
  mafia: { name: "🕵️ MAFIA", max: 15, desc: "لعبة اجتماعية: المافيا تختبئ، والمواطنون يحاولون اكتشافها." },
  duel: { name: "⚔️ PVP DUEL", max: 2, desc: "مواجهة مباشرة بين لاعبين." },
  ttt: { name: "❌⭕ TIC TAC TOE", max: 2, desc: "لعبة XO بين لاعبين." },
  connect4: { name: "🔴🟡 CONNECT 4", max: 2, desc: "وصل أربعة رموز قبل الخصم." }
};

function visualCenterEmbed() {
  return embed("🎮 Gaming Hub", "اختار شنو بغيتي تشوف:\n\n👥 **ألعاب السيرفر** — ألعاب جماعية مع Lobby.\n🧍 **ألعاب فردية** — ألعاب كتبدأ مباشرة.");
}
function visualCenterRows() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("v15_server_games").setLabel("👥 ألعاب السيرفر").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("v15_solo_games").setLabel("🧍 ألعاب فردية").setStyle(ButtonStyle.Secondary)
  );
}
function visualServerRows() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("v15_game_mafia").setLabel("🕵️ Mafia").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("v15_game_duel").setLabel("⚔️ Duel").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("v15_game_ttt").setLabel("❌⭕ Tic Tac Toe").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("v15_game_connect4").setLabel("🔴🟡 Connect 4").setStyle(ButtonStyle.Secondary)
  );
}
function visualSoloRows() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("v15_solo_quiz").setLabel("🧠 Trivia").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("v15_solo_number").setLabel("🔢 Number").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("v15_solo_word").setLabel("🔤 Word").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("v15_solo_reaction").setLabel("⚡ Reaction").setStyle(ButtonStyle.Success)
  );
}
function visualLobbyEmbed(l) {
  return embed(`${l.info.name} — Lobby`,
    `${l.info.desc}\n\n` +
    `👥 **المشاركون: ${l.players.length}/${l.info.max}**\n` +
    l.players.map((id,i)=>`${i+1}. <@${id}>`).join("\n") +
    `\n\n👑 **Host:** <@${l.host}>\n⏳ **الحالة:** ${l.started ? "اللعبة بدأت" : "في انتظار اللاعبين"}`
  );
}
function visualLobbyRows(id, started=false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`v15_join_${id}`).setLabel("🎮 دخول إلى اللعبة").setStyle(ButtonStyle.Success).setDisabled(started),
    new ButtonBuilder().setCustomId(`v15_leave_${id}`).setLabel("🚪 خرج من اللعبة").setStyle(ButtonStyle.Danger).setDisabled(started),
    new ButtonBuilder().setCustomId(`v15_start_${id}`).setLabel("▶️ بدء اللعبة").setStyle(ButtonStyle.Primary).setDisabled(started),
    new ButtonBuilder().setCustomId(`v15_cancel_${id}`).setLabel("❌ إلغاء").setStyle(ButtonStyle.Secondary).setDisabled(started)
  );
}
function mafiaRoleCounts(n) {
  if (n >= 10) return { mafia: 2, doctor: 1, detective: 1 };
  if (n >= 6) return { mafia: 2, doctor: 1, detective: 1 };
  return { mafia: 1, doctor: 1, detective: 0 };
}
function shuffle(a) { return [...a].sort(()=>Math.random()-0.5); }
function assignMafiaRoles(ids) {
  const c=mafiaRoleCounts(ids.length);
  const roles=[...Array(c.mafia).fill("mafia"),...Array(c.doctor).fill("doctor"),...Array(c.detective).fill("detective")];
  while(roles.length<ids.length) roles.push("citizen");
  return shuffle(roles);
}
function mafiaPublic(game, phase, text="") {
  return embed(`🕵️ MAFIA — ${phase}`, `${text}\n\n👥 **الأحياء:**\n${game.players.filter(p=>p.alive).map(p=>`<@${p.id}>`).join("\n")}`);
}
function mafiaFinalEmbed(game, winner, teamPoints) {
  const mafiaWon=winner==="mafia";
  const win=game.players.filter(p=>mafiaWon?p.role==="mafia":p.role!=="mafia");
  const lose=game.players.filter(p=>mafiaWon?p.role!=="mafia":p.role==="mafia");
  return new EmbedBuilder()
    .setTitle(`🏆 ${mafiaWon?"🕵️ MAFIA":"👥 CITIZENS"} — WINNERS 👑`)
    .setDescription(`**${mafiaWon?"الفريق الأول":"الفريق الثاني"} هو الفائز! 👑**`);
}

client.on("messageCreate", async message => {
  if(message.author.bot || message.content.trim()!=="!العاب") return;
  await message.reply({embeds:[visualCenterEmbed()],components:[visualCenterRows()]});
});

client.on("interactionCreate", async interaction => {
  // M18_MAFIA_ROLE_PANEL_HANDLER
  if (interaction.isButton() && interaction.customId.startsWith("m17|")) {
    const parts = interaction.customId.split("|");
    const action = parts[1];
    const gameId = parts[2];
    const game = visualMafiaGames.get(gameId);

    if (!game) return interaction.reply({ content: "❌ هاد لعبة Mafia سالات.", ephemeral: true });

    const player = game.players.find(p => p.id === interaction.user.id);
    if (!player) return interaction.reply({ content: "❌ ماشي لاعب فهاد اللعبة.", ephemeral: true });
    if (!player.alive) return interaction.reply({ content: "💀 ما تقدرش تلعب وأنت ميت.", ephemeral: true });

    if (action === "role") {
      const roleText = mafiaRoleLabel(player.role);
      let description = `🎭 **الدور ديالك: ${roleText}**\n\n`;
      if (player.role === "mafia") description += "🕵️ اختار لاعب تستهدفه فالليل.";
      else if (player.role === "doctor") description += "💉 اختار لاعب تحميه فالليل.";
      else if (player.role === "detective") description += "🔎 اختار لاعب باش تعرف واش هو Mafia.";
      else description += "👤 أنت مواطن. راقب، ناقش، وصوّت فالنهار.";

      const rows = [];
      if (game.phase === "NIGHT" && ["mafia", "doctor", "detective"].includes(player.role)) {
        rows.push(...mafiaTargetRows(game, { type: player.role, actorId: player.id }, player.role === "doctor"));
      }
      return interaction.reply({ content: description, components: rows, ephemeral: true });
    }

    if (game.phase !== "NIGHT") return interaction.reply({ content: "☀️ دابا النهار. تسنى التصويت.", ephemeral: true });

    const targetId = parts[3];
    const target = game.players.find(p => p.id === targetId && p.alive);
    if (!target) return interaction.reply({ content: "❌ الهدف غير صالح.", ephemeral: true });

    if (action === "mafia") {
      if (player.role !== "mafia") return interaction.reply({ content: "❌ ما عندكش هاد الصلاحية.", ephemeral: true });
      game.night.mafiaTarget = target.id;
    } else if (action === "doctor") {
      if (player.role !== "doctor") return interaction.reply({ content: "❌ ما عندكش هاد الصلاحية.", ephemeral: true });
      game.night.doctorTarget = target.id;
    } else if (action === "detective") {
      if (player.role !== "detective") return interaction.reply({ content: "❌ ما عندكش هاد الصلاحية.", ephemeral: true });
      game.night.detectiveTarget = target.id;
    } else {
      return interaction.reply({ content: "❌ Action غير معروف.", ephemeral: true });
    }

    await interaction.reply({ content: `✅ تسجل الاختيار ديالك ضد <@${target.id}>.`, ephemeral: true });
    await resolveMafiaNight(game);
  }

  if (!interaction.isChatInputCommand()) return;
  const command = interaction.commandName;

  if (command === "games") {
    return interaction.reply({ embeds: [embed("🎮 Gaming Hub", "استعمل `!العاب` أو استعمل الألعاب الجديدة.")], ephemeral: true });
  }

  if (command === "game") {
    const gameId = interaction.options.getString("name", true).toLowerCase();
    if (!GAME_DEFINITIONS[gameId]) return interaction.reply({ content: "❌ هاد اللعبة مازال ما مربوطةش من Game Center.", ephemeral: true });
    return interaction.reply({ content: `ℹ️ ${GAME_DEFINITIONS[gameId].name} جاهزة فـ Game Center.` , ephemeral: true });
  }
});


// ==================== AI / FUN / ORIGINAL GAMES ====================

client.login(process.env.DISCORD_TOKEN);