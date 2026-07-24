# 🎮 Gaming Hub Discord Bot V1

بوت Gaming Hub تفاعلي للسيرفرات اللي فيها الملل 😄

## الألعاب الموجودة
- Trivia
- Guess the Number
- Guess the Word
- Emoji Guess
- Reaction Speed
- Math Race
- Tic-Tac-Toe ضد البوت
- Connect 4 ضد البوت
- Rock Paper Scissors
- Dice Duel
- Quick Quiz

## الأنظمة
- XP و Levels
- Coins
- Leaderboard
- Daily Reward
- Achievements
- تحديات يومية
- Profile

## التشغيل
1. ثبت Node.js 18 أو أحدث.
2. شغل:
   npm install
3. انسخ `.env.example` إلى `.env`.
4. ضع Token داخل `.env`.
5. شغل:
   npm start

## Game Center
استعمل `-العاب` لفتح Game Center.
- `👥 ألعاب السيرفر`: اختيار لعبة جماعية ثم إنشاء Lobby.
- `🧍 ألعاب فردية`: اختيار لعبة فردية.

## الأوامر
/games
/profile
/leaderboard
/daily
/challenge
/quiz
/guessnumber
/guessword
/emojiguess
/reaction
/math
/tictactoe
/connect4
/rps
/dice
/tournament
/duel
/coinflip
/help

ملاحظة: هذا إصدار V1.1 عملي وقابل للتوسعة، مع Tic-Tac-Toe وConnect 4 كاملين ضد البوت. البيانات محفوظة محلياً في `data/database.json`.

## V1.2 - Multiplayer & Tournaments
- ⚔️ Player Duel
- 🏆 Tournament Lobby
- 🪙 Coin Flip
- 🏅 Tournament Champion Rewards

> مهم: فعل Message Content Intent من Discord Developer Portal لأن أمر `-العاب` يعتمد على قراءة الرسائل.

## V1.4 — Mafia
- Full Mafia lobby flow
- Secret role assignment via DM
- Mafia / Doctor / Detective / Citizen
- Night phase
- Day phase
- Voting with `/mafiavote @player`
- `/mafiastatus`
- Win conditions
- XP and Coins rewards

## V1.5 Visual Mafia
- `-العاب` Game Center
- Lobby مشابهة لفكرة Fizbo Games
- Mafia / Doctor / Detective / Citizen roles
- Final winner result
- Winning team mentions
- Disabled button showing total team points
- Points divided equally among winners
- `!mafiarole` gives private ephemeral role info

## V1.6 — Actual Mafia Images
- Included real PNG role cards
- Start-of-game role/team images are sent from assets/mafia
- Winner image is selected dynamically for Mafia or Citizens
- Role card is sent privately when requested

## V1.7 — Real Mafia Gameplay
- Night phase with Mafia kill target
- Doctor protection
- Detective investigation
- Private role/action panel through Discord ephemeral buttons
- Automatic night resolution
- Day voting with vote buttons
- Tie handling
- Player elimination
- Automatic win-condition checks
- Automatic transition between Night and Day

## V1.8 — Mafia UI Polish
- Full private role panel embed
- Private action buttons for Night and Day
- Cleaner target labels without revealing roles
- Vote confirmation and action confirmation embeds
- Public alive-player status in private role panel
- Corrected Discord message reply behavior

## V1.9 — Final Polish & Test Readiness
- Centralized cleanup for finished/cancelled games
- Safer winner-condition handling
- Prevents duplicate night actions
- Prevents duplicate votes
- Added `!m17debug` for live state verification during testing
- Final syntax validation performed before packaging
