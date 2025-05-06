import {
    socket,
    currentNick,
    isHost,
    isChoosingPlayer,
    hasPlayerAnswered,
    playersScores,
    setCurrentAudioPlayer,
    addPlayerToAnswered,
} from "./game-state.js"
import { playersListEl, categoriesCt } from "./dom-elements.js"

// Render the list of players
function renderPlayersList(players) {
    playersListEl.innerHTML = ""
    players.forEach((p) => {
        const li = document.createElement("li")
        li.textContent = p.nickname + (p.is_master ? " (хост)" : "")

        // Сохраняем ID игрока в атрибуте data-player-id
        if (p.id) {
            li.dataset.playerId = p.id.toString()
        }

        // Добавляем счет, если игра началась
        if (playersScores[p.nickname] !== undefined) {
            li.textContent += ` - ${playersScores[p.nickname]} очков`
        }

        // Добавляем класс для выбирающего игрока
        import("./game-state.js").then(({ choosingPlayerId }) => {
            if (p.id && p.id.toString() === choosingPlayerId) {
                li.classList.add("choosing-player")
                li.textContent += " (выбирает мелодию)"
            }
        })

        playersListEl.appendChild(li)
    })
}

// Add a single player to the list
function addPlayerToList(nickname, isMaster = false, playerId = null) {
    const li = document.createElement("li")
    li.textContent = nickname + (isMaster ? " (хост)" : "")

    // Сохраняем ID игрока в атрибуте data-player-id
    if (playerId) {
        li.dataset.playerId = playerId.toString()
    }

    // Добавляем счет, если игра началась
    if (playersScores[nickname] !== undefined) {
        li.textContent += ` - ${playersScores[nickname]} очков`
    }

    // Добавляем класс для выбирающего игрока
    import("./game-state.js").then(({ choosingPlayerId }) => {
        if (playerId && playerId.toString() === choosingPlayerId) {
            li.classList.add("choosing-player")
            li.textContent += " (выбирает мелодию)"
        }
    })

    playersListEl.appendChild(li)
}

// Remove a player from the list
function removePlayerFromList(nickname) {
    Array.from(playersListEl.children).forEach((li) => {
        if (li.textContent.startsWith(nickname)) {
            playersListEl.removeChild(li)
        }
    })
}

// Обновляем функцию renderCategories, чтобы использовать ID игрока
function renderCategories(categories) {
    console.log("Rendering categories:", categories)
    categoriesCt.innerHTML = "" // очистить предыдущее

    if (!categories || categories.length === 0) {
        console.error("No categories to render")
        const errorMsg = document.createElement("div")
        errorMsg.textContent = "Нет доступных категорий"
        categoriesCt.appendChild(errorMsg)
        return
    }

    // Добавляем информацию о текущем выбирающем
    const infoEl = document.createElement("div")
    infoEl.id = "game-info"
    infoEl.className = "game-info"

    const isChoosing = isChoosingPlayer()
    console.log("Current player is choosing:", isChoosing)

    if (isChoosing) {
        infoEl.innerHTML = `<p>Вы выбираете мелодию. Выберите категорию и мелодию.</p>`
    } else {
        // Импортируем choosingPlayerId для отображения имени
        import("./game-state.js").then(({ choosingPlayerId }) => {
            // Находим никнейм игрока по ID
            const playersList = document.getElementById("players-list")
            let choosingPlayerName = choosingPlayerId

            if (playersList) {
                const players = Array.from(playersList.children)
                for (const player of players) {
                    if (player.dataset.playerId === choosingPlayerId) {
                        choosingPlayerName = player.textContent.split("(")[0].trim()
                        break
                    }
                }
            }

            infoEl.innerHTML = `<p>Игрок ${choosingPlayerName} выбирает мелодию...</p>`
        })
    }

    categoriesCt.appendChild(infoEl)

    // Важно: показываем категории только если текущий игрок - выбирающий или хост
    // Проверяем, является ли текущий игрок выбирающим
    if (!isChoosing && !isHost) {
        console.log("Current player is not choosing and not host, hiding categories")
        return
    }

    console.log("Showing categories for choosing player or host")
    categories.forEach((cat) => {
        const card = document.createElement("div")
        card.className = "category-card"
        // на свой вкус можно подставить фон по имени категории
        card.style.backgroundImage = `url('/images/${cat.category_name}.jpg')`

        const title = document.createElement("h3")
        title.textContent = cat.category_name
        card.appendChild(title)

        const btns = document.createElement("div")
        btns.className = "buttons"

        if (!cat.melodies || cat.melodies.length === 0) {
            console.warn(`No melodies in category ${cat.category_name}`)
            const noMelodies = document.createElement("p")
            noMelodies.textContent = "Нет мелодий"
            btns.appendChild(noMelodies)
        } else {
            cat.melodies.forEach((m) => {
                const btn = document.createElement("button")
                btn.textContent = m.points

                // Если мелодия уже была угадана, делаем кнопку неактивной
                if (m.is_guessed) {
                    btn.disabled = true
                    btn.style.opacity = "0.5"
                }

                btn.addEventListener("click", () => {
                    console.log("Melody button clicked:", m)
                    // Используем правильный тип события - pick_melody
                    if (socket && (isChoosing || isHost)) {
                        const message = {
                            type: "pick_melody", // Используем type вместо event_type
                            payload: {
                                category: cat.category_name,
                                melody: m.name || `Мелодия ${m.points}`,
                                points: m.points,
                                link: m.link,
                            },
                        }
                        console.log("Sending message:", message)
                        socket.send(JSON.stringify(message))

                        // Отмечаем мелодию как сыгранную
                        m.is_guessed = true
                        btn.disabled = true
                        btn.style.opacity = "0.5"
                    }
                })
                btns.appendChild(btn)
            })
        }

        card.appendChild(btns)
        categoriesCt.appendChild(card)
    })
}

