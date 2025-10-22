const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const tmi = require("tmi.js");

let mainWindow;
const folderName = "AutoShoutout";
const appFolderPath = path.join(app.getPath("appData"), folderName);
const configPath = path.join(appFolderPath, "config.json");
const tokenPath = path.join(appFolderPath, "token.enc");
const secretKey = crypto
  .createHash("sha256")
  .update(app.getPath("userData"))
  .digest("base64")
  .substr(0, 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText) {
  const [ivHex, data] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const defaultConfig = {
  username: "DEIN_TWITCH_NAME",
  shoutouts: ["nobl3esse", "NightmageDxD"],
};

function ensureAppFolder() {
  if (!fs.existsSync(appFolderPath))
    fs.mkdirSync(appFolderPath, { recursive: true });
  if (!fs.existsSync(configPath))
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4));
}

function loadData() {
  ensureAppFolder();
  let token = null;
  let config = null;
  if (fs.existsSync(tokenPath)) {
    const encrypted = fs.readFileSync(tokenPath, "utf-8");
    try {
      token = decrypt(encrypted);
    } catch {}
  }
  if (fs.existsSync(configPath))
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return { token, config };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 816,
    minHeight: 500,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  mainWindow.loadFile("index.html");
  mainWindow.webContents.once("did-finish-load", () => {
    const data = loadData();
    mainWindow.webContents.send("config", data);
    mainWindow.webContents.send("app-version", app.getVersion());
  });
}

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.on("update-available", () => {
    mainWindow.webContents.send(
      "status",
      "Update verfügbar – wird heruntergeladen..."
    );
  });
  autoUpdater.on("update-not-available", () => {
    mainWindow.webContents.send("status", "Keine Updates gefunden.");
  });
  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send(
      "status",
      "Update heruntergeladen. Wird beim nächsten Start installiert."
    );
  });
  autoUpdater.on("error", (err) => {
    mainWindow.webContents.send("status", `Updater-Fehler: ${err.message}`);
  });
});

ipcMain.on("select-token", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Wähle deine Twitch Token-Datei",
    filters: [{ name: "Textdateien", extensions: ["txt"] }],
    properties: ["openFile"],
  });
  if (result.canceled) return;
  const tokenPlain = fs.readFileSync(result.filePaths[0], "utf-8").trim();
  const encrypted = encrypt(tokenPlain);
  fs.writeFileSync(tokenPath, encrypted, "utf-8");
  const data = loadData();
  mainWindow.webContents.send("config", data);
});

ipcMain.on("select-config", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Wähle deine Config.json",
    filters: [{ name: "JSON-Dateien", extensions: ["json"] }],
    properties: ["openFile"],
    defaultPath: configPath,
  });
  if (result.canceled) return;
  fs.copyFileSync(result.filePaths[0], configPath);
  const data = loadData();
  mainWindow.webContents.send("config", data);
});

ipcMain.on("edit-config", () => {
  if (fs.existsSync(configPath)) shell.openPath(configPath);
  else
    dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: "Config nicht gefunden",
      message:
        "Die config.json existiert noch nicht. Bitte lade oder erstelle sie zuerst.",
    });
});

ipcMain.on("start-shoutouts", (event, args) => {
  const { token, config } = args;
  if (!token || !config) {
    mainWindow.webContents.send(
      "status",
      "Fehler: Kein Token oder Config geladen."
    );
    return;
  }
  mainWindow.webContents.send("status", "Verbinde mit Twitch...");
  const client = new tmi.Client({
    options: { debug: false },
    identity: { username: config.username, password: token },
    channels: [config.username],
  });
  client
    .connect()
    .then(() => {
      mainWindow.webContents.send("status", `Verbunden mit ${config.username}`);
      let delay = 0;
      config.shoutouts.forEach((soName) => {
        setTimeout(() => {
          const message = `!so @${soName}`;
          client.say(config.username, message);
          mainWindow.webContents.send("log", `Gesendet: ${message}`);
        }, delay);
        delay += 3000;
      });
    })
    .catch((err) => {
      mainWindow.webContents.send("status", `Fehler: ${err.message}`);
    });
});
