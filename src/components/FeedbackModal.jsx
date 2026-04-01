import { useState, useEffect, useRef } from 'react'
import { saveFeedback } from '../storage'
import './FeedbackModal.css'

export default function FeedbackModal({ authUser, defaultType = 'bug', onClose }) {
  const [type, setType]           = useState(defaultType)
  const [message, setMessage]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)
  const sheetRef = useRef(null)

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      if (!sheetRef.current) return
      const offset = window.innerHeight - vv.height - vv.offsetTop
      sheetRef.current.style.transform = offset > 0 ? `translateY(-${offset}px)` : ''
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    try {
      await saveFeedback(type, message.trim(), authUser?.email)
      setDone(true)
      setTimeout(onClose, 1400)
    } catch (err) {
      console.error('Feedback submit failed:', err)
      setSubmitting(false)
    }
  }

  return (
    <div className="feedback-backdrop" onClick={onClose}>
      <div className="feedback-sheet" ref={sheetRef} onClick={e => e.stopPropagation()}>
        <div className="feedback-handle" />

        {done ? (
          <div className="feedback-done">
            <span className="feedback-done-icon">✓</span>
            <p className="feedback-done-text">Thanks! We got it.</p>
          </div>
        ) : (
          <>
            <div className="feedback-type-row">
              <button
                className={`feedback-type-btn${type === 'bug' ? ' feedback-type-btn--active' : ''}`}
                onClick={() => setType('bug')}
              >
                🐛 Report a Bug
              </button>
              <button
                className={`feedback-type-btn${type === 'feedback' ? ' feedback-type-btn--active' : ''}`}
                onClick={() => setType('feedback')}
              >
                💬 Share Feedback
              </button>
            </div>

            <textarea
              className="feedback-textarea"
              placeholder={
                type === 'bug'
                  ? 'Describe what happened and what you expected…'
                  : "What's on your mind?"
              }
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              autoFocus
            />

            <div className="feedback-actions">
              <button className="feedback-cancel-btn" onClick={onClose}>Cancel</button>
              <button
                className="feedback-submit-btn"
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
