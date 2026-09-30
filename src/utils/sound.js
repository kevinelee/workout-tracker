let audioCtx = null

function getCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (audioCtx?.state === 'closed') audioCtx = null
  if (!audioCtx) {
    // Mix with whatever else is playing (the user's music) instead of
    // competing for the audio session — with the default, iOS can interrupt
    // this context when music is on and the chime silently never plays.
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient' } catch { /* unsupported */ }
    audioCtx = new Ctx()
  }
  return audioCtx
}

// iOS only allows audio to start once an AudioContext has been resumed
// inside a direct user gesture. The rest timer's chime plays later, from a
// setInterval callback, which doesn't count — so call this synchronously
// from the tap that starts the rest timer to unlock it ahead of time.
// Playing a one-sample silent buffer is what actually unlocks older iOS;
// resume() alone isn't always enough there.
export function unlockChime() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state !== 'running') ctx.resume().catch(() => {})
  try {
    const src = ctx.createBufferSource()
    src.buffer = ctx.createBuffer(1, 1, 22050)
    src.connect(ctx.destination)
    src.start(0)
  } catch { /* nothing to unlock */ }
}

// iOS suspends the context again after the app is backgrounded, the screen
// locks, or another app takes the audio ('interrupted' in Safari, which
// resume() used to skip since it only checked for 'suspended'). Any later tap
// re-arms it, so the next chime doesn't depend on the exact set-complete tap.
if (typeof document !== 'undefined') {
  const rearm = () => { if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().catch(() => {}) }
  document.addEventListener('touchend', rearm, true)
  document.addEventListener('click', rearm, true)
}

// Runs play(ctx) once the context is actually running — scheduling notes on a
// suspended context queued them against a frozen clock, or dropped them.
function withCtx(play) {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'running') { play(ctx); return }
  ctx.resume().then(() => play(ctx)).catch(() => {})
}

// Short single-note tick for the 3-2-1 countdown cue, distinct in timbre from
// the ascending completion chime so the two are never confused mid-rest.
export function playTick() {
  withCtx(ctx => {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.1)
  })
}

// Two-note ascending chime for the rest-timer-done alert.
export function playChime() {
  withCtx(ctx => {
    const now = ctx.currentTime
    const notes = [
      { freq: 880,    start: 0,    dur: 0.16 },
      { freq: 1318.5, start: 0.14, dur: 0.3 },
    ]
    for (const { freq, start, dur } of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    }
  })
}
