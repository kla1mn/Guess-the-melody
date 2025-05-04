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
import { currentNick, setCurrentNick, setCurrentCode, setIsHost, socket, clearState, linkAdded } from "./game-state.js"
import { showWaiting, addPlaylistLink, createRoom, joinRoom, startGame } from "./ui-manager.js"
import { addPlayerAnswer } from "./ui-renderer.js"

// Setup all event handlers
function setupEventHandlers() {
    console.log("Setting up event handlers")

    // Create room button
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

    // Go to join screen button
    document.getElementById("join-menu-btn")?.addEventListener("click", () => {
        joinNickInput.value = initNickInput.value
        initScreen.classList.add("hidden")
        joinScreen.classList.remove("hidden")
    })

    // Back to main screen button
    document.getElementById("back-btn")?.addEventListener("click", () => {
        joinScreen.classList.add("hidden")
        initScreen.classList.remove("hidden")
    })

    // Join room button
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

    // Leave waiting room button
    document.getElementById("leave-btn")?.addEventListener("click", () => {
        if (socket) socket.close()
        waitingScreen.classList.add("hidden")
        initScreen.classList.remove("hidden")
        initNickInput.value = currentNick

        clearState()
    })

    // Add playlist link button
    addLinkBtn?.addEventListener("click", async () => {
        if (linkAdded) {
            return alert("Ссылка уже добавлена")
        }

        const link = linkInput.value.trim()
        await addPlaylistLink(link)
    })

    // Start game button (host only)
    startBtn?.addEventListener("click", () => {
        startGame(socket)
    })

    // Форма для отправки ответов
    answerForm?.addEventListener("submit", (e) => {
        e.preventDefault()
        const answer = answerInput.value.trim()
        if (!answer) return

        if (socket) {
            socket.send(
                JSON.stringify({
                    type: "answer", // Изменено с event_type на type
                    payload: {
                        answer: answer,
                    },
                }),
            )
            console.log("Sent answer:", answer)

            // Добавляем свой ответ в контейнер
            addPlayerAnswer(currentNick, answer)

            // Очищаем поле ввода
            answerInput.value = ""
        }
    })
}

export { setupEventHandlers }
