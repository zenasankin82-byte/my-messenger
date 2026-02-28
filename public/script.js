const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

// спрашиваем имя один раз
let username = localStorage.getItem("username");

if (!username) {
  username = prompt("Введите ваше имя:");
  localStorage.setItem("username", username);
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  if (input.value) {
    socket.emit("message", {
      username: username,
      text: input.value
    });

    input.value = "";
  }
});

// новое сообщение
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