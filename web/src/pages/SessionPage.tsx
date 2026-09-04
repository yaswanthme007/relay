import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Volume2, Check, RotateCcw,
  Clock, Activity, Shield, ChevronRight, Settings
} from 'lucide-react'
import './SessionPage.css'

/* ─── Types ──────────────────────────────────────────────── */
interface Candidate {
  text: string
  confidence: number
  reasoning: string
}

interface HeardEntry {
  time: string
  status: 'complete' | 'cut' | 'pending'
  text: string
  cutAt?: string
}

/* ─── Mock Data for Demo ─────────────────────────────────── */
const mockCandidates: Candidate[] = [
  { text: "I need a refill of metformin, five hundred milligrams.", confidence: 0.92, reasoning: "Ledger match: metformin, common pharmacy phrase" },
  { text: "I need a refill of metformin, two fifty milligrams.", confidence: 0.61, reasoning: "Alternative dosage interpretation" },
  { text: "I need a refill of metoprolol, five hundred milligrams.", confidence: 0.34, reasoning: "Phonetically similar, lower ledger match" },
]

const mockHeardLog: HeardEntry[] = [
  { time: '14:32:07', status: 'complete', text: "Hi, I'm here to pick up a prescription." },
  { time: '14:32:19', status: 'cut', text: "Metformin, two fifty—", cutAt: '0.4s' },
  { time: '14:32:21', status: 'complete', text: "Metformin, five hundred milligrams." },
]

/* ─── Confidence helpers ─────────────────────────────────── */
function getConfidenceLabel(c: number): string {
  if (c > 0.85) return 'High'
  if (c >= 0.5) return 'Medium'
  return 'Low'
}

function getConfidenceClass(c: number): string {
  if (c > 0.85) return 'confidence--high'
  if (c >= 0.5) return 'confidence--medium'
  return 'confidence--low'
}

function getDeliveryMode(c: number): string {
  if (c > 0.85) return 'Statement'
  if (c >= 0.5) return 'Question (rising intonation)'
  return 'Silent (manual selection)'
}


