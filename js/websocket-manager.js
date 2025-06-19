import { WS_BACKEND } from "./config.js"
import {
    setSocket,
    resetAnsweredPlayers,
    setPlayerScore,
    currentAudioPlayer,
    updatePlayerMappings,
    setCurrentPlayerId,
    setCurrentCode,
    setCurrentNick,
    setChoosingPlayerId,
    setCurrentAnswer,
    setGameStarted,
    setAllPlayersScores,
} from "./game-state.js"
import {
    renderPlayersList,
    playMelody,
    updateScoreDisplay,
    clearAnswersContainer,
    hideAnswersContainerWithDelay,
} from "./ui-renderer.js"
import { showGame } from "./ui-manager.js"

let socket = null

export function connectWebSocket() {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        console.log("WS: уже подключён или в процессе подключения")
        return socket
    }

    console.log("Подключение к вебсокету...")
    socket = new WebSocket(WS_BACKEND)

    socket.addEventListener("open", () => {
        console.log("WS: подключено успешно")
    })

    socket.addEventListener("message", (event) => {
        let msg
        try {
            msg = JSON.parse(event.data)
            console.log(`Получено: ${JSON.stringify(msg)}`)
        } catch (e) {
            console.error("WS: некорректный JSON", event.data, e)
            return
        }
        handleEvent(msg.type, msg.payload)
    })

    socket.addEventListener("error", (e) => {
        console.error("WS: ошибка", e)
    })

    socket.addEventListener("close", (e) => {
        console.log("WS: закрыто соединение", e.reason)
        for (let i = 0; i < 5; i++) {
            setTimeout(connectWebSocket, 2000)
        }
    })

    setSocket(socket)
    return socket
}

function updateGameInfo(isCurrentPlayer, choosingPlayerName) {
    const infoEl = document.getElementById("game-info")
    if (infoEl) {
        if (isCurrentPlayer) {
            infoEl.innerHTML = `<p>Ты выбираешь мелодию</p>`
        } else {
            infoEl.innerHTML = `<p>${choosingPlayerName} выбирает мелодию...</p>`
        }
    }
}

function updateGameInfoWithDelay(delay = 300) {
    setTimeout(() => {
        import("./game-state.js").then(({ isChoosingPlayer, getNicknameById, choosingPlayerId }) => {
            const choosingPlayerName = getNicknameById(choosingPlayerId)
            updateGameInfo(isChoosingPlayer(), choosingPlayerName)
        })
    }, delay)
}

function renderCategoriesWithDelay(delay = 500) {
    setTimeout(() => {
        import("./ui-renderer.js").then(({ renderCategories }) => {
            import("./game-state.js").then(({ gameCategories }) => {
                renderCategories(gameCategories)
            })
        })
    }, delay)
}

