import { contextBridge, ipcRenderer } from 'electron'
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
  listProjects(): Promise<ProjectSummary[]> {
    return ipcRenderer.invoke('projects:list')
  },

  createProject(input: CreateProjectInput): Promise<ProjectSummary> {
    return ipcRenderer.invoke('projects:create', input)
  },

  listPages(projectId: number): Promise<PageSummary[]> {
    return ipcRenderer.invoke('pages:list', projectId)
  },

  getPage(pageId: number): Promise<PageDocument> {
    return ipcRenderer.invoke('pages:get', pageId)
  },

  createPage(input: CreatePageInput): Promise<PageSummary> {
    return ipcRenderer.invoke('pages:create', input)
  },

  movePage(input: MovePageInput): Promise<PageSummary[]> {
    return ipcRenderer.invoke('pages:move', input)
  },

  savePage(input: SavePageInput): Promise<PageDocument> {
    return ipcRenderer.invoke('pages:save', input)
  },

  addComment(input: AddCommentInput): Promise<PageDocument> {
    return ipcRenderer.invoke('pages:comment', input)
  },

  restoreVersion(input: RestoreVersionInput): Promise<PageDocument> {
    return ipcRenderer.invoke('pages:restore-version', input)
  },

  deleteProject(projectId: number): Promise<void> {
    return ipcRenderer.invoke('projects:delete', projectId)
  },

  deletePage: (pageId: number) => ipcRenderer.invoke('pages:delete', pageId),

  // Map
  listMapPins: (projectId: number) => ipcRenderer.invoke('map:list', projectId),
  saveMapPin: (pin: any) => ipcRenderer.invoke('map:save', pin),
  deleteMapPin: (pinId: string) => ipcRenderer.invoke('map:delete', pinId),
}
contextBridge.exposeInMainWorld('aetherDesktop', api)
