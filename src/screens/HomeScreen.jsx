import { useState, useEffect, useRef, useMemo } from 'react'
import { starterTemplates } from '../data/starterTemplates'
import { getTemplateOrder, saveTemplateOrder } from '../storage'
import { useProGate } from '../lib/proGate'
import './HomeScreen.css'

function fmtLastDone(isoDate) {
  if (!isoDate) return null
  const now = new Date()
  const then = new Date(isoDate)
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Last done: today'
  if (diffDays === 1) return 'Last done: yesterday'
  if (diffDays < 7) return `Last done: ${diffDays} days ago`
  if (diffDays < 14) return 'Last done: 1 week ago'
  if (diffDays < 30) return `Last done: ${Math.floor(diffDays / 7)} weeks ago`
  return `Last done: ${then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <polyline points="7 4 13 10 7 16" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <polyline points="13 4 7 10 13 16" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <polyline points="4 7 10 13 16 7" />
    </svg>
  )
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
      <rect x="4" y="5"  width="12" height="1.8" rx="0.9" />
      <rect x="4" y="9.1" width="12" height="1.8" rx="0.9" />
      <rect x="4" y="13.2" width="12" height="1.8" rx="0.9" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M14.5 2.5a2.121 2.121 0 013 3L6 17l-4 1 1-4L14.5 2.5z" />
    </svg>
  )
}

function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function HomeScreen({
  templates, sessions, dataLoaded, settings,
  activeSession, startingTemplateId, startingQuickStart,
  onNew, onEdit, onStart, onQuickStart, onResumeSession, onAbandon,
  onNewGenerate, onNewGenerateSingle, weeklyInsight, onDismissInsight, onRefreshInsight,
  programs, activeProgram, onSwitchProgram, onCreateProgram, onRenameProgram, onDeleteProgram,
}) {
  const { requirePro } = useProGate()
  const [showNewSheet, setShowNewSheet] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)

  // Program sheet state
  const [showProgramSheet, setShowProgramSheet] = useState(false)
  const [editingProgramId, setEditingProgramId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [deletingProgramId,      setDeletingProgramId]      = useState(null)
  const [programDeleteInProgress, setProgramDeleteInProgress] = useState(null)
  // 'options' = show build/generate choices; 'name' = show name input
  const [newProgramStep, setNewProgramStep] = useState(null)
  const [newProgramName, setNewProgramName] = useState('')
  const [programSaving, setProgramSaving] = useState(false)

  // ── Drag-to-reorder ────────────────────────────────────────
  const [templateOrder, setTemplateOrder] = useState(null)
  const [dragId, setDragId]   = useState(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const itemElsRef    = useRef({})  // { [templateId]: HTMLElement }
  const isDraggingRef = useRef(false)
  const dragIdRef     = useRef(null)
  const hoverIdxRef   = useRef(null)

  // Load persisted order once templates arrive
  useEffect(() => {
    if (!templates) return
    const order = getTemplateOrder()
    if (order) setTemplateOrder(order)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!templates])

  // Templates sorted by saved order; new ones appended at end
  const baseList = useMemo(() => {
    if (!templates) return templates
    if (!templateOrder?.length) return templates
    const map = new Map(templates.map(t => [t.id, t]))
    const ordered   = templateOrder.filter(id => map.has(id)).map(id => map.get(id))
    const remainder = templates.filter(t => !templateOrder.includes(t.id))
    return [...ordered, ...remainder]
  }, [templates, templateOrder])

  // During drag: preview with dragged item at hover position
  const displayList = useMemo(() => {
    if (!baseList || !dragId || hoverIdx === null) return baseList
    const fromIdx = baseList.findIndex(t => t.id === dragId)
    if (fromIdx === -1 || fromIdx === hoverIdx) return baseList
    const result = [...baseList]
    const [item] = result.splice(fromIdx, 1)
    result.splice(hoverIdx, 0, item)
    return result
  }, [baseList, dragId, hoverIdx])

  function getHoverIdx(clientY) {
    const list = displayList ?? []
    let best = 0, minDist = Infinity
    list.forEach((t, i) => {
      const el = itemElsRef.current[t.id]
      if (!el) return
      const rect = el.getBoundingClientRect()
      const dist = Math.abs(clientY - (rect.top + rect.height / 2))
      if (dist < minDist) { minDist = dist; best = i }
    })
    return best
  }

  function handleDragPointerDown(e, templateId) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    dragIdRef.current     = templateId
    hoverIdxRef.current   = (baseList ?? []).findIndex(t => t.id === templateId)
    setDragId(templateId)
    setHoverIdx(hoverIdxRef.current)
  }

  function handleDragPointerMove(e) {
    if (!isDraggingRef.current) return
    const newHover = getHoverIdx(e.clientY)
    if (newHover !== hoverIdxRef.current) {
      hoverIdxRef.current = newHover
      setHoverIdx(newHover)
    }
  }

  function handleDragPointerUp() {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const draggedId = dragIdRef.current
    const toIdx     = hoverIdxRef.current
    setDragId(null)
    setHoverIdx(null)
    dragIdRef.current   = null
    hoverIdxRef.current = null

    if (draggedId != null && toIdx != null) {
      const from = (baseList ?? []).findIndex(t => t.id === draggedId)
      if (from !== -1 && from !== toIdx) {
        const next = [...(baseList ?? [])]
        const [item] = next.splice(from, 1)
        next.splice(toIdx, 0, item)
        const newOrder = next.map(t => t.id)
        setTemplateOrder(newOrder)
        saveTemplateOrder(newOrder)
      }
    }
  }
  // ──────────────────────────────────────────────────────────

  const lastSessionByTemplate = sessions.reduce((map, s) => {
    if (!s.templateId || !s.finishedAt) return map
    const prev = map[s.templateId]
    if (!prev || new Date(s.finishedAt) > new Date(prev)) map[s.templateId] = s.finishedAt
    return map
  }, {})
  const [sessionElapsed, setSessionElapsed] = useState(0)

  useEffect(() => {
    if (!activeSession) return
    const tick = () => setSessionElapsed(Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeSession?.startedAt])

  // Close sheet on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setShowNewSheet(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const completedSets = activeSession?.logs?.reduce((sum, l) => sum + l.sets.filter(s => s.completed).length, 0) ?? 0
  const totalSets     = activeSession?.logs?.reduce((sum, l) => sum + l.sets.length, 0) ?? 0

  function handleNewManual() {
    setShowNewSheet(false)
    onNew()
  }

  function handleNewGenerate() {
    setShowNewSheet(false)
    onNewGenerate()
  }

  function handleNewGenerateSingle() {
    setShowNewSheet(false)
    onNewGenerateSingle()
  }

  return (
    <div className={`home ${settings.controllerSide === 'left' ? 'home--left' : ''}`}>
      <div className="home-header">
        <button className="home-program-btn" onClick={() => setShowProgramSheet(true)}>
          <span className="home-program-name">{activeProgram?.name ?? 'My Workouts'}</span>
          <ChevronDownIcon />
        </button>
        <button className="home-new-btn" onClick={() => setShowNewSheet(true)}>+</button>
      </div>

      {/* Active session resume banner */}
      {activeSession && (
        <div className="home-session-banner-wrap">
          <button className="home-session-banner" onClick={onResumeSession}>
            <div className="home-session-banner-left">
              <span className="home-session-banner-dot" />
              <div>
                <p className="home-session-banner-name">{activeSession.template?.name}</p>
                <p className="home-session-banner-meta">{completedSets}/{totalSets} sets · {fmtElapsed(sessionElapsed)}</p>
              </div>
            </div>
            <span className="home-session-banner-cta">Resume →</span>
          </button>
        </div>
      )}

      {/* AI insight card — weekly recap */}
      {weeklyInsight && (
        <div className="home-insight-card">
          {weeklyInsight.loading ? (
            <div className="home-insight-loading">
              <div className="home-insight-spinner" />
              <span>Analyzing your week…</span>
            </div>
          ) : (
            <div className="home-insight-row">
              <div className="home-insight-body">
                <p className="home-insight-label">{weeklyInsight.mode === 'returning' ? 'Welcome back' : 'Weekly recap'}</p>
                <p className="home-insight-text">{weeklyInsight.insight}</p>
              </div>
              <div className="home-insight-actions">
                <button className="home-insight-refresh" onClick={onRefreshInsight} aria-label="Refresh">↻</button>
                <button className="home-insight-dismiss" onClick={onDismissInsight} aria-label="Dismiss">✕</button>
              </div>
            </div>
          )}
        </div>
      )}

      {templates === null ? (
        <ul className="home-list">
          {[0, 1, 2].map(i => (
            <li key={i}>
              <div className="home-card home-card--skeleton">
                <div className="home-skeleton-info">
                  <div className="home-skeleton-line home-skeleton-line--title" />
                  <div className="home-skeleton-line home-skeleton-line--meta" />
                </div>
                <div className="home-skeleton-btn" />
              </div>
            </li>
          ))}
        </ul>
      ) : templates.length === 0 ? (
        <div className="home-empty">
          <p className="home-empty-text">No workouts yet.</p>
          <p className="home-empty-sub">Pick a Quick Start below or tap <strong>+ New</strong> to build your own.</p>
        </div>
      ) : (
        <ul className={`home-list home-list--loaded${dragId ? ' home-list--dragging' : ''}`}>
          {(displayList ?? []).map(t => {
            const isDragging = t.id === dragId
            return (
              <li key={t.id} ref={el => { if (el) itemElsRef.current[t.id] = el; else delete itemElsRef.current[t.id] }}>
                <div className={`home-card${isDragging ? ' home-card--dragging' : ''}`}>
                  <button
                    className="home-drag-handle"
                    onPointerDown={e => handleDragPointerDown(e, t.id)}
                    onPointerMove={handleDragPointerMove}
                    onPointerUp={handleDragPointerUp}
                    onClick={e => e.stopPropagation()}
                    aria-label="Drag to reorder"
                  >
                    <DragHandleIcon />
                  </button>
                  <div className="home-card-info">
                    <p className="home-card-name">{t.name}</p>
                    <p className="home-card-meta">
                      {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                      {fmtLastDone(lastSessionByTemplate[t.id]) && (
                        <span className="home-card-last-done"> · {fmtLastDone(lastSessionByTemplate[t.id])}</span>
                      )}
                    </p>
                  </div>
                  <div className="home-card-actions">
                    <button className="home-edit-btn" onClick={() => onEdit(t)} aria-label="Edit workout"><PencilIcon /></button>
                    <button
                      className={`home-start-btn ${startingTemplateId === t.id ? 'home-start-btn--loading' : ''}`}
                      onClick={() => onStart(t)}
                      disabled={!!startingTemplateId || !!startingQuickStart}
                      aria-label="Start workout"
                    >
                      {startingTemplateId === t.id
                        ? <span className="home-start-spinner" />
                        : settings.controllerSide === 'left'
                          ? <ChevronLeftIcon />
                          : <ChevronRightIcon />
                      }
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Quick start — always visible */}
      <div className="home-quickstart">
        <p className="home-quickstart-label">Quick Start</p>
        <div className="home-quickstart-grid">
          {starterTemplates.map(starter => {
            const isLoading = startingQuickStart === starter.label
            return (
              <button
                key={starter.label}
                className={`home-quickstart-card${isLoading ? ' home-quickstart-card--loading' : ''}${startingQuickStart && !isLoading ? ' home-quickstart-card--dimmed' : ''}`}
                onClick={() => onQuickStart(starter)}
                disabled={!!startingQuickStart}
              >
                {isLoading
                  ? <span className="qs-spinner" />
                  : <span className="home-quickstart-emoji">{starter.emoji}</span>
                }
                <span className="home-quickstart-name">{starter.label}</span>
                <span className="home-quickstart-desc">{starter.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Program manager sheet */}
      {showProgramSheet && (
        <div className="home-sheet-overlay" onClick={() => { setShowProgramSheet(false); setEditingProgramId(null); setDeletingProgramId(null); setNewProgramStep(null); setNewProgramName('') }}>
          <div className="home-sheet home-program-sheet" onClick={e => e.stopPropagation()}>
            <p className="home-sheet-title">Programs</p>

            <ul className="home-program-list">
              {(programs ?? []).map(p => {
                const isEditing  = editingProgramId === p.id
                const isDeleting = deletingProgramId === p.id
                return (
                  <li
                key={p.id}
                className={`home-program-item${programDeleteInProgress === p.id ? ' home-program-item--removing' : ''}`}
              >
                    {isDeleting ? (
                      <div className="home-program-delete-confirm">
                        <span className="home-program-delete-msg">Delete "{p.name}"?</span>
                        <button
                          className="home-program-delete-cancel"
                          disabled={programDeleteInProgress === p.id}
                          onClick={() => setDeletingProgramId(null)}
                        >Cancel</button>
                        <button
                          className="home-program-delete-ok"
                          disabled={programDeleteInProgress === p.id}
                          onClick={async () => {
                            setProgramDeleteInProgress(p.id)
                            try {
                              await Promise.all([
                                onDeleteProgram(p.id),
                                new Promise(r => setTimeout(r, 360)),
                              ])
                            } finally {
                              setProgramDeleteInProgress(null)
                              setDeletingProgramId(null)
                            }
                            if ((programs?.length ?? 0) <= 1) setShowProgramSheet(false)
                          }}
                        >
                          {programDeleteInProgress === p.id
                            ? <span className="home-program-delete-spinner" />
                            : 'Delete'
                          }
                        </button>
                      </div>
                    ) : isEditing ? (
                      <div className="home-program-edit-row">
                        <input
                          className="home-program-input"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && editingName.trim()) {
                              await onRenameProgram(p.id, editingName.trim())
                              setEditingProgramId(null)
                            }
                            if (e.key === 'Escape') setEditingProgramId(null)
                          }}
                          autoFocus
                        />
                        <button className="home-program-edit-save" onClick={async () => {
                          if (!editingName.trim()) return
                          await onRenameProgram(p.id, editingName.trim())
                          setEditingProgramId(null)
                        }}>Save</button>
                        <button className="home-program-edit-cancel" onClick={() => setEditingProgramId(null)}>✕</button>
                      </div>
                    ) : (
                      <>
                        <button className="home-program-row" onClick={async () => {
                          if (!p.isActive) await onSwitchProgram(p.id)
                          setShowProgramSheet(false)
                        }}>
                          <span className={`home-program-radio${p.isActive ? ' home-program-radio--active' : ''}`} />
                          <span className="home-program-row-name">{p.name}</span>
                        </button>
                        <div className="home-program-row-actions">
                          <button className="home-program-action-btn" aria-label="Rename" onClick={() => { setEditingProgramId(p.id); setEditingName(p.name) }}>
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                              <path d="M14.5 2.5a2.121 2.121 0 013 3L6 17l-4 1 1-4L14.5 2.5z" />
                            </svg>
                          </button>
                          {(programs?.length ?? 0) > 1 && (
                            <button className="home-program-action-btn home-program-action-btn--danger" aria-label="Delete" onClick={() => setDeletingProgramId(p.id)}>
                              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                                <polyline points="5 7 15 7" />
                                <path d="M8 7V5a1 1 0 011-1h2a1 1 0 011 1v2" />
                                <rect x="4" y="7" width="12" height="10" rx="1.5" />
                                <line x1="8" y1="11" x2="8" y2="14" />
                                <line x1="12" y1="11" x2="12" y2="14" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>

            {newProgramStep === 'name' ? (
              <div className="home-program-new-row">
                <input
                  className="home-program-input"
                  placeholder="Program name"
                  value={newProgramName}
                  onChange={e => setNewProgramName(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && newProgramName.trim() && !programSaving) {
                      setProgramSaving(true)
                      try { await onCreateProgram(newProgramName.trim()) } finally {
                        setNewProgramName(''); setNewProgramStep(null); setProgramSaving(false)
                      }
                    }
                    if (e.key === 'Escape') { setNewProgramStep('options'); setNewProgramName('') }
                  }}
                  autoFocus
                />
                <button className="home-program-edit-save" disabled={!newProgramName.trim() || programSaving} onClick={async () => {
                  if (!newProgramName.trim() || programSaving) return
                  setProgramSaving(true)
                  try { await onCreateProgram(newProgramName.trim()) } finally {
                    setNewProgramName(''); setNewProgramStep(null); setProgramSaving(false)
                  }
                }}>
                  {programSaving ? <span className="home-program-spinner" /> : 'Add'}
                </button>
                <button className="home-program-edit-cancel" onClick={() => { setNewProgramStep('options'); setNewProgramName('') }}>✕</button>
              </div>
            ) : newProgramStep === 'options' ? (
              <div className="home-program-new-options">
                <button className="home-sheet-option home-sheet-option--sm" onClick={() => setNewProgramStep('name')}>
                  <div className="home-sheet-option-icon">
                    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="11" y1="5" x2="11" y2="17" />
                      <line x1="5" y1="11" x2="17" y2="11" />
                    </svg>
                  </div>
                  <div className="home-sheet-option-text">
                    <span className="home-sheet-option-label">Build it myself</span>
                    <span className="home-sheet-option-sub">Pick exercises and set your defaults</span>
                  </div>
                </button>
                <button className="home-sheet-option home-sheet-option--sm" onClick={() => {
                  setShowProgramSheet(false); setNewProgramStep(null); setNewProgramName('')
                  onNewGenerateSingle()
                }}>
                  <div className="home-sheet-option-icon home-sheet-option-icon--accent">
                    <svg viewBox="0 0 22 22" fill="currentColor" stroke="none">
                      <path d="M12 2L4.5 12.5H10L8.5 21L19.5 10H14L12 2z" />
                    </svg>
                  </div>
                  <div className="home-sheet-option-text">
                    <span className="home-sheet-option-label">Generate a workout</span>
                    <span className="home-sheet-option-sub">AI builds one workout for you instantly</span>
                  </div>
                </button>
                <button className="home-sheet-option home-sheet-option--sm" onClick={() => {
                  setShowProgramSheet(false); setNewProgramStep(null); setNewProgramName('')
                  onNewGenerate()
                }}>
                  <div className="home-sheet-option-icon home-sheet-option-icon--accent">
                    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
                    </svg>
                  </div>
                  <div className="home-sheet-option-text">
                    <span className="home-sheet-option-label">Generate a plan</span>
                    <span className="home-sheet-option-sub">Answer 2 quick questions, get a full split</span>
                  </div>
                </button>
              </div>
            ) : (
              <button className="home-program-new-btn" onClick={() => {
                if (!requirePro()) return
                setNewProgramStep('options')
              }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                  <line x1="10" y1="4" x2="10" y2="16" /><line x1="4" y1="10" x2="16" y2="10" />
                </svg>
                New Program
              </button>
            )}

            <button className="home-sheet-cancel" onClick={() => { setShowProgramSheet(false); setEditingProgramId(null); setDeletingProgramId(null); setNewProgramStep(null); setNewProgramName('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* New workout choice sheet */}
      {showNewSheet && (
        <div className="home-sheet-overlay" onClick={() => setShowNewSheet(false)}>
          <div className="home-sheet" onClick={e => e.stopPropagation()}>
            <p className="home-sheet-title">New Workout</p>

            <button className="home-sheet-option" onClick={handleNewManual}>
              <div className="home-sheet-option-icon">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="11" y1="5" x2="11" y2="17" />
                  <line x1="5" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <div className="home-sheet-option-text">
                <span className="home-sheet-option-label">Build it myself</span>
                <span className="home-sheet-option-sub">Pick exercises and set your defaults</span>
              </div>
            </button>

            <button
              className="home-sheet-option"
              onClick={handleNewGenerateSingle}
            >
              <div className="home-sheet-option-icon home-sheet-option-icon--accent">
                <svg viewBox="0 0 22 22" fill="currentColor" stroke="none">
                  <path d="M12 2L4.5 12.5H10L8.5 21L19.5 10H14L12 2z" />
                </svg>
              </div>
              <div className="home-sheet-option-text">
                <span className="home-sheet-option-label">Generate a workout</span>
                <span className="home-sheet-option-sub">AI builds one workout for you instantly</span>
              </div>
            </button>

            <button
              className="home-sheet-option"
              onClick={handleNewGenerate}
            >
              <div className="home-sheet-option-icon home-sheet-option-icon--accent">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
                </svg>
              </div>
              <div className="home-sheet-option-text">
                <span className="home-sheet-option-label">Generate a plan</span>
                <span className="home-sheet-option-sub">Answer 2 quick questions, get a full split</span>
              </div>
            </button>

            <button className="home-sheet-cancel" onClick={() => setShowNewSheet(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
