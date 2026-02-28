const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

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

  // Загружаем старые сообщения
  try {
    const result = await pool.query(
      "SELECT * FROM messages ORDER BY created_at ASC"
    );

    console.log("Загружено сообщений:", result.rows.length);
    socket.emit("load messages", result.rows);
  } catch (err) {
    console.error("Ошибка загрузки:", err);
  }

  // Получаем новое сообщение
  socket.on("message", async (data) => {
    try {
      console.log("Получено сообщение:", data);

      const result = await pool.query(
        "INSERT INTO messages (username, text) VALUES ($1, $2) RETURNING *",
        [data.username, data.text]
      );

      console.log("Сохранено в БД:", result.rows[0]);

      // Отправляем всем сохранённый объект
      io.emit("message", result.rows[0]);
    } catch (err) {
      console.error("Ошибка сохранения:", err);
    }
  });
});

server.listen(process.env.PORT || 3000, async () => {
  await init();
  console.log("Сервер запущен");
});