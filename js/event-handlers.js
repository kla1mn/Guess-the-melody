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

// Setup all event handlers
function setupEventHandlers() {
    console.log("Setting up event handlers")
    document.getElementById("logout-btn").classList.add("hidden")

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

        // Скрываем кнопку выхода из игры
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

                // Скрываем кнопку выхода из игры
                document.getElementById("logout-btn").classList.add("hidden")

                clearState()

                window.location.reload()
            } else {
                console.error("Ошибка при удалении токена:", res.status)
                alert("Ошибка при выходе из игры. Попробуйте еще раз.")
            }
        } catch (error) {
            console.error("Ошибка при выходе из игры:", error)
            alert("Ошибка при выходе из игры. Проверьте соединение с сервером.")
        }
    })

    // Add playlist link button
    addLinkBtn?.addEventListener("click", async () => {
        if (linkAdded) {
            return alert("Ссылка уже добавлена")
        }

        const link = linkInput.value.trim()
        await addPlaylistLink(link)
    })

    // Обновляем обработчик кнопки старта игры
    // Start game button (host only)
    startBtn?.addEventListener("click", () => {
        startGame(socket)
    })

    // Добавляем обработчик стандартного события submit, чтобы предотвратить перезагрузку страницы
    answerForm?.addEventListener("submit", (e) => {
        e.preventDefault() // Предотвращаем стандартное поведение формы
        console.log("Form submit prevented")

        // Создаем и диспатчим кастомное событие "answer"
        const answerEvent = new Event("answer")
        answerForm.dispatchEvent(answerEvent)
    })

    // Обработчик кастомного события "answer"
    answerForm?.addEventListener("answer", () => {
        // Проверяем, что текущий игрок не хост
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

                // Добавляем свой ответ в контейнер
                import("./ui-renderer.js").then(({ addPlayerAnswer }) => {
                    addPlayerAnswer(currentNick, answer)
                })

                // Очищаем поле ввода
                answerInput.value = ""

                // Скрываем форму ответа после отправки
                answerForm.classList.add("hidden")
            }
        })
    })
}

export { setupEventHandlers }
