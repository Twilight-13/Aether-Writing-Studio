import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

async function run(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} exited with code ${code ?? 'unknown'}`))
    })
  })
}

async function waitForServer(url: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Wait for Vite to finish booting.
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
  await run('npm.cmd', ['run', 'build:electron'])

  const vite = spawn(
    'npm.cmd',
    ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '5173'],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    },
  )

  try {
    await waitForServer('http://127.0.0.1:5173')

    const electronCommand =
      process.platform === 'win32'
        ? 'node_modules\\.bin\\electron.cmd'
        : 'node_modules/.bin/electron'

    const electron = spawn(electronCommand, ['dist-electron/main.js'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        AETHER_DEV_SERVER_URL: 'http://127.0.0.1:5173',
      },
    })

    electron.on('exit', () => {
      vite.kill()
      process.exit(0)
    })
  } catch (error) {
    vite.kill()
    throw error
  }
}

void main()
