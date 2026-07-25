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
const path = require("path");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

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
  new SlashCommandBuilder().setName("mafiastatus").setDescription("عرض حالة لعبة Mafia")
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
    .setDescription(`**${mafiaWon?"الفريق الأول":"الفريق الثاني"} هو الفائز! 👑**\n\n🥇 **الفريق الفائز:**\n${win.map(p=>`<@${p.id}>`).join(" ")}\n\n🥈 **الفريق الخاسر:**\n${lose.map(p=>`<@${p.id}>`).join(" ")}`)
    .addFields({name:"🎭 الأدوار",value:game.players.map(p=>`<@${p.id}> — ${p.role.toUpperCase()}`).join("\n")})
    .setFooter({text:"Mafia • Game Over"});
}
function mafiaPointsButton(points) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`v15_points_${Date.now()}`).setLabel(`🤖 +${points} نقطة للفريق الفائز`).setStyle(ButtonStyle.Secondary).setDisabled(true)
  );
}
async function finishVisualMafia(game,winner) {
  const channel=await client.channels.fetch(game.channelId).catch(()=>null);
  const winners=game.players.filter(p=>winner==="mafia"?p.role==="mafia":p.role!=="mafia");
  const teamPoints=1000;
  const each=Math.floor(teamPoints/Math.max(winners.length,1));
  winners.forEach(p=>addProgress(p.id,each,Math.floor(each/2),true));

  if(channel){
    const winnerImage = winner === "mafia"
      ? path.join(__dirname, "..", "assets", "mafia", "mafia_win.png")
      : path.join(__dirname, "..", "assets", "mafia", "citizens_win.png");

    const attachment = new AttachmentBuilder(winnerImage, {
      name: winner === "mafia" ? "mafia_win.png" : "citizens_win.png"
    });

    await channel.send({
      content: `${winners.map(p=>`<@${p.id}>`).join(" ")}\n🏆 **${winner==="mafia"?"الفريق الأول — MAFIA":"الفريق الثاني — CITIZENS"} هو الفائز! 👑**`,
      files: [attachment],
      components: [mafiaPointsButton(teamPoints)]
    });

    await channel.send({
      embeds:[mafiaFinalEmbed(game,winner,teamPoints)],
      components:[mafiaPointsButton(teamPoints)]
    });
  }
  cleanupVisualMafia(game);
}
function mafiaWinner(game) {
  return mafiaCheckWinner(game);
}

function mafiaRolePanelButton(gameId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`m17|role|${gameId}`).setLabel("🔐 لوحة دوري").setStyle(ButtonStyle.Primary)
  );
}
function mafiaTargetRows(game, action, excludeSelf=false) {
  const targets=game.players.filter(p=>p.alive && (!excludeSelf || p.id!==action.actorId));
  const rows=[];
  for(let i=0;i<targets.length;i+=5){
    rows.push(new ActionRowBuilder().addComponents(
      ...targets.slice(i,i+5).map(p=>new ButtonBuilder()
        .setCustomId(`m17|${action.type}|${game.id}|${p.id}`)
        .setLabel(`🎯 لاعب ${i+1}`)
        .setStyle(action.type==="mafia"?ButtonStyle.Danger:ButtonStyle.Primary))
    ));
  }
  return rows;
}
function mafiaRoleLabel(role) {
  return {mafia:"🕵️ MAFIA",doctor:"💉 DOCTOR",detective:"🔎 DETECTIVE",citizen:"👤 CITIZEN"}[role] || role;
}
function cleanupVisualMafia(game) {
  if (!game) return;
  visualMafiaGames.delete(game.id);
  visualLobbies.delete(game.id);
}
function mafiaCheckWinner(game) {
  const alive=game.players.filter(p=>p.alive);
  const mafia=alive.filter(p=>p.role==="mafia").length;
  const citizens=alive.filter(p=>p.role!=="mafia").length;
  if(mafia===0) return "citizens";
  if(mafia>=citizens) return "mafia";
  return null;
}
function mafiaAlive(game) { return game.players.filter(p=>p.alive); }
function mafiaNightReady(game) {
  const mafia=game.players.some(p=>p.alive&&p.role==="mafia");
  const doctor=game.players.some(p=>p.alive&&p.role==="doctor");
  const detective=game.players.some(p=>p.alive&&p.role==="detective");
  return (!mafia||game.night.mafiaTarget) && (!doctor||game.night.doctorTarget) && (!detective||game.night.detectiveTarget);
}
async function resolveMafiaNight(game) {
  if(game.phase!=="NIGHT" || !mafiaNightReady(game)) return;
  const channel=await client.channels.fetch(game.channelId).catch(()=>null);
  if(!channel) return;
  const target=game.players.find(p=>p.id===game.night.mafiaTarget);
  const protectedPlayer=game.players.find(p=>p.id===game.night.doctorTarget);
  const detectiveTarget=game.players.find(p=>p.id===game.night.detectiveTarget);
  let text="🌅 **صبح شد!**\n";
  if(target && target.alive && target.id!==protectedPlayer?.id){
    target.alive=false;
    text+=`💀 تم العثور على لاعب ميت.\n`;
  } else {
    text+="🛡️ **ما مات حتى واحد هاد الليلة!**\n";
  }
  if(detectiveTarget){
    const detectives=game.players.filter(p=>p.alive&&p.role==="detective");
    for(const d of detectives){
      const user=await client.users.fetch(d.id).catch(()=>null);
      if(user) await user.send(`🔎 التحقيق ديالك: **${detectiveTarget.id===d.id?"ما تقدرش تحقق فراسك":mafiaRoleLabel(detectiveTarget.role)}**`).catch(()=>{});
    }
  }
  game.phase="DAY"; game.votes=new Map();
  game.night={mafiaTarget:null,doctorTarget:null,detectiveTarget:null};
  const winner=mafiaWinner(game);
  if(winner) return finishVisualMafia(game,winner);
  await channel.send({embeds:[mafiaPublic(game,`☀️ DAY ${game.round}`,text+"🗳️ دابا بدا التصويت.")],components:[mafiaRolePanelButton(game.id)]});
}
async function resolveMafiaVote(game) {
  const alive=mafiaAlive(game);
  if(game.votes.size<alive.length) return;
  const counts=new Map();
  for(const id of game.votes.values()) counts.set(id,(counts.get(id)||0)+1);
  const max=Math.max(...counts.values(),0);
  const top=[...counts.entries()].filter(([,n])=>n===max).map(([id])=>id);
  const channel=await client.channels.fetch(game.channelId).catch(()=>null);
  if(!channel) return;
  let text;
  if(top.length!==1){
    text="🤝 **تعادل فالتصويت — ما تطرد حتى واحد.**";
  } else {
    const eliminated=game.players.find(p=>p.id===top[0]);
    if(eliminated){ eliminated.alive=false; text=`🚪 **تم طرد <@${eliminated.id}>.**`; }
  }
  const winner=mafiaWinner(game);
  if(winner) return finishVisualMafia(game,winner);
  game.round++; game.phase="NIGHT"; game.votes=new Map();
  game.night={mafiaTarget:null,doctorTarget:null,detectiveTarget:null};
  await channel.send({embeds:[mafiaPublic(game,`🌙 NIGHT ${game.round}`,text+"\n🌙 **بدأت ليلة جديدة.**")],components:[mafiaRolePanelButton(game.id)]});
}

