let audioCtx = null

function getCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  audioCtx ??= new Ctx()
  return audioCtx
}

// iOS only allows audio to start once an AudioContext has been resumed
// inside a direct user gesture. The rest timer's chime plays later, from a
// setInterval callback, which doesn't count — so call this synchronously
// from the tap that starts the rest timer to unlock it ahead of time.
export function unlockChime() {
  getCtx()?.resume()
}

// Short single-note tick for the 3-2-1 countdown cue, distinct in timbre from
// the ascending completion chime so the two are never confused mid-rest.
export function playTick() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()

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
}

// Two-note ascending chime for the rest-timer-done alert.
export function playChime() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()

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
}
