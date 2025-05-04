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
} from "./dom-elements.js"
import { currentCode, isHost, saveState, setLinkAdded } from "./game-state.js"
import { connectWebSocket } from "./websocket-manager.js"

// Show waiting screen
function showWaiting() {
    initScreen.classList.add("hidden")
    joinScreen.classList.add("hidden")
    roomCodeEl.textContent = currentCode
    linkInput.value = ""
    linkInput.parentElement.classList.remove("hidden")
    addLinkBtn.parentElement.classList.remove("hidden")

    if (isHost) startBtn.classList.remove("hidden")
    else startBtn.classList.add("hidden")

    waitingScreen.classList.remove("hidden")

    saveState()
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

    console.log("start_game")
    socket.send(JSON.stringify({ type: "start_game", payload: {} }))
    waitingScreen.classList.add("hidden")
    gameScreen.classList.remove("hidden")
}

export { showWaiting, addPlaylistLink, createRoom, joinRoom, startGame }