// Улучшаем функцию playMelody для решения проблемы с автовоспроизведением
function playMelody(link, startTime, endTime) {
    if (!link) {
        console.error("No link provided for melody playback")
        return
    }

    console.log("Playing melody:", link)

    // Используем существующий аудио-элемент из HTML
    const audioPlayer = document.getElementById("audio-player")
    audioPlayer.src = link
    audioPlayer.classList.remove("hidden")

    // Сохраняем ссылку на аудио-плеер
    setCurrentAudioPlayer(audioPlayer)

    // Если указано время начала, устанавливаем его
    if (startTime) {
        audioPlayer.currentTime = startTime
    }

    // Если указано время окончания, устанавливаем таймер
    if (endTime) {
        const duration = endTime - (startTime || 0)
        setTimeout(() => {
            audioPlayer.pause()
        }, duration * 1000)
    }

    // Показываем интерфейс для ответов только для не-хоста
    if (!isHost) {
        showAnswerInterface()
    }

    // Создаем кнопку для воспроизведения в менее заметном месте
    const playButton = document.createElement("button")
    playButton.textContent = "▶️ Играть"
    playButton.style.position = "fixed"
    playButton.style.top = "10px"
    playButton.style.right = "10px"
    playButton.style.zIndex = "1000"
    playButton.style.padding = "5px 10px"
    playButton.style.backgroundColor = "#4CAF50"
    playButton.style.color = "white"
    playButton.style.border = "none"
    playButton.style.borderRadius = "5px"
    playButton.style.cursor = "pointer"
    playButton.style.fontSize = "12px"
    playButton.id = "play-melody-button"

    // Удаляем существующую кнопку, если она есть
    const existingButton = document.getElementById("play-melody-button")
    if (existingButton) {
        existingButton.remove()
    }

    playButton.onclick = () => {
        audioPlayer
            .play()
            .then(() => {
                console.log("Audio playback started successfully")
            })
            .catch((error) => {
                console.error("Error playing audio:", error)
                alert("Не удалось воспроизвести аудио. Проверьте настройки браузера.")
            })
    }

    document.body.appendChild(playButton)

    // Пробуем воспроизвести автоматически (может не сработать из-за политик браузера)
    audioPlayer.play().catch((error) => {
        console.log("Auto-play prevented by browser, user needs to click the play button:", error)
    })
}

// Показать интерфейс для ответов
function showAnswerInterface() {
    // Если текущий игрок - выбирающий или уже ответил или хост, не показываем форму ответа
    if (isChoosingPlayer() || hasPlayerAnswered() || isHost) {
        return
    }

    const answerForm = document.getElementById("answer-form")
    if (answerForm) {
        answerForm.classList.remove("hidden")
    }
}

// Скрыть интерфейс для ответов
function hideAnswerInterface() {
    const answerForm = document.getElementById("answer-form")
    if (answerForm) {
        answerForm.classList.add("hidden")
    }
}

// Показать контейнер ответов
function showAnswersContainer() {
    const answersContainer = document.getElementById("answers-container")
    if (answersContainer) {
        answersContainer.classList.remove("hidden")
    }
}

