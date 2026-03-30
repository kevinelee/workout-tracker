import { useState, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import './WeightChart.css'

const KG_TO_LBS = 2.20462
const LBS_TO_KG = 1 / KG_TO_LBS

function fmtDate(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="wc-tooltip">
      <p className="wc-tooltip-date">{label}</p>
      <p className="wc-tooltip-value">{payload[0].value} {unit}</p>
    </div>
  )
}

export default function WeightChart({ logs, unit, onLog, onDelete }) {
  const isImperial = unit === 'lbs'
  const [showInput, setShowInput]   = useState(false)
  const [inputVal,  setInputVal]    = useState('')
  const [saving,    setSaving]      = useState(false)
  const [deleting,  setDeleting]    = useState(null) // id being deleted
  const inputRef = useRef(null)

  // Last 90 days for the chart
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const sorted = [...logs].sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt))
  const chartData = sorted
    .filter(l => new Date(l.loggedAt) >= cutoff)
    .map(l => ({
      id:     l.id,
      date:   fmtDate(l.loggedAt),
      weight: isImperial
        ? +(l.weightKg * KG_TO_LBS).toFixed(1)
        : +(l.weightKg.toFixed(1)),
    }))

  // Most recent 10 entries for the list (newest first)
  const recentEntries = [...sorted]
    .reverse()
    .slice(0, 10)

  function handleLogOpen() {
    setShowInput(true)
    setInputVal('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSave() {
    const val = parseFloat(inputVal)
    if (!val || val <= 0) return
    const kg = isImperial ? val * LBS_TO_KG : val
    setSaving(true)
    try {
      await onLog(kg)
      setShowInput(false)
      setInputVal('')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setShowInput(false); setInputVal('') }
  }

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await onDelete(id)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="wc">
      {/* Log weight button / inline form */}
      {showInput ? (
        <div className="wc-form">
          <div className="wc-form-row">
            <input
              ref={inputRef}
              className="wc-form-input"
              type="number"
              inputMode="decimal"
              placeholder={isImperial ? '165' : '75'}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <span className="wc-form-unit">{unit}</span>
            <span className="wc-form-date">{todayISO()}</span>
          </div>
          <div className="wc-form-actions">
            <button className="wc-btn wc-btn--ghost" onClick={() => { setShowInput(false); setInputVal('') }}>
              Cancel
            </button>
            <button
              className="wc-btn wc-btn--primary"
              onClick={handleSave}
              disabled={saving || !inputVal}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <button className="wc-log-btn" onClick={handleLogOpen}>
          + Log Weight
        </button>
      )}

      {/* Chart */}
      {chartData.length === 0 ? (
        <p className="wc-empty">Log your first entry — your progress will show up here.</p>
      ) : chartData.length === 1 ? (
        <div className="wc-single">
          <span className="wc-single-value">{chartData[0].weight} {unit}</span>
          <span className="wc-single-date">{chartData[0].date}</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#2e303a" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={v => v}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#c084fc"
              strokeWidth={2}
              dot={{ fill: '#c084fc', r: 4, strokeWidth: 0 }}
              activeDot={{ fill: '#c084fc', r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Recent entries list */}
      {recentEntries.length > 0 && (
        <div className="wc-entries">
          {recentEntries.map(l => {
            const display = isImperial
              ? +(l.weightKg * KG_TO_LBS).toFixed(1)
              : +(l.weightKg.toFixed(1))
            const isBeingDeleted = deleting === l.id
            return (
              <div key={l.id} className="wc-entry">
                <span className="wc-entry-date">{fmtDate(l.loggedAt)}</span>
                <span className="wc-entry-weight">{display} {unit}</span>
                <button
                  className="wc-entry-delete"
                  onClick={() => handleDelete(l.id)}
                  disabled={isBeingDeleted}
                  aria-label="Delete entry"
                >
                  {isBeingDeleted ? '…' : '✕'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
