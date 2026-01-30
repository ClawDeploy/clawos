import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import agentsRouter from './routes/agents'
import skillsRouter from './routes/skills'
import marketplaceRouter from './routes/marketplace'
import moltbookRouter from './routes/moltbook'

dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/v1/agents', agentsRouter)
app.use('/api/v1/skills', skillsRouter)
app.use('/api/v1/marketplace', marketplaceRouter)
app.use('/moltbook', moltbookRouter)

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  })
})

app.listen(PORT, () => {
  console.log(`🦀 ClawOS API running on http://localhost:${PORT}`)
})

export default app
