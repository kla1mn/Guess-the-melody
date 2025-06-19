import {
  resetAnsweredPlayers,
  setPlayerScore,
  setChoosingPlayerId,
  currentPlayerId,
  choosingPlayerId,
  playerNicknameToId,
  getNicknameById,
  checkAllMelodiesGuessed,
  showGameOverAfterDelay,
} from "./game-state.js"
import { updateScoreDisplay } from "./ui-renderer.js"
import { updateLeaderboardTable } from "./leaderboard-renderer.js"
import { renderCategories } from "./category-renderer.js"
import { clearAnswersContainerSafely } from "./answer-renderer.js"

export function updateGameInfo(isCurrentPlayer, choosingPlayerName) {
  const infoEl = document.getElementById("game-info")
  if (infoEl) {
    if (isCurrentPlayer) {
      infoEl.innerHTML = `<p>Ты выбираешь мелодию</p>`
    } else {
      infoEl.innerHTML = `<p>${choosingPlayerName} выбирает мелодию...</p>`
    }
  }
}

export function updateGameInfoWithDelay(delay = 300) {
  setTimeout(() => {
    const choosingPlayerName = getNicknameById(choosingPlayerId)
    const isCurrentPlayer = Number(currentPlayerId) === Number(choosingPlayerId)
    updateGameInfo(isCurrentPlayer, choosingPlayerName)
  }, delay)
}

export function renderCategoriesWithDelay(delay = 500) {
  setTimeout(() => {
    import("./game-state.js").then(({ gameCategories }) => {
      renderCategories(gameCategories)
    })
  }, delay)
}

export function showSystemMessage(text, duration = 3000) {
  const existingMessages = document.querySelectorAll(".system-message")
  const isDuplicate = Array.from(existingMessages).some((msg) => msg.textContent.includes(text))

  if (!isDuplicate) {
    const message = document.createElement("div")
    message.className = "system-message"
    message.textContent = text

    const answersContainer = document.getElementById("answers-container")
    if (answersContainer) {
      answersContainer.appendChild(message)

      setTimeout(() => {
        message.style.opacity = "0"
        message.style.transition = "opacity 0.5s"
        setTimeout(() => message.remove(), 500)
      }, duration)
    }
  }
}

export function processAnswer(playerNickname, points, messagePrefix) {
  setPlayerScore(playerNickname, points)
  updateScoreDisplay(playerNickname, points)
  updateLeaderboardTable()
  showSystemMessage(`${messagePrefix} игрока ${playerNickname}! Теперь у него ${points} очков`)
}

export function updateChoosingPlayer(payload, shouldCheckGameOver = false) {
  const newChoosingPlayerId = playerNicknameToId[payload.choosing_player] || payload.choosing_player
  const choosingPlayerChanged = Number(choosingPlayerId) !== Number(newChoosingPlayerId)

  setChoosingPlayerId(newChoosingPlayerId)

  if (shouldCheckGameOver && checkAllMelodiesGuessed()) {
    console.log("All melodies guessed, showing game over screen")
    showGameOverAfterDelay()
    return
  }

  updateGameInfoWithDelay()

  if (choosingPlayerChanged) {
    console.log("Choosing player changed, updating UI")
    renderCategoriesWithDelay()
  }

  showSystemMessage(`${payload.choosing_player} выбирает следующую мелодию`)
}

export function initializeMelodies(categories) {
  if (categories) {
    categories.forEach((category) => {
      if (category.melodies) {
        category.melodies.forEach((melody) => {
          if (melody.is_guessed === undefined) {
            melody.is_guessed = false
          }
        })
      }
    })
  }
}

export function initializeGameComponents() {
  resetAnsweredPlayers()
  clearAnswersContainerSafely()
}
