import { BACKEND } from "./config.js"
import {
    initScreen,
    joinScreen,
    waitingScreen,
    gameScreen,
    roomCodeEl,
    linkInput,
    addLinkBtn,
    startBtn,
    answerForm,
    answersContainer,
} from "./dom-elements.js"
import {
    currentCode,
    currentNick,
    isHost,
    saveState,
    setLinkAdded,
    setGameStarted,
    setGameCategories,
} from "./game-state.js"
import { connectWebSocket } from "./websocket-manager.js"
import { renderCategories } from "./ui-renderer.js"

// Show waiting screen
function showWaiting() {
    console.log("Showing waiting screen with code:", currentCode, "nick:", currentNick, "isHost:", isHost)

    initScreen.classList.add("hidden")
    joinScreen.classList.add("hidden")
    roomCodeEl.textContent = currentCode
    linkInput.value = ""
    linkInput.parentElement.classList.remove("hidden")
    addLinkBtn.parentElement.classList.remove("hidden")

    if (isHost) startBtn.classList.remove("hidden")
    else startBtn.classList.add("hidden")

    waitingScreen.classList.remove("hidden")
    gameScreen.classList.add("hidden") // Убедимся, что игровой экран скрыт

    saveState()
    connectWebSocket()
}

// Show game screen
function showGame(categories) {
    console.log("Showing game screen with categories:", categories)

    // Устанавливаем флаг, что игра началась
    setGameStarted(true)

    // Сохраняем категории
    setGameCategories(categories)

    // Hide answer form for host
    import("./game-state.js").then(({ isHost }) => {
        if (isHost) {
            answerForm.classList.add("hidden")
            answersContainer.classList.remove("hidden")
        }
    })

    // Рендерим категории после небольшой задержки, чтобы убедиться, что все состояние загружено
    setTimeout(() => {
        if (categories) {
            renderCategories(categories)
        }
    }, 100)

    // Показываем игровой экран
    initScreen.classList.add("hidden")
    joinScreen.classList.add("hidden")
    waitingScreen.classList.add("hidden")
    gameScreen.classList.remove("hidden")

    // Подключаемся к WebSocket, если еще не подключены
    connectWebSocket()
}

// Add playlist link
async function addPlaylistLink(link) {
    if (!link) {
        return alert("Введите ссылку")
    }

    const yaPlaylistRe = /^https?:\/\/music\.yandex\.ru\/users\/[^/]+\/playlists\/\d+(\?.*)?$/
    if (!yaPlaylistRe.test(link)) {
        return alert("Некорректная ссылка. Пожалуйста, введите ссылку на плейлист Яндекс.Музыки.")
    }

    try {
        const res = await fetch(`${BACKEND}/game_app/add_link/`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "text/plain",
                Accept: "*/*",
            },
            body: link,
        })

        if (!res.ok) {
            const err = await res.json().catch(() => null)
            return alert(err?.error || `Ошибка сервера: ${res.status}`)
        }

        const data = await res.text()
        console.log("Ссылка добавлена:", data)

        setLinkAdded(true)
        linkInput.disabled = true
        addLinkBtn.disabled = true
        alert("Плейлист успешно добавлен!")
    } catch (e) {
        console.error(e)
        alert("Ошибка при добавлении ссылки")
    }
}

// Create a new game room
async function createRoom(nickname) {
    if (!nickname) return alert("Введите никнейм")

    try {
        const res = await fetch(`${BACKEND}/game_app/create_game/${encodeURIComponent(nickname)}/`, {
            credentials: "include",
        })
        if (!res.ok) throw new Error(`Ошибка сети: ${res.status}`)

        return await res.text()
    } catch (e) {
        console.error(e)
        alert("Ошибка при создании игры")
        return null
    }
}

// Join an existing game room
async function joinRoom(nickname, code) {
    if (!nickname || !code) {
        return alert("Введите ник и код комнаты")
    } else if (!nickname) {
        return alert("Введите ник")
    } else if (!code) {
        return alert("Введите код комнаты")
    }

    try {
        const res = await fetch(
            `${BACKEND}/game_app/get_token?nickname=${encodeURIComponent(nickname)}&invite_code=${encodeURIComponent(code)}`,
            { method: "GET", credentials: "include" },
        )

        if (res.ok) {
            return true
        } else if (res.status === 400) {
            const errorText = await res.text()
            alert(errorText)
        } else {
            alert(`Ошибка сервера: ${res.status}`)
        }
        return false
    } catch (e) {
        console.error(e)
        alert("Сетевая ошибка при подключении")
        return false
    }
}

// Start the game (host only)
function startGame(socket) {
    if (!socket) return

    console.log("Sending start_game request")
    socket.send(
        JSON.stringify({
            type: "start_game",
            payload: {},
        }),
    )
}

export { showWaiting, showGame, addPlaylistLink, createRoom, joinRoom, startGame }
