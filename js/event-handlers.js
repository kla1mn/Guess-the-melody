import {
    initScreen,
    joinScreen,
    initNickInput,
    joinNickInput,
    joinInviteInput,
    linkInput,
    addLinkBtn,
    startBtn,
} from "./dom-elements.js"
import { showWaiting, createRoom, joinRoom, addPlaylistLink, startGame } from "./ui-manager.js"
import { setCurrentNick, setCurrentCode, setIsHost } from "./game-state.js"

function setupEventHandlers() {
    console.log("Setting up event handlers...")

    // Кнопка создания комнаты
    document.getElementById("create-btn").addEventListener("click", async () => {
        const nickname = initNickInput.value.trim()
        const inviteCode = await createRoom(nickname)

        if (inviteCode) {
            setCurrentNick(nickname)
            setCurrentCode(inviteCode)
            setIsHost(true)
            showWaiting()
        }
    })

    // Кнопка открытия экрана входа по коду
    document.getElementById("join-menu-btn").addEventListener("click", () => {
        initScreen.classList.add("hidden")
        joinScreen.classList.remove("hidden")
    })

    // Кнопка входа в комнату
    document.getElementById("enter-btn").addEventListener("click", async () => {
        const nickname = joinNickInput.value.trim()
        const inviteCode = joinInviteInput.value.trim()

        const success = await joinRoom(nickname, inviteCode)

        if (success) {
            setCurrentNick(nickname)
            setCurrentCode(inviteCode)
            setIsHost(false)
            showWaiting()
        }
    })

    // Кнопка "Назад" на экране входа
    document.getElementById("back-btn").addEventListener("click", () => {
        joinScreen.classList.add("hidden")
        initScreen.classList.remove("hidden")
    })

    // Кнопка добавления плейлиста
    addLinkBtn.addEventListener("click", () => {
        const link = linkInput.value.trim()
        addPlaylistLink(link)
    })

    // Кнопка старта игры (только для хоста)
    startBtn.addEventListener("click", () => {
        import("./game-state.js").then(({ socket }) => {
            startGame(socket)
        })
    })

    // Кнопка выхода из комнаты
    document.getElementById("leave-btn").addEventListener("click", () => {
        import("./game-state.js").then(({ clearState }) => {
            clearState()
            window.location.reload()
        })
    })

    // Кнопка выхода из игры (после окончания)
    const logoutBtn = document.getElementById("logout-btn")
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            import("./game-state.js").then(({ clearState }) => {
                clearState()
                window.location.reload()
            })
        })
    }

    // Обработка отправки формы с ответом
    const answerForm = document.getElementById("answer-form")
    if (answerForm) {
        answerForm.addEventListener("submit", (event) => {
            event.preventDefault()
            const answerInput = document.getElementById("answer-input")
            const answer = answerInput.value.trim()

            if (answer) {
                import("./game-state.js").then(({ socket, currentNick }) => {
                    if (socket) {
                        socket.send(
                            JSON.stringify({
                                type: "answer",
                                payload: {
                                    nickname: currentNick,
                                    answer: answer,
                                },
                            }),
                        )
                        answerInput.value = ""
                    }
                })
            }
        })
    }
}

export { setupEventHandlers }
