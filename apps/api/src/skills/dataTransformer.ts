import { Request, Response } from 'express'
import { z } from 'zod'
import { parse as csvParse } from 'csv-parse/sync'
import { stringify as csvStringify } from 'csv-stringify/sync'
import { parseString as xmlParse, Builder as XmlBuilder } from 'xml2js'

const transformSchema = z.object({
  data: z.any(),
  fromFormat: z.enum(['json', 'csv', 'xml', 'parquet']),
  toFormat: z.enum(['json', 'csv', 'xml', 'parquet']),
  options: z.object({
    csvDelimiter: z.string().default(','),
    csvHeader: z.boolean().default(true),
    xmlRootName: z.string().default('root'),
    xmlItemName: z.string().default('item')
  }).optional()
})

interface TransformOptions {
  csvDelimiter: string
  csvHeader: boolean
  xmlRootName: string
  xmlItemName: string
}

export async function transformData(req: Request, res: Response) {
  try {
    const result = transformSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { data, fromFormat, toFormat, options } = result.data
    
    const opts: TransformOptions = {
      csvDelimiter: options?.csvDelimiter ?? ',',
      csvHeader: options?.csvHeader ?? true,
      xmlRootName: options?.xmlRootName ?? 'root',
      xmlItemName: options?.xmlItemName ?? 'item'
    }

    if (fromFormat === toFormat) {
      return res.json({
        success: true,
        transformedData: data,
        message: 'No transformation needed - formats are the same'
      })
    }

    // Parse input based on fromFormat
    let parsedData: any
    
    switch (fromFormat) {
      case 'json':
        parsedData = typeof data === 'string' ? JSON.parse(data) : data
        break
      case 'csv':
        parsedData = parseCsv(data, opts.csvDelimiter, opts.csvHeader)
        break
      case 'xml':
        parsedData = await parseXml(data)
        break
      case 'parquet':
        // Parquet not fully supported without native module, return error
        return res.status(400).json({
          success: false,
          error: 'Parquet input not supported. Please convert to JSON first.'
        })
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported fromFormat: ${fromFormat}`
        })
    }

    // Transform to output format
    let transformedData: any
    
    switch (toFormat) {
      case 'json':
        transformedData = parsedData
        break
      case 'csv':
        transformedData = convertToCsv(parsedData, opts.csvDelimiter, opts.csvHeader)
        break
      case 'xml':
        transformedData = convertToXml(parsedData, opts.xmlRootName, opts.xmlItemName)
        break
      case 'parquet':
        // Return JSON schema that could be converted to parquet
        transformedData = {
          _note: 'Parquet output requires native module. Returning JSON schema format.',
          schema: generateParquetSchema(parsedData),
          data: parsedData
        }
        break
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported toFormat: ${toFormat}`
        })
    }

    res.json({
      success: true,
      fromFormat,
      toFormat,
      transformedData,
      recordCount: Array.isArray(parsedData) ? parsedData.length : 1
    })
  } catch (error) {
    console.error('Data transformer error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transformation failed'
    })
  }
}

function parseCsv(data: string, delimiter: string, header: boolean): any[] {
  const records = csvParse(data, {
    delimiter,
    columns: header,
    skip_empty_lines: true,
    trim: true
  })
  return records
}

async function parseXml(data: string): Promise<any> {
  return new Promise((resolve, reject) => {
    xmlParse(data, { explicitArray: false }, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

function convertToCsv(data: any, delimiter: string, header: boolean): string {
  if (!Array.isArray(data)) {
    data = [data]
  }
  
  if (data.length === 0) {
    return ''
  }
  
  return csvStringify(data, {
    delimiter,
    header
  })
}

function convertToXml(data: any, rootName: string, itemName: string): string {
  const builder = new XmlBuilder({
    rootName,
    renderOpts: { pretty: true }
  })
  
  // Wrap array items
  if (Array.isArray(data)) {
    const wrapped: any = {}
    wrapped[itemName] = data
    return builder.buildObject(wrapped)
  }
  
  return builder.buildObject(data)
}

function generateParquetSchema(data: any): any {
  if (!Array.isArray(data) || data.length === 0) {
    return {}
  }
  
  const sample = data[0]
  const schema: any = {}
  
  for (const [key, value] of Object.entries(sample)) {
    const type = typeof value
    switch (type) {
      case 'string':
        schema[key] = { type: 'BYTE_ARRAY', convertedType: 'UTF8' }
        break
      case 'number':
        schema[key] = Number.isInteger(value) 
          ? { type: 'INT64' }
          : { type: 'DOUBLE' }
        break
      case 'boolean':
        schema[key] = { type: 'BOOLEAN' }
        break
      default:
        schema[key] = { type: 'BYTE_ARRAY', convertedType: 'UTF8' }
    }
  }
  
  return schema
}