function showSystemMessage(text, duration = 3000) {
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

function processAnswer(playerNickname, points, messagePrefix) {
    setPlayerScore(playerNickname, points)
    updateScoreDisplay(playerNickname, points)

    import("./ui-renderer.js").then(({ updateLeaderboardTable }) => {
        updateLeaderboardTable()
    })

    showSystemMessage(`${messagePrefix} игрока ${playerNickname}! Теперь у него ${points} очков`)
}

function updateChoosingPlayer(payload, shouldCheckGameOver = false) {
    import("./game-state.js").then((gameState) => {
        const { setChoosingPlayerId, playerNicknameToId, choosingPlayerId: currentChoosingPlayerId } = gameState
        const newChoosingPlayerId = playerNicknameToId[payload.choosing_player] || payload.choosing_player
        const choosingPlayerChanged = Number(currentChoosingPlayerId) !== Number(newChoosingPlayerId)

        setChoosingPlayerId(newChoosingPlayerId)

        if (shouldCheckGameOver && gameState.checkAllMelodiesGuessed && gameState.checkAllMelodiesGuessed()) {
            console.log("All melodies guessed, showing game over screen")
            gameState.showGameOverAfterDelay()
            return
        }

        updateGameInfoWithDelay()

        if (choosingPlayerChanged) {
            console.log("Choosing player changed, updating UI")
            renderCategoriesWithDelay()
        }

        showSystemMessage(`${payload.choosing_player} выбирает следующую мелодию`)
    })
}

function initializeMelodies(categories) {
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

function initializeGameComponents() {
    resetAnsweredPlayers()
    clearAnswersContainer()

    import("./ui-renderer.js").then(({ initializeLeaderboard }) => {
        initializeLeaderboard()
    })
}

function handleEvent(type, payload) {
    try {
        switch (type) {
            case "transfer_master":
                console.log(`Event: ${type}`)
                import("./game-state.js").then(({ currentNick, setIsHost }) => {
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
                        import("./ui-renderer.js").then(({ renderPlayersList }) => {
                            renderPlayersList(players)
                        })
                    }
                })
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
                import("./ui-renderer.js").then(({ addPlayerToList }) => {
                    addPlayerToList(payload.nickname, payload.is_master, payload.id)
                })
                break

            case "user_left":
                console.log(`Event: ${type}`)
                import("./ui-renderer.js").then(({ removePlayerFromList }) => {
                    removePlayerFromList(payload.nickname)
                })
                break

            case "start_game":
                console.log(`Event: ${type}`)
                document.getElementById("logout-btn").classList.remove("hidden")

                initializeMelodies(payload.categories)
                showGame(payload.categories)
                initializeGameComponents()

                if (payload.state_info && payload.state_info.choosing_player_id) {
                    import("./game-state.js").then(
                        ({ setChoosingPlayerId, setCurrentAnswer, getNicknameById, currentPlayerId }) => {
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
                        },
                    )
                }
                break

            case "pick_melody":
                console.log(`Event: ${type}`)

                resetAnsweredPlayers()

                if (payload.category_name && payload.points) {
                    import("./game-state.js").then(({ markMelodyAsGuessed }) => {
                        markMelodyAsGuessed(payload.category_name, payload.points)

                        import("./ui-renderer.js").then(({ updateCategoryButtons }) => {
                            updateCategoryButtons()
                        })
                    })
                }
                clearAnswersContainer()

                if (payload.link) {
                    console.log("Playing melody from pick_melody event:", payload.link)
                    import("./game-state.js").then(({ setCurrentAnswer, setCurrentMelody, isHost }) => {
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
                    })
                } else {
                    console.error("No link in pick_melody payload:", payload)
                }
                break

            case "answer":
                console.log(`Event: ${type}`)

                if (payload.answering_player_nickname && payload.answer) {
                    import("./game-state.js").then(({ isHost, currentAudioPlayer, setLastAnsweringPlayer }) => {
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
                    })

                    import("./ui-renderer.js").then(({ addPlayerAnswer, showAnswersContainer }) => {
                        import("./game-state.js").then(({ addPlayerToAnswered }) => {
                            addPlayerToAnswered(payload.answering_player_nickname)
                            showAnswersContainer()
                            console.log(
                                "Calling addPlayerAnswer with:",
                                payload.answering_player_nickname,
                                payload.answer,
                                payload.melody_name,
                            )
                            addPlayerAnswer(payload.answering_player_nickname, payload.answer, payload.melody_name)
                        })
                    })
                }
                break

            case "accept_answer_partially":
                console.log(`Event: ${type}`)
                import("./game-state.js").then(({ lastAnsweringPlayer }) => {
                    if (lastAnsweringPlayer) {
                        processAnswer(lastAnsweringPlayer, payload.new_points, "Ответ частично принят")
                    }
                })

                // Скрываем контейнер с ответами через 3 секунды
                hideAnswersContainerWithDelay(3000)

                updateChoosingPlayer(payload)

                if (currentAudioPlayer) {
                    currentAudioPlayer.play().catch((err) => console.log("Could not resume playback:", err))
                }
                break

            case "accept_answer":
                console.log(`Event: ${type}`)

                // Сначала обновляем счет игрока
                processAnswer(payload.choosing_player, payload.new_points, "Ответ принят")

                // Скрываем контейнер с ответами через 3 секунды
                hideAnswersContainerWithDelay(3000)

                if (window.gameOverTimer) {
                    clearTimeout(window.gameOverTimer)
                    window.gameOverTimer = null
                }

                if (currentAudioPlayer) {
                    currentAudioPlayer.pause()
                }

                // Затем проверяем, закончилась ли игра, и только потом обновляем выбирающего игрока
                import("./game-state.js").then((gameState) => {
                    if (gameState.checkAllMelodiesGuessed && gameState.checkAllMelodiesGuessed()) {
                        console.log("All melodies guessed after accept_answer, showing game over screen")
                        // Небольшая задержка, чтобы UI успел обновиться
                        setTimeout(() => {
                            gameState.showGameOverAfterDelay()
                        }, 100)
                    } else {
                        // Если игра не закончилась, обновляем выбирающего игрока
                        updateChoosingPlayer(payload, false)
                    }
                })
                break

            case "reject_answer":
                console.log(`Event: ${type}`)
                try {
                    import("./game-state.js").then(({ lastAnsweringPlayer }) => {
                        if (lastAnsweringPlayer) {
                            processAnswer(lastAnsweringPlayer, payload.new_points, "Ответ отклонен")
                        }
                    })

                    // Скрываем контейнер с ответами через 3 секунды
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
                }

                const message = errorMessages[payload.message] || `Ошибка: ${payload.message}`
                alert(message)

                if (payload.message === "The game has already begun") {
                    import("./game-state.js").then(({ setGameStarted }) => {
                        setGameStarted(true)
                    })
                }
                break

            case "heartbeat":
                break

            default:
                console.warn("Неизвестный ивент:", type, payload)
        }
    } catch (error) {
        console.error("Error in handleEvent:", error)
    }
}

export function transferHost(nickname) {
    if (!socket) {
        console.error("Сокет не подключен")
        return
    }

    console.log("Новый хост - ", nickname)
    socket.send(
        JSON.stringify({
            type: "transfer_master",
            payload: {
                nickname: nickname,
            },
        }),
    )
}
