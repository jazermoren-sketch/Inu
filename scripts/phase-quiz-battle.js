const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
let code = fs.readFileSync(file, 'utf8');

if (code.includes('QUIZ_BATTLE_MODULE')) {
  console.log('ℹ️ Quiz Battle phase already applied.');
  process.exit(0);
}

const requireLine = 'const { setupQuizBattle } = require("../games/quiz-battle"); // QUIZ_BATTLE_MODULE\n';
const setupLine = '\nsetupQuizBattle(client); // QUIZ_BATTLE_MODULE\n';

const clientMarker = 'const client = new Client({';
if (!code.includes(clientMarker)) throw new Error('Client marker not found.');

const requireInsertMarker = 'const fs = require("fs");\n';
if (!code.includes(requireInsertMarker)) throw new Error('Import marker not found.');
code = code.replace(requireInsertMarker, requireInsertMarker + requireLine, 1);

const clientEnd = '});\n\nconst DATA_DIR =';
if (!code.includes(clientEnd)) throw new Error('Client initialization end marker not found.');
code = code.replace(clientEnd, '});' + setupLine + '\nconst DATA_DIR =', 1);

fs.writeFileSync(file, code);
console.log('✅ Quiz Battle module connected to the bot.');
console.log('✅ Multiplayer lobby, 5-round quiz, scoring and winner screen enabled.');