async function startVisualMafia(lobby, channel) {
  if (lobby.players.length < 5) return;
  const roles=assignMafiaRoles(lobby.players);
  const game={
    id:lobby.id, channelId:channel.id, round:1, phase:"NIGHT",
    votes:new Map(), night:{mafiaTarget:null, doctorTarget:null, detectiveTarget:null},
    players:lobby.players.map((id,i)=>({id,role:roles[i],alive:true}))
  };
  visualMafiaGames.set(game.id,game);

  const roleFiles = {
    mafia: path.join(__dirname, "..", "assets", "mafia", "mafia.png"),
    doctor: path.join(__dirname, "..", "assets", "mafia", "doctor.png"),
    detective: path.join(__dirname, "..", "assets", "mafia", "doctor.png"),
    citizen: path.join(__dirname, "..", "assets", "mafia", "citizen.png")
  };

  const mafiaFile = new AttachmentBuilder(roleFiles.mafia, { name: "mafia.png" });
  const citizenFile = new AttachmentBuilder(roleFiles.citizen, { name: "citizen.png" });

  await channel.send({
    content: "🎭 **اللعبة بدات! تم توزيع الأدوار سرياً.**\n🌙 **الليلة الأولى بدات!**",
    files: [mafiaFile, citizenFile]
  });

  await channel.send({
    embeds: [mafiaPublic(game,"🌙 NIGHT 1","كل لاعب يضغط على **🔐 لوحة دوري** باش يشوف دوره ويقوم بالAction ديالو.")],
    components: [mafiaRolePanelButton(game.id)]
  });
}
client.on("messageCreate", async message => {
  if(message.author.bot || message.content.trim()!=="-العاب") return;
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

  const cmd = interaction.commandName;
  const id = interaction.user.id;

  if (cmd === "mafiavote") {
    const game = [...mafiaGames.values()].find(g => g.channelId === interaction.channelId);
    if (!game) return interaction.reply({ content: "❌ ماكايناش Mafia خدامة فهاد القناة.", ephemeral: true });
    if (game.phase !== "DAY") return interaction.reply({ content: "❌ التصويت كيتدار غير فالنهار.", ephemeral: true });
    const voter = game.players.find(p => p.id === interaction.user.id);
    const target = interaction.options.getUser("player");
    if (!voter || !voter.alive) return interaction.reply({ content: "❌ ما تقدرش تصوت.", ephemeral: true });
    const targetPlayer = game.players.find(p => p.id === target.id && p.alive);
    if (!targetPlayer || target.id === interaction.user.id)
      return interaction.reply({ content: "❌ الهدف غير صالح.", ephemeral: true });
    game.votes.set(interaction.user.id, target.id);
    await interaction.reply({ content: `🗳️ صوتك تسجل ضد ${target}.`, ephemeral: true });

    const alive = game.players.filter(p => p.alive);
    if (game.votes.size >= alive.length) {
      const counts = {};
      for (const t of game.votes.values()) counts[t] = (counts[t] || 0) + 1;
      const eliminatedId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const eliminated = game.players.find(p => p.id === eliminatedId);
      if (eliminated) {
        eliminated.alive = false;
        await interaction.channel.send(`⚖️ تم طرد <@${eliminated.id}> من اللعبة. الدور ديالو كان: **${eliminated.role.toUpperCase()}**.`);
      }
      game.votes.clear();
      const winner = mafiaWinner(game);
      if (winner) await mafiaEnd(game, winner);
      else setTimeout(() => mafiaStartNight(game.id), 5000);
    }
    return;
  }

  if (cmd === "mafiastatus") {
    const game = [...mafiaGames.values()].find(g => g.channelId === interaction.channelId);
    if (!game) return interaction.reply({ content: "❌ ماكايناش Mafia خدامة هنا.", ephemeral: true });
    return interaction.reply({ embeds: [mafiaPublicEmbed(game, game.phase, "استعمل `/mafiavote @player` فالنهار.")] });
  }


  if (cmd === "coinflip") {
    const choice = Math.random() < 0.5 ? "🪙 وجه" : "🪙 كتابة";
    return interaction.reply({ embeds: [embed("🪙 Coin Flip", `النتيجة: **${choice}**`)] });
  }

  if (cmd === "duel") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`duel_join_${id}`).setLabel("⚔️ انضم للتحدي").setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
      embeds: [embed("⚔️ تحدي لاعب ضد لاعب", `${interaction.user} فتح تحدي!\nأول لاعب يضغط على الزر يدخل.`)],
      components: [row]
    });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    collector.on("collect", async i => {
      if (i.user.id === id) return i.reply({ content: "❌ ما تقدرش تتحدى راسك!", ephemeral: true });
      const p1 = interaction.user, p2 = i.user;
      const winner = Math.random() < 0.5 ? p1 : p2;
      addProgress(winner.id, 100, 75, true);
      await i.update({
        embeds: [embed("⚔️ Duel Result", `🎉 الفائز هو ${winner}!\n\n${p1} ضد ${p2}\n\nالفائز حصل على **100 XP** و **75 Coins**.`)],
        components: []
      });
      collector.stop();
    });
    return;
  }

  if (cmd === "tournament") {
    const players = [interaction.user.id];
    const names = new Map([[interaction.user.id, interaction.user.username]]);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("tournament_join").setLabel("🏆 انضم للبطولة").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("tournament_start").setLabel("🚀 بدأ البطولة").setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed("🏆 Tournament Lobby", `المنظم: ${interaction.user}\n\n👥 المشاركون: **1**\n\nاضغط على **انضم للبطولة** باش تدخل، ومن بعد المنظم يضغط **بدأ البطولة**.`)],
      components: [row]
    });

    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 180000 });

    collector.on("collect", async i => {
      if (i.customId === "tournament_join") {
        if (!players.includes(i.user.id)) {
          players.push(i.user.id);
          names.set(i.user.id, i.user.username);
        }
        return i.update({
          embeds: [embed("🏆 Tournament Lobby", `المنظم: ${interaction.user}\n\n👥 المشاركون: **${players.length}**\n\n${players.map((x,n)=>`${n+1}. ${names.get(x)}`).join("\n")}\n\nخاص المنظم يبدأ البطولة.`)],
          components: [row]
        });
      }

      if (i.customId === "tournament_start") {
        if (i.user.id !== interaction.user.id) return i.reply({ content: "❌ غير منظم البطولة يقدر يبدأها.", ephemeral: true });
        if (players.length < 2) return i.reply({ content: "❌ خاص جوج لاعبين على الأقل.", ephemeral: true });

        const shuffled = [...players].sort(() => Math.random() - 0.5);
        let round = 1;
        let current = shuffled;

        while (current.length > 1) {
          const next = [];
          for (let n = 0; n < current.length; n += 2) {
            if (n + 1 >= current.length) {
              next.push(current[n]);
              continue;
            }
            const winner = Math.random() < 0.5 ? current[n] : current[n + 1];
            next.push(winner);
          }
          current = next;
          round++;
        }

        const champion = current[0];
        addProgress(champion, 250, 200, true);
        await i.update({
          embeds: [embed("🏆 Tournament Complete!", `👑 البطل هو **${names.get(champion) || "اللاعب"}**!\n\n🎁 الجائزة: **250 XP + 200 Coins**\n\n📊 عدد المشاركين: **${players.length}**`)],
          components: []
        });
        collector.stop();
      }
    });
    return;
  }

  if (cmd === "help") {
    return interaction.reply({
      embeds: [embed("🎮 Gaming Hub", "بوت الألعاب ديالك باش السيرفر يبقى ناشط!\n\nاستعمل `/games` باش تشوف الألعاب كاملة.\n\nكل لعبة كتقدر تعطيك XP و Coins و Wins.")]
    });
  }

  if (cmd === "games") {
    return interaction.reply({
      embeds: [embed("🎮 جميع الألعاب", [
        "🧠 `/quiz` — Trivia",
        "🔢 `/guessnumber` — Guess the Number",
        "🔤 `/guessword` — Guess the Word",
        "😀 `/emojiguess` — Emoji Guess",
        "⚡ `/reaction` — Reaction Speed",
        "🧮 `/math` — Math Race",
        "❌⭕ `/tictactoe` — XO",
        "🔴 `/connect4` — Connect 4",
        "✊ `/rps` — Rock Paper Scissors",
        "🎲 `/dice` — Dice Duel"
      ].join("\n"))]
    });
  }

  if (cmd === "profile") {
    const u = getUser(id);
    return interaction.reply({
      embeds: [embed(`👤 Profile — ${interaction.user.username}`,
        `⭐ **Level:** ${u.level}\n✨ **XP:** ${u.xp}\n🪙 **Coins:** ${u.coins}\n🏆 **Wins:** ${u.wins}\n🎮 **Games:** ${u.games}\n🏅 **Achievements:** ${u.achievements.length}`)]
    });
  }

  if (cmd === "leaderboard") {
    const db = loadDB();
    const top = Object.entries(db.users)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    const lines = [];
    for (let i = 0; i < top.length; i++) {
      const [uid, u] = top[i];
      let name = uid;
      try { name = (await client.users.fetch(uid)).username; } catch {}
      lines.push(`**${i + 1}.** ${name} — Level ${u.level} | ${u.xp} XP`);
    }

    return interaction.reply({
      embeds: [embed("🏆 Leaderboard", lines.length ? lines.join("\n") : "مازال ماكاين حتى لاعب.")]
    });
  }

  if (cmd === "daily") {
    const db = loadDB();
    const u = getUser(id);
    const today = new Date().toISOString().slice(0, 10);

    if (u.lastDaily === today) {
      return interaction.reply({ content: "⏳ خديتي Daily Reward ديالك اليوم. رجع غدا!", ephemeral: true });
    }

    u.lastDaily = today;
    u.coins += 100;
    u.xp += 50;
    db.users[id] = u;
    saveDB(db);

    return interaction.reply({
      embeds: [embed("🎁 Daily Reward", "ربحتي **100 Coins** و **50 XP** اليوم!")]
    });
  }

  if (cmd === "challenge") {
    const c = random([
      "أول لاعب يربح جوج ألعاب اليوم يحصل على Bonus!",
      "تحدي اليوم: ربح Trivia بلا أي خطأ!",
      "تحدي السرعة: شكون يجيب أسرع Reaction؟",
      "جمع 500 XP اليوم باش تكمل التحدي!"
    ]);
    return interaction.reply({ embeds: [embed("🔥 Daily Challenge", c)] });
  }

  if (cmd === "quiz") {
    const q = random(trivia);
    await interaction.reply({ embeds: [embed("🧠 Trivia", `**${q.q}**\n\nجاوب فـ 20 ثانية!`) ]});
    const collector = interaction.channel.createMessageCollector({
      filter: m => !m.author.bot,
      time: 20000
    });
    collector.on("collect", m => {
      if (q.a.some(a => m.content.toLowerCase().trim() === a.toLowerCase())) {
        const result = addProgress(m.author.id, 50, 25, true);
        m.reply(`🎉 ${m.author} جاوب صحيح! +50 XP و +25 Coins${result.levelUp ? " 🔥 LEVEL UP!" : ""}`);
        collector.stop();
      }
    });
    collector.on("end", (_, reason) => {
      if (reason === "time") interaction.channel.send(`⏰ سالا الوقت! الجواب كان: **${q.a[0]}**`);
    });
    return;
  }

  if (cmd === "guessnumber") {
    const target = Math.floor(Math.random() * 100) + 1;
    await interaction.reply({ embeds: [embed("🔢 Guess the Number", "خمن رقم بين **1 و 100**! عندكم 30 ثانية.")] });
    const collector = interaction.channel.createMessageCollector({ filter: m => !m.author.bot, time: 30000 });
    collector.on("collect", m => {
      const n = Number(m.content);
      if (!Number.isInteger(n)) return;
      if (n === target) {
        const result = addProgress(m.author.id, 75, 40, true);
        m.reply(`🎉 ${m.author} لقا الرقم! +75 XP و +40 Coins${result.levelUp ? " 🔥 LEVEL UP!" : ""}`);
        collector.stop();
      } else if (Math.abs(n - target) <= 5) m.reply("🔥 قريب بزاف!");
      else if (n < target) m.reply("⬆️ طلع!");
      else m.reply("⬇️ هبط!");
    });
    collector.on("end", (_, reason) => {
      if (reason === "time") interaction.channel.send(`⏰ سالا الوقت! الرقم كان **${target}**`);
    });
    return;
  }

  if (cmd === "guessword") {
    const word = random(words).trim().toLowerCase();
    const shuffled = word.split("").sort(() => Math.random() - 0.5).join("");
    await interaction.reply({ embeds: [embed("🔤 Guess the Word", `رتب هاد الحروف:\n\n**${shuffled}**\n\nعندكم 25 ثانية!`)] });
    const collector = interaction.channel.createMessageCollector({ filter: m => !m.author.bot, time: 25000 });
    collector.on("collect", m => {
      if (m.content.toLowerCase().trim() === word) {
        addProgress(m.author.id, 60, 30, true);
        m.reply(`🎉 ${m.author} جاوب صحيح! الكلمة هي **${word}**`);
        collector.stop();
      }
    });
    collector.on("end", (_, reason) => {
      if (reason === "time") interaction.channel.send(`⏰ الجواب كان: **${word}**`);
    });
    return;
  }

  if (cmd === "emojiguess") {
    const q = random(emojiQuestions);
    await interaction.reply({ embeds: [embed("😀 Emoji Guess", `${q.e}\n\nشنو كتعني هاد الإيموجيات؟ عندكم 25 ثانية!`)] });
    const collector = interaction.channel.createMessageCollector({ filter: m => !m.author.bot, time: 25000 });
    collector.on("collect", m => {
      if (m.content.toLowerCase().includes(q.a.toLowerCase())) {
        addProgress(m.author.id, 60, 30, true);
        m.reply(`🎉 ${m.author} عرفها! الجواب: **${q.a}**`);
        collector.stop();
      }
    });
    return;
  }

  if (cmd === "reaction") {
    await interaction.reply({ embeds: [embed("⚡ Reaction Speed", "استعد... الزر غادي يبان فجأة!")] });
    const delay = Math.floor(Math.random() * 5000) + 2000;
    setTimeout(async () => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("reaction_button").setLabel("⚡ اضغط!").setStyle(ButtonStyle.Success)
      );
      const msg = await interaction.channel.send({ content: "🚨 **دابا!**", components: [row] });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 10000 });
      collector.on("collect", async i => {
        const result = addProgress(i.user.id, 50, 25, true);
        await i.reply(`⚡ ${i.user} كان الأسرع! +50 XP و +25 Coins${result.levelUp ? " 🔥 LEVEL UP!" : ""}`);
        collector.stop();
      });
    }, delay);
    return;
  }

  if (cmd === "math") {
    const a = Math.floor(Math.random() * 30) + 1;
    const b = Math.floor(Math.random() * 30) + 1;
    const op = random(["+", "-", "*"]);
    const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
    await interaction.reply({ embeds: [embed("🧮 Math Race", `**${a} ${op} ${b} = ?**\n\nأول جواب صحيح يربح!`)] });
    const collector = interaction.channel.createMessageCollector({ filter: m => !m.author.bot, time: 20000 });
    collector.on("collect", m => {
      if (Number(m.content) === answer) {
        addProgress(m.author.id, 60, 30, true);
        m.reply(`🧠 جواب صحيح يا ${m.author}!`);
        collector.stop();
      }
    });
    return;
  }

  if (cmd === "rps") {
    const choices = ["✊ حجر", "✋ ورق", "✌️ مقص"];
    const row = new ActionRowBuilder().addComponents(
      choices.map((x, i) => new ButtonBuilder().setCustomId(`rps_${i}`).setLabel(x).setStyle(ButtonStyle.Primary))
    );
    await interaction.reply({ embeds: [embed("✊ Rock Paper Scissors", "اختار ديالك!")], components: [row] });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
    collector.on("collect", async i => {
      const player = Number(i.customId.split("_")[1]);
      const bot = Math.floor(Math.random() * 3);
      let result;
      if (player === bot) result = "🤝 تعادل!";
      else if ((player - bot + 3) % 3 === 1) {
        result = "🎉 ربحتي!";
        addProgress(i.user.id, 40, 20, true);
      } else result = "😅 خسرت!";
      await i.reply(`${result}\nأنت: **${choices[player]}**\nالبوت: **${choices[bot]}**`);
      collector.stop();
    });
    return;
  }

  if (cmd === "dice") {
    const player = Math.floor(Math.random() * 6) + 1;
    const bot = Math.floor(Math.random() * 6) + 1;
    const result = player > bot ? "🎉 ربحتي!" : player < bot ? "😅 خسرت!" : "🤝 تعادل!";
    if (player > bot) addProgress(id, 35, 15, true);
    return interaction.reply({ embeds: [embed("🎲 Dice Duel", `${result}\n\nأنت: **${player}**\nالبوت: **${bot}**`)] });
  }

  if (cmd === "tictactoe") {
    const board = Array(9).fill("⬜");
    const buttons = () => {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
          const i = r * 3 + c;
          row.addComponents(new ButtonBuilder()
            .setCustomId(`ttt_${i}`)
            .setLabel(board[i] === "⬜" ? " " : board[i])
            .setStyle(board[i] === "❌" ? ButtonStyle.Danger : board[i] === "⭕" ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(board[i] !== "⬜"));
        }
        rows.push(row);
      }
      return rows;
    };
    function winner(b) {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,b1,c] of lines) if (b[a] !== "⬜" && b[a] === b[b1] && b[a] === b[c]) return b[a];
      return b.every(x => x !== "⬜") ? "draw" : null;
    }
    await interaction.reply({ embeds: [embed("❌⭕ Tic-Tac-Toe", `دورك يا ${interaction.user}! أنت ❌ والبوت هو ⭕`)], components: buttons() });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    collector.on("collect", async i => {
      if (i.user.id !== id) return i.reply({ content: "❌ هادي اللعبة ديال لاعب آخر!", ephemeral: true });
      const idx = Number(i.customId.split("_")[1]);
      if (board[idx] !== "⬜") return;
      board[idx] = "❌";
      let result = winner(board);
      if (!result) {
        const free = board.map((v, n) => v === "⬜" ? n : -1).filter(n => n >= 0);
        if (free.length) board[random(free)] = "⭕";
        result = winner(board);
      }
      if (result) {
        const text = result === "❌" ? "🎉 ربحتي!" : result === "⭕" ? "🤖 البوت ربح!" : "🤝 تعادل!";
        if (result === "❌") addProgress(id, 100, 60, true);
        await i.update({ embeds: [embed("❌⭕ Tic-Tac-Toe", text)], components: buttons() });
        collector.stop();
      } else await i.update({ embeds: [embed("❌⭕ Tic-Tac-Toe", "دورك! أنت ❌")], components: buttons() });
    });
    return;
  }

  if (cmd === "connect4") {
    const board = Array.from({ length: 6 }, () => Array(7).fill("⚪"));
    const render = () => board.map(row => row.join("")).join("\n");
    const check = (p) => {
      for (let r=0;r<6;r++) for (let c=0;c<7;c++) {
        if (board[r][c] !== p) continue;
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (const [dr,dc] of dirs) {
          let n=1;
          for (let k=1;k<4;k++) {
            const rr=r+dr*k, cc=c+dc*k;
            if (rr>=0&&rr<6&&cc>=0&&cc<7&&board[rr][cc]===p) n++;
            else break;
          }
          if (n>=4) return true;
        }
      }
      return false;
    };
    const row = () => new ActionRowBuilder().addComponents(
      Array.from({length:7},(_,i)=>new ButtonBuilder().setCustomId(`c4_${i}`).setLabel(String(i+1)).setStyle(ButtonStyle.Primary))
    );
    const drop = (col, piece) => {
      for (let r=5;r>=0;r--) if (board[r][col] === "⚪") { board[r][col]=piece; return true; }
      return false;
    };
    await interaction.reply({ embeds: [embed("🔴🟡 Connect 4", `أنت 🔴 ضد البوت 🟡\n\n${render()}`)], components: [row()] });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });
    collector.on("collect", async i => {
      if (i.user.id !== id) return i.reply({ content: "❌ هادي اللعبة ديال لاعب آخر!", ephemeral: true });
      const col = Number(i.customId.split("_")[1]);
      if (!drop(col, "🔴")) return i.reply({content:"❌ هاد العمود عامر!", ephemeral:true});
      let result = check("🔴") ? "player" : null;
      if (!result) {
        const available = [...Array(7).keys()].filter(c => board[0][c] === "⚪");
        if (available.length) drop(random(available), "🟡");
        result = check("🟡") ? "bot" : null;
      }
      if (result) {
        if (result === "player") addProgress(id, 150, 100, true);
        await i.update({ embeds: [embed("🔴🟡 Connect 4", result === "player" ? "🎉 ربحتي!" : "🤖 البوت ربح!")], components: [] });
        collector.stop();
      } else if (board.every(r => r.every(x => x !== "⚪"))) {
        await i.update({ embeds: [embed("🔴🟡 Connect 4", "🤝 تعادل!")], components: [] });
        collector.stop();
      } else await i.update({ embeds: [embed("🔴🟡 Connect 4", `دورك 🔴\n\n${render()}`)], components: [row()] });
    });
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);


