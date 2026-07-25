const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'index.js');
let code = fs.readFileSync(file, 'utf8');

if (code.includes('MURDER_MYSTERY_MODULE')) {
  console.log('ℹ️ Murder Mystery phase already applied.');
  process.exit(0);
}

const importMarker = 'const { setupQuizBattle } = require("../games/quiz-battle"); // QUIZ_BATTLE_MODULE\n';
if (!code.includes(importMarker)) throw new Error('Quiz Battle import marker not found.');
code = code.replace(importMarker, importMarker + 'const { setupMurderMystery } = require("../games/murder-mystery"); // MURDER_MYSTERY_MODULE\n', 1);

const setupMarker = 'setupQuizBattle(client); // QUIZ_BATTLE_MODULE\n';
if (!code.includes(setupMarker)) throw new Error('Quiz Battle setup marker not found.');
code = code.replace(setupMarker, setupMarker + 'setupMurderMystery(client); // MURDER_MYSTERY_MODULE\n', 1);

fs.writeFileSync(file, code);
console.log('✅ Murder Mystery module connected to the bot.');
console.log('✅ Investigation lobby, clues, suspect selection and voting enabled.');
