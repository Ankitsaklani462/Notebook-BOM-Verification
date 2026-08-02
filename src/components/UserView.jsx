function UserView({
  modelId,
  modelOptions,
  line,
  setLine,
  shift,
  setShift,
  selectedDate,
  setSelectedDate,
  scanMode,
  setScanMode,
  isScanning,
  setIsScanning,
  readerInput,
  setReaderInput,
  lastResult,
  history,
  bomMaterials,
  bomStatus,
  passCount,
  ngCount,
  allBomDone,
  scanningAllowed,
  lineOptions,
  shiftOptions,
  selectedModel,
  onModelChange,
  onVerifyMaterial,
  onOpenAdmin,
  onSaveSession,
  sessionSaved,
  scanMessage,
  previewSession,
}) {
  const handleReaderSubmit = (event) => {
    event.preventDefault()
    if (!readerInput.trim()) {
      return
    }
    onVerifyMaterial(readerInput, 'reader')
  }

  return (
    <div className="panel results-panel">
      <div className="panel-heading">
        <div>
          <h2>BOM verification</h2>
          <p className="reader-copy">Select a model, enter the production details, and scan the material tag.</p>
        </div>
      </div>

      <div className="select-grid">
        <div className="select-row">
          <label>
            Date
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <label>
            Line
            <select value={line} onChange={(event) => setLine(event.target.value)}>
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
            <select value={shift} onChange={(event) => setShift(event.target.value)}>
              <option value="">Select shift</option>
              {shiftOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="select-row model-row">
          <label>
            Model
            <select value={modelId} onChange={onModelChange}>
              <option value="">Select model</option>
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {scanningAllowed ? (
          <>
            <div className="result-block">
              <h3>BOM status</h3>
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
                    {bomStatus.map((item) => (
                      <tr key={`${item.displayLabel}-${item.scannedTime || 'pending'}`} className={item.status === 'DONE' ? 'done' : 'pending'}>
                        <td>{item.displayLabel}</td>
                        <td>
                          <span className={`status-badge ${item.status === 'DONE' ? 'done' : 'pending'}`}>{item.status}</span>
                        </td>
                        <td>{item.scannedTime || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="summary-row">
              <span className="summary-pill pass">PASS: {passCount}</span>
              <span className="summary-pill ng">NG: {ngCount}</span>
              {allBomDone ? <span className="summary-pill pass">All BOM materials verified</span> : null}
            </div>

            <div className="scan-mode-row">
              <label>
                <input type="radio" value="camera" checked={scanMode === 'camera'} onChange={() => setScanMode('camera')} />
                Camera scan
              </label>
              <label>
                <input type="radio" value="reader" checked={scanMode === 'reader'} onChange={() => setScanMode('reader')} />
                Barcode Reader
              </label>
            </div>

            {!scanMode ? (
              <p className="reader-instructions">Choose a scan mode to start verifying codes.</p>
            ) : null}

            {scanMode === 'reader' ? (
              <form className="reader-input-box" onSubmit={handleReaderSubmit}>
                <p className="reader-copy">Enter the scanned material code manually.</p>
                <input
                  className="reader-input"
                  value={readerInput}
                  onChange={(event) => setReaderInput(event.target.value)}
                  placeholder="Type scanned material"
                />
                <div className="button-row">
                  <button type="submit">Verify</button>
                </div>
                <p className="reader-instructions">Ready for the next code. The field clears after each verification.</p>
              </form>
            ) : null}

            {scanMode === 'camera' ? (
              <>
                <div className="button-row">
                  <button type="button" onClick={() => setIsScanning(true)} disabled={!scanningAllowed}>
                    Start scan
                  </button>
                  <button type="button" className="secondary" onClick={() => setIsScanning(false)}>
                    Stop scan
                  </button>
                </div>
                <div className="scanner-card">
                  <div id="reader" className="reader-box">
                    <strong>{isScanning ? 'Camera ready' : 'Camera idle'}</strong>
                    <span>{isScanning ? 'Ready for the next code' : 'Select Start scan to begin'}</span>
                  </div>
                </div>
              </>
            ) : null}

            {lastResult ? (
              <div className={`status-card ${lastResult.isMatch ? 'success' : 'warning'}`}>
                <p className="status-label">Latest result</p>
                <h2>{lastResult.isMatch ? 'PASS' : 'NG'}</h2>
                <p>{lastResult.isMatch ? 'Material matched the BOM entry.' : 'Scanned material did not match the BOM.'}</p>
              </div>
            ) : null}

            <div className="button-row">
              <button type="button" onClick={onSaveSession} disabled={sessionSaved}>
                {sessionSaved ? 'Saved' : 'Save scan history'}
              </button>
            </div>
            {scanMessage ? (
              <div className="warning-card">
                <p>{scanMessage}</p>
              </div>
            ) : null}
            {previewSession ? (
              <div className="result-block">
                <h3>Saved session preview</h3>
                <p>
                  Model: <strong>{previewSession.modelName}</strong><br />
                  Line: <strong>{previewSession.line}</strong><br />
                  Shift: <strong>{previewSession.shift}</strong><br />
                  Date: <strong>{previewSession.date}</strong>
                </p>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSession.rows.map((item) => (
                      <tr key={item.id}>
                        <td>{item.material}</td>
                        <td>{item.isMatch ? 'PASS' : 'NG'}</td>
                        <td>{item.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {history.length > 0 ? (
              <div className="result-block">
                <h3>Recent scans</h3>
                <ul>
                  {history.map((item) => (
                    <li key={item.id}>
                      {item.material} — {item.isMatch ? 'PASS' : 'NG'} ({item.timestamp})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="reader-instructions">Complete date, line, shift, and model to enable scanning and view the BOM list.</p>
        )}
      </div>
    </div>
  )
}

export default UserView