client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  const id=interaction.customId;

  if(id==="v15_server_games") return interaction.update({embeds:[embed("👥 ألعاب السيرفر","اختار لعبة جماعية. منين تختارها كتتخلق Lobby.")],components:[visualServerRows()]});
  if(id==="v15_solo_games") return interaction.update({embeds:[embed("🧍 ألعاب فردية","اختار لعبة، وغادي تبدأ مباشرة.")],components:[visualSoloRows()]});

  const gameMap={v15_game_mafia:"mafia",v15_game_duel:"duel",v15_game_ttt:"ttt",v15_game_connect4:"connect4"};
  if(gameMap[id]){
    const key=gameMap[id], info=mafiaGameInfo[key];
    const lid=`v15-${interaction.guildId}-${interaction.channelId}-${Date.now()}`;
    const lobby={id:lid,game:key,info,host:interaction.user.id,players:[interaction.user.id],started:false};
    visualLobbies.set(lid,lobby);
    return interaction.update({embeds:[visualLobbyEmbed(lobby)],components:[visualLobbyRows(lid)]});
  }
  if(id.startsWith("v15_join_")||id.startsWith("v15_leave_")||id.startsWith("v15_start_")||id.startsWith("v15_cancel_")){
    const parts=id.split("_"), action=parts[1], lid=parts.slice(2).join("_"), l=visualLobbies.get(lid);
    if(!l) return interaction.reply({content:"❌ الـ Lobby سالات.",ephemeral:true});
    if(action==="join"){
      if(l.players.includes(interaction.user.id)) return interaction.reply({content:"أنت داخل أصلاً.",ephemeral:true});
      if(l.players.length>=l.info.max) return interaction.reply({content:"❌ الـ Lobby عامرة.",ephemeral:true});
      l.players.push(interaction.user.id);
      return interaction.update({embeds:[visualLobbyEmbed(l)],components:[visualLobbyRows(l.id)]});
    }
    if(action==="leave"){
      l.players=l.players.filter(x=>x!==interaction.user.id);
      if(!l.players.length){visualLobbies.delete(l.id);return interaction.update({embeds:[embed("🗑️ Lobby محذوفة","ما بقا حتى لاعب.")],components:[]});}
      if(l.host===interaction.user.id) l.host=l.players[0];
      return interaction.update({embeds:[visualLobbyEmbed(l)],components:[visualLobbyRows(l.id)]});
    }
    if(action==="cancel"){
      if(interaction.user.id!==l.host) return interaction.reply({content:"❌ غير الـ Host يقدر يلغي.",ephemeral:true});
      visualLobbies.delete(l.id);
      return interaction.update({embeds:[embed("❌ Lobby ملغية","تم إلغاء اللعبة.")],components:[]});
    }
    if(action==="start"){
      if(interaction.user.id!==l.host) return interaction.reply({content:"❌ غير الـ Host يقدر يبدأ.",ephemeral:true});
      if(l.game==="mafia" && l.players.length<5) return interaction.reply({content:"❌ خاص Mafia على الأقل 5 لاعبين باش تبدا.",ephemeral:true});
      if(l.game!=="mafia" && l.players.length<2) return interaction.reply({content:"❌ خاص جوج لاعبين على الأقل.",ephemeral:true});
      l.started=true;
      await interaction.update({embeds:[visualLobbyEmbed(l)],components:[visualLobbyRows(l.id,true)]});
      let n=5; const msg=await interaction.channel.send(`⏳ اللعبة غادي تبدا بعد **${n}**...`);
      const t=setInterval(async()=>{n--;if(n>0) await msg.edit(`⏳ اللعبة غادي تبدا بعد **${n}**...`);else{clearInterval(t);await msg.edit("🎮 **اللعبة بدات!**");if(l.game==="mafia") await startVisualMafia(l,interaction.channel);else await interaction.channel.send(`🎮 **${l.info.name} بدات!**`);visualLobbies.delete(l.id);}},1000);
    }
  }
});


