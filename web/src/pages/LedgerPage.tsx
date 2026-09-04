import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Plus, Search, Check, AlertTriangle,
  ChevronRight, Sparkles, FileText
} from 'lucide-react'
import './LedgerPage.css'

/* ─── Types ─────────────────────────────────────────────── */
interface LedgerEntry {
  id: string
  word: string
  phoneme: string
  category: 'name' | 'medication' | 'clinician' | 'location' | 'phrase'
  covered: boolean
  verified: boolean
}

/* ─── Mock ledger data ──────────────────────────────────── */
const initialLedger: LedgerEntry[] = [
  { id: '1', word: 'Ananya Sharma', phoneme: '{ah1nUn2yah sh1Arm2ah}', category: 'name', covered: false, verified: true },
  { id: '2', word: 'Metformin', phoneme: '{m1Etf1OrmIn}', category: 'medication', covered: true, verified: true },
  { id: '3', word: 'Levothyroxine', phoneme: '{l2Ev0othY1rOks2Een}', category: 'medication', covered: false, verified: true },
  { id: '4', word: 'Atorvastatin', phoneme: '{ah1tOrv2ast1atIn}', category: 'medication', covered: true, verified: true },
  { id: '5', word: 'Hydrochlorothiazide', phoneme: '{h1Ydr0okl1Or0othY1azYd}', category: 'medication', covered: false, verified: true },
  { id: '6', word: 'Salbutamol', phoneme: '{s1albyUt1am0Ol}', category: 'medication', covered: false, verified: false },
  { id: '7', word: 'Dr. Raghunathan', phoneme: '{d1Okt0Er r1Ag2Un1At2an}', category: 'clinician', covered: false, verified: true },
  { id: '8', word: 'Dr. Mukherjee', phoneme: '{d1Okt0Er m1Uk2Erj2Ee}', category: 'clinician', covered: false, verified: true },
  { id: '9', word: 'Maple Street Pharmacy', phoneme: '', category: 'location', covered: true, verified: false },
  { id: '10', word: 'Repeat prescription', phoneme: '', category: 'phrase', covered: true, verified: false },
  { id: '11', word: 'Sixty-day supply', phoneme: '{s1Ikst2Ee d1Ay s2Upl1Y}', category: 'phrase', covered: true, verified: true },
  { id: '12', word: 'Five hundred milligrams', phoneme: '{f1Yv h1Undr2Ed m1Il2Igr2amz}', category: 'phrase', covered: true, verified: true },
]

const categoryLabels: Record<string, string> = {
  name: 'Personal Name',
  medication: 'Medication',
  clinician: 'Clinician',
  location: 'Location',
  phrase: 'Domain Phrase',
}

const categoryColors: Record<string, string> = {
  name: 'badge--accent',
  medication: 'badge--info',
  clinician: 'badge--success',
  location: 'badge--warning',
  phrase: 'badge',
}


