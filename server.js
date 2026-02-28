const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// онлайн пользователи
const onlineUsers = new Map();

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Таблица messages готова");
}

app.use(express.static("public"));

io.on("connection", async (socket) => {
  console.log("Пользователь подключился");

  // вход пользователя
  socket.on("join", (username) => {
    onlineUsers.set(socket.id, {
      username: username,
      socketId: socket.id
    });

    io.emit("online users", Array.from(onlineUsers.values()));
  });

  // приватное сообщение
  socket.on("private message", async (data) => {
    console.log("Приватное сообщение:", data);

    try {
      await pool.query(
        "INSERT INTO messages (username, text) VALUES ($1, $2)",
        [data.from, data.text]
      );

      // отправляем получателю
      io.to(data.toSocketId).emit("private message", {
        username: data.from,
        text: data.text
      });

      // отправляем отправителю
      socket.emit("private message", {
        username: data.from,
        text: data.text
      });

    } catch (err) {
      console.error("Ошибка сохранения:", err);
    }
  });

  // отключение
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("online users", Array.from(onlineUsers.values()));
  });
});

server.listen(process.env.PORT || 3000, async () => {
  await init();
  console.log("Сервер запущен");
});