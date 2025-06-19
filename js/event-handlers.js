import {
    addLinkBtn,
    answerForm,
    answerInput,
    backBtn,
    createBtn,
    enterBtn,
    initNickInput,
    initScreen,
    joinInviteInput,
    joinMenuBtn,
    joinNickInput,
    joinScreen,
    leaveBtn,
    linkInput,
    logoutBtn,
    startBtn,
} from "./dom-elements.js"
import { addPlaylistLink, createRoom, joinRoom, showWaiting, startGame } from "./ui-manager.js"
import {
    setCurrentCode,
    setCurrentNick,
    setIsHost,
    socket,
    currentCode,
    clearState,
    currentNick,
} from "./game-state.js"

async function handleCreateRoom() {
    const nickname = initNickInput.value.trim()
    if (!nickname) return

    const inviteCode = await createRoom(nickname)
    if (inviteCode) {
        setCurrentNick(nickname)
        setCurrentCode(inviteCode)
        setIsHost(true)
        showWaiting()
    }
}

function handleJoinMenu() {
    joinNickInput.value = initNickInput.value.trim()
    initScreen.classList.add("hidden")
    joinScreen.classList.remove("hidden")
}

async function handleJoinRoom() {
    const nickname = joinNickInput.value.trim()
    const inviteCode = joinInviteInput.value.trim()

    if (!nickname || !inviteCode) return

    const success = await joinRoom(nickname, inviteCode)
    if (success) {
        setCurrentNick(nickname)
        setCurrentCode(inviteCode)
        setIsHost(false)
        showWaiting()
    }
}

function handleBackNavigation() {
    joinScreen.classList.add("hidden")
    initScreen.classList.remove("hidden")
}

function handleAddPlaylist() {
    const link = linkInput.value.trim()
    if (link) {
        addPlaylistLink(link)
    }
}

function handleStartGame() {
    startGame(socket)
}

function handleLeaveRoom() {
    clearState()
    window.location.reload()
}

function handleAnswerSubmission(event) {
    event.preventDefault()

    const answer = answerInput?.value.trim()
    if (!answer) return

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
}

function handleCopyCode() {
    const copyBtn = document.getElementById("copy-code-btn")

    if (!currentCode) {
        console.error("No room code to copy")
        return
    }

    navigator.clipboard
        .writeText(currentCode)
        .then(() => {
            copyBtn.classList.add("copied")
            copyBtn.textContent = "✓"

            setTimeout(() => {
                copyBtn.classList.remove("copied")
                copyBtn.textContent = "📋"
            }, 1000)

            console.log("Room code copied to clipboard:", currentCode)
        })
        .catch((err) => {
            console.error("Failed to copy room code:", err)

            // для старых браузеров
            const textArea = document.createElement("textarea")
            textArea.value = currentCode
            document.body.appendChild(textArea)
            textArea.select()

            try {
                document.execCommand("copy")
                copyBtn.classList.add("copied")
                copyBtn.textContent = "✓"

                setTimeout(() => {
                    copyBtn.classList.remove("copied")
                    copyBtn.textContent = "📋"
                }, 1000)
            } catch (fallbackErr) {
                console.error("Fallback copy failed:", fallbackErr)
                alert("Не удалось скопировать код. Попробуйте выделить и скопировать вручную.")
            }

            document.body.removeChild(textArea)
        })
}

export function setupEventHandlers() {
    console.log("Setting up event handlers...")

    createBtn?.addEventListener("click", handleCreateRoom)
    joinMenuBtn?.addEventListener("click", handleJoinMenu)
    enterBtn?.addEventListener("click", handleJoinRoom)
    backBtn?.addEventListener("click", handleBackNavigation)
    leaveBtn?.addEventListener("click", handleLeaveRoom)
    logoutBtn?.addEventListener("click", handleLeaveRoom)

    addLinkBtn?.addEventListener("click", handleAddPlaylist)
    startBtn?.addEventListener("click", handleStartGame)
    answerForm?.addEventListener("submit", handleAnswerSubmission)

    const copyCodeBtn = document.getElementById("copy-code-btn")
    copyCodeBtn?.addEventListener("click", handleCopyCode)
}
