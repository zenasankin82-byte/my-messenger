document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const messages = document.getElementById("messages");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (input.value) {
      socket.emit("message", input.value);
      input.value = "";
    }
  });

  socket.on("message", function (msg) {
    const item = document.createElement("li");
    item.textContent = msg;
    messages.appendChild(item);
  });

  socket.on("load messages", function (msgs) {
    messages.innerHTML = ""; // ← ВАЖНО
    msgs.forEach((msg) => {
      const item = document.createElement("li");
      item.textContent = msg.text;
      messages.appendChild(item);
    });
  });
});