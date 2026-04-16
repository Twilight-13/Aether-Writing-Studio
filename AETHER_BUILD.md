# AETHER — Complete Build Prompt for Google Antigravity
> Paste this entire file as your first agent mission. Use **Claude Sonnet 4.6**.

---

## YOUR FIRST TASK — READ BEFORE ANYTHING ELSE

1. **List every file and folder** currently in this project directory
2. **Audit what exists** against the spec below
3. **Identify gaps** — what is missing, incomplete, or incorrectly structured
4. **Then build** everything missing or broken, following this spec exactly
5. Do NOT recreate files that already exist and are correct — refactor them to match spec if needed

---

## APP IDENTITY

- **Name:** Aether
- **Type:** Fully local desktop app (Electron + React + TypeScript)
- **Purpose:** Writing tool for novelists — combines Notion-style notes with a structured creative writing environment
- **Theme:** Deep space / nebula — immersive, dark, beautiful (see Design Tokens section)

---

## TECH STACK — USE EXACTLY THIS

| Layer | Technology |
|---|---|
| Desktop runtime | Electron (latest stable) |
| Frontend | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS (custom design tokens below) |
| Animation | Framer Motion |
| Rich text editor | BlockNote |
| Local database | SQLite via `better-sqlite3` |
| MCP server | `@modelcontextprotocol/sdk` |
| World map | Konva.js |
| Export — Word | `docx` npm package |
| Export — PDF | Puppeteer (bundled) |
| Font loading | Google Fonts (Cormorant Garamond, DM Sans, Lora, JetBrains Mono) |

---

## PROJECT FOLDER STRUCTURE