/* ─── Waveform Visualizer ────────────────────────────────── */
function WaveformVisualizer({ active }: { active: boolean }) {
  const barCount = 32
  return (
    <div className={`waveform ${active ? 'waveform--active' : ''}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="waveform__bar"
          animate={active ? {
            height: [4, Math.random() * 28 + 4, 4],
          } : { height: 4 }}
          transition={active ? {
            duration: 0.6 + Math.random() * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.03,
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  )
}


/* ─── Pulsing Mic Button ─────────────────────────────────── */
function MicButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      className={`mic-button ${active ? 'mic-button--active' : ''}`}
      onClick={onClick}
      id="mic-toggle"
      aria-label={active ? 'Stop recording' : 'Start recording'}
    >
      {active && (
        <>
          <span className="mic-button__ring mic-button__ring--1" />
          <span className="mic-button__ring mic-button__ring--2" />
          <span className="mic-button__ring mic-button__ring--3" />
        </>
      )}
      <span className="mic-button__inner">
        {active ? <MicOff size={24} /> : <Mic size={24} />}
      </span>
    </button>
  )
}


/* ═══════════════════════════════════════════════════════════════
   SESSION PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function SessionPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [showCandidates, setShowCandidates] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [rawTranscript, setRawTranscript] = useState('')
  const [situation, setSituation] = useState('pharmacy')
  const [voiceName, setVoiceName] = useState('Meadow')
  const [heardLog, setHeardLog] = useState<HeardEntry[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [floorHoldActive, setFloorHoldActive] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleMicToggle = useCallback(() => {
    if (isRecording) {
      setIsRecording(false)
      setIsProcessing(true)
      // Simulate pipeline processing
      setTimeout(() => {
        setRawTranscript("i nee a refil of met four min five hunred miligrams")
        setIsProcessing(false)
        setShowCandidates(true)
      }, 1800)
    } else {
      setIsRecording(true)
      setShowCandidates(false)
      setSelectedCandidate(null)
      setRawTranscript('')
    }
  }, [isRecording])

  const handleSelectCandidate = useCallback((index: number) => {
    setSelectedCandidate(index)
    const candidate = mockCandidates[index]
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

    setHeardLog(prev => [...prev, {
      time: timeStr,
      status: 'complete',
      text: candidate.text,
    }])
  }, [])

  const handleReset = useCallback(() => {
    setShowCandidates(false)
    setSelectedCandidate(null)
    setRawTranscript('')
    setIsProcessing(false)
  }, [])

  return (
    <motion.main
      className="session-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="container">
        {/* ─── Header ──── */}
        <motion.div
          className="session-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            <h1 className="text-headline">Relay Session</h1>
            <p className="text-caption">Speak naturally. RELAY will reconstruct, confirm, and relay your intended message.</p>
          </div>
          <button
            className="btn btn--ghost"
            onClick={() => setShowSettings(!showSettings)}
            id="session-settings-toggle"
          >
            <Settings size={16} />
            Settings
          </button>
        </motion.div>

        {/* ─── Settings Panel ──── */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              className="session-settings card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="settings-grid">
                <div className="settings-item">
                  <label className="settings-label">Voice Identity</label>
                  <div className="settings-select-wrap">
                    <select
                      value={voiceName}
                      onChange={e => setVoiceName(e.target.value)}
                      className="settings-select"
                      id="voice-select"
                    >
                      {['Meadow', 'Ember', 'Cove', 'Grove', 'Summit'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="settings-item">
                  <label className="settings-label">Situation</label>
                  <div className="settings-select-wrap">
                    <select
                      value={situation}
                      onChange={e => setSituation(e.target.value)}
                      className="settings-select"
                      id="situation-select"
                    >
                      {['pharmacy', 'clinic', 'home', 'phone'].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="settings-item">
                  <label className="settings-label">Floor-Holding</label>
                  <button
                    className={`settings-toggle ${floorHoldActive ? 'settings-toggle--on' : ''}`}
                    onClick={() => setFloorHoldActive(!floorHoldActive)}
                    id="floor-hold-toggle"
                  >
                    <span className="settings-toggle__track" />
                    <span className="settings-toggle__thumb" />
                  </button>
                </div>
              </div>

              {/* Provider badge */}
              <div className="provider-badge">
                <span className="text-mono">Rime · mistv2 · speaker: {voiceName.toLowerCase()} · ws3</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* ─── Main Session Interface ──── */}
        <div className="session-grid">
          {/* Left: Recording Interface */}
          <div className="session-main">
            {/* Waveform */}
            <motion.div
              className="session-capture card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="capture-header">
                <span className="text-overline">Voice Capture</span>
                <div className={`capture-status ${isRecording ? 'capture-status--live' : ''}`}>
                  <span className="capture-status__dot" />
                  <span>{isRecording ? 'Listening' : isProcessing ? 'Processing' : 'Ready'}</span>
                </div>
              </div>

              <WaveformVisualizer active={isRecording} />

              <div className="capture-controls">
                <MicButton active={isRecording} onClick={handleMicToggle} />
                {showCandidates && (
                  <motion.button
                    className="btn btn--ghost"
                    onClick={handleReset}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <RotateCcw size={14} />
                    Reset
                  </motion.button>
                )}
              </div>

              {isRecording && (
                <motion.p
                  className="capture-hint text-caption"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Speak naturally. Release the microphone when finished.
                </motion.p>
              )}
            </motion.div>

            {/* Processing State */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  className="processing-state card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="processing-state__inner">
                    <motion.div
                      className="processing-spinner"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    />
                    <div>
                      <p className="processing-state__title">Reconstructing intent</p>
                      <p className="text-caption">
                        {floorHoldActive
                          ? '🔊 Floor-hold active — "One moment" played in your voice'
                          : 'Floor-hold disabled — silence during processing'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Raw Transcript */}
            <AnimatePresence>
              {rawTranscript && (
                <motion.div
                  className="raw-transcript card--flat card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <span className="text-overline">Raw ASR Output</span>
                  <p className="raw-transcript__text">"{rawTranscript}"</p>
                  <span className="text-caption">Noisy transcription — reconstruction follows</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Candidate Cards */}
            <AnimatePresence>
              {showCandidates && (
                <motion.div
                  className="candidates"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-overline">Reconstructed Candidates</span>
                  <div className="candidates__list">
                    {mockCandidates.map((candidate, i) => (
                      <motion.button
                        key={i}
                        className={`candidate-card card ${selectedCandidate === i ? 'candidate-card--selected' : ''}`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                        onClick={() => handleSelectCandidate(i)}
                        id={`candidate-${i}`}
                      >
                        <div className="candidate-card__top">
                          <div className="candidate-card__text">
                            {candidate.text}
                          </div>
                          {selectedCandidate === i && (
                            <motion.div
                              className="candidate-card__check"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            >
                              <Check size={14} />
                            </motion.div>
                          )}
                        </div>
                        <div className="candidate-card__meta">
                          <span className={`confidence-badge ${getConfidenceClass(candidate.confidence)}`}>
                            {getConfidenceLabel(candidate.confidence)} · {Math.round(candidate.confidence * 100)}%
                          </span>
                          <span className="text-caption">{getDeliveryMode(candidate.confidence)}</span>
                        </div>
                        <p className="candidate-card__reasoning text-caption">
                          {candidate.reasoning}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Spoken Output */}
            <AnimatePresence>
              {selectedCandidate !== null && (
                <motion.div
                  className="spoken-output card"
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="spoken-output__header">
                    <Volume2 size={18} className="spoken-output__icon" />
                    <span className="text-overline">Spoken Output</span>
                  </div>
                  <p className="spoken-output__text">
                    "{mockCandidates[selectedCandidate].text}"
                  </p>
                  <div className="spoken-output__meta">
                    <span className="badge">
                      <Volume2 size={11} /> Voice: {voiceName}
                    </span>
                    <span className="badge badge--info">
                      {getDeliveryMode(mockCandidates[selectedCandidate].confidence)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Heard Receipt + Status */}
          <div className="session-sidebar">
            {/* Status Panel */}
            <motion.div
              className="status-panel card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="status-panel__title">
                <Activity size={16} />
                Session Status
              </h3>
              <div className="status-rows">
                <div className="status-row">
                  <span className="text-caption">Voice</span>
                  <span className="status-row__value">{voiceName}</span>
                </div>
                <div className="status-row">
                  <span className="text-caption">Situation</span>
                  <span className="status-row__value">{situation}</span>
                </div>
                <div className="status-row">
                  <span className="text-caption">Floor-Hold</span>
                  <span className={`status-row__value ${floorHoldActive ? 'status--on' : 'status--off'}`}>
                    {floorHoldActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="status-row">
                  <span className="text-caption">Model</span>
                  <span className="status-row__value text-mono">mistv2</span>
                </div>
                <div className="status-row">
                  <span className="text-caption">Transport</span>
                  <span className="status-row__value text-mono">ws3</span>
                </div>
              </div>
            </motion.div>

            {/* Heard Receipt */}
            <motion.div
              className="heard-receipt card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="heard-receipt__header">
                <h3 className="heard-receipt__title">
                  <Shield size={16} />
                  Heard Receipt
                </h3>
                <span className="text-caption">{heardLog.length + mockHeardLog.length} entries</span>
              </div>
              <div className="heard-receipt__log">
                {[...mockHeardLog, ...heardLog].map((entry, i) => (
                  <motion.div
                    key={i}
                    className={`receipt-entry receipt-entry--${entry.status}`}
                    initial={i >= mockHeardLog.length ? { opacity: 0, x: -8 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="receipt-entry__time text-mono">{entry.time}</div>
                    <div className="receipt-entry__status">
                      {entry.status === 'complete' && <span className="badge badge--success">SPOKEN</span>}
                      {entry.status === 'cut' && <span className="badge badge--warning">CUT {entry.cutAt}</span>}
                    </div>
                    <div className="receipt-entry__text">"{entry.text}"</div>
                  </motion.div>
                ))}
                {heardLog.length === 0 && mockHeardLog.length > 0 && (
                  <div className="receipt-entry__hint text-caption">
                    Select a candidate above to add a new entry
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.main>
  )
}
