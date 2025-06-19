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
import { setCurrentCode, setCurrentNick, setIsHost } from "./game-state.js"

const getGameState = () => import("./game-state.js")

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

async function handleStartGame() {
    const { socket } = await getGameState()
    startGame(socket)
}

async function handleLeaveRoom() {
    const { clearState } = await getGameState()
    clearState()
    window.location.reload()
}

async function handleAnswerSubmission(event) {
    event.preventDefault()

    const answer = answerInput?.value.trim()
    if (!answer) return

    const { socket, currentNick } = await getGameState()
    if (socket) {
        socket.send(JSON.stringify({
            type: "answer",
            payload: {
                nickname: currentNick,
                answer: answer,
            },
        }))
        answerInput.value = ""
    }
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
}