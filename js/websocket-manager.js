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

        const eventType = msg.type
        const payload = msg.payload

        handleEvent(eventType, payload)
    })

    socket.addEventListener("error", (e) => {
        console.error("WS: ошибка", e)
    })

    socket.addEventListener("close", () => {
        console.log("WS: закрытие соединения")
        //TODO переподключаться
    })

    setSocket(socket)
    return socket
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
                                id: playerId,
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
                console.log(`Event: ${type}`)
                if (payload.id && payload.nickname) {
                    updatePlayerMappings([{ id: payload.id, nickname: payload.nickname, points: 0 }])
                }
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

                if (payload.state_info && payload.state_info.choosing_player_id) {
                    const choosingPlayerId = payload.state_info.choosing_player_id

                    import("./game-state.js").then(
                        ({ setChoosingPlayerId, setCurrentAnswer, getNicknameById, currentNick, currentPlayerId }) => {
                            setChoosingPlayerId(choosingPlayerId)

                            console.log("Setting choosing player ID:", choosingPlayerId, "Current player ID:", currentPlayerId)

                            if (payload.state_info.answer) {
                                setCurrentAnswer(payload.state_info.answer)
                            }

                            // Make sure we preserve the is_guessed state of melodies
                            if (payload.categories) {
                                // Ensure all categories have the is_guessed property for each melody
                                payload.categories.forEach((category) => {
                                    if (category.melodies) {
                                        category.melodies.forEach((melody) => {
                                            if (melody.is_guessed === undefined) {
                                                melody.is_guessed = false
                                            }
                                        })
                                    }
                                })
                            }

                            showGame(payload.categories)
                            resetAnsweredPlayers()

                            import("./ui-renderer.js").then(({ clearAnswersContainer }) => {
                                clearAnswersContainer()
                            })

                            import("./ui-renderer.js").then(({ initializeLeaderboard }) => {
                                initializeLeaderboard()
                            })

                            setTimeout(() => {
                                const infoEl = document.getElementById("game-info")
                                if (infoEl) {
                                    const choosingPlayerNickname = getNicknameById(choosingPlayerId)
                                    if (String(currentPlayerId) === String(choosingPlayerId)) {
                                        infoEl.innerHTML = `<p>Ты выбираешь мелодию</p>`
                                    } else {
                                        infoEl.innerHTML = `<p>${choosingPlayerNickname} выбирает мелодию...</p>`
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
                    // Make sure we preserve the is_guessed state of melodies
                    if (payload.categories) {
                        // Ensure all categories have the is_guessed property for each melody
                        payload.categories.forEach((category) => {
                            if (category.melodies) {
                                category.melodies.forEach((melody) => {
                                    if (melody.is_guessed === undefined) {
                                        melody.is_guessed = false
                                    }
                                })
                            }
                        })
                    }

                    showGame(payload.categories)
                    resetAnsweredPlayers()

                    import("./ui-renderer.js").then(({ clearAnswersContainer }) => {
                        clearAnswersContainer()
                    })

                    import("./ui-renderer.js").then(({ initializeLeaderboard }) => {
                        initializeLeaderboard()
                    })
                }
                break

            case "pick_melody":
                console.log(`Event: ${type}`)

                resetAnsweredPlayers()

                // Mark the melody as guessed in our local state
                if (payload.category_name && payload.points) {
                    import("./game-state.js").then(({ markMelodyAsGuessed }) => {
                        markMelodyAsGuessed(payload.category_name, payload.points)

                        // Update the UI to reflect the guessed melody
                        import("./ui-renderer.js").then(({ updateCategoryButtons }) => {
                            updateCategoryButtons()
                        })
                    })
                }
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
                console.log(`Event: ${type}`)

                if (payload.answering_player_nickname && payload.answer) {
                    import("./game-state.js").then(({ isHost, currentAudioPlayer, markMelodyAsGuessed }) => {
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

                    import("./ui-renderer.js").then(({ addPlayerAnswer, showAnswersContainer, updateCategoryButtons }) => {
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
                if (payload.answered_players_nicknames && payload.answered_players_nicknames.length > 0) {
                    const lastPlayerNickname = payload.answered_players_nicknames[payload.answered_players_nicknames.length - 1]

                    setPlayerScore(lastPlayerNickname, payload.new_points)
                    updateScoreDisplay(lastPlayerNickname, payload.new_points)

                    import("./ui-renderer.js").then(({ updateLeaderboardTable }) => {
                        updateLeaderboardTable()
                    })

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
                import("./game-state.js").then(
                    ({ setChoosingPlayerId, playerNicknameToId, choosingPlayerId: currentChoosingPlayerId }) => {
                        const newChoosingPlayerId = playerNicknameToId[payload.choosing_player] || payload.choosing_player

                        const choosingPlayerChanged = String(currentChoosingPlayerId) !== String(newChoosingPlayerId)

                        setChoosingPlayerId(newChoosingPlayerId)

                        if (choosingPlayerChanged) {
                            console.log("Choosing player changed, updating UI")
                            setTimeout(() => {
                                const infoEl = document.getElementById("game-info")
                                if (infoEl) {
                                    import("./game-state.js").then(({ isChoosingPlayer, getNicknameById, choosingPlayerId }) => {
                                        if (isChoosingPlayer()) {
                                            infoEl.innerHTML = `<p>Ты выбираешь мелодию</p>`
                                        } else {
                                            const choosingPlayerName = getNicknameById(choosingPlayerId)
                                            infoEl.innerHTML = `<p>${choosingPlayerName} выбирает мелодию...</p>`
                                        }
                                    })
                                }
                            }, 300)

                            setTimeout(() => {
                                import("./ui-renderer.js").then(({ renderCategories }) => {
                                    import("./game-state.js").then(({ gameCategories }) => {
                                        renderCategories(gameCategories)
                                    })
                                })
                            }, 500)
                        }

                        const nextMessage = document.createElement("div")
                        nextMessage.className = "system-message"
                        nextMessage.textContent = `${payload.choosing_player} выбирает следующую мелодию`

                        const answersContainer = document.getElementById("answers-container")
                        if (answersContainer) {
                            answersContainer.appendChild(nextMessage)

                            setTimeout(() => {
                                nextMessage.style.opacity = "0"
                                nextMessage.style.transition = "opacity 0.5s"
                                setTimeout(() => nextMessage.remove(), 500)
                            }, 3000)
                        }
                    },
                )

                if (currentAudioPlayer) {
                    currentAudioPlayer.play().catch((err) => console.log("Could not resume playback:", err))
                }

                break

            case "accept_answer":
                console.log(`Event: ${type}`)
                const lastPlayerNickname = payload.choosing_player

                setPlayerScore(lastPlayerNickname, payload.new_points)
                updateScoreDisplay(lastPlayerNickname, payload.new_points)

                import("./ui-renderer.js").then(({ updateLeaderboardTable }) => {
                    updateLeaderboardTable()
                })

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

                // Clear any existing game over timer
                if (window.gameOverTimer) {
                    clearTimeout(window.gameOverTimer)
                    window.gameOverTimer = null
                }

                import("./game-state.js").then(
                    ({
                         setChoosingPlayerId,
                         playerNicknameToId,
                         choosingPlayerId: currentChoosingPlayerId,
                         checkAllMelodiesGuessed,
                         showGameOverAfterDelay,
                     }) => {
                        const newChoosingPlayerId = playerNicknameToId[payload.choosing_player] || payload.choosing_player

                        const choosingPlayerChanged = String(currentChoosingPlayerId) !== String(newChoosingPlayerId)

                        setChoosingPlayerId(newChoosingPlayerId)

                        // Check if all melodies are guessed after accepting this answer
                        if (checkAllMelodiesGuessed()) {
                            console.log("All melodies guessed after accepting answer, showing game over screen")
                            showGameOverAfterDelay()
                            return // Skip the rest of the function
                        }

                        if (choosingPlayerChanged) {
                            console.log("Choosing player changed, updating UI")
                            setTimeout(() => {
                                const infoEl = document.getElementById("game-info")
                                if (infoEl) {
                                    import("./game-state.js").then(({ isChoosingPlayer, getNicknameById, choosingPlayerId }) => {
                                        if (isChoosingPlayer()) {
                                            infoEl.innerHTML = `<p>Ты выбираешь мелодию</p>`
                                        } else {
                                            const choosingPlayerName = getNicknameById(choosingPlayerId)
                                            infoEl.innerHTML = `<p>${choosingPlayerName} выбирает мелодию...</p>`
                                        }
                                    })
                                }
                            }, 300)

                            setTimeout(() => {
                                import("./ui-renderer.js").then(({ renderCategories }) => {
                                    import("./game-state.js").then(({ gameCategories }) => {
                                        renderCategories(gameCategories)
                                    })
                                })
                            }, 500)
                        }

                        const nextMessage = document.createElement("div")
                        nextMessage.className = "system-message"
                        nextMessage.textContent = `${payload.choosing_player} выбирает следующую мелодию`

                        const answersContainer = document.getElementById("answers-container")
                        if (answersContainer) {
                            answersContainer.appendChild(nextMessage)

                            setTimeout(() => {
                                nextMessage.style.opacity = "0"
                                nextMessage.style.transition = "opacity 0.5s"
                                setTimeout(() => nextMessage.remove(), 500)
                            }, 3000)
                        }
                    },
                )

                if (currentAudioPlayer) {
                    currentAudioPlayer.pause()
                }

                break

            case "reject_answer":
                console.log(`Event: ${type}`)
                try {
                    if (payload.answered_players_nicknames && payload.answered_players_nicknames.length > 0) {
                        const lastPlayerNickname = payload.answered_players_nicknames[payload.answered_players_nicknames.length - 1]

                        setPlayerScore(lastPlayerNickname, payload.new_points)
                        updateScoreDisplay(lastPlayerNickname, payload.new_points)

                        import("./ui-renderer.js").then(({ updateLeaderboardTable }) => {
                            updateLeaderboardTable()
                        })

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
                    import("./game-state.js").then(
                        ({ setChoosingPlayerId, playerNicknameToId, choosingPlayerId: currentChoosingPlayerId }) => {
                            const newChoosingPlayerId = playerNicknameToId[payload.choosing_player] || payload.choosing_player

                            const choosingPlayerChanged = String(currentChoosingPlayerId) !== String(newChoosingPlayerId)

                            setChoosingPlayerId(newChoosingPlayerId)

                            if (choosingPlayerChanged) {
                                console.log("Choosing player changed, updating UI")
                                setTimeout(() => {
                                    const infoEl = document.getElementById("game-info")
                                    if (infoEl) {
                                        import("./game-state.js").then(({ isChoosingPlayer, getNicknameById, choosingPlayerId }) => {
                                            if (isChoosingPlayer()) {
                                                infoEl.innerHTML = `<p>Ты выбираешь мелодию</p>`
                                            } else {
                                                const choosingPlayerName = getNicknameById(choosingPlayerId)
                                                infoEl.innerHTML = `<p>${choosingPlayerName} выбирает мелодию...</p>`
                                            }
                                        })
                                    }
                                }, 300)

                                setTimeout(() => {
                                    import("./ui-renderer.js").then(({ renderCategories }) => {
                                        import("./game-state.js").then(({ gameCategories }) => {
                                            renderCategories(gameCategories)
                                        })
                                    })
                                }, 500)
                            }

                            const nextMessage = document.createElement("div")
                            nextMessage.className = "system-message"
                            nextMessage.textContent = `${payload.choosing_player} выбирает следующую мелодию`

                            const answersContainer = document.getElementById("answers-container")
                            if (answersContainer) {
                                answersContainer.appendChild(nextMessage)

                                setTimeout(() => {
                                    nextMessage.style.opacity = "0"
                                    message.style.transition = "opacity 0.5s"
                                    setTimeout(() => nextMessage.remove(), 500)
                                }, 3000)
                            }
                        },
                    )
                    if (currentAudioPlayer) {
                        currentAudioPlayer.play().catch((err) => console.log("Could not resume playback:", err))
                    }
                } catch (error) {
                    console.error("Error in reject_answer handler:", error)
                }
                break

            case "exception":
                console.log(`Event: ${type}`)
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

function transferHost(nickname) {
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

export { connectWebSocket, transferHost }
