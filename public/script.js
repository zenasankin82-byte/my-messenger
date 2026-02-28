const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const onlineList = document.getElementById("online");

let username = localStorage.getItem("username");

if (!username) {
  username = prompt("Введите ваше имя:");
  localStorage.setItem("username", username);
}

socket.emit("join", username);

let currentChat = null;

// добавить сообщение
function addMessage(msg, isMine) {
  const div = document.createElement("div");
  div.classList.add("message");

  if (isMine) {
    div.classList.add("my-message");
  } else {
    div.classList.add("other-message");
  }

  div.innerHTML = `
    <div class="username">${msg.username}</div>
    <div>${msg.text}</div>
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// отправка сообщения
form.addEventListener("submit", function (e) {
  e.preventDefault();

  if (!currentChat) {
    alert("Выберите пользователя из списка онлайн");
    return;
  }

  if (input.value.trim() !== "") {
    socket.emit("private message", {
      from: username,
      text: input.value,
      toSocketId: currentChat.socketId
    });

    input.value = "";
  }
});

// получение приватного сообщения
socket.on("private message", function (msg) {
  const isMine = msg.username === username;
  addMessage(msg, isMine);
});

// обновление онлайн списка
socket.on("online users", function (users) {
  onlineList.innerHTML = "";

  users.forEach((user) => {
    if (user.username === username) return;

    const li = document.createElement("li");
    li.textContent = user.username;
    li.style.cursor = "pointer";

    li.addEventListener("click", () => {
      currentChat = user;
      messages.innerHTML = "";
      alert("Чат с " + user.username);
    });

    onlineList.appendChild(li);
  });
});