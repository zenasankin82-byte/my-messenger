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

const onlineUsers = new Map();

// Создание таблицы сообщений (если её нет)
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender TEXT NOT NULL,
      receiver TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Таблица messages готова");
}

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("Пользователь подключился");

  // Пользователь входит в чат
  socket.on("join", (username) => {
    onlineUsers.set(socket.id, username);
    socket.join(username);
    io.emit("online users", Array.from(onlineUsers.values()));
  });

  // Отправка приватного сообщения
  socket.on("private message", async (data) => {
    try {
      // Сохраняем сообщение в базе
      await pool.query(
        "INSERT INTO messages (sender, receiver, text) VALUES ($1, $2, $3)",
        [data.from, data.to, data.text]
      );

      // Отправляем сообщение получателю
      io.to(data.to).emit("private message", {
        sender: data.from,
        text: data.text,
      });

      // Отправляем сообщение отправителю
      socket.emit("private message", {
        sender: data.from,
        text: data.text,
      });

    } catch (err) {
      console.error("Ошибка сохранения:", err);
    }
  });

  // Загрузка истории чата
  socket.on("join chat", async (data) => {
    try {
      const result = await pool.query(
        `SELECT * FROM messages
         WHERE (sender = $1 AND receiver = $2)
            OR (sender = $2 AND receiver = $1)
         ORDER BY created_at ASC`,
        [data.from, data.to]
      );

      socket.emit("load messages", result.rows);

    } catch (err) {
      console.error("Ошибка загрузки сообщений:", err);
    }
  });

  // Пользователь отключился
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("online users", Array.from(onlineUsers.values()));
  });
});

server.listen(process.env.PORT || 3000, async () => {
  await init();
  console.log("Сервер запущен");
});