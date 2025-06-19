import { WS_BACKEND } from "./config.js"
import { setSocket } from "./game-state.js"
import { handleEvent } from "./websocket-events.js"

let socket = null

export function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    console.log("WS: already connected or connecting right now")
    return socket
  }

  console.log("Connecting to WebSocket...")
  socket = new WebSocket(WS_BACKEND)

  socket.addEventListener("open", () => {
    console.log("WS: connected successfully")
  })

  socket.addEventListener("message", (event) => {
    let msg
    try {
      msg = JSON.parse(event.data)
      console.log(`Received: ${JSON.stringify(msg)}`)
    } catch (e) {
      console.error("WS: incorrect JSON", event.data, e)
      return
    }
    handleEvent(msg.type, msg.payload)
  })

  socket.addEventListener("error", (e) => {
    console.error("WS: error", e)
  })

  socket.addEventListener("close", (e) => {
    console.log("WS: connection closed", e.reason)
    for (let i = 0; i < 5; i++) {
      setTimeout(connectWebSocket, 2000)
    }
  })

  setSocket(socket)
  return socket
}

export function transferHost(nickname) {
  if (!socket) {
    console.error("Socket not connected")
    return
  }

  console.log("New host:", nickname)
  socket.send(
    JSON.stringify({
      type: "transfer_master",
      payload: {
        nickname: nickname,
      },
    }),
  )
}