```
aether/
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Context bridge
│   └── mcp-server.ts        # Local MCP server (all Claude tools)
├── src/
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Root app component + routing
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # Three-zone layout wrapper
│   │   │   ├── Sidebar.tsx          # Left sidebar — project tree + TOC
│   │   │   ├── EditorZone.tsx       # Centre content area
│   │   │   └── ClaudePanel.tsx      # Right panel — Claude chat + action log
│   │   ├── dashboard/
│   │   │   ├── ProjectDashboard.tsx # Launch screen — project cards + starfield
│   │   │   └── ProjectCard.tsx      # Individual project card
│   │   ├── editor/
│   │   │   ├── BlockEditor.tsx      # BlockNote wrapper
│   │   │   ├── ChapterPage.tsx      # Chapter sub-page (5 sections)
│   │   │   ├── CharacterCard.tsx    # Character profile card
│   │   │   ├── WorldMap.tsx         # Konva.js interactive map
│   │   │   └── SectionBlock.tsx     # Reusable named section container
│   │   ├── ui/
│   │   │   ├── Starfield.tsx        # Animated parallax star canvas
│   │   │   ├── NebulaGlow.tsx       # Decorative nebula background blobs
│   │   │   ├── GlassPanel.tsx       # Reusable glassmorphism panel
│   │   │   ├── CopyButton.tsx       # One-click copy button
│   │   │   └── PlanetAccent.tsx     # Decorative floating planet SVG element
│   │   └── modals/
│   │       ├── NewProjectModal.tsx
│   │       └── ExportModal.tsx
│   ├── store/
│   │   ├── projectStore.ts    # Zustand — active project state
│   │   ├── editorStore.ts     # Zustand — editor state
│   │   └── claudeStore.ts     # Zustand — Claude panel state
│   ├── db/
│   │   ├── schema.ts          # SQLite table definitions
│   │   ├── projects.ts        # Project CRUD
│   │   ├── pages.ts           # Page CRUD
│   │   ├── chapters.ts        # Chapter CRUD
│   │   └── characters.ts      # Character CRUD
│   ├── types/
│   │   └── index.ts           # All TypeScript interfaces
│   └── styles/
│       └── globals.css        # Tailwind base + custom CSS vars
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## DESIGN SYSTEM — IMPLEMENT EXACTLY

### Visual Direction
The app must look like the reference images: deep space with rich blue/purple nebula clouds, glassmorphism panels floating over a cosmic background, floating planetary accents, and a strong blue-dominant palette with magenta/purple bursts. Think: a control panel aboard a starship.

### Colour Tokens (add to tailwind.config.ts as custom colours)

```js
colors: {
  void:     '#05001A',   // deepest bg — near-black, strong blue-purple undertone
  deep:     '#080028',   // main content bg
  surface:  '#0D0040',   // panel/card background
  elevated: '#160060',   // modals, dropdowns
  hover:    '#1E0080',   // hover state

  // Nebula accents
  'nebula-blue':    '#1E90FF',   // dominant — buttons, active states, borders
  'nebula-purple':  '#7B2FFF',   // secondary — headings, highlights
  'nebula-magenta': '#C020C0',   // tertiary — tags, special actions
  'nebula-teal':    '#00D4C8',   // success, map pins, code
  'nebula-gold':    '#FFD700',   // stars, starred items, crown accents

  // Text
  'text-primary':   '#E8F4FF',   // main body text (cool white)
  'text-secondary': '#8BAFD8',   // secondary labels
  'text-muted':     '#3D5580',   // placeholders, disabled
  'text-glow':      '#A0C8FF',   // glowing headings

  // Borders
  'border-subtle':  'rgba(30, 144, 255, 0.15)',
  'border-active':  'rgba(30, 144, 255, 0.5)',
  'glass-bg':       'rgba(13, 0, 64, 0.6)',
  'glass-border':   'rgba(30, 144, 255, 0.2)',
}
```

### Typography

```css
/* In globals.css — import from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

--font-display: 'Cormorant Garamond', serif;   /* titles, logo, headings */
--font-body:    'DM Sans', sans-serif;          /* UI labels, metadata */
--font-editor:  'Lora', serif;                  /* writing canvas default */
--font-mono:    'JetBrains Mono', monospace;    /* code blocks */
```

### Glassmorphism Panel (GlassPanel.tsx)

```css
background: rgba(13, 0, 64, 0.55);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(30, 144, 255, 0.2);
border-radius: 16px;
box-shadow: 0 0 40px rgba(30, 144, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.05);
```

### Starfield (Starfield.tsx)
- Full-screen `<canvas>` fixed behind everything, z-index: 0
- 350 stars: varied sizes (0.5px–2.5px), varied opacity (0.3–1.0), white to pale blue
- **Parallax:** on mouse move, star layers move at different speeds (3 depth layers: 0.02x, 0.05x, 0.08x)
- **Twinkle:** each star independently pulses opacity on a randomised sine wave
- **Shooting star:** every 18–35 seconds (randomised), a white streak arcs across with a fading tail
- Use `requestAnimationFrame` loop — must not block the main thread

### Nebula Glow (NebulaGlow.tsx)
- Absolutely positioned behind panel content
- 3 radial gradient blobs: blue (#1E90FF at 0%, transparent at 60%), purple (#7B2FFF), magenta (#C020C0)
- Each blob ~600–900px diameter, very low opacity (0.06–0.10)
- Slight CSS animation: slowly drift position over 30s loop
- Place one in the top-left, one in the centre-right, one at the bottom

### Planet Accents (PlanetAccent.tsx)
- SVG-based planets at different sizes floating in the background of the dashboard and major views
- Planet styles: ringed gas giant (Saturn-like), blue marble (Earth-like), dusty red (Mars-like)
- Slow CSS float animation (up/down, 8–14s loop per planet)
- Decorative only — no interaction

### Animations (use Framer Motion)
- **Button hover:** scale(1.02) + box-shadow glow pulse
- **Modal open:** `initial={{ opacity:0, scale:0.95 }}` → `animate={{ opacity:1, scale:1 }}` 180ms ease
- **Page transition:** `initial={{ opacity:0, y:8 }}` → `animate={{ opacity:1, y:0 }}` 220ms
- **Sidebar item active:** smooth left border slide-in
- **Save indicator:** small star icon (★) pulse animation on auto-save
- **Claude response:** text streams in with blinking cursor until complete

### Layout Dimensions
- Left sidebar: 260px (collapsible to 48px icon-rail)
- Right Claude panel: 320px (collapsible)
- Editor: fills remaining width, max-width 860px, centred
- Min window: 1024×768

---

## FULL FEATURE SPEC

### PROJECT DASHBOARD (launch screen)
- Full-screen view with Starfield + planet accents behind
- Project cards in a responsive grid — GlassPanel style
- Each card: project title, type badge (Notes / Novel / Story), last edited date, colour accent
- "New Project" button — opens NewProjectModal
- Projects can be archived (not deleted)
- Search/filter bar at top

### NEW PROJECT MODAL
- Project name input
- Type selector: **Normal Notes** / **Novel or Series** / **Single Story**
- On confirm: creates project in SQLite, generates template if writing type, opens project

---

## NORMAL NOTES MODE

### Page System
- Unlimited nested pages (sidebar tree with indentation)
- Drag-and-drop reorder in sidebar
- Page icon/emoji picker + optional cover image
- Auto-generated TOC in sidebar from H1/H2/H3 on page
- Version history: auto-save every 30s, restore from timeline

### Block Types
**Text:** Paragraph, H1, H2, H3, Quote, Callout (icon + coloured bg), Toggle/Collapsible, Divider
**Lists:** Ordered, Unordered, To-do (checkbox)
**Embeds:** Table (resizable columns), Image (drag-drop), Link (inline + card), Code block (syntax highlighted)

### Rich Text Formatting
Bold, italic, underline, strikethrough, inline code, text colour, highlight colour, font size override, emoji (`:` shortcut)

### Markdown shortcuts
`#` + space → H1, `##` → H2, `###` → H3, `-` → bullet, `1.` → numbered, `[]` → todo, ` ``` ` → code block, `---` → divider, `>` → quote

