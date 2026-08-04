function normalizeMaterialRow(row) {
  if (!row) {
    return { name: '', number: '' }
  }
  if (typeof row === 'string') {
    return { name: row.trim(), number: '' }
  }
  return {
    name: (row.name || '').trim(),
    number: (row.number || '').trim(),
  }
}

export function createModelEntry({ id, name, line, shift, sku, materials }) {
  const normalizedMaterials = Array.isArray(materials)
    ? materials.map(normalizeMaterialRow).filter((row) => row.name || row.number)
    : typeof materials === 'string'
      ? materials
          .split(/[\n,;|]+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => normalizeMaterialRow(item))
      : []

  return {
    id: id || `model-${Date.now()}`,
    name: (name || '').trim(),
    line: (line || '').trim() || 'Line 1',
    shift: (shift || '').trim() || 'A',
    sku: (sku || '').trim(),
    materials: normalizedMaterials,
  }
}

export function normalizeMaterial(value) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase()
  }

  if (typeof value === 'object' && value !== null) {
    return normalizeMaterial(value.number) || normalizeMaterial(value.name)
  }

  return ''
}

function getMaterialCandidates(material) {
  if (typeof material === 'string') {
    return [material]
  }

  if (typeof material === 'object' && material !== null) {
    return [material.name, material.number].filter(Boolean)
  }

  return []
}

function getMaterialTokens(value) {
  if (!value) {
    return []
  }

  const normalizedValue = normalizeMaterial(value)

  if (!normalizedValue) {
    return []
  }

  return normalizedValue
    .split(/[^a-z0-9._/-]+/i)
    .map((token) => token.trim())
    .filter(Boolean)
}

function containsMaterialToken(value, token) {
  if (!value || !token) {
    return false
  }

  const normalizedValue = normalizeMaterial(value)
  const normalizedToken = normalizeMaterial(token)

  if (!normalizedValue || !normalizedToken) {
    return false
  }

  const tokens = getMaterialTokens(normalizedValue)

  return tokens.includes(normalizedToken) || normalizedValue.includes(normalizedToken)
}

export function verifyScannedMaterial(scannedValue, bomMaterials) {
  const normalizedInput = normalizeMaterial(scannedValue)
  const matchedMaterial = bomMaterials.find((material) => {
    return getMaterialCandidates(material).some((candidate) => {
      const normalizedCandidate = normalizeMaterial(candidate)
      return normalizedCandidate === normalizedInput || containsMaterialToken(normalizedInput, normalizedCandidate)
    })
  })

  return {
    isMatch: Boolean(matchedMaterial),
    material: normalizedInput,
    matchedMaterial: matchedMaterial ? normalizeMaterial(matchedMaterial) : null,
  }
}

export function getCameraScanFeedbackMessage(result) {
  if (!result) {
    return ''
  }

  return result.isMatch
    ? 'PASS — ready for the next scan.'
    : 'NG — ready for the next scan.'
}

