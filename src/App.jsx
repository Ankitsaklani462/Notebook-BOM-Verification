import { useEffect, useMemo, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import logoImage from './assets/LOGO.png'
import './App.css'
import AdminView from './components/AdminView'
import HistoryView from './components/HistoryView'
import UserView from './components/UserView'
import { createModelEntry, normalizeMaterial, verifyScannedMaterial } from './utils/verifyMaterials'
import { loadDataWithFallback, readStoredJSON, writeStoredJSON } from './utils/staticStorage'

function App() {
  const [modelId, setModelId] = useState('')
  const [line, setLine] = useState('')
  const [shift, setShift] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [scanMode, setScanMode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [readerInput, setReaderInput] = useState('')
  const [lastResult, setLastResult] = useState(null)
  const [history, setHistory] = useState([])
  const [savedHistory, setSavedHistory] = useState([])
  const [previewSession, setPreviewSession] = useState(null)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const [bomCompleteNotified, setBomCompleteNotified] = useState(false)
  const [catalog, setCatalog] = useState([])
  const [showAdmin, setShowAdmin] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminLoginForm, setAdminLoginForm] = useState({ id: '', password: '' })
  const [editingModelId, setEditingModelId] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [adminForm, setAdminForm] = useState({
    id: '',
    name: '',
    line: '',
    materials: [],
  })
  const scannerRef = useRef(null)
  const readerInputRef = useRef(null)
  const audioContextRef = useRef(null)

  useEffect(() => {
    const loadAppData = async () => {
      const storedModels = await loadDataWithFallback('/api/models', 'bomCatalog', [])
      const catalogData = Array.isArray(storedModels) ? storedModels : []
      setCatalog(catalogData)
      if (!catalogData.length) {
        setAdminMessage('No saved models yet. Add one from Admin mode.')
      }

      const saved = await loadDataWithFallback('/api/history', 'savedBomHistory', [])
      setSavedHistory(Array.isArray(saved) ? saved : [])

      const storedHistory = readStoredJSON('bomScanHistory', [])
      setHistory(Array.isArray(storedHistory) ? storedHistory : [])
    }

    loadAppData()
  }, [])

  useEffect(() => {
    writeStoredJSON('bomScanHistory', history)
  }, [history])

  useEffect(() => {
    writeStoredJSON('savedBomHistory', savedHistory)

    if (!savedHistory.length || typeof window === 'undefined') {
      return
    }

    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedHistory),
    }).catch(() => {
      // Ignore backend sync failures and keep the local fallback.
    })
  }, [savedHistory])

  const modelOptions = useMemo(() => {
    const filtered = line ? catalog.filter((model) => model.line === line) : catalog
    return filtered.map((model) => ({ value: model.id, label: model.name }))
  }, [catalog, line])

  const selectedModel = useMemo(
    () => (modelId ? catalog.find((model) => model.id === modelId) ?? null : null),
    [catalog, modelId],
  )
  const bomMaterials = selectedModel?.materials ?? []
  const scanningAllowed = Boolean(modelId && selectedDate && line && shift)
  const allBomDone = bomMaterials.length > 0 && bomMaterials.every((material) => {
    const normalized = normalizeMaterial(material)
    return history.some((entry) => entry.isMatch && normalizeMaterial(entry.material) === normalized)
  })
  const lineOptions = useMemo(() => {
    const values = [...new Set(catalog.map((model) => model.line).filter(Boolean))]
    return values.length > 0 ? values : ['Line 1']
  }, [catalog])
  const shiftOptions = useMemo(() => ['A', 'B', 'C', 'D1', 'D2'], [])

  const bomStatus = useMemo(() => {
    const scannedMatches = history.reduce((acc, entry) => {
      if (entry.isMatch) {
        acc[normalizeMaterial(entry.material)] = entry.timestamp
      }
      return acc
    }, {})

    return bomMaterials.map((material) => {
      const normalizedSource = normalizeMaterial(material)
      const scannedTime = scannedMatches[normalizedSource]
      const displayLabel = typeof material === 'string'
        ? material
        : material.number
          ? `${material.name} (${material.number})`
          : material.name

      return {
        material,
        displayLabel,
        status: scannedTime ? 'DONE' : 'PENDING',
        scannedTime,
      }
    })
  }, [bomMaterials, history])

  const resetAdminForm = () => {
    setEditingModelId(null)
    setAdminForm({ id: '', name: '', line: '', materials: [] })
  }

  const handleSaveModel = async (event) => {
    event.preventDefault()

    if (!adminForm.name.trim()) {
      setAdminMessage('Enter a model name first.')
      return
    }

    const nextModel = createModelEntry({
      id: editingModelId || adminForm.id || `model-${Date.now()}`,
      name: adminForm.name,
      line: adminForm.line,
      materials: adminForm.materials,
    })

    try {
      const endpoint = editingModelId ? `/api/models/${nextModel.id}` : '/api/models'
      const method = editingModelId ? 'PUT' : 'POST'

      try {
        await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextModel),
        })
      } catch {
        // Fall back to local storage if the backend is unavailable.
      }

      setCatalog((previous) => {
        const exists = previous.some((model) => model.id === nextModel.id)
        const updatedCatalog = exists
          ? previous.map((model) => (model.id === nextModel.id ? nextModel : model))
          : [nextModel, ...previous]

        writeStoredJSON('bomCatalog', updatedCatalog)
        return updatedCatalog
      })

      setAdminMessage(editingModelId ? 'Model updated successfully.' : 'Model added successfully.')
      resetAdminForm()
    } catch (error) {
      console.error(error)
      setAdminMessage('Could not save model locally.')
    }
  }

  const handleEditModel = (model) => {
    setEditingModelId(model.id)
    setAdminForm({
      id: model.id,
      name: model.name,
      line: model.line || 'Line 1',
      materials: model.materials || [],
    })
    setShowAdmin(true)
  }

  const handleDeleteModel = async (modelIdToDelete) => {
    try {
      try {
        await fetch(`/api/models/${modelIdToDelete}`, { method: 'DELETE' })
      } catch {
        // Fall back to local storage if the backend is unavailable.
      }

      setCatalog((previous) => {
        const updatedCatalog = previous.filter((model) => model.id !== modelIdToDelete)
        writeStoredJSON('bomCatalog', updatedCatalog)
        return updatedCatalog
      })
      if (modelId === modelIdToDelete) {
        setModelId('')
        setLine('')
        setShift('')
        setIsScanning(false)
      }
      setAdminMessage('Model removed.')
    } catch (error) {
      console.error(error)
      setAdminMessage('Could not delete model locally.')
    }
  }

  const handleAdminLogin = (event) => {
    event.preventDefault()
    if (adminLoginForm.id === 'admin' && adminLoginForm.password === 'admin123') {
      setIsAdminMode(true)
      setShowAdmin(true)
      setAdminMessage('Welcome admin.')
      setAdminLoginForm({ id: '', password: '' })
    } else {
      setAdminMessage('Invalid admin credentials.')
    }
  }

  const handleAdminLogout = () => {
    setIsAdminMode(false)
    setShowAdmin(false)
    setAdminLoginForm({ id: '', password: '' })
    setAdminMessage('Admin login required.')
  }

  const handleAdminLoginFieldChange = (field, value) => {
    setAdminLoginForm((current) => ({ ...current, [field]: value }))
  }

  const handleAdminFormFieldChange = (field, value) => {
    setAdminForm((current) => ({ ...current, [field]: value }))
  }

  const ensureAudioContext = async () => {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
      return null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume()
        } catch {
          // ignore resume errors
        }
      }
      return audioContextRef.current
    }

    const context = new window.AudioContext()
    try {
      await context.resume()
    } catch {
      // ignore resume errors
    }
    audioContextRef.current = context
    return context
  }

  const playResultFeedback = async (isPass) => {
    if (typeof window === 'undefined') {
      return
    }

    if (typeof window.speechSynthesis !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(isPass ? 'Pass' : 'N G')
      utterance.lang = 'en-US'
      utterance.rate = 1.1
      utterance.pitch = 1.0
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    }

    const context = await ensureAudioContext()
    if (!context) {
      return
    }

    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(isPass ? 880 : 220, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(isPass ? 1180 : 180, context.currentTime + 0.22)

    gainNode.gain.setValueAtTime(0.06, context.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3)

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.3)
  }

  const handleVerifyMaterial = (rawValue, source = 'camera') => {
    const result = verifyScannedMaterial(rawValue, bomMaterials)
    const newEntry = {
      id: `${rawValue}-${Date.now()}`,
      material: rawValue,
      isMatch: result.isMatch,
      source,
      timestamp: new Date().toLocaleTimeString(),
      recordedAt: new Date().toISOString(),
      date: selectedDate,
      line,
      shift,
      modelId: selectedModel?.id || '',
      model: selectedModel?.name || '',
    }

    setLastResult(result)
    setHistory((previous) => [newEntry, ...previous])
    setSessionSaved(false)
    playResultFeedback(result.isMatch)
    if (source === 'reader') {
      setReaderInput('')
      setTimeout(() => {
        readerInputRef.current?.focus()
      }, 0)
    }
  }

  const handleModelChange = (event) => {
    const nextModelId = event.target.value
    setModelId(nextModelId)
    setIsScanning(false)
    setSessionSaved(false)
  }

  useEffect(() => {
    if (modelId && line) {
      const selected = catalog.find((model) => model.id === modelId)
      if (selected && selected.line !== line) {
        setModelId('')
      }
    }
  }, [catalog, line, modelId])

  useEffect(() => {
    if (!scanningAllowed && isScanning) {
      setIsScanning(false)
    }
  }, [scanningAllowed, isScanning])

  useEffect(() => {
    if (allBomDone && history.length > 0 && !bomCompleteNotified) {
      const message = 'All BOM items are scanned. You can now save the session.'
      setScanMessage(message)
      if (typeof window !== 'undefined') {
        window.alert(message)
      }
      setBomCompleteNotified(true)
    }

    if (!allBomDone && bomCompleteNotified) {
      setBomCompleteNotified(false)
    }
  }, [allBomDone, bomCompleteNotified, history.length])

  useEffect(() => {
    if (!isScanning || scanMode !== 'camera') {
      return undefined
    }

    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false,
    )

    scanner.render((decodedText) => {
      handleVerifyMaterial(decodedText, 'camera')
    }, () => {})

    scannerRef.current = scanner

    return () => {
      scannerRef.current?.clear().catch(() => {})
      scannerRef.current = null
    }
  }, [isScanning, scanMode, bomMaterials])

  useEffect(() => {
    if (scanMode === 'reader') {
      setTimeout(() => {
        readerInputRef.current?.focus()
      }, 0)
    }
  }, [scanMode])

  const passCount = history.filter((entry) => entry.isMatch).length
  const ngCount = history.filter((entry) => !entry.isMatch).length

  const handleSaveSession = () => {
    if (sessionSaved) {
      setScanMessage('This session has already been saved.')
      return
    }

    if (history.length === 0) {
      const message = 'No scans available to save.'
      setScanMessage(message)
      if (typeof window !== 'undefined') {
        window.alert(message)
      }
      return
    }

    if (!allBomDone) {
      const message = 'Incomplete BOM scan. Please scan all items before saving.'
      setScanMessage(message)
      if (typeof window !== 'undefined') {
        window.alert(message)
      }
      return
    }

    const readyMessage = 'All BOM completed. Saving session now.'
    setScanMessage(readyMessage)
    if (typeof window !== 'undefined') {
      window.alert(readyMessage)
    }

    const sessionSavedAt = new Date().toLocaleString()
    const sessionId = `session-${Date.now()}`
    const entriesToSave = history.map((entry) => ({
      ...entry,
      savedAt: sessionSavedAt,
      sessionId,
      id: `${entry.id}-saved-${Date.now()}`,
    }))

    const saveToBackend = async () => {
      try {
        const response = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entriesToSave),
        })

        if (!response.ok) {
          throw new Error('Failed to save scan history to backend')
        }

        const saved = await response.json()
        setSavedHistory((previous) => [...saved, ...previous])
      } catch (error) {
        console.error(error)
        setScanMessage('Could not save history to backend; saved locally instead.')
        setSavedHistory((previous) => [...entriesToSave, ...previous])
      }
    }

    saveToBackend()

    setSessionSaved(true)
    setScanMessage('Scan session saved successfully.')
    setBomCompleteNotified(false)
    setPreviewSession({
      sessionId,
      date: selectedDate,
      line,
      shift,
      model: selectedModel?.name || '',
      rows: entriesToSave,
      savedAt: sessionSavedAt,
    })
    setModelId('')
    setLine('')
    setShift('')
    setSelectedDate('')
    setScanMode('')
    setIsScanning(false)
    setReaderInput('')
    setLastResult(null)
    setHistory([])
  }

  return (
    <main className="app-shell">
      <section className="hero-card hero-header">
        <div className="header-row">
          <div className="header-left">
            <div className="logo-placeholder">
              <img src={logoImage} alt="Company logo" className="app-logo" />
            </div>
            <div className="header-copy">
              <p className="company-name">Navitasys India Private Limited</p>
              <h1>BOM Material Verification</h1>
            </div>
          </div>
          <div className="header-actions">
            {!isAdminMode && !showAdmin && !showHistory ? (
              <>
                <button type="button" className="secondary role-button" onClick={() => setShowHistory(true)}>
                  View history
                </button>
                <button type="button" className="secondary role-button" onClick={() => setShowAdmin(true)}>
                  Switch to Admin
                </button>
              </>
            ) : null}
            {!isAdminMode && !showAdmin && showHistory ? (
              <button type="button" className="secondary role-button" onClick={() => setShowHistory(false)}>
                Back to scan
              </button>
            ) : null}
            {showAdmin ? (
              <button type="button" className="secondary role-button" onClick={handleAdminLogout}>
                Switch to User
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel-grid">
        {!isAdminMode && !showAdmin && !showHistory ? (
          <UserView
            modelId={modelId}
            modelOptions={modelOptions}
            line={line}
            setLine={setLine}
            shift={shift}
            setShift={setShift}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            scanMode={scanMode}
            setScanMode={setScanMode}
            isScanning={isScanning}
            setIsScanning={setIsScanning}
            readerInput={readerInput}
            setReaderInput={setReaderInput}
            lastResult={lastResult}
            history={history}
            bomMaterials={bomMaterials}
            bomStatus={bomStatus}
            passCount={passCount}
            ngCount={ngCount}
            allBomDone={allBomDone}
            scanningAllowed={scanningAllowed}
            lineOptions={lineOptions}
            shiftOptions={shiftOptions}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            onVerifyMaterial={handleVerifyMaterial}
            onOpenAdmin={() => setShowAdmin(true)}
            onOpenHistory={() => setShowHistory(true)}
            onSaveSession={handleSaveSession}
            sessionSaved={sessionSaved}
            scanMessage={scanMessage}
            previewSession={previewSession}
          />
        ) : !isAdminMode && !showAdmin && showHistory ? (
          <HistoryView
            history={savedHistory}
            catalog={catalog}
            onCloseHistory={() => setShowHistory(false)}
          />
        ) : (
          <AdminView
            isAdminMode={isAdminMode}
            adminLoginForm={adminLoginForm}
            adminMessage={adminMessage}
            adminForm={adminForm}
            catalog={catalog}
            onLogin={handleAdminLogin}
            onLogout={handleAdminLogout}
            onChangeLogin={handleAdminLoginFieldChange}
            onChangeAdminForm={handleAdminFormFieldChange}
            onSaveModel={handleSaveModel}
            onEditModel={handleEditModel}
            onDeleteModel={handleDeleteModel}
            onResetAdminForm={resetAdminForm}
          />
        )}
      </section>
    </main>
  )
}

export default App
