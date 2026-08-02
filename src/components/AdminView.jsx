import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

function AdminView({
  isAdminMode,
  adminLoginForm,
  adminMessage,
  adminForm,
  catalog,
  onLogin,
  onLogout,
  onChangeLogin,
  onChangeAdminForm,
  onSaveModel,
  onEditModel,
  onDeleteModel,
  onResetAdminForm,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [lineFilter, setLineFilter] = useState('')
  const [previewModelId, setPreviewModelId] = useState(null)

  const materialRows = Array.isArray(adminForm.materials)
    ? adminForm.materials
    : []

  const lineOptions = useMemo(
    () => [...new Set(catalog.map((model) => model.line).filter(Boolean))],
    [catalog],
  )

  const filteredCatalog = useMemo(
    () =>
      catalog.filter((model) => {
        const lowerSearchTerm = searchTerm.toLowerCase()
        const matchesSearch =
          !searchTerm ||
          model.name.toLowerCase().includes(lowerSearchTerm) ||
          (model.line || '').toLowerCase().includes(lowerSearchTerm)
        const matchesLine = !lineFilter || model.line === lineFilter
        return matchesSearch && matchesLine
      }),
    [catalog, lineFilter, searchTerm],
  )

  const previewModel = useMemo(
    () => catalog.find((model) => model.id === previewModelId) || null,
    [catalog, previewModelId],
  )

  const loadBomMaterials = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    let rows = []

    if (extension === 'xls' || extension === 'xlsx') {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

      rows = jsonData
        .map((row) => {
          const number = String(row[0] || '').trim()
          const name = String(row[1] || '').trim()
          return { number, name }
        })
        .filter((row) => row.number || row.name)
    } else {
      const text = await file.text()
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      rows = lines.map((line) => {
        const columns = line.split(',').map((value) => value.trim())
        return {
          number: columns[0] || '',
          name: columns[1] || '',
        }
      }).filter((row) => row.number || row.name)
    }

    const hasHeader = rows.length > 0 && /part\s*number/i.test(rows[0].number) && /part\s*(name|description)/i.test(rows[0].name)
    const parsedRows = hasHeader ? rows.slice(1) : rows

    onChangeAdminForm('materials', parsedRows)
    event.target.value = ''
  }

  return (
    <div className="panel admin-only-panel">
      {!isAdminMode ? (
        <div className="admin-login-card">
          <div className="admin-header">
            <h2>Admin access</h2>
            <span className="chip">Navitasys QC</span>
          </div>
          <p className="admin-message">Enter admin credentials to continue.</p>
          <p className="reader-copy">Use Admin ID: admin and Password: admin123</p>
          <form className="admin-form" onSubmit={onLogin}>
            <label>
              Admin ID
              <input value={adminLoginForm.id} onChange={(event) => onChangeLogin('id', event.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={adminLoginForm.password} onChange={(event) => onChangeLogin('password', event.target.value)} />
            </label>
            <div className="button-row">
              <button type="submit">Login</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="admin-panel">
          <div className="admin-header">
            <h2>Model admin</h2>
            <button type="button" className="secondary" onClick={onResetAdminForm}>New model</button>
          </div>
          {adminMessage ? <p className="admin-message">{adminMessage}</p> : null}
          <form className="admin-form" onSubmit={onSaveModel}>
            <div className="admin-form-grid">
              <label>
                Name Model
                <input value={adminForm.name} onChange={(event) => onChangeAdminForm('name', event.target.value)} />
              </label>
              <label>
                Line
                <input value={adminForm.line} onChange={(event) => onChangeAdminForm('line', event.target.value)} />
              </label>
            </div>
            <div className="admin-materials-block">
              <div className="admin-header">
                <h3>BOM materials</h3>
                <div className="admin-header-actions">
                  <label className="csv-upload-label">
                    Upload CSV / Excel
                    <input type="file" accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={loadBomMaterials} />
                  </label>
                </div>
              </div>
              <div className="admin-materials-instructions">
                <p>Upload a CSV or Excel file to load the BOM materials.</p>
                <p>File format: first column = Part Number, second column = Part Description.</p>
                {materialRows.length > 0 ? <p>{materialRows.length} rows imported.</p> : null}
              </div>
            </div>
            <div className="button-row">
              <button type="submit">Save model</button>
              <button type="button" className="secondary" onClick={onResetAdminForm}>Cancel</button>
            </div>
          </form>

          <div className="admin-filters">
            <div className="admin-filters-heading">
              <h3>Search models</h3>
              <p>Use the fields below to filter saved models by name or line.</p>
            </div>
            <div className="admin-filter-row">
              <label>
                Search model
                <select value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)}>
                  <option value="">All models</option>
                  {catalog.map((model) => (
                    <option key={model.id} value={model.name || ''}>
                      {model.name || 'Unnamed model'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Filter line
                <select value={lineFilter} onChange={(event) => setLineFilter(event.target.value)}>
                  <option value="">All lines</option>
                  {lineOptions.map((lineOption) => (
                    <option key={lineOption} value={lineOption}>
                      {lineOption}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="admin-list">
            {filteredCatalog.map((model) => (
              <div
                key={model.id}
                className={`admin-list-item ${previewModelId === model.id ? 'selected' : ''}`}
                onClick={() => setPreviewModelId((current) => (current === model.id ? null : model.id))}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    setPreviewModelId((current) => (current === model.id ? null : model.id))
                  }
                }}
              >
                <div>
                  <strong>{model.name}</strong>
                  <p>{model.line || 'No line'}{model.shift ? ` • Shift ${model.shift}` : ''}</p>
                </div>
                <div className="admin-list-actions">
                  <button type="button" className="secondary" onClick={(event) => { event.stopPropagation(); onEditModel(model) }}>Edit</button>
                  <button type="button" className="secondary" onClick={(event) => { event.stopPropagation(); onDeleteModel(model.id) }}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          {previewModel ? (
            <div className="admin-preview">
              <div className="admin-header">
                <h3>Preview BOM: {previewModel.name}</h3>
                <p>{previewModel.line ? `Line: ${previewModel.line}` : 'Line not set'}</p>
              </div>
              <div className="bom-preview-table">
                <div className="bom-preview-header">
                  <span>Part Number</span>
                  <span>Description</span>
                </div>
                {Array.isArray(previewModel.materials) && previewModel.materials.length > 0 ? (
                  previewModel.materials.map((material, index) => (
                    <div key={`${material.number}-${index}`} className="bom-preview-row">
                      <span>{material.number || '-'}</span>
                      <span>{material.name || '-'}</span>
                    </div>
                  ))
                ) : (
                  <p className="admin-message">No BOM materials available for this model.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default AdminView
