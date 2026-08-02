import { useEffect, useMemo, useState } from 'react'

function HistoryView({ history, catalog, onCloseHistory }) {
  const [dateFilter, setDateFilter] = useState('')
  const [lineFilter, setLineFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')

  const dateOptions = useMemo(
    () => [...new Set(history.map((entry) => entry.date).filter(Boolean))],
    [history],
  )

  const lineOptions = useMemo(
    () => [...new Set(history.map((entry) => entry.line).filter(Boolean))],
    [history],
  )

  const shiftOptions = useMemo(
    () => [...new Set(history.map((entry) => entry.shift).filter(Boolean))],
    [history],
  )

  const modelOptions = useMemo(() => {
    const map = {}
    history.forEach((entry) => {
      const id = entry.modelId || entry.model || ''
      if (id && !map[id]) {
        map[id] = entry.model || entry.modelId || 'Unknown model'
      }
    })
    return Object.entries(map).map(([id, name]) => ({ id, name }))
  }, [history])

  const filteredHistory = useMemo(
    () =>
      history.filter((entry) => {
        const matchesDate = !dateFilter || entry.date === dateFilter
        const matchesLine = !lineFilter || entry.line === lineFilter
        const matchesShift = !shiftFilter || entry.shift === shiftFilter
        const matchesModel = !selectedModelId || entry.modelId === selectedModelId
        return matchesDate && matchesLine && matchesShift && matchesModel
      }),
    [history, dateFilter, lineFilter, shiftFilter, selectedModelId],
  )

  const allFiltersSelected = Boolean(dateFilter && lineFilter && shiftFilter && selectedModelId)
  const visibleHistory = allFiltersSelected ? filteredHistory : []

  const sessionGroups = useMemo(() => {
    const groups = {}
    visibleHistory.forEach((entry) => {
      const key = entry.sessionId || `${entry.modelId}-${entry.date}-${entry.shift}-${entry.savedAt}`
      if (!groups[key]) {
        groups[key] = {
          sessionId: entry.sessionId || key,
          modelId: entry.modelId,
          model: entry.model || 'Unknown model',
          date: entry.date,
          line: entry.line,
          shift: entry.shift,
          savedAt: entry.savedAt || entry.timestamp,
          total: 0,
          passCount: 0,
          ngCount: 0,
        }
      }
      groups[key].total += 1
      if (entry.isMatch) {
        groups[key].passCount += 1
      } else {
        groups[key].ngCount += 1
      }
    })
    return Object.values(groups)
  }, [visibleHistory])

  const selectedSession = useMemo(
    () => visibleHistory.find((entry) => entry.sessionId === selectedSessionId) || null,
    [visibleHistory, selectedSessionId],
  )

  const selectedModel = useMemo(
    () => catalog.find((model) => model.id === selectedSession?.modelId) || null,
    [catalog, selectedSession],
  )

  const selectedModelHistory = useMemo(
    () => visibleHistory.filter((entry) => entry.sessionId === selectedSessionId),
    [visibleHistory, selectedSessionId],
  )

  useEffect(() => {
    if (!selectedModelId) {
      setSelectedSessionId('')
    }
  }, [selectedModelId])

  useEffect(() => {
    if (allFiltersSelected && !selectedSessionId && sessionGroups.length === 1) {
      setSelectedSessionId(sessionGroups[0].sessionId)
    }
  }, [allFiltersSelected, selectedSessionId, sessionGroups])

  const selectedModelScanMap = useMemo(() => {
    const map = {}
    selectedModelHistory.forEach((entry) => {
      const key = entry.material.trim().toLowerCase()
      if (!map[key] || (entry.isMatch && !map[key].isMatch)) {
        map[key] = entry
      }
    })
    return map
  }, [selectedModelHistory])

  const bomRows = selectedModel?.materials || []

  return (
    <div className="panel results-panel">
      <div className="panel-heading">
        <div>
          <h2>Scan history</h2>
          <p className="reader-copy">Select date, line, and shift to see scanned models and part status.</p>
        </div>
        <button type="button" className="secondary role-button" onClick={onCloseHistory}>
          Back to scan
        </button>
      </div>

      <div className="admin-filters">
        <div className="admin-filter-row">
          <label>
            Date
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="">Select date</option>
              {dateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Line
            <select value={lineFilter} onChange={(event) => setLineFilter(event.target.value)}>
              <option value="">Select line</option>
              {lineOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Shift
            <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}>
              <option value="">Select shift</option>
              {shiftOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model
            <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
              <option value="">Select model</option>
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="result-block">
        <h3>Saved sessions</h3>
        <div className="bom-table-wrap">
          <table className="bom-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Saved at</th>
                <th>Total scans</th>
                <th>PASS</th>
                <th>NG</th>
              </tr>
            </thead>
            <tbody>
              {!allFiltersSelected ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px 0' }}>
                    Select date, line, shift, and model to view history.
                  </td>
                </tr>
              ) : sessionGroups.length > 0 ? (
                sessionGroups.map((group) => (
                  <tr
                    key={group.sessionId || group.model}
                    className={group.sessionId === selectedSessionId ? 'done' : ''}
                    onClick={() => setSelectedSessionId(group.sessionId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{group.model}</td>
                    <td>{group.savedAt}</td>
                    <td>{group.total}</td>
                    <td>{group.passCount}</td>
                    <td>{group.ngCount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px 0' }}>
                    No scanned sessions found for these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedModel ? (
        <div className="result-block">
          <h3>Model details: {selectedModel.name}</h3>
          <div className="bom-table-wrap">
            <table className="bom-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Part number</th>
                  <th>Status</th>
                  <th>Pass time</th>
                </tr>
              </thead>
              <tbody>
                {bomRows.length > 0 ? (
                  bomRows.map((material, index) => {
                    const normalizedKey = String(material.number || material.name || '').trim().toLowerCase()
                    const scanEntry = selectedModelScanMap[normalizedKey]
                    const isMatch = Boolean(scanEntry?.isMatch)
                    return (
                      <tr key={`${normalizedKey}-${index}`} className={isMatch ? 'done' : 'pending'}>
                        <td>{material.name || '-'}</td>
                        <td>{material.number || '-'}</td>
                        <td>
                          <span className={`status-badge ${isMatch ? 'done' : 'pending'}`}>
                            {isMatch ? 'PASS' : 'PENDING'}
                          </span>
                        </td>
                        <td>{scanEntry?.isMatch ? scanEntry.timestamp : '—'}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px 0' }}>
                      No BOM data available for this model.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="result-block">
            <h3>Scanned materials for this model</h3>
            <div className="bom-table-wrap">
              <table className="bom-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedModelHistory.length > 0 ? (
                    selectedModelHistory.map((entry) => (
                      <tr key={entry.id} className={entry.isMatch ? 'done' : 'pending'}>
                        <td>{entry.material}</td>
                        <td>
                          <span className={`status-badge ${entry.isMatch ? 'done' : 'pending'}`}>
                            {entry.isMatch ? 'PASS' : 'NG'}
                          </span>
                        </td>
                        <td>{entry.timestamp}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '20px 0' }}>
                        No scanned material entries for this model.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default HistoryView
