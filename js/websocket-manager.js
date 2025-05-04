import { WS_BACKEND } from "./config.js"
import { setSocket } from "./game-state.js"
import { renderPlayersList, renderCategories } from "./ui-renderer.js"

function connectWebSocket() {
    const socket = new WebSocket(WS_BACKEND)

    socket.addEventListener("open", () => {
        console.log("WS: connected")
    })

    socket.addEventListener("message", (event) => {
        let msg
        try {
            msg = JSON.parse(event.data)
        } catch {
            console.error("WS: некорректный JSON", event.data)
            return
        }
        const event_type = msg["type"]
        const payload = msg["payload"]
        handleEvent(event_type, payload)
    })

    socket.addEventListener("close", () => console.log("WS: closed"))
    socket.addEventListener("error", (e) => console.error("WS error", e))

    setSocket(socket)
    return socket
}

function handleEvent(type, payload) {
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
            console.log("start_game")
            const categories = payload.categories
            renderCategories(categories)
            break

        case "exception":
            console.log("exception")
            if (payload.message === "The game has already begun") {
                alert("Потерпи, игра уже началась")
            } else if (payload.message === "1") {
                alert("1")
            }
            break

        default:
            console.warn("Неизвестный ивент:", type, payload)
    }
}

export { connectWebSocket }
