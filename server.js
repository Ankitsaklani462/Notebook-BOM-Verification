import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = process.env.PORT || 4000
const dataFile = path.join(__dirname, 'models.json')

app.use(express.json())

function readModels() {
  try {
    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, JSON.stringify([]), 'utf-8')
      return []
    }

    const content = fs.readFileSync(dataFile, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading model data:', error)
    return []
  }
}

function writeModels(models) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(models, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Error writing model data:', error)
    return false
  }
}

app.get('/api/models', (req, res) => {
  const models = readModels()
  res.json(models)
})

const historyFile = path.join(__dirname, 'history.json')

function readHistory() {
  try {
    if (!fs.existsSync(historyFile)) {
      fs.writeFileSync(historyFile, JSON.stringify([]), 'utf-8')
      return []
    }

    const content = fs.readFileSync(historyFile, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading history data:', error)
    return []
  }
}

function writeHistory(history) {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Error writing history data:', error)
    return false
  }
}

app.get('/api/history', (req, res) => {
  const history = readHistory()
  res.json(history)
})

app.post('/api/history', (req, res) => {
  const existingHistory = readHistory()
  const entries = req.body

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: 'Invalid history payload' })
  }

  const nextHistory = [...entries, ...existingHistory]
  if (!writeHistory(nextHistory)) {
    return res.status(500).json({ message: 'Failed to save history' })
  }

  res.status(201).json(entries)
})

app.post('/api/models', (req, res) => {
  const models = readModels()
  const model = req.body

  if (!model || !model.id || !model.name) {
    return res.status(400).json({ message: 'Model id and name are required' })
  }

  const existing = models.find((item) => item.id === model.id)
  if (existing) {
    return res.status(409).json({ message: 'Model with this ID already exists' })
  }

  models.unshift(model)
  writeModels(models)
  res.status(201).json(model)
})

app.put('/api/models/:id', (req, res) => {
  const models = readModels()
  const modelId = req.params.id
  const updatedModel = req.body

  if (!updatedModel || !updatedModel.id || !updatedModel.name) {
    return res.status(400).json({ message: 'Model id and name are required' })
  }

  const index = models.findIndex((item) => item.id === modelId)
  if (index === -1) {
    return res.status(404).json({ message: 'Model not found' })
  }

  models[index] = updatedModel
  writeModels(models)
  res.json(updatedModel)
})

app.delete('/api/models/:id', (req, res) => {
  const models = readModels()
  const modelId = req.params.id
  const nextModels = models.filter((item) => item.id !== modelId)

  if (nextModels.length === models.length) {
    return res.status(404).json({ message: 'Model not found' })
  }

  writeModels(nextModels)
  res.json({ success: true })
})

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`)
})
