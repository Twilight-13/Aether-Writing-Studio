import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Circle, Line, Text, Rect, Group } from 'react-konva'
import type Konva from 'konva'

type LocationType = 'city' | 'dungeon' | 'landmark' | 'region' | 'country' | 'other'

type MapPin = {
  id: string
  name: string
  type: LocationType
  x: number
  y: number
  description: string
  connections: string[] // IDs of connected pins
}

const PIN_COLORS: Record<LocationType, string> = {
  city:     '#1E90FF',
  dungeon:  '#C020C0',
  landmark: '#FFD700',
  region:   '#00D4C8',
  country:  '#7B2FFF',
  other:    '#8BAFD8',
}

type PopupState = { pin: MapPin; x: number; y: number } | null

function makeId() {
  return `pin-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

type WorldMapProps = {
  projectId?: number
}

function WorldMap({ projectId: _projectId }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [dims, setDims] = useState({ w: 800, h: 480 })
  const [pins, setPins] = useState<MapPin[]>([])
  const [popup, setPopup] = useState<PopupState>(null)
  const [addMode, setAddMode] = useState(false)
  const [addType, setAddType] = useState<LocationType>('city')
  const [showGrid, setShowGrid] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [newPin, setNewPin] = useState<{ name: string; description: string }>({ name: '', description: '' })
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [showNewPinForm, setShowNewPinForm] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: Math.max(420, el.clientHeight) })
    })
    ro.observe(el)
    setDims({ w: el.clientWidth, h: Math.max(420, el.clientHeight) })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (projectId) {
      window.aetherDesktop?.listMapPins(projectId).then(setPins)
    }
  }, [projectId])

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!addMode) {
      setPopup(null)
      return
    }
    if (e.target !== e.target.getStage()) return // clicked on a shape, not canvas
    const pos = e.target.getStage()!.getPointerPosition()
    if (!pos) return
    setPendingPos(pos)
    setShowNewPinForm(true)
    setAddMode(false)
  }, [addMode])

  const confirmNewPin = async () => {
    if (!pendingPos || !newPin.name.trim() || !projectId) return
    const pin: MapPin = {
      id: makeId(),
      projectId,
      name: newPin.name.trim(),
      type: addType,
      x: pendingPos.x,
      y: pendingPos.y,
      description: newPin.description,
      connections: [],
    }
    
    await window.aetherDesktop?.saveMapPin(pin)
    setPins((prev) => [...prev, pin])
    
    setPendingPos(null)
    setShowNewPinForm(false)
    setNewPin({ name: '', description: '' })
  }

  const handlePinClick = (pin: MapPin, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    setPopup({ pin, x: pos.x, y: pos.y })
  }

  const handlePinDrag = async (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const pos = e.target.position()
    const updatedPin = pins.find((p) => p.id === id)
    if (!updatedPin) return
    
    const newPin = { ...updatedPin, x: pos.x, y: pos.y }
    setPins((prev) => prev.map((p) => p.id === id ? newPin : p))
    await window.aetherDesktop?.saveMapPin(newPin)
  }

  const exportPNG = () => {
    const stage = stageRef.current
    if (!stage) return
    const dataURL = stage.toDataURL({ pixelRatio: 2 })
    const a = document.createElement('a')
    a.href = dataURL
    a.download = 'aether-world-map.png'
    a.click()
  }

  const deletePin = async (id: string) => {
    if (!window.confirm('Delete this map location?')) return
    await window.aetherDesktop?.deleteMapPin(id)
    setPins((prev) => prev.filter((p) => p.id !== id).map((p) => ({ ...p, connections: p.connections.filter((c) => c !== id) })))
    setPopup(null)
  }

  // Grid lines
  const gridLines: JSX.Element[] = []
  if (showGrid) {
    const step = 60
    for (let x = 0; x < dims.w; x += step) {
      gridLines.push(<Line key={`gx-${x}`} points={[x, 0, x, dims.h]} stroke="rgba(30,144,255,0.06)" strokeWidth={1} />)
    }
    for (let y = 0; y < dims.h; y += step) {
      gridLines.push(<Line key={`gy-${y}`} points={[0, y, dims.w, y]} stroke="rgba(30,144,255,0.06)" strokeWidth={1} />)
    }
  }

  // Connection lines
  const connectionLines: JSX.Element[] = []
  const drawn = new Set<string>()
  for (const pin of pins || []) {
    for (const targetId of pin.connections || []) {
      const key = [pin.id, targetId].sort().join('--')
      if (drawn.has(key)) continue
      drawn.add(key)
      const target = pins.find((p) => p.id === targetId)
      if (!target) continue
      connectionLines.push(
        <Line
          key={key}
          points={[pin.x, pin.y, target.x, target.y]}
          stroke="rgba(30,144,255,0.35)"
          strokeWidth={1.5}
          dash={[6, 6]}
        />
      )
    }
  }

  return (
    <div className="world-map-container" style={{ display: 'grid', gridTemplateRows: 'auto 1fr' }}>
      {/* Toolbar */}
      <div className="world-map-toolbar">
        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-muted)' }}>World Map</span>
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as LocationType)}
          style={{ padding: '0.3rem 0.6rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)', background: 'rgba(5,0,26,0.7)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
        >
          {(['city', 'dungeon', 'landmark', 'region', 'country', 'other'] as LocationType[]).map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <button
          className={`mini-button${addMode ? ' primary-button' : ''}`}
          onClick={() => { setAddMode((v) => !v); setPopup(null) }}
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
        >
          {addMode ? '📍 Click map to place' : '+ Pin'}
        </button>
        <button className="mini-button" onClick={() => setShowGrid((v) => !v)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>
        <button className="mini-button" onClick={exportPNG} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', marginLeft: 'auto' }}>
          Export PNG
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ position: 'relative', background: 'rgba(5,0,26,0.85)', cursor: addMode ? 'crosshair' : 'default', minHeight: 420 }}>
        <Stage
          ref={stageRef}
          width={dims.w}
          height={dims.h}
          onClick={handleStageClick}
          draggable={!addMode}
        >
          <Layer>
            {/* Grid */}
            {gridLines}
            {/* Connection lines */}
            {connectionLines}
            {/* Pins */}
            {pins.map((pin) => {
              const color = PIN_COLORS[pin.type]
              return (
                <Group
                  key={pin.id}
                  x={pin.x}
                  y={pin.y}
                  draggable
                  onDragStart={() => setDragging(pin.id)}
                  onDragEnd={(e) => { handlePinDrag(pin.id, e); setDragging(null) }}
                  onClick={(e) => handlePinClick(pin, e)}
                >
                  {/* Glow */}
                  <Circle radius={14} fill={color} opacity={0.12} />
                  {/* Pin body */}
                  <Circle radius={7} fill={color} stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} />
                  {dragging === pin.id ? null : (
                    <Text
                      text={pin.name}
                      x={10}
                      y={-6}
                      fontSize={11}
                      fill="rgba(232,244,255,0.9)"
                      fontFamily="'DM Sans', sans-serif"
                    />
                  )}
                </Group>
              )
            })}
          </Layer>
        </Stage>

        {/* Popup */}
        {popup && (
          <div
            className="pin-popup"
            style={{
              left: Math.min(popup.x + 12, dims.w - 220),
              top: Math.min(popup.y + 12, dims.h - 140),
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: PIN_COLORS[popup.pin.type], marginBottom: 2 }}>
                  {popup.pin.type}
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem' }}>
                  {popup.pin.name}
                </div>
              </div>
              <button
                className="copy-btn danger"
                onClick={() => deletePin(popup.pin.id)}
                style={{ flexShrink: 0, borderColor: 'rgba(192,32,192,0.4)' }}
              >
                ✕
              </button>
            </div>
            {popup.pin.description && (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {popup.pin.description}
              </p>
            )}
          </div>
        )}

        {/* New pin form */}
        {showNewPinForm && (
          <div className="pin-popup" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '20rem' }}>
            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
              New {addType} location
            </p>
            <input
              className="block-input"
              value={newPin.name}
              onChange={(e) => setNewPin((p) => ({ ...p, name: e.target.value }))}
              placeholder="Location name"
              style={{ width: '100%', marginBottom: '0.5rem' }}
              autoFocus
            />
            <input
              className="block-input"
              value={newPin.description}
              onChange={(e) => setNewPin((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description (optional)"
              style={{ width: '100%', marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="primary-button" onClick={confirmNewPin} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Add Pin
              </button>
              <button className="ghost-button" onClick={() => { setShowNewPinForm(false); setPendingPos(null) }} style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorldMap
