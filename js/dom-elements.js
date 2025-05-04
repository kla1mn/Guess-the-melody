// DOM element references
// Screens
const initScreen = document.getElementById("init-screen")
const joinScreen = document.getElementById("join-screen")
const waitingScreen = document.getElementById("waiting-screen")
const gameScreen = document.getElementById("game-screen")
const categoriesCt = document.getElementById("categories-container")
const audioPlayer = document.getElementById("audio-player")

// Inputs
const initNickInput = document.getElementById("init-nickname-input")
const joinNickInput = document.getElementById("join-nickname-input")
const joinInviteInput = document.getElementById("join-invite-input")
const roomCodeEl = document.getElementById("room-code")

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
    initNickInput,
    joinNickInput,
    joinInviteInput,
    roomCodeEl,
    linkInput,
    addLinkBtn,
    startBtn,
    playersListEl,
}
