const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
const code = fs.readFileSync(file, 'utf8');

const checks = [
  ['Mafia role panel handler marker', code.includes('M17_MAFIA_ROLE_PANEL_HANDLER')],
  ['Role button action exists', code.includes('action === "role"')],
  ['Mafia night action exists', code.includes('game.night.mafiaTarget = target.id')],
  ['Doctor night action exists', code.includes('game.night.doctorTarget = target.id')],
  ['Detective night action exists', code.includes('game.night.detectiveTarget = target.id')],
  ['Night resolution is called', code.includes('await resolveMafiaNight(game)')],
  ['Ephemeral role response exists', code.includes('ephemeral: true')]
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('\n🎭 Mafia role-panel phase verification passed.');
