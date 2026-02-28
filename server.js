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

// список онлайн пользователей
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

  // пользователь сообщает имя
  socket.on("join", (username) => {
    onlineUsers.set(socket.id, username);
    io.emit("online users", Array.from(onlineUsers.values()));
  });

  // загрузка старых сообщений
  try {
    const result = await pool.query(
      "SELECT * FROM messages ORDER BY created_at ASC"
    );
    socket.emit("load messages", result.rows);
  } catch (err) {
    console.error("Ошибка загрузки:", err);
  }

  // получение нового сообщения
  socket.on("message", async (data) => {
    console.log("Получено сообщение:", data);

    try {
      const result = await pool.query(
        "INSERT INTO messages (username, text) VALUES ($1, $2) RETURNING *",
        [data.username, data.text]
      );

      io.emit("message", result.rows[0]);
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