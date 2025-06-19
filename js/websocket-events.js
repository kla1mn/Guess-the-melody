import {
  setCurrentCode,
  setCurrentNick,
  setIsHost,
  setGameStarted,
  setChoosingPlayerId,
  setCurrentAnswer,
  setAllPlayersScores,
  updatePlayerMappings,
  setCurrentPlayerId,
  resetAnsweredPlayers,
  markMelodyAsGuessed,
  setCurrentMelody,
  setLastAnsweringPlayer,
  addPlayerToAnswered,
  currentNick,
  isHost,
  currentPlayerId,
  currentAudioPlayer,
  lastAnsweringPlayer,
  checkAllMelodiesGuessed,
  showGameOverAfterDelay,
  getNicknameById,
} from "./game-state.js"
import { renderPlayersList, addPlayerToList, removePlayerFromList } from "./player-list-renderer.js"
import { updateCategoryButtons } from "./category-renderer.js"
import {
  addPlayerAnswer,
  showAnswersContainer,
  hideAnswersContainerWithDelay,
  clearAnswersContainerSafely,
} from "./answer-renderer.js"
import { playMelody } from "./audio-player.js"
import { showGame } from "./ui-manager.js"
import {
  updateGameInfo,
  renderCategoriesWithDelay,
  processAnswer,
  updateChoosingPlayer,
  initializeMelodies,
  initializeGameComponents,
} from "./game-helpers.js"

