import { socket } from "./game-state.js"
import { playersListEl, categoriesCt } from "./dom-elements.js"

// Render the list of players
function renderPlayersList(players) {
    playersListEl.innerHTML = ""
    players.forEach((p) => {
        const li = document.createElement("li")
        li.textContent = p.nickname + (p.is_master ? " (хост)" : "")
        playersListEl.appendChild(li)
    })
}

// Add a single player to the list
function addPlayerToList(nickname, isMaster = false) {
    const li = document.createElement("li")
    li.textContent = nickname + (isMaster ? " (хост)" : "")
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

// Render game categories
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
                btn.addEventListener("click", () => {
                    console.log("Melody button clicked:", m)
                    // Используем правильный тип события - pick_melody
                    if (socket) {
                        const message = {
                            type: "pick_melody", // Изменено с event_type на type
                            payload: {
                                category: cat.category_name,
                                melody: m.name || `Мелодия ${m.points}`,
                                points: m.points,
                                link: m.link,
                            },
                        }
                        console.log("Sending message:", message)
                        socket.send(JSON.stringify(message))

                        // Для отладки - воспроизводим мелодию локально
                        console.log("Debug: Playing melody locally:", m.link)
                        playMelody(m.link)
                    }
                })
                btns.appendChild(btn)
            })
        }

        card.appendChild(btns)
        categoriesCt.appendChild(card)
    })
}

// Play a melody
function playMelody(link) {
    if (!link) {
        console.error("No link provided for melody playback")
        return
    }

    console.log("Playing melody:", link)

    // Используем существующий аудио-элемент из HTML
    const audioPlayer = document.getElementById("audio-player")
    audioPlayer.src = link
    audioPlayer.classList.remove("hidden")

    // Пробуем воспроизвести
    const playPromise = audioPlayer.play()

    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                console.log("Audio playback started successfully")
            })
            .catch((error) => {
                console.error("Error playing audio:", error)

                // Создаем небольшую кнопку для воспроизведения (не на весь экран)
                const playButton = document.createElement("button")
                playButton.textContent = "▶️ Воспроизвести"
                playButton.style.position = "fixed"
                playButton.style.bottom = "10px"
                playButton.style.right = "10px"
                playButton.style.zIndex = "1000"
                playButton.style.padding = "5px 10px"
                playButton.style.backgroundColor = "#4CAF50"
                playButton.style.color = "white"
                playButton.style.border = "none"
                playButton.style.borderRadius = "5px"
                playButton.style.cursor = "pointer"

                playButton.onclick = () => {
                    audioPlayer
                        .play()
                        .then(() => {
                            playButton.remove()
                        })
                        .catch(() => {
                            alert("Не удалось воспроизвести аудио. Проверьте настройки браузера.")
                        })
                }

                document.body.appendChild(playButton)
            })
    }
}

// Показать контейнер ответов
function showAnswersContainer() {
    const answersContainer = document.getElementById("answers-container")
    if (answersContainer) {
        answersContainer.classList.remove("hidden")
    }
}

// Добавить ответ игрока в контейнер
function addPlayerAnswer(nickname, answer) {
    const answersContainer = document.getElementById("answers-container")
    if (!answersContainer) return

    showAnswersContainer()

    const answerElement = document.createElement("div")
    answerElement.className = "player-answer"
    answerElement.textContent = `${nickname}: ${answer}`
    answersContainer.appendChild(answerElement)
}

export {
    renderPlayersList,
    addPlayerToList,
    removePlayerFromList,
    renderCategories,
    playMelody,
    showAnswersContainer,
    addPlayerAnswer,
}
