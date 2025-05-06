import { WS_BACKEND } from "./config.js"
import { setSocket, resetAnsweredPlayers, updatePlayerScore, currentAudioPlayer } from "./game-state.js"
import { renderPlayersList, playMelody, updateScoreDisplay, clearAnswersContainer } from "./ui-renderer.js"
import { showGame } from "./ui-manager.js"

let socket // Declare socket here

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

    socket.addEventListener("close", (event) => {
        console.log("WS: closed", event)
        setTimeout(() => {
            console.log("WS: attempting to reconnect...")
            connectWebSocket()
        }, 2000)
    })

    socket.addEventListener("error", (e) => {
        console.error("WS error", e)
    })

    setSocket(socket)
    return socket
}

function handleEvent(type, payload) {
    console.log("Handling event:", type, payload)

    switch (type) {
        // Обновляем обработчик события init, чтобы сохранять ID игрока
        case "init":
            console.log("init event with payload:", payload)
            import("./game-state.js").then(
                ({
                     setCurrentCode,
                     setCurrentNick,
                     gameStarted,
                     setChoosingPlayerId,
                     setCurrentAnswer,
                     setCurrentPlayerId,
                     setGameStarted,
                 }) => {
                    setCurrentCode(payload.invite_code)
                    setCurrentNick(payload.current_player_nickname)
                    document.getElementById("room-code").textContent = payload.invite_code

                    // Сохраняем список игроков и их ID
                    renderPlayersList(payload.players)

                    // Находим текущего игрока в списке и сохраняем его ID
                    const currentPlayer = payload.players.find((p) => p.nickname === payload.current_player_nickname)
                    if (currentPlayer && currentPlayer.id) {
                        console.log("Setting current player ID:", currentPlayer.id)
                        setCurrentPlayerId(currentPlayer.id.toString())
                    }

                    // Проверяем, есть ли информация о выбирающем игроке в state_info
                    if (payload.state_info && payload.state_info.choosing_player_id) {
                        console.log("Setting choosing player from init event:", payload.state_info.choosing_player_id)
                        setChoosingPlayerId(payload.state_info.choosing_player_id)

                        // Если есть информация о текущем ответе, сохраняем его
                        if (payload.state_info.answer) {
                            setCurrentAnswer(payload.state_info.answer)
                        }

                        // Если игра уже началась, устанавливаем флаг
                        if (payload.state_info.game_started) {
                            setGameStarted(true)
                        }
                    }
                },
            )
            break

        // Обработчик для получения состояния игры
        case "game_state":
            console.log("game_state received:", payload)
            if (payload.categories) {
                import("./game-state.js").then(({ gameStarted }) => {
                    if (gameStarted) {
                        showGame(payload.categories)
                    }
                })
            }
            break

        case "new_player":
            console.log("new_player")
            import("./ui-renderer.js").then(({ addPlayerToList }) => {
                // Обновляем маппинг ID игроков к никнеймам
                if (payload.id && payload.nickname) {
                    import("./game-state.js").then(({ updatePlayerMappings }) => {
                        updatePlayerMappings([{ id: payload.id, nickname: payload.nickname }])
                    })
                }

                addPlayerToList(payload.nickname, payload.is_master)
            })
            break

        case "user_left":
            import("./ui-renderer.js").then(({ removePlayerFromList }) => {
                removePlayerFromList(payload.nickname)
            })
            break

        // Обработчик события start_game
        case "start_game":
            console.log("start_game received with payload:", payload)

            // Устанавливаем игрока, который выбирает мелодию
            if (payload.state_info && payload.state_info.choosing_player_id) {
                // Получаем ID игрока, который выбирает мелодию
                const choosingPlayerId = payload.state_info.choosing_player_id

                // Сохраняем ID выбирающего игрока
                import("./game-state.js").then(({ setChoosingPlayerId, setCurrentAnswer, getNicknameById, currentNick }) => {
                    // Сохраняем ID
                    setChoosingPlayerId(choosingPlayerId)

                    // Если есть информация о текущем ответе, сохраняем его
                    if (payload.state_info.answer) {
                        setCurrentAnswer(payload.state_info.answer)
                    }

                    // Обновляем интерфейс для отображения выбирающего игрока
                    const infoEl = document.getElementById("game-info")
                    if (infoEl) {
                        const choosingPlayerNickname = getNicknameById(choosingPlayerId)
                        if (choosingPlayerNickname === currentNick) {
                            infoEl.innerHTML = `<p>Вы выбираете мелодию. Выберите категорию и мелодию.</p>`
                        } else {
                            infoEl.innerHTML = `<p>Игрок ${choosingPlayerNickname} выбирает мелодию...</p>`
                        }
                    }
                })
            }

            // Показываем игровой экран и сохраняем состояние
            showGame(payload.categories)

            // Сбрасываем список ответивших игроков для нового раунда
            resetAnsweredPlayers()

            // Очищаем контейнер ответов
            clearAnswersContainer()
            break

        // Обработчик события pick_melody
        case "pick_melody":
            console.log("pick_melody received:", payload)

            // Сбрасываем список ответивших игроков для нового раунда
            resetAnsweredPlayers()
            // Очищаем контейнер ответов
            clearAnswersContainer()

            if (payload.link) {
                console.log("Playing melody from pick_melody event:", payload.link)

                // Сохраняем текущий ответ, если он есть в payload
                if (payload.melody) {
                    import("./game-state.js").then(({ setCurrentAnswer }) => {
                        setCurrentAnswer(payload.melody)
                    })
                }

                // Только хост автоматически воспроизводит мелодию
                import("./game-state.js").then(({ isHost, currentNick, isChoosingPlayer }) => {
                    if (isHost) {
                        playMelody(payload.link, payload.start_time, payload.end_time)
                    } else if (!isChoosingPlayer()) {
                        // Для остальных игроков (кроме выбирающего) показываем кнопку "Ответить"
                        const answerForm = document.getElementById("answer-form")
                        if (answerForm) {
                            answerForm.classList.remove("hidden")
                        }

                        // Показываем сообщение о том, что мелодия воспроизводится
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

        // Обработчик события answer
        case "answer":
            console.log("answer event received with full payload:", payload)

            // Отображение ответа игрока
            if (payload.answering_player_nickname && payload.answer) {
                // Останавливаем воспроизведение музыки, если это хост
                import("./game-state.js").then(({ isHost, currentAudioPlayer }) => {
                    if (isHost && currentAudioPlayer) {
                        currentAudioPlayer.pause()

                        // Показываем уведомление о полученном ответе
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

                        // Удаляем уведомление через 2 секунды
                        setTimeout(() => {
                            notification.style.opacity = "0"
                            notification.style.transition = "opacity 0.5s"
                            setTimeout(() => notification.remove(), 500)
                        }, 2000)
                    }
                })

                // Добавляем ответ в интерфейс немедленно
                import("./ui-renderer.js").then(({ addPlayerAnswer, showAnswersContainer }) => {
                    import("./game-state.js").then(({ addPlayerToAnswered }) => {
                        // Добавляем игрока в список ответивших
                        addPlayerToAnswered(payload.answering_player_nickname)

                        // Показываем контейнер ответов
                        showAnswersContainer()

                        // Добавляем ответ в интерфейс
                        console.log(
                            "Calling addPlayerAnswer with:",
                            payload.answering_player_nickname,
                            payload.answer,
                            payload.melody_name,
                        )
                        addPlayerAnswer(payload.answering_player_nickname, payload.answer, payload.melody_name)
                    })
                })
            } else if (payload.nickname && payload.answer) {
                // Альтернативный формат данных
                import("./ui-renderer.js").then(({ addPlayerAnswer, showAnswersContainer }) => {
                    import("./game-state.js").then(({ addPlayerToAnswered, currentAnswer }) => {
                        // Добавляем игрока в список ответивших
                        addPlayerToAnswered(payload.nickname)

                        // Показываем контейнер ответов
                        showAnswersContainer()

                        // Добавляем ответ в интерфейс
                        console.log(
                            "Calling addPlayerAnswer with alternative format:",
                            payload.nickname,
                            payload.answer,
                            currentAnswer,
                        )
                        addPlayerAnswer(payload.nickname, payload.answer, currentAnswer)
                    })
                })
            }
            break

        case "accept_answer_partially":
            console.log("accept_answer_partially", payload)
            // Обработка частичного принятия ответа
            if (payload.nickname && payload.points) {
                // Обновляем счет игрока
                updatePlayerScore(payload.nickname, payload.points)
                updateScoreDisplay(payload.nickname, payload.points)

                // Показываем сообщение
                const message = document.createElement("div")
                message.className = "system-message"
                message.textContent = `Ответ игрока ${payload.nickname} частично принят! +${payload.points} очков`
                document.getElementById("answers-container").appendChild(message)

                // Если указан следующий выбирающий, обновляем его
                if (payload.choosing_player) {
                    import("./game-state.js").then(({ setChoosingPlayerId, playerNicknameToId }) => {
                        // Получаем ID игрока по никнейму
                        const choosingPlayerId = playerNicknameToId[payload.choosing_player]
                        if (choosingPlayerId) {
                            setChoosingPlayerId(choosingPlayerId)
                        } else {
                            // Если не нашли ID, используем никнейм как ID
                            setChoosingPlayerId(payload.choosing_player)
                        }
                    })
                }

                // Продолжаем воспроизведение для остальных игроков
                if (currentAudioPlayer) {
                    currentAudioPlayer.play()
                }
            }
            break

        case "accept_answer":
            console.log("accept_answer", payload)
            // Обработка полного принятия ответа
            if (payload.nickname && payload.points) {
                // Обновляем счет игрока
                updatePlayerScore(payload.nickname, payload.points)
                updateScoreDisplay(payload.nickname, payload.points)

                // Показываем сообщение
                const message = document.createElement("div")
                message.className = "system-message"
                message.textContent = `Ответ игрока ${payload.nickname} принят! +${payload.points} очков`
                document.getElementById("answers-container").appendChild(message)

                // Если указан следующий выбирающий, обновляем его
                if (payload.choosing_player) {
                    import("./game-state.js").then(({ setChoosingPlayerId, playerNicknameToId }) => {
                        // Получаем ID игрока по никнейму
                        const choosingPlayerId = playerNicknameToId[payload.choosing_player]
                        if (choosingPlayerId) {
                            setChoosingPlayerId(choosingPlayerId)
                        } else {
                            // Если не нашли ID, используем никнейм как ID
                            setChoosingPlayerId(payload.choosing_player)
                        }

                        // Показываем сообщение о новом выбирающем
                        const nextMessage = document.createElement("div")
                        nextMessage.className = "system-message"
                        nextMessage.textContent = `Игрок ${payload.choosing_player} выбирает следующую мелодию`
                        document.getElementById("answers-container").appendChild(nextMessage)

                        // Обновляем интерфейс для нового раунда
                        import("./ui-renderer.js").then(({ renderCategories }) => {
                            import("./game-state.js").then(({ gameCategories }) => {
                                renderCategories(gameCategories)
                            })
                        })
                    })
                }
            }
            break

        case "reject_answer":
            console.log("reject_answer", payload)
            // Обработка отклонения ответа
            if (payload.nickname) {
                // Показываем сообщение
                const message = document.createElement("div")
                message.className = "system-message"
                message.textContent = `Ответ игрока ${payload.nickname} отклонен!`
                document.getElementById("answers-container").appendChild(message)

                // Продолжаем воспроизведение для остальных игроков
                if (currentAudioPlayer) {
                    currentAudioPlayer.play()
                }
            }
            break

        case "exception":
            console.log("exception", payload)
            if (payload.message === "The game has already begun") {
                alert("Потерпи, игра уже началась")
            } else {
                alert(`Ошибка: ${payload.message}`)
            }
            break

        default:
            console.warn("Неизвестный ивент:", type, payload)
    }
}

export { connectWebSocket }
