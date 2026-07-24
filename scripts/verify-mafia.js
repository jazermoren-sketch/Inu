const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
const code = fs.readFileSync(file, 'utf8');

const checks = [
  ['Mafia minimum 5-player patch script exists', fs.existsSync(path.join(__dirname, 'patch-mafia-min5.js'))],
  ['Mafia start function exists', code.includes('async function startVisualMafia')],
  ['Mafia lobby start validation exists', code.includes('خاص Mafia على الأقل 5 لاعبين')],
  ['Mafia winner logic exists', code.includes('function mafiaCheckWinner')],
  ['Mafia cleanup exists', code.includes('function cleanupVisualMafia')],
  ['Mafia role panel exists', code.includes('function mafiaRolePanelButton')]
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('\n🎭 Mafia verification passed.');
