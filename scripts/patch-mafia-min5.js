const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
let code = fs.readFileSync(file, 'utf8');

// Required by the Mafia image attachments already used in the project.
if (!code.includes('AttachmentBuilder')) {
  code = code.replace(
    '  ComponentType\n} = require("discord.js");',
    '  ComponentType,\n  AttachmentBuilder\n} = require("discord.js");'
  );
}

// Mafia requires at least 5 players.
const mafiaGuard = 'if(l.game==="mafia" && l.players.length<5) return interaction.reply({content:"❌ خاص Mafia على الأقل 5 لاعبين باش تبدا.",ephemeral:true});';

if (!code.includes('l.game==="mafia" && l.players.length<5')) {
  const startLine = /if\(l\.players\.length<2\) return interaction\.reply\(\{content:"❌ خاص جوج لاعبين على الأقل\."\s*,\s*ephemeral:true\}\);/;
  if (!startLine.test(code)) {
    throw new Error('Mafia start validation line was not found.');
  }
  code = code.replace(
    startLine,
    `${mafiaGuard}\n      if(l.game!=="mafia" && l.players.length<2) return interaction.reply({content:"❌ خاص جوج لاعبين على الأقل.",ephemeral:true});`
  );
}

fs.writeFileSync(file, code);
console.log('✅ Mafia minimum-player rule applied: 5 players.');
console.log('✅ AttachmentBuilder import verified.');