### Comments
- Highlight text → right-click → Add Comment
- Comment anchors to text range
- Thread panel opens in right sidebar
- Comments: resolve (hide) or delete
- Block-level comments also supported

### Export (Notes)
- `.docx` and `.pdf`
- Option to include sub-pages
- Heading styles preserved

---

## WRITING MODE — NOVEL / SERIES & SINGLE STORY

On project creation, auto-generate this exact template:

### OVERVIEW PAGE
Divided into 5 named sections using SectionBlock:
1. **Title** — large display text, editable
2. **Core Concept** — free-form paragraphs
3. **Genre & Tone** — genre tags + tone description
4. **Lead Characters** — brief mentions (auto-link to Characters page)
5. **Key Characteristics** — what makes this series original

### CHARACTERS PAGE
Each character = a structured card (CharacterCard.tsx). Fields:
- Name + aliases
- Type: Protagonist / Antagonist / Supporting / Minor / Group
- Age
- Defining quote
- Role in story
- Powers / abilities / dynamics
- Physical description
- Psychological profile (motivations, fears, internal conflict)
- Relationships (link to other character cards)
- Arc notes
- Custom fields (writer can add)

**Group type** additionally has: member list (link existing characters), group dynamics, collective goal

Characters can also be individual sub-pages for longer profiles.

### LORE & HISTORY PAGE
Collapsible sections (toggles):
- World History
- Factions
- Magic / Tech Systems
- Geography
- Timeline
- Myths & Legends
- Rules of the World
- (Writer can add custom sections)

World Map embedded at top of this page (see World Map spec below).

### ARC & CHAPTERS OUTLINE PAGE
**Page header contains:**
- Series title + tagline
- Story start and end (brief summary)
- Arc count + Chapter count (auto-calculated)
- **Humanizer Rules block** (pre-filled defaults, fully editable — see Humanizer Rules section)

**Each Arc listed on this page:**
- Arc number + title
- Arc overview (2–3 sentences)
- What this arc establishes
- Emotional register
- Chapter list with one-line synopsis each

**Each Arc → sub-page (Arc Sub-page):**
- Full arc overview
- Key turning points
- Character dynamic shifts
- Full chapter list with links

**Each Chapter → sub-page (Chapter Sub-page):**

Structure: exactly 5 sections using SectionBlock:

| # | Section Name | Content |
|---|---|---|
| 1 | Chapter Identity | Chapter number + title |
| 2 | Chapter Type | Auto-suggested by Claude (action / quiet / aftermath / romance / revelation / transition / confrontation). Writer can override. |
| 3 | Chapter Body | The writing canvas. BlockNote editor. |
| 4 | Key Points | Bullet list of what happens. Auto-populated by Claude after writing. Editable. |
| 5 | Chapter Length | Live word count of Section 3 ONLY. Auto-calculated. Updates on every keystroke. |

**Every section has a one-click copy button (CopyButton.tsx).** Copy button copies that section's raw text to clipboard.

---

## WORLD MAP (WorldMap.tsx using Konva.js)

- Embedded in Lore & History page
- Dark canvas with subtle grid (toggle-able) or parchment texture option
- Pan (drag) and zoom (scroll)
- Drop location pins anywhere
- Each pin: name label, type (city / dungeon / landmark / region / country / other), optional description
- Pins connected by optional dotted lines (trade routes, paths, borders)
- Region polygons: draw closed shapes, fill with low-opacity colour, add label
- Click pin → info card popup
- Export map as PNG button
- All pin data stored in SQLite (world_map_locations table)

---

## MCP SERVER (electron/mcp-server.ts)

Runs as child process on app start. Communicates over stdio. Exposes these tools to Claude:

