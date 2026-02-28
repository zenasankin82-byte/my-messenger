const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const onlineList = document.getElementById("online");

// получаем имя пользователя
let username = localStorage.getItem("username");

if (!username) {
  username = prompt("Введите ваше имя:");
  localStorage.setItem("username", username);
}

// сообщаем серверу что пользователь вошёл
socket.emit("join", username);

// функция добавления сообщения в чат
function addMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");

  if (msg.username === username) {
    div.classList.add("my-message");
  } else {
    div.classList.add("other-message");
  }

  div.innerHTML = `
    <div class="username">${msg.username}</div>
    <div>${msg.text}</div>
  `;

  messages.appendChild(div);

  // автоскролл вниз
  messages.scrollTop = messages.scrollHeight;
}

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

// получение нового сообщения
socket.on("message", function (msg) {
  addMessage(msg);
});

// загрузка старых сообщений
socket.on("load messages", function (msgs) {
  messages.innerHTML = "";
  msgs.forEach(addMessage);
});

// обновление списка онлайн пользователей
socket.on("online users", function (users) {
  onlineList.innerHTML = "";

  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user + " (online)";
    onlineList.appendChild(li);
  });
});