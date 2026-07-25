const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
let code = fs.readFileSync(file, 'utf8');

if (code.includes('M18_MAFIA_ROLE_PANEL_HANDLER')) {
  console.log('ℹ️ Mafia role panel v2 already applied.');
  process.exit(0);
}

const marker = 'client.on("interactionCreate", async interaction => {\n  if (!interaction.isChatInputCommand()) return;';

if (!code.includes(marker)) {
  throw new Error('Main interactionCreate marker not found.');
}

const handler = `client.on("interactionCreate", async interaction => {
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
      let description = \`🎭 **الدور ديالك: \${roleText}**\\n\\n\`;
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

    await interaction.reply({ content: \`✅ تسجل الاختيار ديالك ضد <@\${target.id}>.\`, ephemeral: true });
    await resolveMafiaNight(game);
  }

  if (!interaction.isChatInputCommand()) return;`;

code = code.replace(marker, handler);
fs.writeFileSync(file, code);
console.log('✅ Mafia role panel interaction handler applied.');
console.log('✅ Role information is ephemeral.');
console.log('✅ Mafia, Doctor and Detective night actions are wired.');
