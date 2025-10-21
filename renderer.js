// renderer.js
const { ipcRenderer } = require("electron");

let token = null;
let config = null;

//Statusanzeige
ipcRenderer.on("status", (event, message) => {
  const statusEl = document.getElementById("status");

  let icon = "fa-circle-info";
  let color = "#c0c0c0";

  if (message.toLowerCase().includes("fehler")) {
    icon = "fa-circle-xmark";
    color = "#ff4c4c";
  } else if (
    message.toLowerCase().includes("update") ||
    message.toLowerCase().includes("geladen")
  ) {
    icon = "fa-circle-check";
    color = "#50fa7b";
  } else if (
    message.toLowerCase().includes("verbinde") ||
    message.toLowerCase().includes("lade")
  ) {
    icon = "fa-rotate";
    color = "#f1fa8c";
  }

  statusEl.innerHTML = `<i class="fa-solid ${icon}" style="color:${color};margin-right:6px;"></i>${message}`;
});

//Config-/ Tokenanzeige
ipcRenderer.on("config", (event, data) => {
  token = data.token;
  config = data.config;

  document.getElementById("status").innerHTML =
    '<i class="fa-solid fa-circle-check" style="color:#50fa7b;margin-right:6px;"></i>Daten erfolgreich geladen.';

  document.getElementById("username").textContent = config
    ? config.username
    : "-";
  document.getElementById("shoutouts").textContent = config
    ? config.shoutouts.join(", ")
    : "-";
  document.getElementById("token").textContent = token
    ? token.slice(0, 10) + "..."
    : "-";

  document.getElementById("startBtn").disabled = !(token && config);
});

//Logausgabe
ipcRenderer.on("log", (event, message) => {
  const logBox = document.getElementById("log");
  logBox.textContent += message + "\n";
  logBox.scrollTop = logBox.scrollHeight;
});

//Versionsanzeige im Footer
ipcRenderer.on("app-version", (event, version) => {
  const footer = document.getElementById("footer");
  if (footer)
    footer.innerHTML = `<i class="fa-brands fa-twitch" style="color:#9146ff;margin-right:6px;"></i>Powered by Noblesse | v${version}`;
});

//Button Events
document.getElementById("startBtn").addEventListener("click", () => {
  ipcRenderer.send("start-shoutouts", { token, config });
  document.getElementById("log").textContent = "";
});

document.getElementById("loadTokenBtn").addEventListener("click", () => {
  ipcRenderer.send("select-token");
});

document.getElementById("loadConfigBtn").addEventListener("click", () => {
  ipcRenderer.send("select-config");
});

document.getElementById("editConfigBtn").addEventListener("click", () => {
  ipcRenderer.send("edit-config");
});
