const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
let code = fs.readFileSync(file, 'utf8');

// Required by the Mafia image attachments already used in the project.
if (!code.includes('  AttachmentBuilder\n')) {
  code = code.replace('  ComponentType\n} = require("discord.js");', '  ComponentType,\n  AttachmentBuilder\n} = require("discord.js");');
}

// Mafia requires at least 5 players.
const old = 'if(l.players.length<2) return interaction.reply({content:"❌ خاص جوج لاعبين على الأقل.",ephemeral:true});';
const next = 'if(l.game === "mafia" && l.players.length < 5) return interaction.reply({content:"❌ خاص Mafia على الأقل 5 لاعبين باش تبدا.",ephemeral:true});\n      if(l.game !== "mafia" && l.players.length < 2) return interaction.reply({content:"❌ خاص جوج لاعبين على الأقل.",ephemeral:true});';

if (code.includes(old)) {
  code = code.replace(old, next);
} else if (!code.includes('خاص Mafia على الأقل 5 لاعبين')) {
  throw new Error('Mafia start validation line was not found.');
}

fs.writeFileSync(file, code);
console.log('✅ Mafia minimum-player rule applied: 5 players.');
console.log('✅ AttachmentBuilder import verified.');