client.on("messageCreate", async message => {
  if(message.author.bot || message.content.trim()!=="!mafiarole") return;
  const game=[...visualMafiaGames.values()].find(g=>g.channelId===message.channelId);
  if(!game) return message.reply("❌ ماكايناش Mafia خدامة هنا.");
  const p=game.players.find(x=>x.id===message.author.id);
  if(!p) return message.reply("❌ ماشي لاعب فهاد اللعبة.");

  const names={mafia:"🕵️ MAFIA — الفريق الأول",doctor:"💉 DOCTOR — الفريق الثاني",detective:"🔎 DETECTIVE — الفريق الثاني",citizen:"👤 CITIZEN — الفريق الثاني"};
  const roleImage = p.role === "mafia" ? "mafia.png" : (p.role === "citizen" ? "citizen.png" : "doctor.png");
  const attachment = new AttachmentBuilder(path.join(__dirname,"..","assets","mafia",roleImage), {name: roleImage});

  // Discord messageCreate replies cannot be ephemeral. The role is therefore sent as a private DM.
  // The actual game card is still used, and the role is never posted publicly.
  try {
    await message.author.send({
      content:`🎭 **الدور ديالك:** ${names[p.role]}\n❤️ الحالة: ${p.alive?"حي":"ميت"}`,
      files:[attachment]
    });
    return message.reply("✅ صيفطنا ليك بطاقة الدور فالخاص.");
  } catch {
    return message.reply("❌ ما قدرتش نصيفط ليك البطاقة فالخاص.");
  }
});



