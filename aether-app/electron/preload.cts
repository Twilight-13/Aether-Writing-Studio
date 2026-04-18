const { contextBridge, ipcRenderer } = require('electron')

// Types are handled by tsc, so we don't need the explicit import type for require
// but we need the types for the file to compile.
// I'll keep them as import type because they are removed on compile.
import type {
  PageDocument,
  PageSummary,
  PageVersion,
  ProjectSummary,
  ProjectType,
} from './db.js'

type CreateProjectInput = {
  name: string
  type: ProjectType
}

type CreatePageInput = {
  projectId: number
  parentId: number | null
  title: string
}

type MovePageInput = {
  pageId: number
  targetPageId: number
}

type SavePageInput = {
  pageId: number
  title: string
  blocks: PageDocument['blocks']
  createVersion: boolean
}

type AddCommentInput = {
  pageId: number
  blockKey: string
  body: string
}

type RestoreVersionInput = {
  pageId: number
  versionId: PageVersion['id']
}

const api = {
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (payload: CreateProjectInput) => ipcRenderer.invoke('projects:create', payload),
    delete: (projectId: number) => ipcRenderer.invoke('projects:delete', projectId),
  },
  pages: {
    list: (projectId: number) => ipcRenderer.invoke('pages:list', projectId),
    get: (pageId: number) => ipcRenderer.invoke('pages:get', pageId),
    create: (payload: CreatePageInput) => ipcRenderer.invoke('pages:create', payload),
    move: (payload: MovePageInput) => ipcRenderer.invoke('pages:move', payload),
    save: (payload: SavePageInput) => ipcRenderer.invoke('pages:save', payload),
    comment: (payload: AddCommentInput) => ipcRenderer.invoke('pages:comment', payload),
    restoreVersion: (payload: RestoreVersionInput) => ipcRenderer.invoke('pages:restore-version', payload),
    delete: (pageId: number) => ipcRenderer.invoke('pages:delete', pageId),
  },
  map: {
    list: (projectId: number) => ipcRenderer.invoke('map:list', projectId),
    save: (pin: any) => ipcRenderer.invoke('map:save', pin),
    delete: (pinId: string) => ipcRenderer.invoke('map:delete', pinId),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
