const { ipcRenderer } = require("electron");

let token = null;
let config = null;

ipcRenderer.on("status", (event, message) => {
  document.getElementById("status").textContent = message;
});

ipcRenderer.on("config", (event, data) => {
  token = data.token;
  config = data.config;
  document.getElementById("status").textContent = "Daten erfolgreich geladen.";
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

ipcRenderer.on("log", (event, message) => {
  const logBox = document.getElementById("log");
  logBox.textContent += message + "\n";
  logBox.scrollTop = logBox.scrollHeight;
});

ipcRenderer.on("app-version", (event, version) => {
  const footer = document.getElementById("footer");
  if (footer) footer.textContent = `Powered by Noblesse | v${version}`;
});

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
