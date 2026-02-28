const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const onlineList = document.getElementById("online");

// имя пользователя
let username = localStorage.getItem("username");

if (!username) {
  username = prompt("Введите ваше имя:");
  localStorage.setItem("username", username);
}

// сообщаем серверу что мы вошли
socket.emit("join", username);

// отправка сообщения
form.addEventListener("submit", function (e) {
  e.preventDefault();

  if (input.value.trim() !== "") {
    socket.emit("message", {
      username: username,
      text: input.value
    });

    input.value = "";
  }
});

// получаем новое сообщение
socket.on("message", function (msg) {
  const item = document.createElement("li");
  item.textContent = msg.username + ": " + msg.text;
  messages.appendChild(item);
});

// загрузка старых сообщений
socket.on("load messages", function (msgs) {
  messages.innerHTML = "";

  msgs.forEach((msg) => {
    const item = document.createElement("li");
    item.textContent = msg.username + ": " + msg.text;
    messages.appendChild(item);
  });
});

// список онлайн пользователей
socket.on("online users", function (users) {
  onlineList.innerHTML = "";

  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user + " (online)";
    onlineList.appendChild(li);
  });
});