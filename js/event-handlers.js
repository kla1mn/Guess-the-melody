import {
    initScreen,
    joinScreen,
    waitingScreen,
    initNickInput,
    joinNickInput,
    joinInviteInput,
    linkInput,
    addLinkBtn,
    startBtn,
    answerForm,
    answerInput,
} from "./dom-elements.js"
import {
    currentNick,
    setCurrentNick,
    setCurrentCode,
    setIsHost,
    socket,
    clearState,
    linkAdded,
    currentPlayerId,
} from "./game-state.js"
import { showWaiting, addPlaylistLink, createRoom, joinRoom, startGame } from "./ui-manager.js"
import { BACKEND } from "./config.js"

function setupEventHandlers() {
    console.log("Setting up event handlers")
    document.getElementById("logout-btn").classList.add("hidden")

    document.getElementById("create-btn")?.addEventListener("click", async () => {
        const nick = initNickInput.value.trim()
        if (!nick) return alert("Введите никнейм")

        setCurrentNick(nick)
        setIsHost(true)

        const code = await createRoom(nick)
        if (code) {
            setCurrentCode(code)
            console.log(code)
            showWaiting()
        }
    })

    document.getElementById("join-menu-btn")?.addEventListener("click", () => {
        joinNickInput.value = initNickInput.value
        initScreen.classList.add("hidden")
        joinScreen.classList.remove("hidden")
    })

    document.getElementById("back-btn")?.addEventListener("click", () => {
        joinScreen.classList.add("hidden")
        initScreen.classList.remove("hidden")
    })

    document.getElementById("enter-btn")?.addEventListener("click", async () => {
        const nick = joinNickInput.value.trim()
        const code = joinInviteInput.value.trim()

        setCurrentNick(nick)
        setCurrentCode(code)
        setIsHost(false)

        const success = await joinRoom(nick, code)
        if (success) {
            showWaiting()
        }
    })

    document.getElementById("leave-btn")?.addEventListener("click", () => {
        if (socket) socket.close()
        waitingScreen.classList.add("hidden")
        initScreen.classList.remove("hidden")
        initNickInput.value = currentNick

        document.getElementById("logout-btn").classList.add("hidden")

        clearState()
    })

    document.getElementById("logout-btn")?.addEventListener("click", async () => {
        try {
            const res = await fetch(`${BACKEND}/game_app/delete_token`, {
                method: "GET",
                credentials: "include",
            })

            if (res.ok) {
                console.log("Токен успешно удален")
            } else {
                console.log("Токен не удален, возможно уже истек:", res.status)
            }
        } catch (error) {
            console.log("Ошибка при удалении токена, возможно он уже истек:", error)
        } finally {
            document.getElementById("logout-btn").classList.add("hidden")
            clearState()
            window.location.reload()
        }
    })

    addLinkBtn?.addEventListener("click", async () => {
        if (linkAdded) {
            return alert("Ссылка уже добавлена")
        }

        const link = linkInput.value.trim()
        await addPlaylistLink(link)
    })

    startBtn.addEventListener("click", () => {
        startGame(socket)
    })

    answerForm?.addEventListener("submit", (e) => {
        e.preventDefault()
        console.log("Form submit prevented")

        const answerEvent = new Event("answer")
        answerForm.dispatchEvent(answerEvent)
    })

    answerForm?.addEventListener("answer", () => {
        import("./game-state.js").then(({ isHost }) => {
            if (isHost) {
                console.log("Host cannot answer")
                return
            }

            const answer = answerInput.value.trim()
            if (!answer) return

            if (socket) {
                socket.send(
                    JSON.stringify({
                        type: "answer",
                        payload: {
                            answer: answer,
                            nickname: currentNick,
                            id: currentPlayerId,
                        },
                    }),
                )
                console.log("Sent answer:", answer)

                import("./ui-renderer.js").then(({ addPlayerAnswer }) => {
                    addPlayerAnswer(currentNick, answer)
                })
                answerInput.value = ""
                answerForm.classList.add("hidden")
            }
        })
    })

    document.getElementById("close-leaderboard-btn")?.addEventListener("click", () => {
        console.log("Close leaderboard button clicked")
        const leaderboardModal = document.getElementById("leaderboard-modal")
        if (leaderboardModal) {
            leaderboardModal.classList.add("hidden")
            leaderboardModal.style.display = "none"
        }
    })

    document.getElementById("leaderboard-modal")?.addEventListener("click", (e) => {
        if (e.target === document.getElementById("leaderboard-modal")) {
            console.log("Leaderboard background clicked")
            const leaderboardModal = document.getElementById("leaderboard-modal")
            if (leaderboardModal) {
                leaderboardModal.classList.add("hidden")
                leaderboardModal.style.display = "none"
            }
        }
    })
}

export { setupEventHandlers }
