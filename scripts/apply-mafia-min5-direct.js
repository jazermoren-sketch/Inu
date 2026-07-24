const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
let code = fs.readFileSync(file, 'utf8');

// Ensure AttachmentBuilder is imported because Mafia role cards use it.
if (!code.includes('AttachmentBuilder')) {
  const importPattern = /\s+ComponentType\s*\n\s*\}\s*=\s*require\("discord\.js"\);/;
  if (!importPattern.test(code)) throw new Error('discord.js import block not found.');
  code = code.replace(importPattern, '\n  ComponentType,\n  AttachmentBuilder\n} = require("discord.js");');
}

// Replace the generic minimum-player rule with a Mafia-specific rule.
const generic = /if\(l\.players\.length<2\) return interaction\.reply\(\{content:"❌ خاص جوج لاعبين على الأقل\."\s*,\s*ephemeral:true\}\);/;
const mafiaRule = 'if(l.game==="mafia" && l.players.length<5) return interaction.reply({content:"❌ خاص Mafia على الأقل 5 لاعبين باش تبدا.",ephemeral:true});\n      if(l.game!=="mafia" && l.players.length<2) return interaction.reply({content:"❌ خاص جوج لاعبين على الأقل.",ephemeral:true});';

if (!code.includes('l.game==="mafia" && l.players.length<5')) {
  if (!generic.test(code)) throw new Error('Generic lobby minimum-player rule not found.');
  code = code.replace(generic, mafiaRule);
}

fs.writeFileSync(file, code);
console.log('✅ Mafia minimum players: 5');
console.log('✅ Other server games minimum players: 2');
console.log('✅ AttachmentBuilder import verified');
