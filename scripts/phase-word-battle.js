const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('const { setupWordBattle } = require("../games/word-battle"); // WORD_BATTLE_MODULE')) {
  const marker = 'const { setupDuelArena } = require("../games/duel-arena"); // DUEL_ARENA_MODULE';
  if (!code.includes(marker)) throw new Error('Duel Arena import marker not found.');
  code = code.replace(marker, marker + '\nconst { setupWordBattle } = require("../games/word-battle"); // WORD_BATTLE_MODULE', 1);
}

if (!code.includes('setupWordBattle(client); // WORD_BATTLE_MODULE')) {
  const marker = 'setupDuelArena(client); // DUEL_ARENA_MODULE';
  if (!code.includes(marker)) throw new Error('Duel Arena setup marker not found.');
  code = code.replace(marker, marker + '\nsetupWordBattle(client); // WORD_BATTLE_MODULE', 1);
}

if (!code.includes('.setName("wordbattle")')) {
  const marker = 'new SlashCommandBuilder().setName("duel").setDescription("تحدي لاعب آخر في لعبة"),';
  if (!code.includes(marker)) throw new Error('Slash command insertion marker not found.');
  code = code.replace(marker, marker + '\n  new SlashCommandBuilder().setName("wordbattle").setDescription("لعبة تخمين الكلمات الجماعية"),', 1);
}

fs.writeFileSync(file, code);
console.log('✅ Word Battle connected to the bot.');
console.log('✅ /wordbattle slash command added.');
