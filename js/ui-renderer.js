import {
    socket,
    currentNick,
    isHost,
    isChoosingPlayer,
    hasPlayerAnswered,
    playersScores,
    setCurrentAudioPlayer,
    addPlayerToAnswered,
    getSortedPlayersByScore,
} from "./game-state.js"
import { playersListEl, categoriesCt } from "./dom-elements.js"

// Изменяем функцию renderPlayersList, чтобы не показывать очки в лобби
function renderPlayersList(players) {
    playersListEl.innerHTML = ""
    players.forEach((p) => {
        const li = document.createElement("li")
        li.textContent = p.nickname + (p.is_master ? " (хост)" : "")

        // Сохраняем ID игрока в атрибуте data-player-id
        if (p.id) {
            li.dataset.playerId = p.id.toString()
        }

        // Добавляем счет, только если игра началась
        import("./game-state.js").then(({ gameStarted }) => {
            if (gameStarted && playersScores[p.nickname] !== undefined) {
                li.textContent += ` - ${playersScores[p.nickname]} очков`
            }
        })

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

// Изменяем функцию addPlayerToList, чтобы не показывать очки в лобби
function addPlayerToList(nickname, isMaster = false, playerId = null) {
    const li = document.createElement("li")
    li.textContent = nickname + (isMaster ? " (хост)" : "")

    // Сохраняем ID игрока в атрибуте data-player-id
    if (playerId) {
        li.dataset.playerId = playerId.toString()
    }

    // Добавляем счет, только если игра началась
    import("./game-state.js").then(({ gameStarted }) => {
        if (gameStarted && playersScores[nickname] !== undefined) {
            li.textContent += ` - ${playersScores[nickname]} очков`
        }
    })

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

    // Добавляем нопку для показа таблицы лидеров
    const leaderboardBtn = document.createElement("button")
    leaderboardBtn.textContent = "Таблица лидеров"
    leaderboardBtn.className = "leaderboard-btn"
    leaderboardBtn.style.position = "fixed"
    leaderboardBtn.style.top = "10px"
    leaderboardBtn.style.left = "10px"
    leaderboardBtn.style.zIndex = "1000"
    leaderboardBtn.style.padding = "8px 16px"
    leaderboardBtn.style.backgroundColor = "#4a90e2"
    leaderboardBtn.style.color = "white"
    leaderboardBtn.style.border = "none"
    leaderboardBtn.style.borderRadius = "5px"
    leaderboardBtn.style.cursor = "pointer"
    leaderboardBtn.style.fontSize = "14px"
    leaderboardBtn.onclick = showLeaderboard

    // Удаляем существующую кнопку, если она есть
    const existingBtn = document.getElementById("leaderboard-btn")
    if (existingBtn) {
        existingBtn.remove()
    }

    leaderboardBtn.id = "leaderboard-btn"
    document.body.appendChild(leaderboardBtn)

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
        import("./game-state.js").then(({choosingPlayerId, getNicknameById}) => {
            // Находим никнейм игрока по ID
            const choosingPlayerName = getNicknameById(choosingPlayerId)
            infoEl.innerHTML = `<p>Игрок ${choosingPlayerName} выбирает мелодию...</p>`
        })
    }

    categoriesCt.appendChild(infoEl)

    if (isChoosing || isHost)
    {
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

    // Ограничиваем воспроизведение 30 секундами
    setTimeout(() => {
        audioPlayer.pause()
    }, 30 * 1000)

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

// Обновляем функцию addPlayerAnswer для лучшего отображения
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

    // Создаем контейнер для имени и ответа
    const answerContentDiv = document.createElement("div")
    answerContentDiv.style.flex = "1"

    // Создаем элемент для имени игрока
    const nameElement = document.createElement("span")
    nameElement.className = "player-name"
    nameElement.textContent = nickname + ": "

    // Создаем элемент для текста ответа
    const answerTextElement = document.createElement("span")
    answerTextElement.className = "answer-text"
    answerTextElement.textContent = answer

    answerContentDiv.appendChild(nameElement)
    answerContentDiv.appendChild(answerTextElement)
    answerElement.appendChild(answerContentDiv)

    // Если текущий игрок - хост, добавляем кнопки для оценки ответа и показываем правильный ответ
    if (isHost) {
        // Показываем правильный ответ для хоста
        if (correctAnswer) {
            const correctAnswerEl = document.createElement("div")
            correctAnswerEl.className = "correct-answer"
            correctAnswerEl.textContent = `Правильный ответ: ${correctAnswer}`
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
            try {
                if (socket) {
                    socket.send(
                        JSON.stringify({
                            type: "accept_answer",
                            payload: {
                                nickname: nickname,
                            },
                        }),
                    )
                }
                // Удаляем кнопки после нажатия
                buttonsContainer.remove()

                // Добавляем класс для визуального отображения принятого ответа
                answerElement.classList.add("accepted-answer")
            } catch (error) {
                console.error("Error sending accept_answer:", error)
            }
        }

        // Кнопка "Частично принять ответ"
        const partialButton = document.createElement("button")
        partialButton.textContent = "½"
        partialButton.title = "Частично принять ответ"
        partialButton.className = "partial-button"
        partialButton.onclick = () => {
            try {
                if (socket) {
                    socket.send(
                        JSON.stringify({
                            type: "accept_answer_partially",
                            payload: {
                                nickname: nickname,
                            },
                        }),
                    )
                }
                // Удаляем кнопки после нажатия
                buttonsContainer.remove()

                // Добавляем класс для визуального отображения частично принятого ответа
                answerElement.classList.add("partially-accepted-answer")
            } catch (error) {
                console.error("Error sending accept_answer_partially:", error)
            }
        }

        // Кнопка "Отклонить ответ"
        const rejectButton = document.createElement("button")
        rejectButton.textContent = "✗"
        rejectButton.title = "Отклонить ответ"
        rejectButton.className = "reject-button"
        rejectButton.onclick = () => {
            try {
                if (socket) {
                    socket.send(
                        JSON.stringify({
                            type: "reject_answer",
                            payload: {
                                nickname: nickname,
                            },
                        }),
                    )
                }
                // Удаляем кнопки после нажатия
                buttonsContainer.remove()

                // Добавляем класс для визуального отображения отклоненного ответа
                answerElement.classList.add("rejected-answer")
            } catch (error) {
                console.error("Error sending reject_answer:", error)
            }
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

// Изменяем функцию updateScoreDisplay, чтобы обновлять таблицу лидеров
function updateScoreDisplay(nickname, points) {
    const playerItems = Array.from(playersListEl.children)

    for (const item of playerItems) {
        if (item.textContent.startsWith(nickname)) {
            // Обновляем текст элемента, сохраняя метку хоста, если она есть
            const isHostText = item.textContent.includes("(хост)") ? " (хост)" : ""
            const isChoosingText = item.textContent.includes("(выбирает мелодию)") ? " (выбирает мелодию)" : ""

            // Проверяем, началась ли игра
            import("./game-state.js").then(({ gameStarted }) => {
                if (gameStarted) {
                    item.textContent = `${nickname}${isHostText}${isChoosingText} - ${points} очков`
                } else {
                    item.textContent = `${nickname}${isHostText}${isChoosingText}`
                }
            })
            break
        }
    }

    // Обновляем таблицу лидеров, если она открыта
    const leaderboardModal = document.querySelector(".leaderboard-modal")
    if (leaderboardModal) {
        updateLeaderboardTable(leaderboardModal)
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

// Добавляем новую функцию для обновления таблицы лидеров
function updateLeaderboardTable(modal) {
    // Получаем отсортированный список игроков по очкам
    const sortedPlayers = getSortedPlayersByScore()

    // Находим тело таблицы
    const tbody = modal.querySelector("tbody")
    if (!tbody) return

    // Очищаем таблицу
    tbody.innerHTML = ""

    // Добавляем строки с игроками
    sortedPlayers.forEach((player, index) => {
        const row = document.createElement("tr")

        // Выделяем текущего игрока
        if (player.nickname === currentNick) {
            row.style.backgroundColor = "rgba(74, 144, 226, 0.1)"
            row.style.fontWeight = "bold"
        }

        // Выделяем первые три места
        if (index < 3) {
            row.style.color = ["#FFD700", "#C0C0C0", "#CD7F32"][index]
            row.style.fontWeight = "bold"
        }

        const rankCell = document.createElement("td")
        rankCell.textContent = (index + 1).toString()
        rankCell.style.padding = "10px"
        rankCell.style.borderBottom = "1px solid #ddd"

        const nameCell = document.createElement("td")
        nameCell.textContent = player.nickname
        nameCell.style.padding = "10px"
        nameCell.style.borderBottom = "1px solid #ddd"

        const scoreCell = document.createElement("td")
        scoreCell.textContent = player.score.toString()
        scoreCell.style.padding = "10px"
        scoreCell.style.borderBottom = "1px solid #ddd"
        scoreCell.style.textAlign = "right"

        row.appendChild(rankCell)
        row.appendChild(nameCell)
        row.appendChild(scoreCell)
        tbody.appendChild(row)
    })
}

// Добавляем функцию для автоматического обновления таблицы лидеров
function setupLeaderboardAutoUpdate() {
    // Обновляем таблицу лидеров каждые 2 секунды
    const leaderboardInterval = setInterval(() => {
        const leaderboardModal = document.querySelector(".leaderboard-modal")
        if (leaderboardModal) {
            updateLeaderboardTable(leaderboardModal)
        } else {
            // Если модальное окно закрыто, останавливаем интервал
            clearInterval(leaderboardInterval)
        }
    }, 2000)

    return leaderboardInterval
}

// Модифицируем функцию showLeaderboard, чтобы использовать автоматическое обновление
function showLeaderboard() {
    console.log("Showing leaderboard")

    // Проверяем, не открыта ли уже таблица лидеров
    if (document.querySelector(".leaderboard-modal")) {
        return
    }

    // Создаем модальное окно для таблицы лидеров
    const modal = document.createElement("div")
    modal.className = "leaderboard-modal"
    modal.style.position = "fixed"
    modal.style.top = "0"
    modal.style.left = "0"
    modal.style.width = "100%"
    modal.style.height = "100%"
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.7)"
    modal.style.display = "flex"
    modal.style.justifyContent = "center"
    modal.style.alignItems = "center"
    modal.style.zIndex = "2000"

    // Создаем контейнер для таблицы
    const container = document.createElement("div")
    container.className = "leaderboard-container"
    container.style.backgroundColor = "white"
    container.style.padding = "20px"
    container.style.borderRadius = "10px"
    container.style.maxWidth = "400px"
    container.style.width = "80%"
    container.style.maxHeight = "80vh"
    container.style.overflowY = "auto"

    // Создаем заголовок
    const title = document.createElement("h2")
    title.textContent = "Таблица лидеров"
    title.style.textAlign = "center"
    title.style.marginBottom = "20px"
    title.style.color = "#333"

    // Создаем таблицу
    const table = document.createElement("table")
    table.style.width = "100%"
    table.style.borderCollapse = "collapse"

    // Создаем заголовок таблицы
    const thead = document.createElement("thead")
    const headerRow = document.createElement("tr")

    const rankHeader = document.createElement("th")
    rankHeader.textContent = "Место"
    rankHeader.style.padding = "10px"
    rankHeader.style.borderBottom = "2px solid #ddd"
    rankHeader.style.textAlign = "left"

    const nameHeader = document.createElement("th")
    nameHeader.textContent = "Игрок"
    nameHeader.style.padding = "10px"
    nameHeader.style.borderBottom = "2px solid #ddd"
    nameHeader.style.textAlign = "left"

    const scoreHeader = document.createElement("th")
    scoreHeader.textContent = "Очки"
    scoreHeader.style.padding = "10px"
    scoreHeader.style.borderBottom = "2px solid #ddd"
    scoreHeader.style.textAlign = "right"

    headerRow.appendChild(rankHeader)
    headerRow.appendChild(nameHeader)
    headerRow.appendChild(scoreHeader)
    thead.appendChild(headerRow)
    table.appendChild(thead)

    // Создаем тело таблицы
    const tbody = document.createElement("tbody")
    table.appendChild(tbody)

    // Заполняем таблицу данными
    updateLeaderboardTable(modal)

    // Запускаем автоматическое обновление таблицы
    const updateInterval = setupLeaderboardAutoUpdate()

    // Создаем кнопку закрытия
    const closeButton = document.createElement("button")
    closeButton.textContent = "Закрыть"
    closeButton.style.display = "block"
    closeButton.style.margin = "20px auto 0"
    closeButton.style.padding = "10px 20px"
    closeButton.style.backgroundColor = "#4a90e2"
    closeButton.style.color = "white"
    closeButton.style.border = "none"
    closeButton.style.borderRadius = "5px"
    closeButton.style.cursor = "pointer"
    closeButton.onclick = () => {
        document.body.removeChild(modal)
        clearInterval(updateInterval)
    }

    // Собираем все вместе
    container.appendChild(title)
    container.appendChild(table)
    container.appendChild(closeButton)
    modal.appendChild(container)

    // Добавляем модальное окно на страницу
    document.body.appendChild(modal)

    // Закрытие по клику вне таблицы
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal)
            clearInterval(updateInterval)
        }
    })
}

// Добавляем функцию в экспорт
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
    showLeaderboard,
    updateLeaderboardTable,
    setupLeaderboardAutoUpdate,
}