// Обновляем функцию addPlayerAnswer для добавления кнопок оценки и улучшения отображения
function addPlayerAnswer(nickname, answer, correctAnswer) {
    console.log("Adding player answer to UI:", nickname, answer, correctAnswer)

    const answersContainer = document.getElementById("answers-container")
    if (!answersContainer) {
        console.error("Answers container not found")
        return
    }

    // Показываем контейнер ответов
    showAnswersContainer()

    // Добавляем игрока в список ответивших
    addPlayerToAnswered(nickname)

    // Если текущий игрок ответил, скрываем форму ответа
    if (nickname === currentNick) {
        hideAnswerInterface()
    }

    // Удаляем предыдущий ответ от этого игрока, если он есть
    const existingAnswers = answersContainer.querySelectorAll(".player-answer")
    existingAnswers.forEach((el) => {
        if (el.dataset.player === nickname) {
            el.remove()
        }
    })

    // Создаем элемент ответа
    const answerElement = document.createElement("div")
    answerElement.className = "player-answer"
    answerElement.dataset.player = nickname

    // Добавляем анимацию появления
    answerElement.style.animation = "fadeIn 0.5s"

    // Если это хост, делаем ответ более заметным
    if (isHost) {
        answerElement.classList.add("host-view")
    }

    // Создаем элемент для имени игрока
    const nameElement = document.createElement("span")
    nameElement.className = "player-name"
    nameElement.textContent = nickname + ": "

    // Создаем элемент для текста ответа
    const answerTextElement = document.createElement("span")
    answerTextElement.className = "answer-text"
    answerTextElement.textContent = answer

    answerElement.appendChild(nameElement)
    answerElement.appendChild(answerTextElement)

    // Если текущий игрок - хост, добавляем кнопки для оценки ответа и показываем правильный ответ
    if (isHost) {
        // Показываем правильный ответ для хоста
        if (correctAnswer) {
            const correctAnswerEl = document.createElement("div")
            correctAnswerEl.className = "correct-answer"
            correctAnswerEl.textContent = `Правильный ответ: ${correctAnswer}`
            correctAnswerEl.style.fontWeight = "bold"
            correctAnswerEl.style.color = "#FFD700"
            correctAnswerEl.style.marginTop = "5px"
            answerElement.appendChild(correctAnswerEl)
        }

        const buttonsContainer = document.createElement("div")
        buttonsContainer.className = "answer-buttons"

        // Кнопка "Принять ответ"
        const acceptButton = document.createElement("button")
        acceptButton.textContent = "✓"
        acceptButton.title = "Принять ответ"
        acceptButton.className = "accept-button"
        acceptButton.onclick = () => {
            if (socket) {
                socket.send(
                    JSON.stringify({
                        type: "accept_answer",
                        payload: {},
                    }),
                )
            }
            buttonsContainer.remove()

            answerElement.classList.add("accepted-answer")
        }

        // Кнопка "Частично принять ответ"
        const partialButton = document.createElement("button")
        partialButton.textContent = "½"
        partialButton.title = "Частично принять ответ"
        partialButton.className = "partial-button"
        partialButton.onclick = () => {
            if (socket) {
                socket.send(
                    JSON.stringify({
                        type: "accept_answer_partially",
                        payload: {},
                    }),
                )
            }
            buttonsContainer.remove()

            answerElement.classList.add("partially-accepted-answer")
        }

        // Кнопка "Отклонить ответ"
        const rejectButton = document.createElement("button")
        rejectButton.textContent = "✗"
        rejectButton.title = "Отклонить ответ"
        rejectButton.className = "reject-button"
        rejectButton.onclick = () => {
            if (socket) {
                socket.send(
                    JSON.stringify({
                        type: "reject_answer",
                        payload: {},
                    }),
                )
            }
            // Удаляем кнопки после нажатия
            buttonsContainer.remove()

            // Добавляем класс для визуального отображения отклоненного ответа
            answerElement.classList.add("rejected-answer")
        }

        buttonsContainer.appendChild(acceptButton)
        buttonsContainer.appendChild(partialButton)
        buttonsContainer.appendChild(rejectButton)

        answerElement.appendChild(buttonsContainer)
    }

    answersContainer.appendChild(answerElement)

    // Прокручиваем контейнер ответов вниз, чтобы показать новый ответ
    answersContainer.scrollTop = answersContainer.scrollHeight
}

// Обновить счет игрока в интерфейсе
function updateScoreDisplay(nickname, points) {
    const playerItems = Array.from(playersListEl.children)

    for (const item of playerItems) {
        if (item.textContent.startsWith(nickname)) {
            // Обновляем текст элемента, сохраняя метку хоста, если она есть
            const isHostText = item.textContent.includes("(хост)") ? " (хост)" : ""
            const isChoosingText = item.textContent.includes("(выбирает мелодию)") ? " (выбирает мелодию)" : ""
            item.textContent = `${nickname}${isHostText}${isChoosingText} - ${points} очков`
            break
        }
    }
}

// Очистить контейнер ответов
function clearAnswersContainer() {
    const answersContainer = document.getElementById("answers-container")
    if (answersContainer) {
        answersContainer.innerHTML = ""
        answersContainer.classList.add("hidden")
    }
}

export {
    renderPlayersList,
    addPlayerToList,
    removePlayerFromList,
    renderCategories,
    playMelody,
    showAnswerInterface,
    hideAnswerInterface,
    showAnswersContainer,
    addPlayerAnswer,
    updateScoreDisplay,
    clearAnswersContainer,
}