function mafiaActionRows(game, player) {
  if (!player || !player.alive) return [];
  if (game.phase === "NIGHT") {
    if (["mafia","doctor","detective"].includes(player.role)) {
      const type=player.role;
      return mafiaTargetRows(game,{type,actorId:player.id},type!=="mafia");
    }
  }
  if (game.phase === "DAY") {
    return mafiaTargetRows(game,{type:"vote",actorId:player.id},true);
  }
  return [];
}
function mafiaRolePanelEmbed(game, player) {
  const role=mafiaRoleLabel(player.role);
  const phase=game.phase==="NIGHT"?"🌙 الليل":"☀️ النهار";
  const action=game.phase==="NIGHT"
    ? (player.role==="mafia"?"اختار الضحية ديال المافيا":player.role==="doctor"?"اختار اللاعب اللي بغيتي تحمي":"اختار اللاعب اللي بغيتي تحقق فيه")
    : "اختار اللاعب اللي بغيتي تصوت عليه";
  return new EmbedBuilder()
    .setTitle(`🎭 لوحة الدور — ${role}`)
    .setDescription(`❤️ الحالة: **${player.alive?"حي":"ميت"}**\n🕒 المرحلة: **${phase}**\n\n${player.role==="citizen"&&game.phase==="NIGHT"?"🌙 ما عندك حتى Action فالليل.":"🎯 "+action}`)
    .setFooter({text:"Mafia • Private Role Panel"});
}
function mafiaPublicStatus(game) {
  const alive=game.players.filter(p=>p.alive);
  return `👥 **الأحياء: ${alive.length}/${game.players.length}**\n${alive.map(p=>`• <@${p.id}>`).join("\n")}`;
}

