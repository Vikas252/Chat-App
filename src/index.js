const express = require("express")
const http = require("http")
const path = require("path")
const socketio = require("socket.io")
const Filter = require("bad-words")

const { generateMessage, generateLoactionMessage } = require("./utils/messages")
const {
  addUser,
  removeUser,
  getUser,
  getUsersInroom,
} = require("./utils/users")

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, "../public")

app.use(express.static(publicDirectoryPath))
app.use(
  "/css",
  express.static(path.join(__dirname, "../node_modules/bootstrap/dist/css"))
)
app.use(
  "/js",
  express.static(path.join(__dirname, "../node_modules/bootstrap/dist/js"))
)
app.use(
  "/js",
  express.static(path.join(__dirname, "../node_modules/jquery/dist"))
)

//let count = 0
//let message = "Welcome!"

io.on("connection", (socket) => {
  console.log("New web socket connection")

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({
      id: socket.id,
      ...options,
    })

    if (error) {
      return callback(error)
    }

    socket.join(user.room)

    socket.emit("message", generateMessage("Admin", "Welcome!"))
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage(
          "Admin",
          `${user.username} has joined the room ${user.room}`
        )
      )

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInroom(user.room),
    })

    callback()
  })

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id)
    const filter = new Filter()

    if (filter.isProfane(message)) {
      return callback("Profanity not allowed")
    }

    io.to(user.room).emit("message", generateMessage(user.username, message))
    callback()
  })

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id)
    io.to(user.room).emit(
      "locationMessage",
      generateLoactionMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    )
    callback()
  })

  socket.on("disconnect", () => {
    const user = removeUser(socket.id)

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(
          "Admin",
          `${user.username} has left the room ${user.room}`
        )
      )
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInroom(user.room),
      })
    }
  })
})
// socket.emit("countUpdated", count)

// socket.on("increment", () => {
//   count++
//   //socket.emit("countUpdated", count)
//   io.emit("countUpdated", count)
// })

server.listen(port, () => {
  console.log("Server running at port", port)
})
