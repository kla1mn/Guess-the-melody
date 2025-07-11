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
    isHost,
    saveState,
    setLinkAdded,
    setGameStarted,
    setGameCategories,
} from "./game-state.js"
import { connectWebSocket } from "./websocket-manager.js"
import { renderCategories } from "./ui-renderer.js"

export function showWaiting() {
    initScreen.classList.add("hidden")
    joinScreen.classList.add("hidden")
    roomCodeEl.textContent = currentCode
    linkInput.value = ""
    linkInput.parentElement.classList.remove("hidden")
    addLinkBtn.parentElement.classList.remove("hidden")

    if (isHost) startBtn.classList.remove("hidden")
    else startBtn.classList.add("hidden")

    waitingScreen.classList.remove("hidden")
    gameScreen.classList.add("hidden")

    saveState()
    connectWebSocket()
}

export function showGame(categories) {
    setGameStarted(true)
    setGameCategories(categories)

    if (isHost) {
        answerForm.classList.add("hidden")
        answersContainer.classList.remove("hidden")
    }

    setTimeout(() => {
        if (categories) {
            renderCategories(categories)
        }
    }, 100)

    initScreen.classList.add("hidden")
    joinScreen.classList.add("hidden")
    waitingScreen.classList.add("hidden")
    gameScreen.classList.remove("hidden")
    connectWebSocket()
}

export async function addPlaylistLink(link) {
    if (!link) {
        return alert("Введите ссылку")
    }

    const yaPlaylistRe = /^https:\/\/music\.yandex\..*\/.*playlist.*/
    if (!yaPlaylistRe.test(link)) {
        return alert("Некорректная ссылка. Пожалуйста, введите ссылку на плейлист Яндекс.Музыки")
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

export async function createRoom(nickname) {
    if (!nickname) return alert("Введите никнейм")

    try {
        const res = await fetch(`${BACKEND}/game_app/create_game/${encodeURIComponent(nickname)}/`, {
            credentials: "include",
        })
        if (!res.ok)
            alert(`Ошибка сети: ${res.status}`)

        return await res.text()
    } catch (e) {
        console.error(e)
        alert("Ошибка при создании игры")
        return null
    }
}

export async function joinRoom(nickname, code) {
    if (!nickname && !code) {
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

export function startGame(socket) {
    if (!socket) return

    console.log("Sending start_game request")
    socket.send(
        JSON.stringify({
            type: "start_game",
            payload: {},
        }),
    )
}
