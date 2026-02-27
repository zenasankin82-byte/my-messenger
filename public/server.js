const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("Пользователь подключился");

    socket.on("message", (msg) => {
        io.emit("message", msg); // отправляем всем
    });

    socket.on("disconnect", () => {
        console.log("Пользователь вышел");
    });
});

server.listen(3000, () => {
    console.log("Сервер запущен: http://localhost:3000");
});
