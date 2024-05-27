// Modules to control application life and create native browser window
const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require("electron");
const path = require("node:path");
const { conversation, screenshot } = require('./apiService');
const io = require('socket.io-client');
const config = require("./config")

const socket = io('http://127.0.0.1:5000');
socket.on('directory', (response) => {
  showMessage(response.data)
});

socket.on('screenshot', (response) => {
  showMessage(response.data.initial_response)
});

var petWindow;
var chatboxInputWindow;
var chatboxResponseWindow;
var petOrientation = 1;

function getPetWindowSize() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const petWindowHeight = 272 * config.SCALE
  const petWindowWidth = 272 * config.SCALE
  const petWindowSize = {
    width: petWindowWidth,
    height: petWindowHeight
  }

  return petWindowSize
}

function petStepHandler(event, dx, dy) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  const petWindowSize = getPetWindowSize()
  const screenSize = screen.getPrimaryDisplay().workAreaSize;

  let newX = win.getPosition()[0] + dx
  let newY = win.getPosition()[1] + dy

  const minX = Math.floor(petWindowSize.width * 0.3) - petWindowSize.width
  const maxX = screenSize.width - Math.floor(petWindowSize.width * 0.3)

  const minY = Math.floor(petWindowSize.height * 0.3) - petWindowSize.height
  const maxY = screenSize.height - Math.floor(petWindowSize.height * 0.3)

  if (newX > maxX) {
    newX = minX
  } else if (newX < minX) {
    newX = maxX
  }

  if (newY > maxY) {
    newY = minY
  } else if (newY < minY) {
    newY = maxY
  }

  win.setBounds({
    width: petWindowSize.width,
    height: petWindowSize.height,
    x: newX,
    y: newY
  });

  webContents.send('petPosition', { x: newX, y: newY });

  if (petWindow.getPosition()[0] + getPetWindowSize().width > screen.getPrimaryDisplay().workAreaSize.width) {
    return {
      type: "set-orientation",
      value: -1
    }
  }
  else if(petWindow.getPosition()[0] < 0) {
    return {
      type: "set-orientation",
      value: 1
    }
  }
  
  return {}
}

function initPositionHandler(event) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  const screenSize = screen.getPrimaryDisplay().workAreaSize;

  let newX = win.getPosition()[0]
  let newY = win.getPosition()[1]
  webContents.send('petPosition', { x: newX, y: newY });
  return { screenWidth: screenSize.width, screenHeight: screenSize.height };
}

function createPetWindow() {
  const petWindowSize = getPetWindowSize();

  petWindow = new BrowserWindow({
    width: petWindowSize.width,
    height: petWindowSize.height,
    x: 0,
    y: screen.getPrimaryDisplay().workAreaSize.height - getPetWindowSize().height,
    transparent: true,
    frame: false,
    useContentSize: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      enableRemoteModule: true
    },
  });

  petWindow.loadFile("pet.html");
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  petWindow.setIgnoreMouseEvents(true);
  // petWindow.webContents.openDevTools({mode: 'detach'});
}

function createChatboxInputWindow() {
  chatboxInputWindow = new BrowserWindow({
    width: 600,
    height: 56,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    useContentSize: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      enableRemoteModule: true
    },
  });

  chatboxInputWindow.loadFile("chatbox-input.html");
  chatboxInputWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  chatboxInputWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  // chatboxInputWindow.webContents.openDevTools({mode: "detach"});
}

function createChatboxResponseWindow() {
  chatboxResponseWindow = new BrowserWindow({
    width: 1000 * config.SCALE,
    height: 600 * config.SCALE,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    useContentSize: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      enableRemoteModule: true
    },
  });

  chatboxResponseWindow.loadFile("chatbox-response.html");
  chatboxResponseWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  chatboxResponseWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  // chatboxResponseWindow.webContents.openDevTools({mode: 'detach'});

  return chatboxResponseWindow;
}

function showMessage(message) {
  if (petWindow.getPosition()[0] + getPetWindowSize().width / 2 < screen.getPrimaryDisplay().workAreaSize.width / 2) {
    petOrientation = 1
  } else {
    petOrientation = -1
  }

  chatboxResponseWindow.webContents.send("message", {
    text: message,
    orientation: petOrientation
  })
  petWindow.webContents.send("message", {
    text: "response-open",
    orientation: petOrientation
  })

  chatboxResponseWindow.hide();

  chatboxResponseWindow.setBounds({
    width: 800 * config.SCALE,
    height: 400 * config.SCALE,
    x: petWindow.getPosition()[0] - (700 * config.SCALE),
    y: petWindow.getPosition()[1] - (300 * config.SCALE)
  });
  chatboxResponseWindow.show();
}

var processingMessage = false

function handleSubmitMessage(event, type, message) {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);

  if (type === "input") {

    processingMessage = true
    petWindow.webContents.send("message", {
      text: "processing-message",
      orientation: petOrientation
    })

    win.hide();
    conversation(message)
    .then(
      response => {
        processingMessage = false
        showMessage(response.data)
      }
    )
    .catch(error => {
      // Handle error
      console.error('Error fetching conversation:', error);
    });
  }
  else if (type === "response-size") {
    const width = Math.ceil(message.width);
    const height = Math.ceil(message.height);

    let responsePositionX = 0;
    if (petOrientation == 1) {
      responsePositionX = Math.max(0,
        Math.min(
          petWindow.getPosition()[0] + getPetWindowSize().width - (50 * config.SCALE),
          screen.getPrimaryDisplay().workAreaSize.width - width),
      );
    }
    else {
      responsePositionX = Math.max(0,
        Math.min(
          petWindow.getPosition()[0] - width + 70,
          screen.getPrimaryDisplay().workAreaSize.width - width),
      );  
    }
    
    const responsePositionY = petWindow.getPosition()[1] - height + (50 * config.SCALE);
    chatboxResponseWindow.setBounds({
      width: width,
      height: height,
      x: responsePositionX,
      y: responsePositionY,
    });

    chatboxResponseWindow.show();
  }
  else if (type === "response-close") {
    win.hide();
    petWindow.webContents.send("message", { text: "response-close" });
  };

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.on('submit-message', handleSubmitMessage);
  ipcMain.handle('pet-step', petStepHandler);
  ipcMain.handle('init-position', initPositionHandler);

  createPetWindow();
  createChatboxInputWindow();
  createChatboxResponseWindow();

  globalShortcut.register('CommandOrControl+L', () => {
    if (processingMessage) return

    if (chatboxInputWindow.isVisible()) {
      chatboxInputWindow.hide();
    } else {
      chatboxInputWindow.webContents.send("show");
      chatboxInputWindow.show();
    }
  })

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})