import { currentNick, isHost, playersScores, gameStarted, choosingPlayerId } from "./game-state.js"
import { playersListEl } from "./dom-elements.js"
import { transferHost } from "./websocket-manager.js"

export function renderPlayersList(players) {
  playersListEl.innerHTML = ""

  players.forEach((p) => {
    const li = document.createElement("li")
    li.className = "player-list-item"

    const playerInfo = document.createElement("span")
    playerInfo.textContent = p.nickname + (p.is_master ? " (хост)" : "")
    li.appendChild(playerInfo)

    const playerId = p.id
    if (playerId !== undefined) {
      li.dataset.playerId = String(playerId)
    }

    if (gameStarted && playersScores[p.nickname] !== undefined) {
      playerInfo.textContent += ` - ${playersScores[p.nickname]} очков`
    }

    if (playerId !== undefined && choosingPlayerId !== null && Number(playerId) === Number(choosingPlayerId)) {
      li.classList.add("choosing-player")
      playerInfo.textContent += " (выбирает мелодию)"
    }

    if (isHost && !p.is_master && !gameStarted && p.nickname !== currentNick) {
      const transferBtn = document.createElement("button")
      transferBtn.textContent = "Сделать хостом"
      transferBtn.className = "transfer-host-btn"
      transferBtn.onclick = () => {
        transferHost(p.nickname)
      }
      li.appendChild(transferBtn)
    }

    playersListEl.appendChild(li)
  })
}

export function addPlayerToList(nickname, isMaster = false, playerId = null) {
  const li = document.createElement("li")
  li.className = "player-list-item"

  const playerInfo = document.createElement("span")
  playerInfo.textContent = nickname + (isMaster ? " (хост)" : "")
  li.appendChild(playerInfo)

  if (playerId !== null && playerId !== undefined) {
    li.dataset.playerId = String(playerId)
    console.log(`Adding player to list with ID: ${playerId}, nickname: ${nickname}`)
  }

  if (gameStarted && playersScores[nickname] !== undefined) {
    playerInfo.textContent += ` - ${playersScores[nickname]} очков`
  }

  if (isHost && !isMaster && !gameStarted && nickname !== currentNick) {
    const transferBtn = document.createElement("button")
    transferBtn.textContent = "Сделать хостом"
    transferBtn.className = "transfer-host-btn"
    transferBtn.onclick = () => {
      transferHost(nickname)
    }
    li.appendChild(transferBtn)
  }

  if (playerId !== null && choosingPlayerId !== null && Number(playerId) === Number(choosingPlayerId)) {
    li.classList.add("choosing-player")
    playerInfo.textContent += " (выбирает мелодию)"
  }

  playersListEl.appendChild(li)
}

export function removePlayerFromList(nickname) {
  Array.from(playersListEl.children).forEach((li) => {
    if (li.textContent.startsWith(nickname)) {
      playersListEl.removeChild(li)
    }
  })
}
