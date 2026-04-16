import { app, BrowserWindow, ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createProjectRepository } from './db.js'

const currentFile = fileURLToPath(import.meta.url)
const currentDirectory = dirname(currentFile)

let repository: any = null

function spawnMcpServer(databasePath: string) {
  const mcpScript = join(currentDirectory, 'mcp-server.js')
  if (!existsSync(mcpScript)) return // not built yet — safe to skip

  const child = spawn(process.execPath, [mcpScript, databasePath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  })

  child.on('error', (err) => {
    console.error('[MCP] spawn error:', err.message)
  })

  child.on('exit', (code) => {
    console.log(`[MCP] server exited with code ${code}`)
  })

  return child
}

function createMainWindow() {
  const preloadPath = join(currentDirectory, 'preload.js')
  const window = new BrowserWindow({
    width: 1520,
    height: 960,
    minWidth: 1024,
    minHeight: 768,
    title: 'Aether Writing Studio',
    backgroundColor: '#05001A',
    show: false, // Wait until ready
    autoHideMenuBar: true,
    icon: join(currentDirectory, '..', '..', 'dist', 'icon.png'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.AETHER_DEV_SERVER_URL) {
    void window.loadURL(process.env.AETHER_DEV_SERVER_URL)
    window.webContents.openDevTools({ mode: 'detach' })
    return window
  }

  const rendererPath = join(currentDirectory, '..', '..', 'dist', 'index.html')
  if (existsSync(rendererPath)) {
    void window.loadFile(rendererPath)
  }

  window.once('ready-to-show', () => {
    window.maximize()
    window.show()
  })

  return window
}

function registerIpcHandlers(repo: any) {
  ipcMain.handle('projects:list', () => repo.listProjects())
  ipcMain.handle('projects:create', (_event, payload) => repo.createProject(payload))
  ipcMain.handle('projects:delete', (_event, projectId) => repo.deleteProject(projectId))

  ipcMain.handle('pages:list', (_event, projectId) => repo.listPages(projectId))
  ipcMain.handle('pages:get', (_event, pageId) => repo.getPage(pageId))
  ipcMain.handle('pages:create', (_event, payload) => repo.createPage(payload))
  ipcMain.handle('pages:move', (_event, payload) => repo.movePage(payload))
  ipcMain.handle('pages:save', (_event, payload) => repo.savePage(payload))
  ipcMain.handle('pages:comment', (_event, payload) => repo.addComment(payload))
  ipcMain.handle('pages:restore-version', (_event, payload) => repo.restoreVersion(payload))
  ipcMain.handle('pages:delete', (_event, pageId) => repo.deletePage(pageId))

  ipcMain.handle('map:list', (_event, projectId) => repo.listMapPins(projectId))
  ipcMain.handle('map:save', (_event, pin) => repo.saveMapPin(pin))
  ipcMain.handle('map:delete', (_event, pinId) => repo.deleteMapPin(pinId))
}

// ── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const dbPath = process.env.AETHER_DB_PATH ?? join(app.getPath('userData'), 'data', 'aether.db')
  repository = createProjectRepository(dbPath)
  registerIpcHandlers(repository)

  spawnMcpServer(dbPath)
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
