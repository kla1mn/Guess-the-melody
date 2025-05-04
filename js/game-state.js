import { showWaiting } from "./ui-manager.js"

// Game state variables
let socket = null
let currentNick = ""
let currentCode = ""
let isHost = false
let linkAdded = false

// Load saved state from localStorage
function loadSavedState() {
    const savedCode = localStorage.getItem("guessthemelody_code")
    const savedNick = localStorage.getItem("guessthemelody_nick")
    const savedIsHost = localStorage.getItem("guessthemelody_isHost")

    if (savedCode && savedNick) {
        currentCode = savedCode
        currentNick = savedNick
        isHost = savedIsHost === "1"

        showWaiting()
    }
}

// Save current state to localStorage
function saveState() {
    localStorage.setItem("guessthemelody_code", currentCode)
    localStorage.setItem("guessthemelody_nick", currentNick)
    localStorage.setItem("guessthemelody_isHost", isHost ? "1" : "0")
}

// Clear saved state
function clearState() {
    localStorage.removeItem("guessthemelody_code")
    localStorage.removeItem("guessthemelody_nick")
    localStorage.removeItem("guessthemelody_isHost")
}

export { socket, currentNick, currentCode, isHost, linkAdded, loadSavedState, saveState, clearState }

// Allow these to be modified from other modules
export function setSocket(newSocket) {
    socket = newSocket
}

export function setCurrentNick(nick) {
    currentNick = nick
}

export function setCurrentCode(code) {
    currentCode = code
}

export function setIsHost(host) {
    isHost = host
}

export function setLinkAdded(added) {
    linkAdded = added
}
