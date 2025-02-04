import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";  // Correct import
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();
const server = createServer(app);

// Correct the instantiation of the Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",  // Allow all origins (update this for better security in production)
    methods: ["GET", "POST"],
  },
});

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


// Serve static files
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"))
})
app.get("/1", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "demo.html"))
})

const rooms = new Map()

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`)
    socket.on("join-room", (roomName) => {
        socket.join(roomName)
        if (!rooms.has(roomName)) {
            rooms.set(roomName, new Set())
        }
        rooms.get(roomName).add(socket.id)
        socket.to(roomName).emit("user-connected", socket.id)

        // Send list of existing participants to the new user
        const participants = Array.from(rooms.get(roomName))
        socket.emit("existing-participants", participants)
    })

    socket.on("voice-activity", ({ userId, room }) => {
        if (room) {
            socket.to(room).emit("voice-activity", { userId }); // Broadcast to everyone else in the room
        }
    });

    socket.on("voice-muted", ({ userId, room }) => {
        if (room) {
            socket.to(room).emit("voice-muted", { userId }); // Broadcast to everyone else in the room
        }
    });




    socket.on("offer", ({ userId, offer }) => {
        socket.to(userId).emit("offer", { userId: socket.id, offer })
    })

    socket.on("answer", ({ userId, answer }) => {
        socket.to(userId).emit("answer", { userId: socket.id, answer })
    })

    socket.on("ice-candidate", ({ userId, candidate }) => {
        socket.to(userId).emit("ice-candidate", { userId: socket.id, candidate })
    })

    socket.on("chat-message", ({ room, message }) => {
        socket.to(room).emit("chat-message", { sender: socket.id, message })
    })

    socket.on("disconnecting", () => {
        for (const room of socket.rooms) {
            if (rooms.has(room)) {
                rooms.get(room).delete(socket.id)
                if (rooms.get(room).size === 0) {
                    rooms.delete(room)
                }
                socket.to(room).emit("user-disconnected", socket.id)
            }
        }
    })

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`)
    })
})

const PORT = process.env.PORT || 9000
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})