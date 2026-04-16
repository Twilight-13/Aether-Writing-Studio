import { useEffect, useRef } from 'react'

type Star = {
  x: number
  y: number
  radius: number
  baseAlpha: number
  twinklePhase: number
  twinkleSpeed: number
  depth: number // 0=near, 1=far
}

type ShootingStar = {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  tailLength: number
}

const STAR_COUNT = 350
const DEPTH_TIERS = [
  { count: 110, radiusMin: 1.6, radiusMax: 2.5, alphaMin: 0.55, alphaMax: 1.0, parallax: 0.08 },
  { count: 130, radiusMin: 0.9, radiusMax: 1.7, alphaMin: 0.35, alphaMax: 0.75, parallax: 0.05 },
  { count: 110, radiusMin: 0.5, radiusMax: 1.0, alphaMin: 0.15, alphaMax: 0.45, parallax: 0.02 },
]

function makeStars(): (Star & { parallaxScale: number })[] {
  const stars: (Star & { parallaxScale: number })[] = []
  for (const [ti, tier] of DEPTH_TIERS.entries()) {
    for (let i = 0; i < tier.count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        radius: Math.random() * (tier.radiusMax - tier.radiusMin) + tier.radiusMin,
        baseAlpha: Math.random() * (tier.alphaMax - tier.alphaMin) + tier.alphaMin,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.6 + 0.25,
        depth: ti,
        parallaxScale: tier.parallax,
      })
    }
  }
  return stars
}

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const stars = makeStars()
    const pointer = { x: 0, y: 0 }
    let width = 0
    let height = 0
    let animFrame = 0
    let lastTime = 0
    let shootingTimer = 0
    let nextShootingDelay = randomShootingDelay()

    const shooter: ShootingStar = {
      active: false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      life: 0, maxLife: 0,
      tailLength: 0,
    }

    function randomShootingDelay() {
      return 18000 + Math.random() * 17000 // 18–35s
    }

    function launchShootingStar() {
      const angle = Math.random() * Math.PI * 0.3 + Math.PI * 0.1 // bias: top-left → bottom-right
      const speed = width * (0.25 + Math.random() * 0.2)
      shooter.active = true
      shooter.x = Math.random() * width * 0.6
      shooter.y = Math.random() * height * 0.4
      shooter.vx = Math.cos(angle) * speed
      shooter.vy = Math.sin(angle) * speed
      shooter.maxLife = 0.9 + Math.random() * 0.5
      shooter.life = 0
      shooter.tailLength = width * (0.08 + Math.random() * 0.07)
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const handlePointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX / Math.max(width, 1) - 0.5
      pointer.y = e.clientY / Math.max(height, 1) - 0.5
    }

    const render = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05)
      lastTime = timestamp
      shootingTimer += dt * 1000

      ctx.clearRect(0, 0, width, height)

      // Draw stars
      for (const star of stars) {
        const twinkle = Math.sin(star.twinklePhase + timestamp * 0.001 * star.twinkleSpeed) * 0.4 + 0.6
        const alpha = star.baseAlpha * twinkle

        const driftX = pointer.x * star.parallaxScale * width * 2
        const driftY = pointer.y * star.parallaxScale * height * 2
        const px = star.x * width + driftX
        const py = star.y * height + driftY

        // Color varies slightly by depth
        const blueShift = star.depth === 0 ? 255 : star.depth === 1 ? 245 : 230

        ctx.beginPath()
        ctx.arc(px, py, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220, 235, ${blueShift}, ${alpha})`
        ctx.fill()

        // Subtle cross-glow on brighter stars
        if (star.radius > 1.8 && star.baseAlpha > 0.7) {
          ctx.beginPath()
          ctx.arc(px, py, star.radius * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(165, 200, 255, ${alpha * 0.08})`
          ctx.fill()
        }
      }

      // Shooting star 
      if (shootingTimer >= nextShootingDelay) {
        launchShootingStar()
        shootingTimer = 0
        nextShootingDelay = randomShootingDelay()
      }

      if (shooter.active) {
        shooter.life += dt
        const t = shooter.life / shooter.maxLife
        if (t >= 1) {
          shooter.active = false
        } else {
          const x = shooter.x + shooter.vx * t * shooter.maxLife
          const y = shooter.y + shooter.vy * t * shooter.maxLife
          const headAlpha = Math.sin(t * Math.PI) // ramp up then fade

          // Tail
          const tx = x - (shooter.vx / Math.hypot(shooter.vx, shooter.vy)) * shooter.tailLength * headAlpha
          const ty = y - (shooter.vy / Math.hypot(shooter.vx, shooter.vy)) * shooter.tailLength * headAlpha

          const grad = ctx.createLinearGradient(tx, ty, x, y)
          grad.addColorStop(0, `rgba(255, 255, 255, 0)`)
          grad.addColorStop(0.6, `rgba(200, 230, 255, ${headAlpha * 0.4})`)
          grad.addColorStop(1, `rgba(255, 255, 255, ${headAlpha * 0.95})`)

          ctx.beginPath()
          ctx.moveTo(tx, ty)
          ctx.lineTo(x, y)
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.5
          ctx.lineCap = 'round'
          ctx.stroke()

          // Head glow
          ctx.beginPath()
          ctx.arc(x, y, 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${headAlpha * 0.9})`
          ctx.fill()
        }
      }

      animFrame = window.requestAnimationFrame(render)
    }

    resize()
    animFrame = window.requestAnimationFrame(render)
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      window.cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />
}

export default Starfield
