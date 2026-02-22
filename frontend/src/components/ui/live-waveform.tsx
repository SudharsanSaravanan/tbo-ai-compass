"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface LiveWaveformProps {
    /**
     * When true the component opens the microphone itself and reacts to live audio.
     * When false (default) the component runs a gentle idle animation.
     */
    active?: boolean
    /**
     * Shows an AI-processing shimmer animation (no mic needed).
     * Ignored when active=true.
     */
    processing?: boolean
    /** Height of the canvas in px */
    height?: number
    /** Width of each bar in px */
    barWidth?: number
    /** Gap between bars in px */
    barGap?: number
    /** Number of history frames kept for scrolling mode */
    historySize?: number
    /** "static" — symmetric bars; "scrolling" — history scrolls left */
    mode?: "static" | "scrolling"
    /** Soft fade on left/right edges */
    fadeEdges?: boolean
    /** CSS color, or "primary" to read --primary from the theme */
    barColor?: string
    className?: string
}

export function LiveWaveform({
    active = false,
    processing = false,
    height = 64,
    barWidth = 3,
    barGap = 2,
    historySize = 80,
    mode = "static",
    fadeEdges = true,
    barColor = "primary",
    className,
}: LiveWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number>(0)
    const historyRef = useRef<number[]>([])
    const analyserRef = useRef<AnalyserNode | null>(null)
    const ctxAudioRef = useRef<AudioContext | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    // Single phase counter advanced once per frame — keeps the wave slow & smooth
    const phaseRef = useRef(0)
    // Smoothed level — prevents abrupt jumps
    const smoothLevelRef = useRef(0)

    // ── resolve bar colour ────────────────────────────────────────────────────
    const resolvedColor = useCallback(() => {
        if (barColor === "primary") {
            const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
            return raw ? `hsl(${raw})` : "#6366f1"
        }
        if (barColor === "gray") return "#6b7280"
        return barColor
    }, [barColor])

    // ── microphone setup / teardown ───────────────────────────────────────────
    useEffect(() => {
        if (!active) {
            // tear down
            streamRef.current?.getTracks().forEach((t) => t.stop())
            ctxAudioRef.current?.close().catch(() => { })
            analyserRef.current = null
            ctxAudioRef.current = null
            streamRef.current = null
            smoothLevelRef.current = 0
            return
        }

        let cancelled = false
            ; (async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                    if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
                    streamRef.current = stream

                    const ctx = new AudioContext()
                    if (cancelled) { ctx.close(); stream.getTracks().forEach((t) => t.stop()); return }
                    ctxAudioRef.current = ctx

                    const analyser = ctx.createAnalyser()
                    analyser.fftSize = 1024          // more bins → smoother frequency data
                    analyser.smoothingTimeConstant = 0.85  // built-in temporal smoothing
                    ctx.createMediaStreamSource(stream).connect(analyser)
                    analyserRef.current = analyser
                } catch {
                    // permission denied or no mic — fall back to idle animation
                }
            })()

        return () => {
            cancelled = true
            streamRef.current?.getTracks().forEach((t) => t.stop())
            ctxAudioRef.current?.close().catch(() => { })
            analyserRef.current = null
            ctxAudioRef.current = null
            streamRef.current = null
            smoothLevelRef.current = 0
        }
    }, [active])

    // ── draw loop ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx2d = canvas.getContext("2d")!

        const draw = () => {
            const dpr = window.devicePixelRatio || 1
            const w = container.clientWidth
            const h = height

            // resize only when needed
            if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
                canvas.width = w * dpr
                canvas.height = h * dpr
                canvas.style.width = `${w}px`
                canvas.style.height = `${h}px`
                ctx2d.scale(dpr, dpr)
            }

            ctx2d.clearRect(0, 0, w, h)

            const step = barWidth + barGap
            const numBars = Math.max(1, Math.floor(w / step))
            const midY = h / 2
            const color = resolvedColor()

            // ── advance phase ONCE per frame (not per bar) ────────────────────────
            if (active || processing) {
                // processing: slightly faster oscillation for "ai thinking" feel
                phaseRef.current += processing && !active ? 0.036 : 0.032
            } else {
                // idle: very slow drift
                phaseRef.current += 0.008
            }

            // ── sample mic level ──────────────────────────────────────────────────
            let targetLevel = 0
            if (active && analyserRef.current) {
                const data = new Uint8Array(analyserRef.current.frequencyBinCount)
                analyserRef.current.getByteFrequencyData(data)
                // use only lower half of spectrum (voice range)
                const half = Math.floor(data.length / 3)
                const sum = data.slice(0, half).reduce((a, b) => a + b, 0)
                const avg = sum / half
                targetLevel = Math.min(1, Math.max(0, (avg - 8) / 80))
            } else if (processing) {
                // gentle rhythmic pulse for processing state
                targetLevel = 0.35 + 0.25 * Math.sin(phaseRef.current * 1.5)
            }

            // smooth the level with a lag filter to prevent sudden jumps
            const lag = active ? 0.12 : 0.06
            smoothLevelRef.current += (targetLevel - smoothLevelRef.current) * lag
            const level = smoothLevelRef.current

            // ── draw bars ─────────────────────────────────────────────────────────
            if (mode === "scrolling") {
                historyRef.current.push(level)
                if (historyRef.current.length > historySize) historyRef.current.shift()
                const hist = historyRef.current
                const startX = w - hist.length * step
                for (let i = 0; i < hist.length; i++) {
                    const barH = Math.max(2, hist[i] * (h - 8))
                    const x = startX + i * step
                    ctx2d.fillStyle = color
                    ctx2d.globalAlpha = active || processing ? 0.5 + hist[i] * 0.5 : 0.2
                    roundRect(ctx2d, x, midY - barH / 2, barWidth, barH, barWidth / 2)
                    ctx2d.fill()
                }
            } else {
                // static symmetric mode
                for (let i = 0; i < numBars; i++) {
                    const t = i / (numBars - 1)           // 0 → 1
                    const envelope = Math.sin(t * Math.PI) // bell curve tallest at centre

                    let barH: number
                    if (active || processing) {
                        // wave offset is purely per-bar spatial, phaseRef is time — no accumulation
                        const spatialOffset = t * Math.PI * 4
                        const wave = Math.sin(spatialOffset + phaseRef.current)
                        const minH = 3
                        const maxH = (h - 6) * (level * 0.85 + 0.15)
                        barH = Math.max(minH, envelope * maxH * (0.55 + 0.45 * wave))
                    } else {
                        // idle: very short bars with slow ripple
                        barH = 2 + envelope * (3 + 2 * Math.sin(t * Math.PI * 2 + phaseRef.current))
                    }

                    const x = i * step
                    ctx2d.fillStyle = color
                    ctx2d.globalAlpha = active || processing ? 0.55 + envelope * 0.45 : 0.18
                    roundRect(ctx2d, x, midY - barH / 2, barWidth, barH, barWidth / 2)
                    ctx2d.fill()
                }
            }

            // ── soft edge fade ─────────────────────────────────────────────────────
            if (fadeEdges && w > 0) {
                const fadeW = Math.min(48, w * 0.18)
                // read actual background so the fade blends with whatever is behind
                const bg = getComputedStyle(canvas.parentElement ?? canvas).backgroundColor || "transparent"

                const makeGrad = (x0: number, x1: number, c0: string, c1: string) => {
                    const g = ctx2d.createLinearGradient(x0, 0, x1, 0)
                    g.addColorStop(0, c0)
                    g.addColorStop(1, c1)
                    return g
                }

                ctx2d.globalAlpha = 1
                ctx2d.fillStyle = makeGrad(0, fadeW, bg, "transparent")
                ctx2d.fillRect(0, 0, fadeW, h)
                ctx2d.fillStyle = makeGrad(w - fadeW, w, "transparent", bg)
                ctx2d.fillRect(w - fadeW, 0, fadeW, h)
            }

            rafRef.current = requestAnimationFrame(draw)
        }

        rafRef.current = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(rafRef.current)
    }, [active, processing, height, barWidth, barGap, historySize, mode, fadeEdges, resolvedColor])

    return (
        <div ref={containerRef} className={cn("w-full relative", className)} style={{ height }}>
            <canvas ref={canvasRef} className="w-full" style={{ height }} />
        </div>
    )
}

// ── rounded rectangle path helper ────────────────────────────────────────────
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
) {
    if (h < 2 * r) r = h / 2
    if (w < 2 * r) r = w / 2
    if (r < 0) r = 0
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}
