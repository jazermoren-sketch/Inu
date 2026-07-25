const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
const code = fs.readFileSync(file, 'utf8');

const checks = [
  [
    'Mafia-specific minimum 5 validation',
    code.includes('l.game==="mafia" && l.players.length<5')
  ],
  [
    'Non-Mafia games retain minimum 2 validation',
    code.includes('l.game!=="mafia" && l.players.length<2')
  ],
  [
    'Defensive Mafia start guard',
    /async function startVisualMafia\(lobby, channel\)\s*\{\s*if\s*\(\s*lobby\.players\.length\s*<\s*5\s*\)\s*return\s*;/.test(code)
  ],
  [
    'AttachmentBuilder available for role images',
    code.includes('AttachmentBuilder')
  ]
];

let failed = false;

for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\n❌ Mafia minimum-player verification failed.');
  process.exit(1);
}

console.log('\n🎭 Mafia minimum-player verification passed.');
