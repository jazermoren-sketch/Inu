const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
const code = fs.readFileSync(file, 'utf8');

const checks = [
  ['M18 handler marker', code.includes('M18_MAFIA_ROLE_PANEL_HANDLER')],
  ['Button interactions are handled before slash-command guard', code.includes('interaction.isButton() && interaction.customId.startsWith("m17|")')],
  ['Role panel action exists', code.includes('if (action === "role")')],
  ['Mafia target action exists', code.includes('game.night.mafiaTarget = target.id')],
  ['Doctor target action exists', code.includes('game.night.doctorTarget = target.id')],
  ['Detective target action exists', code.includes('game.night.detectiveTarget = target.id')],
  ['Night resolution is called', code.includes('await resolveMafiaNight(game)')],
  ['Role response is ephemeral', code.includes('return interaction.reply({ content: description, components: rows, ephemeral: true })')]
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\n❌ Mafia role panel v2 verification failed.');
  process.exit(1);
}

console.log('\n🎭 Mafia role-panel v2 verification passed.');