client.on("interactionCreate", async interaction => {
  if(!interaction.isButton() || !interaction.customId.startsWith("m17|")) return;
  const [prefix,action,gameId,targetId]=interaction.customId.split("|");
  const game=visualMafiaGames.get(gameId);
  if(!game) return interaction.reply({content:"❌ هاد اللعبة سالات.",ephemeral:true});
  const player=game.players.find(p=>p.id===interaction.user.id);
  if(!player) return interaction.reply({content:"❌ ماشي لاعب فهاد اللعبة.",ephemeral:true});
  if(!player.alive) return interaction.reply({content:"💀 أنت ميت وما بقاتش عندك Actions.",ephemeral:true});

  if(action==="role"){
    const rows=mafiaActionRows(game,player);
    return interaction.reply({
      embeds:[mafiaRolePanelEmbed(game,player)],
      content: mafiaPublicStatus(game),
      components:rows,
      ephemeral:true
    });
  }

  if(game.phase==="NIGHT" && ["mafia","doctor","detective"].includes(action)){
    if(player.role!==action) return interaction.reply({content:"❌ هاد Action ماشي ديال الدور ديالك.",ephemeral:true});
    if(action==="mafia" && game.night.mafiaTarget) return interaction.reply({content:"❌ اخترتي الهدف ديالك من قبل.",ephemeral:true});
    if(action==="doctor" && game.night.doctorTarget) return interaction.reply({content:"❌ اخترتي الحماية ديالك من قبل.",ephemeral:true});
    if(action==="detective" && game.night.detectiveTarget) return interaction.reply({content:"❌ درتي التحقيق ديالك من قبل.",ephemeral:true});
    const target=game.players.find(p=>p.id===targetId && p.alive);
    if(!target) return interaction.reply({content:"❌ الهدف غير صالح.",ephemeral:true});
    if(action==="mafia") game.night.mafiaTarget=target.id;
    if(action==="doctor") game.night.doctorTarget=target.id;
    if(action==="detective") game.night.detectiveTarget=target.id;
    await interaction.reply({
      embeds:[new EmbedBuilder().setTitle("✅ تم تسجيل الـ Action").setDescription(`🎯 الاختيار ديالك تسجل على: <@${target.id}>.\n\nيمكن لباقي الأدوار يكملو Actions ديالهم.`)],
      ephemeral:true
    });
    return resolveMafiaNight(game);
  }

  if(game.phase==="DAY" && action==="vote"){
    if(game.votes.has(player.id)) return interaction.reply({content:"❌ صوتيتي من قبل فهاد الجولة.",ephemeral:true});
    const target=game.players.find(p=>p.id===targetId && p.alive && p.id!==player.id);
    if(!target) return interaction.reply({content:"❌ ما تقدرش تصوت لهاد اللاعب.",ephemeral:true});
    game.votes.set(player.id,target.id);
    await interaction.reply({
      embeds:[new EmbedBuilder().setTitle("✅ تم تسجيل التصويت").setDescription(`🗳️ صوتك تسجل ضد <@${target.id}>.\n\nما تقدرش تبدل التصويت ديالك فهاد الجولة.`)],
      ephemeral:true
    });
    return resolveMafiaVote(game);
  }
});

client.on("messageCreate", async message => {
  if(message.author.bot || message.content.trim()!=="!m17debug") return;
  const game=[...visualMafiaGames.values()].find(g=>g.channelId===message.channelId);
  if(!game) return message.reply("ℹ️ ماكايناش لعبة Mafia خدامة هنا.");
  return message.reply(`🧪 **Mafia Debug**\nالمرحلة: ${game.phase}\nالجولة: ${game.round}\nالأحياء: ${game.players.filter(p=>p.alive).length}/${game.players.length}\nالأصوات: ${game.votes.size}`);
});
