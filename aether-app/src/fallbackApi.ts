import type { DesktopApi, PageDocument, PageSummary, ProjectSummary } from './models'
import {
  calculateWordCount,
  clone,
  createEmptyBlock,
  makeBlockKey,
  synchronizeChapterMetrics,
  type CreateProjectInput,
  type MapPin,
  type PageBlock,
} from './models'

declare global {
  interface Window {
    aetherDesktop?: DesktopApi
  }
}



export function getDesktopApi(): DesktopApi {
  if (window.aetherDesktop) {
    return window.aetherDesktop
  }

  console.warn('[Aether] Initializing in-memory fallback API. Data will not persist across restarts.')

  const projects: ProjectSummary[] = []

  const pagesByProject = new Map<number, PageSummary[]>()
  const documents = new Map<number, PageDocument>()
  const versionSnapshots = new Map<number, { title: string; blocks: PageBlock[] }>()

  // Seed map pins
  const mapPins = new Map<string, MapPin>()


  let nextProjectId = 4
  let nextPageId = 400
  let nextCommentId = 1
  let nextVersionId = 100

  for (const document of documents.values()) {
    const firstVersion = document.versions[0]
    if (firstVersion) {
      versionSnapshots.set(firstVersion.id, { title: document.page.title, blocks: clone(document.blocks) })
    }
  }

  const updateProjectTimestamp = (projectId: number) => {
    const project = projects.find((entry) => entry.id === projectId)
    if (project) project.lastEditedAt = new Date().toISOString()
  }

  const getPagesForProject = (projectId: number) => clone(pagesByProject.get(projectId) ?? [])
  const getDocument = (pageId: number) => {
    const document = documents.get(pageId)
    if (!document) throw new Error(`Page ${pageId} not found.`)
    return clone(document)
  }

  const saveDocument = (pageId: number, title: string, blocks: PageBlock[], createVersion: boolean) => {
    const document = documents.get(pageId)
    if (!document) throw new Error(`Page ${pageId} not found.`)

    document.page.title = title.trim() || 'Untitled Page'
    document.blocks = clone(
      synchronizeChapterMetrics(blocks.length > 0 ? blocks : [createEmptyBlock('paragraph')]),
    )
    document.comments = document.comments.filter((comment) =>
      document.blocks.some((block) => block.blockKey === comment.blockKey),
    )

    if (createVersion) {
      const versionId = nextVersionId++
      document.versions.unshift({ id: versionId, pageId, createdAt: new Date().toISOString() })
      versionSnapshots.set(versionId, { title: document.page.title, blocks: clone(document.blocks) })
    }

    const pages = pagesByProject.get(document.page.projectId)
    const page = pages?.find((entry) => entry.id === pageId)
    if (page) page.title = document.page.title
    updateProjectTimestamp(document.page.projectId)
    return clone(document)
  }

  const createNotesProject = (project: ProjectSummary) => {
    const rootPages = ['Project Overview', 'Research', 'Reference', 'Scraps'].map((title, index) => ({
      id: nextPageId++,
      projectId: project.id,
      parentId: null,
      title,
      pageType: 'page',
      sortOrder: index,
    }))

    pagesByProject.set(project.id, rootPages)
    for (const page of rootPages) {
      const document: PageDocument = {
        page: clone(page),
        blocks: page.sortOrder === 0 ? [{ blockKey: makeBlockKey(), type: 'heading1', data: { text: page.title } }, { blockKey: makeBlockKey(), type: 'paragraph', data: { text: 'Start collecting notes, fragments, and outlines here.' } }] : [createEmptyBlock('paragraph')],
        comments: [],
        versions: [{ id: nextVersionId++, pageId: page.id, createdAt: new Date().toISOString() }],
      }
      documents.set(page.id, document)
      versionSnapshots.set(document.versions[0].id, { title: document.page.title, blocks: clone(document.blocks) })
    }
  }

  const createWritingProject = (_project: ProjectSummary) => {
    // No-op for now as seeds are removed, or implement basic writing project structure
  }

  return {
    async listProjects() {
      return clone(projects).sort((left, right) => right.lastEditedAt.localeCompare(left.lastEditedAt))
    },

    async createProject(input: CreateProjectInput) {
      const project: ProjectSummary = {
        id: nextProjectId++,
        name: input.name,
        type: input.type,
        lastEditedAt: new Date().toISOString(),
        accentColor: input.type === 'notes' ? '#FF6DB0' : input.type === 'story' ? '#00D4C8' : '#9B6DFF',
        icon: input.type === 'notes' ? 'NT' : input.type === 'story' ? 'ST' : 'NV',
        archived: false,
        synopsis: input.type === 'notes' ? 'A flexible workspace for references, research, and raw fragments.' : 'A fresh story space generated from the Aether writing template.',
      }
      projects.unshift(project)
      if (project.type === 'notes') createNotesProject(project)
      else createWritingProject(project)
      return clone(project)
    },

    async listPages(projectId) {
      return getPagesForProject(projectId)
    },

    async getPage(pageId) {
      return getDocument(pageId)
    },

    async createPage(input) {
      const existingPages = pagesByProject.get(input.projectId) ?? []
      const siblingCount = existingPages.filter((page) => page.parentId === input.parentId).length
      const page: PageSummary = {
        id: nextPageId++,
        projectId: input.projectId,
        parentId: input.parentId,
        title: input.title.trim() || 'Untitled Page',
        pageType: 'page',
        sortOrder: siblingCount,
      }
      existingPages.push(page)
      pagesByProject.set(input.projectId, existingPages)
      const blocks = [createEmptyBlock('paragraph')]
      const version = { id: nextVersionId++, pageId: page.id, createdAt: new Date().toISOString() }
      documents.set(page.id, { page: clone(page), blocks, comments: [], versions: [version] })
      versionSnapshots.set(version.id, { title: page.title, blocks: clone(blocks) })
      updateProjectTimestamp(input.projectId)
      return clone(page)
    },

    async movePage(input) {
      const allPages = Array.from(pagesByProject.values()).flat()
      const page = allPages.find((entry) => entry.id === input.pageId)
      const target = allPages.find((entry) => entry.id === input.targetPageId)
      if (!page || !target || page.id === target.id) return getPagesForProject(page?.projectId ?? target?.projectId ?? 0)

      const projectPages = pagesByProject.get(page.projectId) ?? []
      const siblings = projectPages.filter((entry) => entry.parentId === target.parentId && entry.id !== page.id)
      const targetIndex = siblings.findIndex((entry) => entry.id === target.id)
      siblings.splice(targetIndex + 1, 0, { ...page, parentId: target.parentId })
      siblings.forEach((entry, index) => {
        const source = projectPages.find((item) => item.id === entry.id)
        if (source) {
          source.parentId = entry.parentId
          source.sortOrder = index
        }
      })
      const document = documents.get(page.id)
      if (document) document.page.parentId = target.parentId
      updateProjectTimestamp(page.projectId)
      return getPagesForProject(page.projectId)
    },

    async savePage(input) {
      return saveDocument(input.pageId, input.title, input.blocks, input.createVersion)
    },

    async addComment(input) {
      const document = documents.get(input.pageId)
      if (!document) throw new Error(`Page ${input.pageId} not found.`)
      document.comments.unshift({
        id: nextCommentId++,
        pageId: input.pageId,
        blockKey: input.blockKey,
        body: input.body.trim(),
        createdAt: new Date().toISOString(),
      })
      return clone(document)
    },

    async restoreVersion(input) {
      const snapshot = versionSnapshots.get(input.versionId)
      if (!snapshot) throw new Error(`Version ${input.versionId} not found.`)
      return saveDocument(input.pageId, snapshot.title, snapshot.blocks, true)
    },

    async deleteProject(projectId) {
      const idx = projects.findIndex((p) => p.id === projectId)
      if (idx !== -1) projects.splice(idx, 1)
      pagesByProject.delete(projectId)
    },

    async deletePage(pageId) {
      for (const [projectId, pages] of pagesByProject.entries()) {
        const filtered = pages.filter((p) => p.id !== pageId)
        if (filtered.length !== pages.length) {
          pagesByProject.set(projectId, filtered)
          documents.delete(pageId)
          break
        }
      }
    },

    async listMapPins(projectId: number) {
      return Array.from(mapPins.values()).filter((p) => p.projectId === projectId)
    },

    async saveMapPin(pin: MapPin) {
      mapPins.set(pin.id, pin)
    },

    async deleteMapPin(pinId: string) {
      mapPins.delete(pinId)
      // also remove connections
      for (const p of mapPins.values()) {
        if (p.connections.includes(pinId)) {
          p.connections = p.connections.filter((c) => c !== pinId)
        }
      }
    },
  }
}
