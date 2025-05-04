// DOM element references
// Screens
const initScreen = document.getElementById("init-screen")
const joinScreen = document.getElementById("join-screen")
const waitingScreen = document.getElementById("waiting-screen")
const gameScreen = document.getElementById("game-screen")
const categoriesCt = document.getElementById("categories-container")
const audioPlayer = document.getElementById("audio-player")
const answersContainer = document.getElementById("answers-container")
const playOverlay = document.getElementById("play-overlay")
const answerForm = document.getElementById("answer-form")

// Inputs
const initNickInput = document.getElementById("init-nickname-input")
const joinNickInput = document.getElementById("join-nickname-input")
const joinInviteInput = document.getElementById("join-invite-input")
const roomCodeEl = document.getElementById("room-code")
const answerInput = document.getElementById("answer-input")

// Waiting screen elements
const linkInput = document.getElementById("link-input")
const addLinkBtn = document.getElementById("add-link-btn")
const startBtn = document.getElementById("start-btn")

// Player list
const playersListEl = document.getElementById("players-list")

export {
    initScreen,
    joinScreen,
    waitingScreen,
    gameScreen,
    categoriesCt,
    audioPlayer,
    answersContainer,
    playOverlay,
    answerForm,
    initNickInput,
    joinNickInput,
    joinInviteInput,
    roomCodeEl,
    answerInput,
    linkInput,
    addLinkBtn,
    startBtn,
    playersListEl,
}
