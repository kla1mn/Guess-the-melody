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
import { renderPlayersList, playMelody, updateScoreDisplay, clearAnswersContainer } from "./ui-renderer.js"
import { showGame } from "./ui-manager.js"

let socket

function connectWebSocket() {
    console.log("Connecting to WebSocket...")
    socket = new WebSocket(WS_BACKEND)

    socket.addEventListener("open", () => {
        console.log("WS: connected successfully")
    })

    socket.addEventListener("message", (event) => {
        console.log("WS: received message", event.data)
        let msg
        try {
            msg = JSON.parse(event.data)
        } catch (e) {
            console.error("WS: некорректный JSON", event.data, e)
            return
        }

        console.log("Received raw message:", msg)

        let eventType, payload

        if (msg.type && msg.payload) {
            eventType = msg.type
            payload = msg.payload
        } else {
            console.error("Неизвестный формат сообщения:", msg)
            return
        }

        handleEvent(eventType, payload)
    })

    socket.addEventListener("error", (e) => {
        console.error("WS error", e)
    })

    setSocket(socket)
    return socket
}

function handleEvent(type, payload) {
    console.log("Handling event:", type, payload)

    try {
        switch (type) {
            case "heartbeat":
                alert('heartbeat')
                break
            case "init":
                console.log("init event with payload:", payload)

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
                }

                const currentPlayer = payload.players.find((p) => p.nickname === payload.current_player_nickname)
                if (currentPlayer && currentPlayer.id) {
                    console.log("Setting current player ID:", currentPlayer.id)
                    setCurrentPlayerId(currentPlayer.id.toString())
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
                console.log("new_player")
                if (payload.id && payload.nickname) {
                    updatePlayerMappings([{ id: payload.id, nickname: payload.nickname, points: 0 }])
                }
                import("./ui-renderer.js").then(({ addPlayerToList }) => {
                    addPlayerToList(payload.nickname, payload.is_master, payload.id)
                })
                break

            case "user_left":
                import("./ui-renderer.js").then(({ removePlayerFromList }) => {
                    removePlayerFromList(payload.nickname)
                })
                break

            case "start_game":
                console.log("start_game received with payload:", payload)

                document.getElementById("logout-btn").classList.remove("hidden")

                if (payload.state_info && payload.state_info.choosing_player_id) {
                    const choosingPlayerId = payload.state_info.choosing_player_id

                    import("./game-state.js").then(
                        ({ setChoosingPlayerId, setCurrentAnswer, getNicknameById, currentNick, currentPlayerId }) => {
                            setChoosingPlayerId(choosingPlayerId)

                            console.log("Setting choosing player ID:", choosingPlayerId, "Current player ID:", currentPlayerId)

                            if (payload.state_info.answer) {
                                setCurrentAnswer(payload.state_info.answer)
                            }

                            showGame(payload.categories)
                            resetAnsweredPlayers()
                            clearAnswersContainer()

                            setTimeout(() => {
                                const infoEl = document.getElementById("game-info")
                                if (infoEl) {
                                    const choosingPlayerNickname = getNicknameById(choosingPlayerId)
                                    if (String(currentPlayerId) === String(choosingPlayerId)) {
                                        infoEl.innerHTML = `<p>Вы выбираете категорию и мелодию.</p>`
                                    } else {
                                        infoEl.innerHTML = `<p>Игрок ${choosingPlayerNickname} выбирает мелодию...</p>`
                                    }
                                }

                                import("./ui-renderer.js").then(({ renderCategories }) => {
                                    import("./game-state.js").then(({ gameCategories }) => {
                                        renderCategories(gameCategories)
                                    })
                                })
                            }, 200)
                        },
                    )
                } else {
                    showGame(payload.categories)
                    resetAnsweredPlayers()
                    clearAnswersContainer()
                }
                break

            case "pick_melody":
                console.log("pick_melody received:", payload)

                resetAnsweredPlayers()
                clearAnswersContainer()

                if (payload.link) {
                    console.log("Playing melody from pick_melody event:", payload.link)
                    import("./game-state.js").then(({ setCurrentAnswer, setCurrentMelody }) => {
                        if (payload.melody) {
                            setCurrentAnswer(payload.melody)
                        }
                        setCurrentMelody({
                            name: payload.melody || "",
                            link: payload.link,
                            points: payload.points || 0,
                            category: payload.category || "",
                        })
                    })

                    import("./game-state.js").then(({ isHost, currentNick, isChoosingPlayer }) => {
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
                console.log("answer event received with full payload:", payload)

                if (payload.answering_player_nickname && payload.answer) {
                    import("./game-state.js").then(({ isHost, currentAudioPlayer }) => {
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
                console.log("accept_answer_partially", payload)
                try {
                    if (payload.answered_players_nicknames && payload.answered_players_nicknames.length > 0) {
                        const lastPlayerNickname = payload.answered_players_nicknames[payload.answered_players_nicknames.length - 1]

                        setPlayerScore(lastPlayerNickname, payload.new_points)
                        updateScoreDisplay(lastPlayerNickname, payload.new_points)

                        const leaderboardModal = document.querySelector(".leaderboard-modal")
                        if (leaderboardModal) {
                            import("./ui-renderer.js").then(({ updateLeaderboardTable }) => {
                                updateLeaderboardTable(leaderboardModal)
                            })
                        }

                        const existingMessages = document.querySelectorAll(".system-message")
                        let isDuplicate = false
                        existingMessages.forEach((msg) => {
                            if (msg.textContent.includes(`Ответ игрока ${lastPlayerNickname} частично принят!`)) {
                                isDuplicate = true
                            }
                        })

                        if (!isDuplicate) {
                            const message = document.createElement("div")
                            message.className = "system-message"
                            message.textContent = `Ответ игрока ${lastPlayerNickname} частично принят! Теперь у него ${payload.new_points} очков`

                            const answersContainer = document.getElementById("answers-container")
                            if (answersContainer) {
                                answersContainer.appendChild(message)

                                setTimeout(() => {
                                    message.style.opacity = "0"
                                    message.style.transition = "opacity 0.5s"
                                    setTimeout(() => message.remove(), 500)
                                }, 3000)
                            }
                        }
                    }

                    if (payload.choosing_player) {
                        import("./game-state.js").then(({ setChoosingPlayerId, playerNicknameToId }) => {
                            const choosingPlayerId = playerNicknameToId[payload.choosing_player]
                            if (choosingPlayerId) {
                                setChoosingPlayerId(choosingPlayerId)
                            } else {
                                setChoosingPlayerId(payload.choosing_player)
                            }
                        })
                    }

                    if (currentAudioPlayer) {
                        currentAudioPlayer.play().catch((err) => console.log("Could not resume playback:", err))
                    }
                } catch (error) {
                    console.error("Error in accept_answer_partially handler:", error)
                }
                break

            case "accept_answer":
                console.log("accept_answer", payload)
                try {
                    if (payload.answered_players_nicknames && payload.answered_players_nicknames.length > 0) {
                        const lastPlayerNickname = payload.answered_players_nicknames[payload.answered_players_nicknames.length - 1]

                        setPlayerScore(lastPlayerNickname, payload.new_points)
                        updateScoreDisplay(lastPlayerNickname, payload.new_points)

                        const leaderboardModal = document.querySelector(".leaderboard-modal")
                        if (leaderboardModal) {
                            import("./ui-renderer.js").then(({ updateLeaderboardTable }) => {
                                updateLeaderboardTable(leaderboardModal)
                            })
                        }

                        const existingMessages = document.querySelectorAll(".system-message")
                        let isDuplicate = false
                        existingMessages.forEach((msg) => {
                            if (msg.textContent.includes(`Ответ игрока ${lastPlayerNickname} принят!`)) {
                                isDuplicate = true
                            }
                        })

                        if (!isDuplicate) {
                            const message = document.createElement("div")
                            message.className = "system-message"
                            message.textContent = `Ответ игрока ${lastPlayerNickname} принят! Теперь у него ${payload.new_points} очков`

                            const answersContainer = document.getElementById("answers-container")
                            if (answersContainer) {
                                answersContainer.appendChild(message)

                                setTimeout(() => {
                                    message.style.opacity = "0"
                                    message.style.transition = "opacity 0.5s"
                                    setTimeout(() => message.remove(), 500)
                                }, 3000)
                            }
                        }
                    }

                    if (payload.choosing_player) {
                        import("./game-state.js").then(({ setChoosingPlayerId, playerNicknameToId }) => {
                            const choosingPlayerId = playerNicknameToId[payload.choosing_player]
                            if (choosingPlayerId) {
                                setChoosingPlayerId(choosingPlayerId)
                            } else {
                                setChoosingPlayerId(payload.choosing_player)
                            }

                            const nextMessage = document.createElement("div")
                            nextMessage.className = "system-message"
                            nextMessage.textContent = `Игрок ${payload.choosing_player} выбирает следующую мелодию`

                            const answersContainer = document.getElementById("answers-container")
                            if (answersContainer) {
                                answersContainer.appendChild(nextMessage)

                                setTimeout(() => {
                                    nextMessage.style.opacity = "0"
                                    nextMessage.style.transition = "opacity 0.5s"
                                    setTimeout(() => nextMessage.remove(), 500)
                                }, 3000)
                            }

                            import("./ui-renderer.js").then(({ renderCategories }) => {
                                import("./game-state.js").then(({ gameCategories }) => {
                                    renderCategories(gameCategories)
                                })
                            })
                        })
                    }

                    if (currentAudioPlayer) {
                        currentAudioPlayer.pause()
                    }
                } catch (error) {
                    console.error("Error in accept_answer handler:", error)
                }
                break

            case "reject_answer":
                console.log("reject_answer", payload)
                try {
                    if (payload.answered_players_nicknames && payload.answered_players_nicknames.length > 0) {
                        const lastPlayerNickname = payload.answered_players_nicknames[payload.answered_players_nicknames.length - 1]

                        setPlayerScore(lastPlayerNickname, payload.new_points)
                        updateScoreDisplay(lastPlayerNickname, payload.new_points)

                        const leaderboardModal = document.querySelector(".leaderboard-modal")
                        if (leaderboardModal) {
                            import("./ui-renderer.js").then(({ updateLeaderboardTable }) => {
                                updateLeaderboardTable(leaderboardModal)
                            })
                        }

                        const existingMessages = document.querySelectorAll(".system-message")
                        let isDuplicate = false
                        existingMessages.forEach((msg) => {
                            if (msg.textContent.includes(`Ответ игрока ${lastPlayerNickname} отклонен!`)) {
                                isDuplicate = true
                            }
                        })

                        if (!isDuplicate) {
                            const message = document.createElement("div")
                            message.className = "system-message"
                            message.textContent = `Ответ игрока ${lastPlayerNickname} отклонен! Теперь у него ${payload.new_points} очков`

                            const answersContainer = document.getElementById("answers-container")
                            if (answersContainer) {
                                answersContainer.appendChild(message)

                                setTimeout(() => {
                                    message.style.opacity = "0"
                                    message.style.transition = "opacity 0.5s"
                                    setTimeout(() => message.remove(), 500)
                                }, 3000)
                            }
                        }
                    }

                    if (currentAudioPlayer) {
                        currentAudioPlayer.play().catch((err) => console.log("Could not resume playback:", err))
                    }
                } catch (error) {
                    console.error("Error in reject_answer handler:", error)
                }
                break

            case "exception":
                console.log("exception", payload)
                if (payload.message === "The game has already begun") {
                    alert("Потерпи, игра уже началась")

                    import("./game-state.js").then(({ setGameStarted }) => {
                        setGameStarted(true)
                    })
                } else {
                    alert(`Ошибка: ${payload.message}`)
                }
                break

            default:
                console.warn("Неизвестный ивент:", type, payload)
        }
    } catch (error) {
        console.error("Error in handleEvent:", error)
    }
}

export { connectWebSocket }
