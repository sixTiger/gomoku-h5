(() => {
  "use strict";

  const BOARD_SIZE = 15;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  const canvas = document.querySelector("#gameBoard");
  const context = canvas.getContext("2d");
  const boardFrame = document.querySelector("#boardFrame");
  const modeButtons = [...document.querySelectorAll(".mode-button")];
  const newGameButton = document.querySelector("#newGameButton");
  const playAgainButton = document.querySelector("#playAgainButton");
  const undoButton = document.querySelector("#undoButton");
  const resetStatsButton = document.querySelector("#resetStatsButton");
  const soundButton = document.querySelector("#soundButton");
  const statusText = document.querySelector("#statusText");
  const turnStone = document.querySelector("#turnStone");
  const turnName = document.querySelector("#turnName");
  const turnHint = document.querySelector("#turnHint");
  const modeBadge = document.querySelector("#modeBadge");
  const thinking = document.querySelector("#thinking");
  const resultPanel = document.querySelector("#resultPanel");
  const resultIcon = document.querySelector("#resultIcon");
  const resultTitle = document.querySelector("#resultTitle");
  const resultSubtitle = document.querySelector("#resultSubtitle");
  const leftWins = document.querySelector("#leftWins");
  const rightWins = document.querySelector("#rightWins");
  const draws = document.querySelector("#draws");
  const leftLabel = document.querySelector("#leftLabel");
  const rightLabel = document.querySelector("#rightLabel");

  let board = createBoard();
  let history = [];
  let mode = "ai";
  let currentPlayer = BLACK;
  let gameOver = false;
  let aiThinking = false;
  let aiTimer = null;
  let winningLine = [];
  let muted = localStorage.getItem("gomoku-muted") === "true";
  let geometry = { size: 0, padding: 0, cell: 0 };

  function createBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  }

  function startGame() {
    clearTimeout(aiTimer);
    board = createBoard();
    history = [];
    currentPlayer = BLACK;
    gameOver = false;
    aiThinking = false;
    winningLine = [];
    resultPanel.hidden = true;
    thinking.classList.remove("is-visible");
    canvas.classList.remove("is-locked");
    updateInterface();
    drawBoard();
  }

  function switchMode(nextMode) {
    if (nextMode === mode) return;
    mode = nextMode;
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    startGame();
    updateStats();
  }

  function resizeCanvas() {
    const rect = boardFrame.getBoundingClientRect();
    const size = Math.max(240, Math.floor(rect.width - parseFloat(getComputedStyle(boardFrame).borderLeftWidth) * 2));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size * ratio);
    canvas.height = Math.floor(size * ratio);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    geometry = {
      size,
      padding: Math.max(17, size * 0.052),
      cell: (size - Math.max(17, size * 0.052) * 2) / (BOARD_SIZE - 1),
    };
    drawBoard();
  }

  function drawBoard() {
    const { size, padding, cell } = geometry;
    if (!size) return;
    context.clearRect(0, 0, size, size);

    context.save();
    context.strokeStyle = "rgba(55, 43, 29, 0.66)";
    context.lineWidth = Math.max(0.75, size / 720);
    context.beginPath();
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const point = padding + index * cell;
      context.moveTo(padding, point);
      context.lineTo(size - padding, point);
      context.moveTo(point, padding);
      context.lineTo(point, size - padding);
    }
    context.stroke();

    const stars = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];
    context.fillStyle = "rgba(49, 39, 27, 0.78)";
    stars.forEach(([row, col]) => {
      context.beginPath();
      context.arc(padding + col * cell, padding + row * cell, Math.max(2.2, cell * 0.08), 0, Math.PI * 2);
      context.fill();
    });
    context.restore();

    if (winningLine.length) drawWinningLine();
    history.forEach((move, index) => drawStone(move.row, move.col, move.player, index === history.length - 1));
  }

  function drawStone(row, col, player, isLastMove) {
    const { padding, cell } = geometry;
    const x = padding + col * cell;
    const y = padding + row * cell;
    const radius = cell * 0.42;
    context.save();
    context.shadowColor = "rgba(48, 31, 17, 0.34)";
    context.shadowBlur = radius * 0.36;
    context.shadowOffsetY = radius * 0.18;
    const gradient = context.createRadialGradient(x - radius * 0.34, y - radius * 0.4, radius * 0.1, x, y, radius);
    if (player === BLACK) {
      gradient.addColorStop(0, "#6d6964");
      gradient.addColorStop(0.32, "#2c2a27");
      gradient.addColorStop(1, "#0d0c0b");
    } else {
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.58, "#f3efe8");
      gradient.addColorStop(1, "#cfc7bd");
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.shadowColor = "transparent";
    context.lineWidth = 0.7;
    context.strokeStyle = player === BLACK ? "rgba(0,0,0,.5)" : "rgba(72,58,43,.25)";
    context.stroke();

    if (isLastMove) {
      context.fillStyle = player === BLACK ? "#e6c188" : "#b94832";
      context.beginPath();
      context.arc(x, y, Math.max(2, radius * 0.16), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawWinningLine() {
    if (winningLine.length < 2) return;
    const { padding, cell } = geometry;
    const start = winningLine[0];
    const end = winningLine[winningLine.length - 1];
    context.save();
    context.strokeStyle = "rgba(185, 72, 50, 0.76)";
    context.lineWidth = Math.max(4, cell * 0.14);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(padding + start.col * cell, padding + start.row * cell);
    context.lineTo(padding + end.col * cell, padding + end.row * cell);
    context.stroke();
    context.restore();
  }

  function handleBoardClick(event) {
    if (gameOver || aiThinking || (mode === "ai" && currentPlayer === WHITE)) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.round((x - geometry.padding) / geometry.cell);
    const row = Math.round((y - geometry.padding) / geometry.cell);
    if (!isInside(row, col) || board[row][col] !== EMPTY) return;

    const snapX = geometry.padding + col * geometry.cell;
    const snapY = geometry.padding + row * geometry.cell;
    if (Math.hypot(x - snapX, y - snapY) > geometry.cell * 0.52) return;

    placeStone(row, col, currentPlayer);
    if (finishTurn(row, col, currentPlayer)) return;

    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateInterface();
    if (mode === "ai" && currentPlayer === WHITE) scheduleAiMove();
  }

  function placeStone(row, col, player) {
    board[row][col] = player;
    history.push({ row, col, player });
    playStoneSound(player);
    drawBoard();
  }

  function finishTurn(row, col, player) {
    const line = findWinningLine(row, col, player);
    if (line.length >= 5) {
      winningLine = line;
      drawBoard();
      endGame(player);
      return true;
    }
    if (history.length === BOARD_SIZE * BOARD_SIZE) {
      endGame(EMPTY);
      return true;
    }
    return false;
  }

  function scheduleAiMove() {
    aiThinking = true;
    thinking.classList.add("is-visible");
    canvas.classList.add("is-locked");
    updateInterface();
    aiTimer = window.setTimeout(() => {
      if (gameOver || mode !== "ai") return;
      const move = chooseAiMove();
      aiThinking = false;
      thinking.classList.remove("is-visible");
      canvas.classList.remove("is-locked");
      if (!move) return;
      placeStone(move.row, move.col, WHITE);
      if (finishTurn(move.row, move.col, WHITE)) return;
      currentPlayer = BLACK;
      updateInterface();
    }, 420);
  }

  function chooseAiMove() {
    if (history.length === 0) return { row: 7, col: 7 };
    const candidates = getCandidates();

    for (const point of candidates) {
      if (wouldWin(point.row, point.col, WHITE)) return point;
    }
    for (const point of candidates) {
      if (wouldWin(point.row, point.col, BLACK)) return point;
    }

    let bestScore = -Infinity;
    let bestMoves = [];
    for (const point of candidates) {
      const attack = evaluatePoint(point.row, point.col, WHITE);
      const defense = evaluatePoint(point.row, point.col, BLACK);
      const distance = Math.hypot(point.row - 7, point.col - 7);
      const score = attack * 1.08 + defense + (10 - distance) * 1.8 + Math.random() * 2;
      if (score > bestScore + 0.01) {
        bestScore = score;
        bestMoves = [point];
      } else if (Math.abs(score - bestScore) < 0.01) {
        bestMoves.push(point);
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)] || { row: 7, col: 7 };
  }

  function getCandidates() {
    const points = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (board[row][col] !== EMPTY) continue;
        let nearby = false;
        for (let dr = -2; dr <= 2 && !nearby; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            if (isInside(row + dr, col + dc) && board[row + dr][col + dc] !== EMPTY) {
              nearby = true;
              break;
            }
          }
        }
        if (nearby) points.push({ row, col });
      }
    }
    return points;
  }

  function evaluatePoint(row, col, player) {
    let total = 0;
    for (const [dr, dc] of DIRECTIONS) {
      let count = 1;
      let openEnds = 0;
      let step = 1;
      while (isInside(row + dr * step, col + dc * step) && board[row + dr * step][col + dc * step] === player) {
        count += 1;
        step += 1;
      }
      if (isInside(row + dr * step, col + dc * step) && board[row + dr * step][col + dc * step] === EMPTY) openEnds += 1;
      step = 1;
      while (isInside(row - dr * step, col - dc * step) && board[row - dr * step][col - dc * step] === player) {
        count += 1;
        step += 1;
      }
      if (isInside(row - dr * step, col - dc * step) && board[row - dr * step][col - dc * step] === EMPTY) openEnds += 1;
      total += patternScore(count, openEnds);
    }
    return total;
  }

  function patternScore(count, openEnds) {
    if (count >= 5) return 1_000_000;
    if (count === 4 && openEnds === 2) return 80_000;
    if (count === 4 && openEnds === 1) return 12_000;
    if (count === 3 && openEnds === 2) return 7_000;
    if (count === 3 && openEnds === 1) return 900;
    if (count === 2 && openEnds === 2) return 480;
    if (count === 2 && openEnds === 1) return 70;
    return openEnds === 2 ? 18 : 4;
  }

  function wouldWin(row, col, player) {
    board[row][col] = player;
    const wins = findWinningLine(row, col, player).length >= 5;
    board[row][col] = EMPTY;
    return wins;
  }

  function findWinningLine(row, col, player) {
    for (const [dr, dc] of DIRECTIONS) {
      const line = [{ row, col }];
      let step = 1;
      while (isInside(row + dr * step, col + dc * step) && board[row + dr * step][col + dc * step] === player) {
        line.push({ row: row + dr * step, col: col + dc * step });
        step += 1;
      }
      step = 1;
      while (isInside(row - dr * step, col - dc * step) && board[row - dr * step][col - dc * step] === player) {
        line.unshift({ row: row - dr * step, col: col - dc * step });
        step += 1;
      }
      if (line.length >= 5) return line;
    }
    return [];
  }

  function isInside(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function undoMove() {
    if (!history.length || aiThinking || gameOver) return;
    const amount = mode === "ai" && history.length >= 2 ? 2 : 1;
    for (let index = 0; index < amount; index += 1) {
      const move = history.pop();
      if (move) board[move.row][move.col] = EMPTY;
    }
    currentPlayer = mode === "ai" ? BLACK : (history.length % 2 === 0 ? BLACK : WHITE);
    winningLine = [];
    updateInterface();
    drawBoard();
  }

  function endGame(winner) {
    gameOver = true;
    aiThinking = false;
    thinking.classList.remove("is-visible");
    canvas.classList.remove("is-locked");
    const stats = getStats();

    if (winner === EMPTY) {
      stats.draws += 1;
      resultIcon.textContent = "和";
      resultTitle.textContent = "旗鼓相当";
      resultSubtitle.textContent = "棋盘已满，本局和棋";
      statusText.textContent = "本局和棋";
    } else {
      const blackWins = winner === BLACK;
      if (blackWins) stats.left += 1;
      else stats.right += 1;
      resultIcon.textContent = "✦";
      if (mode === "ai") {
        resultTitle.textContent = blackWins ? "漂亮的一局！" : "再接再厉";
        resultSubtitle.textContent = blackWins ? "你执黑五子连珠" : "电脑执白五子连珠";
        statusText.textContent = blackWins ? "恭喜你获胜！" : "电脑获胜，再试一次吧";
      } else {
        resultTitle.textContent = `${blackWins ? "黑方" : "白方"}获胜`;
        resultSubtitle.textContent = `${blackWins ? "黑方" : "白方"}率先五子连珠`;
        statusText.textContent = `${blackWins ? "黑方" : "白方"}获胜！`;
      }
    }

    saveStats(stats);
    updateStats();
    undoButton.disabled = true;
    window.setTimeout(() => { resultPanel.hidden = false; }, 300);
  }

  function updateInterface() {
    const isBlack = currentPlayer === BLACK;
    const aiTurn = mode === "ai" && !isBlack;
    turnStone.classList.toggle("stone--black", isBlack);
    turnStone.classList.toggle("stone--white", !isBlack);
    modeBadge.textContent = mode === "ai" ? "人机" : "双人";

    if (mode === "ai") {
      turnName.textContent = aiTurn ? "电脑思考中" : "轮到你了";
      turnHint.textContent = aiTurn ? "执白落子" : "你执黑棋";
      statusText.textContent = aiTurn ? "对手正在思考…" : history.length ? "轮到你落子" : "黑方先行，请落子";
    } else {
      turnName.textContent = isBlack ? "轮到黑方" : "轮到白方";
      turnHint.textContent = isBlack ? "黑棋回合" : "白棋回合";
      statusText.textContent = isBlack ? "轮到黑方落子" : "轮到白方落子";
    }
    undoButton.disabled = history.length === 0 || aiThinking || gameOver;
  }

  function getStats() {
    const fallback = { left: 0, right: 0, draws: 0 };
    try {
      return { ...fallback, ...JSON.parse(localStorage.getItem(`gomoku-stats-${mode}`)) };
    } catch {
      return fallback;
    }
  }

  function saveStats(stats) {
    localStorage.setItem(`gomoku-stats-${mode}`, JSON.stringify(stats));
  }

  function updateStats() {
    const stats = getStats();
    leftWins.textContent = stats.left;
    rightWins.textContent = stats.right;
    draws.textContent = stats.draws;
    leftLabel.textContent = mode === "ai" ? "你" : "黑方";
    rightLabel.textContent = mode === "ai" ? "电脑" : "白方";
  }

  function resetStats() {
    saveStats({ left: 0, right: 0, draws: 0 });
    updateStats();
  }

  function playStoneSound(player) {
    if (muted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(player === BLACK ? 185 : 215, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(120, audio.currentTime + 0.055);
      gain.gain.setValueAtTime(0.06, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.07);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.075);
      oscillator.addEventListener("ended", () => audio.close());
    } catch {
      // Some browsers may block audio; gameplay should continue normally.
    }
  }

  function toggleSound() {
    muted = !muted;
    localStorage.setItem("gomoku-muted", String(muted));
    soundButton.classList.toggle("is-muted", muted);
    soundButton.setAttribute("aria-label", muted ? "开启落子音效" : "关闭落子音效");
  }

  canvas.addEventListener("click", handleBoardClick);
  modeButtons.forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
  newGameButton.addEventListener("click", startGame);
  playAgainButton.addEventListener("click", startGame);
  undoButton.addEventListener("click", undoMove);
  resetStatsButton.addEventListener("click", resetStats);
  soundButton.addEventListener("click", toggleSound);
  window.addEventListener("resize", resizeCanvas);

  soundButton.classList.toggle("is-muted", muted);
  soundButton.setAttribute("aria-label", muted ? "开启落子音效" : "关闭落子音效");
  updateStats();
  updateInterface();
  requestAnimationFrame(resizeCanvas);
})();
