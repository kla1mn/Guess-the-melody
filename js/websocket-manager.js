import { WS_BACKEND } from "./config.js"
import { setSocket } from "./game-state.js"
import { renderPlayersList, renderCategories, playMelody, addPlayerAnswer } from "./ui-renderer.js"
import { waitingScreen, gameScreen } from "./dom-elements.js"

function connectWebSocket() {
    console.log("Connecting to WebSocket...")
    const socket = new WebSocket(WS_BACKEND)

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

        // Проверяем структуру сообщения
        console.log("Received raw message:", msg)

        // Адаптируем к разным форматам сообщений
        let eventType, payload

        if (msg.type && msg.payload) {
            // Формат: { type: "...", payload: {...} }
            eventType = msg.type
            payload = msg.payload
        } else if (msg.event_type && msg.payload) {
            // Формат: { event_type: "...", payload: {...} }
            eventType = msg.event_type
            payload = msg.payload
        } else {
            console.error("Неизвестный формат сообщения:", msg)
            return
        }

        console.log("Processed event:", eventType, payload)
        handleEvent(eventType, payload)
    })

    socket.addEventListener("close", (event) => {
        console.log("WS: closed", event)
        // Пытаемся переподключиться через 2 секунды
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
        case "init":
            console.log("init")
            import("./game-state.js").then(({ setCurrentCode, setCurrentNick }) => {
                setCurrentCode(payload.invite_code)
                setCurrentNick(payload.current_player_nickname)
                document.getElementById("room-code").textContent = payload.invite_code
                renderPlayersList(payload.players)
            })
            break

        case "new_player":
            console.log("new_player")
            import("./ui-renderer.js").then(({ addPlayerToList }) => {
                addPlayerToList(payload.nickname, payload.is_master)
            })
            break

        case "user_left":
            import("./ui-renderer.js").then(({ removePlayerFromList }) => {
                removePlayerFromList(payload.nickname)
            })
            break

        case "start_game":
            console.log("start_game received with payload:", payload)
            // Показываем игровой экран для ВСЕХ игроков, не только для хоста
            waitingScreen.classList.add("hidden")
            gameScreen.classList.remove("hidden")
            console.log(payload)

            // Рендерим категории
            if (payload.categories) {
                renderCategories(payload.categories)
            }
            break

        case "pick_melody":
            console.log("pick_melody received:", payload)
            if (payload.link) {
                console.log("Playing melody from pick_melody event:", payload.link)
                playMelody(payload.link)
            } else {
                console.error("No link in pick_melody payload:", payload)
            }
            break

        case "answer":
            console.log("answer", payload)
            // Отображение ответа игрока
            if (payload.nickname && payload.answer) {
                addPlayerAnswer(payload.nickname, payload.answer)
            }
            break

        case "accept_answer_partially":
            console.log("accept_answer_partially", payload)
            // Обработка частичного принятия ответа
            break

        case "accept_answer":
            console.log("accept_answer", payload)
            // Обработка полного принятия ответа
            break

        case "reject_answer":
            console.log("reject_answer", payload)
            // Обработка отклонения ответа
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
