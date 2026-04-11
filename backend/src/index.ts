import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { router } from './routes'

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json())

app.use('/api', router)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