export function handleEvent(type, payload) {
  try {
    switch (type) {
      case "transfer_master":
        console.log(`Event: ${type}`)
        const isNewHost = payload.nickname === currentNick
        setIsHost(isNewHost)

        const startBtn = document.getElementById("start-btn")
        startBtn.classList.toggle("hidden", !isNewHost)

        const playersListEl = document.getElementById("players-list")
        if (playersListEl) {
          const players = []
          Array.from(playersListEl.children).forEach((li) => {
            const playerSpan = li.querySelector("span")
            let nickname = playerSpan ? playerSpan.textContent.split(" (")[0] : li.textContent.split(" (")[0]

            nickname = nickname.trim()

            const playerId = li.dataset.playerId
            players.push({
              nickname,
              is_master: nickname === payload.nickname,
              id: playerId ? Number(playerId) : null,
            })
          })

          playersListEl.innerHTML = ""
          renderPlayersList(players)
        }
        break

      case "init":
        console.log(`Event: ${type}`)

        setCurrentCode(payload.invite_code)
        setCurrentNick(payload.current_player_nickname)
        document.getElementById("room-code").textContent = payload.invite_code

        if (payload.players && Array.isArray(payload.players)) {
          updatePlayerMappings(payload.players)

          const initialScores = {}
          payload.players.forEach((player) => {
            if (player.nickname) {
              initialScores[player.nickname] = player.points || 0
            }
          })
          setAllPlayersScores(initialScores)

          renderPlayersList(payload.players)

          const currentPlayer = payload.players.find((p) => p.nickname === payload.current_player_nickname)
          if (currentPlayer && currentPlayer.id) {
            console.log("Setting current player ID:", currentPlayer.id)
            setCurrentPlayerId(currentPlayer.id)
          }
        }

        if (payload.state_info && payload.state_info.choosing_player_id) {
          console.log("Setting choosing player from init event:", payload.state_info.choosing_player_id)
          setChoosingPlayerId(payload.state_info.choosing_player_id)

          if (payload.state_info.answer) {
            setCurrentAnswer(payload.state_info.answer)
          }

          if (payload.state_info.game_started) {
            setGameStarted(true)

            if (payload.categories) {
              showGame(payload.categories)
            }
          }
        }
        break

      case "new_player":
        console.log(`Event: ${type}`)
        updatePlayerMappings([{ id: payload.id, nickname: payload.nickname, points: payload.points || 0 }])
        addPlayerToList(payload.nickname, payload.is_master, payload.id)
        break

      case "user_left":
        console.log(`Event: ${type}`)
        removePlayerFromList(payload.nickname)
        break

      case "start_game":
        console.log(`Event: ${type}`)
        document.getElementById("logout-btn").classList.remove("hidden")

        initializeMelodies(payload.categories)
        showGame(payload.categories)
        initializeGameComponents()

        if (payload.state_info && payload.state_info.choosing_player_id) {
          setChoosingPlayerId(payload.state_info.choosing_player_id)
          console.log(
            "Setting choosing player ID:",
            payload.state_info.choosing_player_id,
            "Current player ID:",
            currentPlayerId,
          )

          if (payload.state_info.answer) {
            setCurrentAnswer(payload.state_info.answer)
          }

          setTimeout(() => {
            const choosingPlayerNickname = getNicknameById(payload.state_info.choosing_player_id)
            const isCurrentPlayer = Number(currentPlayerId) === Number(payload.state_info.choosing_player_id)
            updateGameInfo(isCurrentPlayer, choosingPlayerNickname)
            renderCategoriesWithDelay(200)
          }, 200)
        }
        break

      case "pick_melody":
        console.log(`Event: ${type}`)

        resetAnsweredPlayers()

        if (payload.category_name && payload.points) {
          markMelodyAsGuessed(payload.category_name, payload.points)
          updateCategoryButtons()
        }

        clearAnswersContainerSafely()

        if (payload.link) {
          console.log("Playing melody from pick_melody event:", payload.link)
          if (payload.melody) {
            setCurrentAnswer(payload.melody)
          }
          setCurrentMelody({
            name: payload.melody || "",
            link: payload.link,
            points: payload.points || 0,
            category: payload.category || "",
          })

          if (isHost) {
            playMelody(payload.link)
          } else {
            const answerForm = document.getElementById("answer-form")
            if (answerForm) {
              answerForm.classList.remove("hidden")
            }

            const infoEl = document.getElementById("game-info")
            if (infoEl) {
              infoEl.innerHTML = `<p>Мелодия воспроизводится у хоста. Введите ваш ответ!</p>`
            }
          }
        } else {
          console.error("No link in pick_melody payload:", payload)
        }
        break

      case "answer":
        console.log(`Event: ${type}`)

        if (payload.answering_player_nickname && payload.answer) {
          setLastAnsweringPlayer(payload.answering_player_nickname)

          if (isHost && currentAudioPlayer) {
            currentAudioPlayer.pause()

            const notification = document.createElement("div")
            notification.className = "answer-notification"
            notification.textContent = `Получен ответ от ${payload.answering_player_nickname}!`
            notification.style.position = "fixed"
            notification.style.top = "50%"
            notification.style.left = "50%"
            notification.style.transform = "translate(-50%, -50%)"
            notification.style.backgroundColor = "rgba(76, 175, 80, 0.9)"
            notification.style.color = "white"
            notification.style.padding = "20px"
            notification.style.borderRadius = "10px"
            notification.style.zIndex = "1000"
            notification.style.fontWeight = "bold"
            notification.style.fontSize = "24px"
            notification.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)"
            document.body.appendChild(notification)

            setTimeout(() => {
              notification.style.opacity = "0"
              notification.style.transition = "opacity 0.5s"
              setTimeout(() => notification.remove(), 500)
            }, 2000)
          }

          addPlayerToAnswered(payload.answering_player_nickname)
          showAnswersContainer()
          addPlayerAnswer(payload.answering_player_nickname, payload.answer, payload.melody_name)
        }
        break

      case "accept_answer_partially":
        console.log(`Event: ${type}`)
        if (lastAnsweringPlayer) {
          processAnswer(lastAnsweringPlayer, payload.new_points, "Ответ частично принят")
        }

        hideAnswersContainerWithDelay(3000)
        updateChoosingPlayer(payload)

        if (currentAudioPlayer) {
          currentAudioPlayer.play().catch((err) => console.log("Could not resume playback:", err))
        }
        break

      case "accept_answer":
        console.log(`Event: ${type}`)

        processAnswer(payload.choosing_player, payload.new_points, "Ответ принят")
        hideAnswersContainerWithDelay(3000)

        if (window.gameOverTimer) {
          clearTimeout(window.gameOverTimer)
          window.gameOverTimer = null
        }

        if (currentAudioPlayer) {
          currentAudioPlayer.pause()
        }

        if (checkAllMelodiesGuessed()) {
          console.log("All melodies guessed after accept_answer, showing game over screen")
          setTimeout(() => {
            showGameOverAfterDelay()
          }, 100)
        } else {
          updateChoosingPlayer(payload, false)
        }
        break

      case "reject_answer":
        console.log(`Event: ${type}`)
        try {
          if (lastAnsweringPlayer) {
            processAnswer(lastAnsweringPlayer, payload.new_points, "Ответ отклонен")
          }

          hideAnswersContainerWithDelay(3000)
          updateChoosingPlayer(payload)

          if (currentAudioPlayer) {
            currentAudioPlayer.play().catch((err) => console.log("Could not resume playback:", err))
          }
        } catch (error) {
          console.error("Error in reject_answer handler:", error)
        }
        break

      case "exception":
        console.log(`Event: ${type}`)
        const errorMessages = {
          "The game has already begun": "Потерпи, игра уже началась",
          "Game is not started": "Игра еще не началась",
          "Now another player chooses": "Сейчас выбирает другой игрок",
          "Some player has already answered": "Другой игрок уже ответил",
          "This song has been chosen before": "Эту мелодию уже выбирали раньше",
          "User must be a master": "Для этого действия надо быть хостом",
          "There must be at least two players in the game": "В игре должен быть один хост и хотя бы один игрок",
          "At least one player must load the playlist to start the game":
            "Хотя бы один игрок должен загрузить ссылку на плейлист Яндекс.Музыки",
          "This action is not available in the current state": "В данный момент ты не можешь это сделать",
        }

        const message = errorMessages[payload.message] || `Ошибка: ${payload.message}`
        alert(message)

        if (payload.message === "The game has already begun") {
          setGameStarted(true)
        }
        break

      case "heartbeat":
        break

      default:
        console.warn("Unknown event:", type, payload)
    }
  } catch (error) {
    console.error("Error in handleEvent:", error)
  }
}
