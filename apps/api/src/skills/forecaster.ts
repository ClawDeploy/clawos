import { Request, Response } from 'express'
import { z } from 'zod'

const forecasterSchema = z.object({
  data: z.array(z.object({
    timestamp: z.union([z.string(), z.number()]),
    value: z.number()
  })).min(3, 'At least 3 data points required'),
  periods: z.number().min(1).max(100).default(5),
  method: z.enum(['linear', 'moving_average', 'exponential_smoothing']).default('linear')
})

export async function forecastTimeSeries(req: Request, res: Response) {
  try {
    const result = forecasterSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { data, periods, method } = result.data

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => {
      const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp
      const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp
      return aTime - bTime
    })

    const values = sortedData.map(d => d.value)
    const timestamps = sortedData.map(d => d.timestamp)

    let predictions: number[] = []
    let confidence = 0
    let trend: 'up' | 'down' | 'stable' = 'stable'
    let metrics: any = {}

    switch (method) {
      case 'linear':
        const linearResult = linearRegressionForecast(values, periods)
        predictions = linearResult.predictions
        confidence = linearResult.confidence
        metrics = linearResult.metrics
        break
      case 'moving_average':
        const maResult = movingAverageForecast(values, periods)
        predictions = maResult.predictions
        confidence = maResult.confidence
        metrics = maResult.metrics
        break
      case 'exponential_smoothing':
        const esResult = exponentialSmoothingForecast(values, periods)
        predictions = esResult.predictions
        confidence = esResult.confidence
        metrics = esResult.metrics
        break
    }

    // Calculate trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    if (secondAvg > firstAvg * 1.05) trend = 'up'
    else if (secondAvg < firstAvg * 0.95) trend = 'down'

    // Generate prediction timestamps
    const lastTimestamp = timestamps[timestamps.length - 1]
    const predictionTimestamps = generateFutureTimestamps(lastTimestamp, periods)

    res.json({
      success: true,
      method,
      periods,
      predictions: predictions.map((value, i) => ({
        period: i + 1,
        timestamp: predictionTimestamps[i],
        value: Math.round(value * 10000) / 10000
      })),
      confidence: Math.round(confidence * 100) / 100,
      trend,
      metrics,
      historicalStats: {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        mean: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10000) / 10000,
        lastValue: values[values.length - 1]
      }
    })
  } catch (error) {
    console.error('Forecaster error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Forecasting failed'
    })
  }
}

function linearRegressionForecast(values: number[], periods: number): { predictions: number[], confidence: number, metrics: any } {
  const n = values.length
  
  // Calculate means
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  
  // Calculate slope (m) and intercept (b)
  let numerator = 0
  let denominator = 0
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = yMean - slope * xMean
  
  // Generate predictions
  const predictions: number[] = []
  for (let i = 1; i <= periods; i++) {
    const x = n - 1 + i
    predictions.push(slope * x + intercept)
  }
  
  // Calculate R-squared (confidence metric)
  const ssRes = values.reduce((sum, y, i) => {
    const predicted = slope * i + intercept
    return sum + (y - predicted) ** 2
  }, 0)
  
  const ssTot = values.reduce((sum, y) => sum + (y - yMean) ** 2, 0)
  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0
  
  // Calculate standard error
  const standardError = Math.sqrt(ssRes / (n - 2))
  
  return {
    predictions,
    confidence: Math.max(0, Math.min(1, rSquared)),
    metrics: {
      slope: Math.round(slope * 10000) / 10000,
      intercept: Math.round(intercept * 10000) / 10000,
      rSquared: Math.round(rSquared * 10000) / 10000,
      standardError: Math.round(standardError * 10000) / 10000
    }
  }
}

function movingAverageForecast(values: number[], periods: number, windowSize: number = 3): { predictions: number[], confidence: number, metrics: any } {
  const predictions: number[] = []
  const workingValues = [...values]
  
  for (let i = 0; i < periods; i++) {
    const recent = workingValues.slice(-windowSize)
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length
    predictions.push(avg)
    workingValues.push(avg)
  }
  
  // Calculate MSE on historical predictions
  const mse = calculateMSE(values, windowSize)
  const confidence = Math.max(0, 1 - (mse / (Math.max(...values) - Math.min(...values)) ** 2))
  
  return {
    predictions,
    confidence,
    metrics: {
      windowSize,
      mse: Math.round(mse * 10000) / 10000,
      method: `Simple Moving Average (window=${windowSize})`
    }
  }
}

function exponentialSmoothingForecast(values: number[], periods: number, alpha: number = 0.3): { predictions: number[], confidence: number, metrics: any } {
  // Initialize with first value
  let smoothed = values[0]
  
  // Apply smoothing
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed
  }
  
  // Generate predictions
  const predictions: number[] = []
  for (let i = 0; i < periods; i++) {
    predictions.push(smoothed)
    // For future periods, use the last smoothed value
    smoothed = alpha * smoothed + (1 - alpha) * smoothed
  }
  
  // Calculate MSE
  let smoothedHistory = values[0]
  let totalError = 0
  for (let i = 1; i < values.length; i++) {
    const error = values[i] - smoothedHistory
    totalError += error ** 2
    smoothedHistory = alpha * values[i] + (1 - alpha) * smoothedHistory
  }
  
  const mse = totalError / (values.length - 1)
  const confidence = Math.max(0, 1 - (mse / (Math.max(...values) - Math.min(...values)) ** 2))
  
  return {
    predictions,
    confidence,
    metrics: {
      alpha,
      mse: Math.round(mse * 10000) / 10000,
      method: 'Exponential Smoothing'
    }
  }
}

function calculateMSE(values: number[], windowSize: number): number {
  if (values.length <= windowSize) return 0
  
  let totalError = 0
  let count = 0
  
  for (let i = windowSize; i < values.length; i++) {
    const prediction = values.slice(i - windowSize, i).reduce((a, b) => a + b, 0) / windowSize
    totalError += (values[i] - prediction) ** 2
    count++
  }
  
  return count > 0 ? totalError / count : 0
}

function generateFutureTimestamps(lastTimestamp: string | number, periods: number): (string | number)[] {
  const isString = typeof lastTimestamp === 'string'
  
  if (isString) {
    const lastDate = new Date(lastTimestamp)
    const timestamps: string[] = []
    
    // Try to infer interval from last two timestamps
    // Default to daily
    const intervalMs = 24 * 60 * 60 * 1000
    
    for (let i = 1; i <= periods; i++) {
      const futureDate = new Date(lastDate.getTime() + intervalMs * i)
      timestamps.push(futureDate.toISOString())
    }
    
    return timestamps
  } else {
    // Numeric timestamps - assume consistent interval
    // Default to 1 unit interval
    const interval = 1
    const timestamps: number[] = []
    
    for (let i = 1; i <= periods; i++) {
      timestamps.push(lastTimestamp as number + interval * i)
    }
    
    return timestamps
  }
}
