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
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      user1_id INTEGER NOT NULL,
      user2_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id)
    );
  `);

  console.log("Таблицы messages и chats готовы");
}

app.use(express.static("public"));

io.on("connection", async (socket) => {
  console.log("Пользователь подключился");

  // пользователь сообщает имя и заходит в комнату
  socket.on("join", (username) => {
    onlineUsers.set(socket.id, {
      username: username,
      socketId: socket.id
    });
    socket.join(username);  // соединение с комнатой по имени пользователя
    io.emit("online users", Array.from(onlineUsers.values()));
  });

  // отправка приватного сообщения
  socket.on("private message", async (data) => {
    console.log("Приватное сообщение:", data);

    try {
      // находим или создаём чат
      const chatResult = await pool.query(`
        INSERT INTO chats (user1_id, user2_id)
        VALUES (
          (SELECT id FROM users WHERE username = $1 LIMIT 1),
          (SELECT id FROM users WHERE username = $2 LIMIT 1)
        )
        ON CONFLICT (user1_id, user2_id) DO NOTHING
        RETURNING id
      `, [data.from, data.to]);

      const chatId = chatResult.rows[0]?.id;

      // сохраняем сообщение
      const result = await pool.query(
        "INSERT INTO messages (sender_id, receiver_id, text) VALUES ((SELECT id FROM users WHERE username = $1 LIMIT 1), (SELECT id FROM users WHERE username = $2 LIMIT 1), $3) RETURNING *",
        [data.from, data.to, data.text]
      );

      // отправляем сообщение в комнаты
      io.to(data.to).emit("private message", {
        username: data.from,
        text: data.text
      });

      // отправляем сообщение отправителю
      socket.emit("private message", {
        username: data.from,
        text: data.text
      });

    } catch (err) {
      console.error("Ошибка сохранения:", err);
    }
  });

  // загрузка старых сообщений
  socket.on("join chat", async (data) => {
    try {
      const result = await pool.query(`
        SELECT * FROM messages
        WHERE (sender_id = (SELECT id FROM users WHERE username = $1 LIMIT 1) AND receiver_id = (SELECT id FROM users WHERE username = $2 LIMIT 1))
        OR (sender_id = (SELECT id FROM users WHERE username = $2 LIMIT 1) AND receiver_id = (SELECT id FROM users WHERE username = $1 LIMIT 1))
        ORDER BY created_at ASC
      `, [data.from, data.to]);

      socket.emit("load messages", result.rows);
    } catch (err) {
      console.error("Ошибка загрузки сообщений:", err);
    }
  });

  // отключение пользователя
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("online users", Array.from(onlineUsers.values()));
  });
});

server.listen(process.env.PORT || 3000, async () => {
  await init();
  console.log("Сервер запущен");
});