### READ TOOLS
```
get_project_overview()
  → returns Overview page content as structured JSON

get_character(name: string)
  → returns single character card data

get_all_characters()
  → returns array of all character cards

get_lore_section(section_name: string)
  → returns content of named lore section

get_chapter(arc: number, chapter: number)
  → returns chapter body + all metadata

get_arc_outline(arc: number)
  → returns arc overview + chapter list

get_full_outline()
  → returns complete arc/chapter structure

get_world_map_locations()
  → returns all map pins and descriptions

get_humanizer_rules()
  → returns the humanizer rules block content
```

### WRITE TOOLS
```
write_chapter_body(arc: number, chapter: number, content: string)
  → replaces chapter body with new content

append_to_chapter(arc: number, chapter: number, content: string)
  → appends content to existing chapter body

update_character_field(name: string, field: string, value: string)
  → updates specific field on a character card

update_key_points(arc: number, chapter: number, points: string[])
  → sets the key points section of a chapter

update_chapter_type(arc: number, chapter: number, type: string)
  → sets the chapter type

create_character(data: CharacterData)
  → creates a new character card

create_chapter(arc: number, chapter: number, title: string)
  → creates a new chapter sub-page with empty sections

update_lore_section(section_name: string, content: string)
  → updates a named lore section
```

### CONTEXT TOOL
```
get_context_bundle(arc: number, chapter: number)
  → returns combined package:
     - Project overview
     - All characters (full data)
     - Relevant lore sections
     - Arc outline
     - Previous chapter summary
     - Humanizer rules
  → This is called automatically before any write operation
```

### SEARCH
```
search_content(query: string)
  → full-text search across all project content
  → returns matches with page/chapter references
```

### Claude Panel (ClaudePanel.tsx — right sidebar)
- Chat interface: writer types instructions, Claude responds + acts
- Every tool call logged in plain English below the chat (e.g. "Claude read Chapter 4", "Claude updated character: Aria")
- Writer can Accept / Reject / Edit any change Claude makes before it is committed
- Panel detachable to second window
- Stream Claude's text response with blinking cursor

---

## EXPORT SYSTEM (ExportModal.tsx)

Triggered by Export button in project header.

### Scope selection
- Entire Series / Story
- Specific Arc(s) — multi-select
- Specific Chapter(s) — multi-select

### Format selection
- `.docx` (via docx npm package)
- `.pdf` (via Puppeteer)

### Output formatting (docx/pdf)
- Page 1: Story title (large centred) + optional author name
- Each chapter starts on a new page
- Chapter heading: "Chapter [N] — [Title]"
- Chapter body text only (no section labels, no key points, no metadata)
- Page numbers in footer (bottom-right)
- Configurable: font family, font size (default 12pt), line spacing (default 1.5)
- Chapter exports named: `Chapter_01_TitleSlug.docx`

---

## HUMANIZER RULES (pre-loaded in every writing project)

Store these in the Humanizer Rules block on the Outline page. Pass the full block to Claude as system context before every write operation.

```
AETHER HUMANIZER RULES — CLAUDE WRITING BEHAVIOUR

VOICE & RHYTHM
- Vary sentence length deliberately. Short punchy sentences. Then longer ones that build and breathe and let the reader settle into a moment before moving on.
- Never start consecutive sentences with the same word or syntactic structure.
- Use contractions naturally in dialogue and internal monologue. Avoid them in formal narration only when tone demands.
- Vary paragraph length. Some paragraphs are a single sentence. Others run longer.

WORD CHOICE — BANNED WORDS/PHRASES
Never use: delve, tapestry, testament to, in the realm of, it's worth noting, dive into, multifaceted, nuanced, ever-evolving, comprehensive, seamlessly, groundbreaking, game-changer, vibrant, foster, unwavering, meticulous, crucial, pivotal (overuse).

- Choose specific concrete nouns over vague abstractions.
- Use unexpected but accurate word choices over safe predictable ones.
- Character-specific vocabulary must feel authentic to that character's background and voice.

DIALOGUE
- Dialogue tags: use 'said' and 'asked' mostly. Use action beats instead of exotic tags (he growled, she breathed, etc.).
- Characters interrupt. Dialogue is not perfectly articulate unless that is the character's trait.
- Subtext matters. Characters often mean something other than what they say.

PACING
- Not every paragraph needs to advance plot. Quiet moments have weight.
- Do not summarise what can be shown as scene. Prefer scene over summary.
- Chapter endings: either a door closing or a door opening. Never a neutral stop.

EMOTION — SHOW, NEVER STATE
- Never write: "She was angry." Show it through behaviour, physical sensation, internal thought.
- Do not over-explain feelings. Trust the reader.
- Internal monologue must sound like that specific character, not a generic narrator voice.

CONSISTENCY — MANDATORY
- Always call get_context_bundle before writing any chapter.
- All character names, abilities, relationships, and established facts must match prior content exactly.
- If a detail contradicts prior content, flag it as a comment rather than guessing or overwriting.
```

