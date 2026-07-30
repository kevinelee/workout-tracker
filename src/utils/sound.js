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
