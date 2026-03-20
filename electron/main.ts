import { app, BrowserWindow, Menu, shell, session } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// =========================================================================
// THE OFFICIAL LIVE URL
// =========================================================================
const LIVE_URL = 'https://sltsecmanage.slt.lk:7443/officer/login'
// =========================================================================

process.env.APP_ROOT = path.join(__dirname, '..')

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    title: 'Customer Service Officer Dashboard'
  })

  // Set a clean menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Application',
      submenu: [
        { label: 'Home', click: () => { win?.loadURL(LIVE_URL) } },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { 
          label: 'Clear App Cache', 
          click: () => { 
            session.defaultSession.clearStorageData().then(() => {
              app.relaunch();
              app.exit();
            })
          } 
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        { label: 'Back', accelerator: 'Alt+Left', click: () => { if(win?.webContents.canGoBack()) win.webContents.goBack() } },
        { label: 'Forward', accelerator: 'Alt+Right', click: () => { if(win?.webContents.canGoForward()) win.webContents.goForward() } }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // Always load the live website in production!
    // Always load the live website with cache revalidation
    win.loadURL(LIVE_URL, { extraHeaders: 'pragma: no-cache\nCache-Control: no-cache\n' })
  }

  // Open external links (like Google or support sites) in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