/* ─── Coverage stat ────────────────────────────────────── */
function CoverageRing({ covered, total }: { covered: number; total: number }) {
  const percentage = Math.round((covered / total) * 100)
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="coverage-ring">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="4" />
        <motion.circle
          cx="48" cy="48" r={radius} fill="none"
          stroke="var(--color-accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="coverage-ring__label">
        <span className="coverage-ring__value">{percentage}%</span>
        <span className="coverage-ring__sub">covered</span>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   LEDGER PAGE
   ═══════════════════════════════════════════════════════════ */
export default function LedgerPage() {
  const [ledger, setLedger] = useState(initialLedger)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [newCategory, setNewCategory] = useState<string>('medication')

  const filtered = ledger.filter(entry => {
    const matchesSearch = entry.word.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = activeCategory ? entry.category === activeCategory : true
    return matchesSearch && matchesCat
  })

  const coveredCount = ledger.filter(e => e.covered).length
  const verifiedCount = ledger.filter(e => e.verified).length
  const uncoveredCount = ledger.length - coveredCount
  const categories = Array.from(new Set(ledger.map(e => e.category)))

  const handleAdd = () => {
    if (!newWord.trim()) return
    setLedger(prev => [...prev, {
      id: Date.now().toString(),
      word: newWord.trim(),
      phoneme: '',
      category: newCategory as LedgerEntry['category'],
      covered: false,
      verified: false,
    }])
    setNewWord('')
    setShowAddForm(false)
  }

  return (
    <motion.main
      className="ledger-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="container">
        {/* ─── Header ──── */}
        <motion.div
          className="ledger-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            <span className="text-overline">Personal Pronunciation Ledger</span>
            <h1 className="text-headline">Your words, pronounced correctly</h1>
            <p className="text-subheadline" style={{ maxWidth: 560, marginTop: 'var(--space-2)' }}>
              Every name, medication, and phrase that matters to you — verified with Rime's Coverage 
              and Phonemize APIs for deterministic pronunciation.
            </p>
          </div>
          <button
            className="btn btn--accent"
            onClick={() => setShowAddForm(!showAddForm)}
            id="add-term-btn"
          >
            <Plus size={16} />
            Add Term
          </button>
        </motion.div>

        {/* ─── Add Form ──── */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              className="add-form card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="add-form__inner">
                <div className="add-form__field">
                  <label className="settings-label">Term</label>
                  <input
                    type="text"
                    className="add-form__input"
                    placeholder="e.g. Lisinopril, Dr. Patel, morning dose..."
                    value={newWord}
                    onChange={e => setNewWord(e.target.value)}
                    id="add-term-input"
                    autoFocus
                  />
                </div>
                <div className="add-form__field">
                  <label className="settings-label">Category</label>
                  <select
                    className="settings-select"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    id="add-term-category"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="add-form__actions">
                  <button className="btn btn--accent" onClick={handleAdd} id="add-term-submit">
                    <Plus size={14} /> Add to Ledger
                  </button>
                  <button className="btn btn--ghost" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Stats Row ──── */}
        <motion.div
          className="ledger-stats"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="ledger-stat-card card">
            <CoverageRing covered={coveredCount} total={ledger.length} />
            <div>
              <p className="ledger-stat-card__label">Rime Coverage</p>
              <p className="text-caption">{coveredCount} of {ledger.length} terms are in Rime's dictionary</p>
            </div>
          </div>

          <div className="ledger-stat-card card">
            <div className="ledger-stat-card__big">
              <Sparkles size={20} className="ledger-stat-icon" />
              <span className="stat__number">{verifiedCount}</span>
            </div>
            <div>
              <p className="ledger-stat-card__label">Phoneme Verified</p>
              <p className="text-caption">Custom phoneme strings confirmed via Phonemize API</p>
            </div>
          </div>

          <div className="ledger-stat-card card">
            <div className="ledger-stat-card__big">
              <AlertTriangle size={20} className="ledger-stat-icon ledger-stat-icon--warn" />
              <span className="stat__number">{uncoveredCount}</span>
            </div>
            <div>
              <p className="ledger-stat-card__label">Uncovered Terms</p>
              <p className="text-caption">Require custom phoneme injection for reliable pronunciation</p>
            </div>
          </div>
        </motion.div>

        {/* ─── Filters ──── */}
        <motion.div
          className="ledger-filters"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="ledger-search">
            <Search size={16} className="ledger-search__icon" />
            <input
              type="text"
              className="ledger-search__input"
              placeholder="Search vocabulary..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              id="ledger-search"
            />
          </div>

          <div className="ledger-category-pills">
            <button
              className={`category-pill ${!activeCategory ? 'category-pill--active' : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              All ({ledger.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-pill ${activeCategory === cat ? 'category-pill--active' : ''}`}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {categoryLabels[cat]} ({ledger.filter(e => e.category === cat).length})
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── Vocabulary Table ──── */}
        <motion.div
          className="ledger-table-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="ledger-table">
            <div className="ledger-table__header">
              <span>Term</span>
              <span>Category</span>
              <span>Phoneme String</span>
              <span>Coverage</span>
              <span>Status</span>
            </div>
            <div className="ledger-table__body">
              <AnimatePresence>
                {filtered.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    className="ledger-row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    layout
                  >
                    <div className="ledger-row__term">
                      <span className="ledger-row__word">{entry.word}</span>
                    </div>
                    <div>
                      <span className={`badge ${categoryColors[entry.category]}`}>
                        {categoryLabels[entry.category]}
                      </span>
                    </div>
                    <div className="ledger-row__phoneme">
                      {entry.phoneme ? (
                        <code className="phoneme-code">{entry.phoneme}</code>
                      ) : (
                        <span className="text-caption">— pending</span>
                      )}
                    </div>
                    <div>
                      {entry.covered ? (
                        <span className="badge badge--success">
                          <Check size={10} /> In Dictionary
                        </span>
                      ) : (
                        <span className="badge badge--warning">
                          <AlertTriangle size={10} /> Uncovered
                        </span>
                      )}
                    </div>
                    <div>
                      {entry.verified ? (
                        <span className="badge badge--success">
                          <Check size={10} /> Verified
                        </span>
                      ) : (
                        <span className="badge badge--danger">
                          Pending
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ─── Pipeline Explanation ──── */}
        <motion.div
          className="ledger-pipeline card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="ledger-pipeline__header">
            <FileText size={18} className="ledger-pipeline__icon" />
            <div>
              <h3 className="ledger-pipeline__title">How the Ledger Pipeline Works</h3>
              <p className="text-caption">Automated, systematic, and measurable — not hand-typed phonemes</p>
            </div>
          </div>
          <div className="ledger-pipeline__steps">
            {[
              { label: 'Vocabulary List', desc: "Personal terms from the user\u2019s life" },
              { label: 'Coverage API', desc: 'Which words Rime already knows' },
              { label: 'Record Audio', desc: 'Correct pronunciation captured' },
              { label: 'Phonemize API', desc: 'Audio → Rime phoneme string' },
              { label: 'Store in Ledger', desc: 'Persisted per-user entry' },
              { label: 'Inject at Synthesis', desc: '{phoneme} in text + mistv2' },
            ].map((step, i) => (
              <div key={i} className="ledger-pipeline__step">
                <div className="ledger-pipeline__step-num">{i + 1}</div>
                <div>
                  <p className="ledger-pipeline__step-label">{step.label}</p>
                  <p className="text-caption">{step.desc}</p>
                </div>
                {i < 5 && <ChevronRight size={14} className="ledger-pipeline__arrow" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.main>
  )
}
