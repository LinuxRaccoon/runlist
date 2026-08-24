import { createWorker } from 'tesseract.js'

// UK postcode pattern, tolerant of a missing space (we normalise after match).
// Matches e.g. "PO19 8EX", "PO198EX", "GU29 0JG"
const POSTCODE_RE =
  /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/gi

function normalise(raw) {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase()
}

/**
 * Pull postcode-shaped strings out of raw OCR text, in the order they
 * appear (i.e. reading order top-to-bottom as Tesseract emits lines).
 * Returns an array of { postcode, line } where `line` is the full source
 * line, useful if the paper photo also has a house name/number on it.
 */
export function extractPostcodes(text) {
  const lines = text.split('\n')
  const results = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const matches = [...line.matchAll(POSTCODE_RE)]
    for (const m of matches) {
      const outward = m[1].toUpperCase()
      const inward = m[2].toUpperCase()
      const postcode = `${outward} ${inward}`
      results.push({ postcode, line })
    }
  }

  return results
}

let workerPromise = null
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng')
  }
  return workerPromise
}

/**
 * Run OCR on an image file/blob and return extracted postcode matches
 * in the order they appear in the photo.
 * @param {File|Blob} imageFile
 * @param {(status: string, progress: number) => void} [onProgress]
 */
export async function scanImageForPostcodes(imageFile, onProgress) {
  const worker = await getWorker()

  if (onProgress) {
    worker.setLogger?.((m) => {
      if (m.status && typeof m.progress === 'number') {
        onProgress(m.status, m.progress)
      }
    })
  }

  const { data } = await worker.recognize(imageFile)
  const matches = extractPostcodes(data.text)

  // De-duplicate identical postcode+line pairs (e.g. OCR double-reading a line)
  const seen = new Set()
  const deduped = []
  for (const m of matches) {
    const key = `${m.postcode}|${m.line}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(m)
    }
  }

  return deduped
}

export function isValidPostcodeShape(value) {
  const v = normalise(value)
  return /^[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}$/.test(v)
}