---

## DATABASE SCHEMA (SQLite)

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'notes' | 'novel_series' | 'single_story'
  created_at INTEGER,
  updated_at INTEGER,
  archived INTEGER DEFAULT 0,
  metadata TEXT  -- JSON blob for extra fields
);

CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,  -- null = top level
  title TEXT NOT NULL,
  icon TEXT,
  cover_image TEXT,
  content TEXT,  -- BlockNote JSON
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  page_type TEXT DEFAULT 'free'  -- 'free' | 'overview' | 'characters' | 'lore' | 'outline' | 'arc' | 'chapter'
);

CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  arc_number INTEGER,
  chapter_number INTEGER,
  title TEXT,
  chapter_type TEXT,
  body TEXT,
  key_points TEXT,  -- JSON array
  word_count INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT,  -- JSON array
  char_type TEXT,  -- 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'group'
  age TEXT,
  defining_quote TEXT,
  role TEXT,
  abilities TEXT,
  physical TEXT,
  psychology TEXT,
  relationships TEXT,  -- JSON
  arc_notes TEXT,
  custom_fields TEXT,  -- JSON
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE lore_sections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  section_name TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE world_map_locations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location_type TEXT,
  x REAL,
  y REAL,
  description TEXT,
  connections TEXT  -- JSON array of connected location IDs
);

CREATE TABLE version_history (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  content TEXT,
  saved_at INTEGER
);
```

---

## FOCUS MODE

- Toggle with F11 or button in editor toolbar
- Hides: sidebar, Claude panel, all chrome except editor
- Dims background to 70% opacity
- Editor expands to centred 720px column
- Exit: press F11 or Escape
- Smooth Framer Motion transition in/out (300ms)

---

## BUILD CHECKLIST — VERIFY EACH ITEM

After reading existing files and completing the build, confirm every item:

- [ ] Electron app launches without errors
- [ ] Starfield renders and parallax works on mouse movement
- [ ] Shooting star fires at random intervals
- [ ] Project dashboard shows with planet accents and glassmorphism cards
- [ ] New Project modal works for all 3 types
- [ ] Notes mode: all block types work
- [ ] Notes mode: markdown shortcuts work
- [ ] Notes mode: rich text formatting works
- [ ] Notes mode: comments system works
- [ ] Notes mode: version history saves and restores
- [ ] Writing mode template generates on project creation
- [ ] All 4 template pages exist (Overview, Characters, Lore, Outline)
- [ ] Chapter sub-page has exactly 5 sections
- [ ] Word count counts body section only
- [ ] All sections have copy buttons
- [ ] Character cards have all fields
- [ ] Group character type works
- [ ] World map: pins, connections, regions, pan/zoom, PNG export
- [ ] Humanizer rules block pre-loaded in outline page
- [ ] MCP server starts with app
- [ ] All read tools return correct data
- [ ] All write tools persist changes to SQLite
- [ ] get_context_bundle returns full package
- [ ] Claude panel: chat works, actions logged, accept/reject/edit flow works
- [ ] Export: all scopes work (full/arc/chapter)
- [ ] Export: docx format correct (new page per chapter, no metadata)
- [ ] Export: pdf format correct
- [ ] Focus mode works (F11, smooth transition)
- [ ] App window min-size 1024×768 enforced
- [ ] Fonts load correctly (Cormorant Garamond, DM Sans, Lora)
- [ ] All colours match design token spec
- [ ] Nebula glow blobs visible on panels
- [ ] Glassmorphism panel style applied to all cards/panels

---

## PROMPTING PATTERNS FOR SUBSEQUENT TASKS

When starting a new agent mission after the initial build, use these patterns:

**To continue a phase:**
```
Read AETHER_BUILD.md. The build checklist items marked below are still incomplete. Fix only these items: [list items]
```

**To change design:**
```
In Aether, change [component]. It should look like [description]. Match the design tokens in AETHER_BUILD.md.
```

**To fix a bug:**
```
In Aether, [describe bug]. The relevant file is [file]. Fix it without changing anything else.
```

**To add a feature:**
```
Read the Aether spec in AETHER_BUILD.md. Add the following feature: [description]. It should integrate with [related component].
```

---

*Aether — Build something extraordinary.*
