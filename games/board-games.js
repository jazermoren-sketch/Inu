const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const activeBoardGames = new Map();

function boardEmbed(game, notice = '') {
  const title = game.type === 'connect4' ? '🔴🟡 CONNECT FOUR' : '❌⭕ TIC TAC TOE';
  const board = game.type === 'connect4' ? renderConnect4(game) : renderTicTacToe(game);
  const current = game.players[game.turn];
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`${notice ? `${notice}\n\n` : ''}${board}\n\n🎯 الدور: <@${current}>`)
    .setFooter({ text: 'GamingHub • Board Games' });
}

function renderTicTacToe(game) {
  return game.board.map((cell, i) => cell || `${i + 1}️⃣`).reduce((rows, cell, i) => {
    if (i % 3 === 0) rows.push([]);
    rows[rows.length - 1].push(cell);
    return rows;
  }, []).map(row => row.join(' │ ')).join('\n──────────\n');
}

function renderConnect4(game) {
  return game.board.map(row => row.map(c => c || '⚪').join('')).join('\n');
}

function tttRows(id, game) {
  return [0, 1, 2].map(row => new ActionRowBuilder().addComponents(
    [0, 1, 2].map(col => {
      const i = row * 3 + col;
      return new ButtonBuilder()
        .setCustomId(`bg_ttt_${id}_${i}`)
        .setLabel(game.board[i] || `${i + 1}`)
        .setStyle(game.board[i] ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(Boolean(game.board[i]));
    })
  ));
}

function connect4Rows(id, game) {
  return [new ActionRowBuilder().addComponents(
    [0, 1, 2, 3, 4, 5, 6].map(col => new ButtonBuilder()
      .setCustomId(`bg_c4_${id}_${col}`)
      .setLabel(`${col + 1}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(game.board[0][col] !== null)
    )
  )];
}

function winnerTtt(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return board.every(Boolean) ? 'draw' : null;
}

function winnerC4(board) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    if (!board[r][c]) continue;
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let n = 1; n < 4; n++) {
        const rr = r + dr * n, cc = c + dc * n;
        if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7 || board[rr][cc] !== board[r][c]) break;
        count++;
      }
      if (count >= 4) return board[r][c];
    }
  }
  return board.every(row => row.every(Boolean)) ? 'draw' : null;
}

function startBoardGame({ id, type, channelId, players }) {
  const game = {
    id, type, channelId, players,
    turn: 0,
    board: type === 'connect4' ? Array.from({ length: 6 }, () => Array(7).fill(null)) : Array(9).fill(null),
    symbols: type === 'connect4' ? ['🔴', '🟡'] : ['❌', '⭕']
  };
  activeBoardGames.set(id, game);
  return game;
}

async function handleBoardInteraction(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('bg_')) return false;
  const [, kind, id, position] = interaction.customId.split('_');
  const game = activeBoardGames.get(id);
  if (!game) {
    await interaction.reply({ content: '❌ هاد اللعبة سالات.', ephemeral: true });
    return true;
  }
  const playerIndex = game.players.indexOf(interaction.user.id);
  if (playerIndex === -1) {
    await interaction.reply({ content: '❌ ماشي لاعب فهاد اللعبة.', ephemeral: true });
    return true;
  }
  if (playerIndex !== game.turn) {
    await interaction.reply({ content: '⏳ مازال ما جاكش الدور.', ephemeral: true });
    return true;
  }

  let result = null;
  if (kind === 'ttt') {
    const index = Number(position);
    if (!Number.isInteger(index) || game.board[index]) return interaction.reply({ content: '❌ الخانة ما متاحةش.', ephemeral: true });
    game.board[index] = game.symbols[game.turn];
    result = winnerTtt(game.board);
  } else if (kind === 'c4') {
    const col = Number(position);
    if (!Number.isInteger(col) || col < 0 || col > 6) return interaction.reply({ content: '❌ العمود غير صالح.', ephemeral: true });
    let row = -1;
    for (let r = 5; r >= 0; r--) if (!game.board[r][col]) { row = r; break; }
    if (row === -1) return interaction.reply({ content: '❌ هاد العمود عامر.', ephemeral: true });
    game.board[row][col] = game.symbols[game.turn];
    result = winnerC4(game.board);
  }

  if (result) {
    const winner = result === 'draw' ? null : game.players[game.symbols.indexOf(result)];
    activeBoardGames.delete(id);
    return interaction.update({
      embeds: [boardEmbed(game, result === 'draw' ? '🤝 تعادل!' : `🏆 الفائز: <@${winner}>`)],
      components: []
    });
  }

  game.turn = game.turn === 0 ? 1 : 0;
  return interaction.update({
    embeds: [boardEmbed(game)],
    components: game.type === 'connect4' ? connect4Rows(id, game) : tttRows(id, game)
  });
}

function boardComponents(game) {
  return game.type === 'connect4' ? connect4Rows(game.id, game) : tttRows(game.id, game);
}

module.exports = { startBoardGame, handleBoardInteraction, boardEmbed, boardComponents, activeBoardGames };
