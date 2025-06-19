import { currentNick, getSortedPlayersByScore } from "./game-state.js"

function createPlayerRow(player, index) {
  const row = document.createElement("tr")

  if (player.nickname === currentNick) {
    row.classList.add("current-player")
  }

  if (index < 3) {
    row.classList.add(`rank-${index + 1}`)
  }

  const rankCell = document.createElement("td")
  rankCell.textContent = (index + 1).toString()

  const nameCell = document.createElement("td")
  nameCell.textContent = player.nickname || "Unknown Player"

  const scoreCell = document.createElement("td")
  scoreCell.textContent = player.score.toString()
  scoreCell.classList.add("score-cell")

  row.appendChild(rankCell)
  row.appendChild(nameCell)
  row.appendChild(scoreCell)

  return row
}

export function updateLeaderboardTable() {
  console.log("Updating leaderboard table")
  const sortedPlayers = getSortedPlayersByScore()
  const tbody = document.getElementById("leaderboard-tbody")

  if (!tbody) {
    console.error("Leaderboard tbody not found")
    return
  }

  tbody.innerHTML = ""

  if (sortedPlayers.length === 0) {
    console.log("No player scores available")
    return
  }

  sortedPlayers.forEach((player, index) => {
    const row = createPlayerRow(player, index)
    tbody.appendChild(row)
  })

  console.log(`Leaderboard updated with ${sortedPlayers.length} players`)
}

export function showLeaderboard() {
  console.log("Showing leaderboard")
  const leaderboardModal = document.getElementById("leaderboard-modal")

  if (leaderboardModal) {
    updateLeaderboardTable()

    const tbody = document.getElementById("leaderboard-tbody")
    if (tbody && tbody.children.length === 0) {
      console.log("No leaderboard data available")
      const row = document.createElement("tr")
      const cell = document.createElement("td")
      cell.colSpan = 3
      cell.textContent = "Нет данных о счете игроков"
      cell.style.textAlign = "center"
      cell.style.padding = "20px"
      row.appendChild(cell)
      tbody.appendChild(row)
    }

    leaderboardModal.classList.remove("hidden")
    leaderboardModal.style.display = "flex"
  } else {
    console.error("Leaderboard modal not found")
  }
}

export function hideLeaderboard() {
  const leaderboardModal = document.getElementById("leaderboard-modal")
  if (leaderboardModal) {
    leaderboardModal.classList.add("hidden")
    leaderboardModal.style.display = "none"
  }
}

export function setupLeaderboardEvents() {
  const closeLeaderboardBtn = document.getElementById("close-leaderboard-btn")
  if (closeLeaderboardBtn) {
    closeLeaderboardBtn.addEventListener("click", hideLeaderboard)
  }

  const leaderboardModal = document.getElementById("leaderboard-modal")
  if (leaderboardModal) {
    leaderboardModal.addEventListener("click", (e) => {
      if (e.target === leaderboardModal) {
        hideLeaderboard()
      }
    })
  }
}

export function showGameOverScreen() {
  console.log("Showing game over screen")

  const gameOverModal = document.getElementById("game-over-modal")
  if (!gameOverModal) {
    console.error("Game over modal not found")
    return
  }

  const sortedPlayers = getSortedPlayersByScore()

  if (sortedPlayers.length === 0) {
    console.error("No player scores available for game over screen")
    return
  }

  const winner = sortedPlayers[0]

  const winnerNameEl = document.getElementById("winner-name")
  const winnerScoreEl = document.getElementById("winner-score")

  if (winnerNameEl && winnerScoreEl) {
    const winnerName = winner.nickname || "Unknown Player"
    winnerNameEl.textContent = winnerName
    winnerScoreEl.textContent = `${winner.score || 0} очков`

    if (winnerName === currentNick) {
      winnerNameEl.style.textShadow = "0 0 10px rgba(255, 215, 0, 0.8)"
      document.getElementById("winner-container").style.animation = "winner-glow 1s infinite alternate"
    }
  }

  const finalResultsTbody = document.getElementById("final-results-tbody")
  if (finalResultsTbody) {
    finalResultsTbody.innerHTML = ""

    sortedPlayers.forEach((player, index) => {
      const row = createPlayerRow(player, index)
      finalResultsTbody.appendChild(row)
    })
  }

  const exitGameBtn = document.getElementById("exit-game-btn")
  if (exitGameBtn) {
    exitGameBtn.onclick = () => {
      import("./game-state.js").then(({ clearState }) => {
        clearState()
        window.location.reload()
      })
    }
  }

  gameOverModal.classList.remove("hidden")
  gameOverModal.style.display = "flex"
}
