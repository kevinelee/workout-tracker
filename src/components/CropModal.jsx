import { useState, useRef, useEffect } from 'react'
import './CropModal.css'

const CROP_SIZE = 260 // diameter of the crop circle in px

export default function CropModal({ file, onConfirm, onCancel }) {
  const [imgSrc,  setImgSrc]  = useState(null)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [scale,   setScale]   = useState(1)
  const [pos,     setPos]     = useState({ x: 0, y: 0 }) // offset from center in px
  const imgRef  = useRef(null)
  const drag    = useRef(null)  // { sx, sy, px, py }
  const pinch   = useRef(null)  // { d, s }

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onLoad(e) {
    const w = e.target.naturalWidth
    const h = e.target.naturalHeight
    setNatural({ w, h })
    // Scale so the shorter side exactly fills the crop circle
    setScale(CROP_SIZE / Math.min(w, h))
    setPos({ x: 0, y: 0 })
  }

  // Keep the image covering the crop circle at all times
  function clamp(x, y, s, nat = natural) {
    const maxX = Math.max(0, (nat.w * s - CROP_SIZE) / 2)
    const maxY = Math.max(0, (nat.h * s - CROP_SIZE) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    }
  }

  function xy(e) {
    return e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX,            y: e.clientY }
  }

  function onDown(e) {
    if (e.touches?.length >= 2) return
    const { x, y } = xy(e)
    drag.current = { sx: x, sy: y, px: pos.x, py: pos.y }
  }

  function onMove(e) {
    e.preventDefault()
    // ── Pinch zoom ───────────────────────────────────────────────
    if (e.touches?.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      if (!pinch.current) { pinch.current = { d, s: scale }; return }
      const minS = CROP_SIZE / Math.min(natural.w, natural.h)
      const newS = Math.max(minS, Math.min(6, pinch.current.s * (d / pinch.current.d)))
      setScale(newS)
      setPos(p => clamp(p.x, p.y, newS))
      return
    }
    // ── Drag ─────────────────────────────────────────────────────
    pinch.current = null
    if (!drag.current) return
    const { x, y } = xy(e)
    setPos(clamp(
      drag.current.px + (x - drag.current.sx),
      drag.current.py + (y - drag.current.sy),
      scale,
    ))
  }

  function onUp() {
    drag.current  = null
    pinch.current = null
  }

  function onWheel(e) {
    e.preventDefault()
    const minS = CROP_SIZE / Math.min(natural.w, natural.h)
    const newS = Math.max(minS, Math.min(6, scale * (e.deltaY < 0 ? 1.1 : 0.9)))
    setScale(newS)
    setPos(p => clamp(p.x, p.y, newS))
  }

  function confirm() {
    if (!natural.w) return
    const OUT     = 512
    const canvas  = document.createElement('canvas')
    canvas.width  = OUT
    canvas.height = OUT
    const srcSize = CROP_SIZE / scale
    const srcX    = natural.w / 2 - srcSize / 2 - pos.x / scale
    const srcY    = natural.h / 2 - srcSize / 2 - pos.y / scale
    canvas.getContext('2d').drawImage(imgRef.current, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT)
    canvas.toBlob(
      blob => blob && onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })),
      'image/jpeg', 0.9,
    )
  }

  return (
    <div className="crop-overlay" onMouseUp={onUp} onTouchEnd={onUp}>
      <div className="crop-modal">
        <p className="crop-title">Move &amp; Scale</p>

        {/* Outer wrapper clips the box-shadow so it doesn't bleed outside */}
        <div className="crop-wrapper" style={{ width: CROP_SIZE, height: CROP_SIZE }}>
          <div
            className="crop-viewport"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onTouchStart={onDown}
            onTouchMove={onMove}
            onWheel={onWheel}
          >
            {imgSrc && (
              <img
                ref={imgRef}
                src={imgSrc}
                onLoad={onLoad}
                className="crop-img"
                style={{
                  width:     natural.w * scale,
                  height:    natural.h * scale,
                  left:      '50%',
                  top:       '50%',
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }}
                alt=""
              />
            )}

            {/*
              The ring div uses box-shadow to darken everything outside the circle.
              The wrapper's overflow:hidden clips the shadow so it doesn't bleed out.
              No SVG / global IDs involved.
            */}
            <div className="crop-ring" />
          </div>
        </div>

        <p className="crop-hint">Drag to reposition · Pinch or scroll to zoom</p>

        <div className="crop-actions">
          <button className="crop-btn crop-btn--cancel"  onClick={onCancel}>Cancel</button>
          <button className="crop-btn crop-btn--confirm" onClick={confirm}>Use Photo</button>
        </div>
      </div>
    </div>
  )
}
