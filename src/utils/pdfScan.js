import * as pdfjsLib from 'pdfjs-dist'

// Vite picks this up as an asset URL automatically — no special import suffix needed.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

const UK_POSTCODE_RE = /([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i
const PHONE_LINE_RE = /^\+?\d[\d\s]{6,}$/
const BOILERPLATE_RE =
  /All customer paperwork|details are protected|Page \d+ of \d+|Contact centre:|Breakdown service:|Accident reporting:|^Lane C|^Van \d|orders, .* Totes|L = Loaded|STORE COPY|\b\d{1,2}\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i
const HARD_STOP_RE = /STORE COPY|\bEND\b/

// The address column sits roughly between the drop-number/time column and the
// item-code column on this delivery-sheet layout. If a different depot/app
// template is ever used, these x-ranges are the first thing to re-check.
const ADDRESS_COL_MIN_X = 100
const ADDRESS_COL_MAX_X = 235
const DROP_LABEL_MAX_X = 60
const DROP_NUMBER_MAX_X = 100

async function extractRows(file) {
  const buffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const allRows = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const items = content.items
      .filter((it) => it.str.trim() !== '')
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }))

    const rows = new Map()
    for (const it of items) {
      const key = Math.round(it.y)
      if (!rows.has(key)) rows.set(key, [])
      rows.get(key).push(it)
    }
    const sortedY = [...rows.keys()].sort((a, b) => b - a)
    for (const y of sortedY) {
      const rowItems = rows.get(y).sort((a, b) => a.x - b.x)
      allRows.push({ page: pageNum, y, items: rowItems })
    }
  }
  return allRows
}

function columnText(rowItems, minX, maxX) {
  return rowItems
    .filter((it) => it.x >= minX && it.x < maxX)
    .map((it) => it.str)
    .join('')
}

function joinAddressLines(lines) {
  let result = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    if (result === '') {
      result = trimmed
    } else if (result.endsWith('-')) {
      // word-wrap hyphen: join directly, drop the hyphen
      result = result.slice(0, -1) + trimmed
    } else {
      result = result + ' ' + trimmed
    }
  }
  return result
}

/**
 * Parses a delivery-run PDF (the per-drop route sheet export) directly from
 * its text layer — no OCR or AI needed, so this is instant and always
 * accurate as long as the file is a genuine text PDF, not a scanned image.
 * Returns an array of { dropNumber, name, detail, postcode }.
 */
export async function scanPdfForDrops(file) {
  const rows = await extractRows(file)
  const drops = []
  let current = null

  const flush = () => {
    if (!current) return
    const addressText = joinAddressLines(current.addressLines)
    const match = addressText.match(UK_POSTCODE_RE)
    let postcode = ''
    let detail = addressText
    if (match) {
      postcode = `${match[1]} ${match[2]}`.toUpperCase()
      detail = (addressText.slice(0, match.index) + addressText.slice(match.index + match[0].length)).trim()
      detail = detail
        .replace(/,\s*$/, '')
        .replace(/^,\s*/, '')
        .replace(/,(?=\S)/g, ', ')
        .trim()
    }
    if (postcode) {
      drops.push({
        dropNumber: current.dropNumber,
        name: current.name,
        detail,
        postcode,
      })
    }
    current = null
  }

  for (const row of rows) {
    const fullRowText = row.items.map((it) => it.str).join(' ')

    if (HARD_STOP_RE.test(fullRowText)) {
      flush()
      break
    }
    if (BOILERPLATE_RE.test(fullRowText)) continue

    const dropLabelItem = row.items.find((it) => it.str === 'Drop' && it.x < DROP_LABEL_MAX_X)
    if (dropLabelItem) {
      flush()
      const numberItem = row.items.find((it) => it.x > dropLabelItem.x && it.x < DROP_NUMBER_MAX_X)
      const name = columnText(row.items, ADDRESS_COL_MIN_X, ADDRESS_COL_MAX_X).trim()
      current = {
        dropNumber: numberItem ? numberItem.str.trim() : '',
        name,
        addressLines: [],
      }
      continue
    }

    if (!current) continue

    if (/RETURN/.test(fullRowText)) {
      flush()
      continue
    }

    if (row.items.some((it) => it.str.includes('Payment successful'))) {
      flush()
      continue
    }

    const addressPart = columnText(row.items, ADDRESS_COL_MIN_X, ADDRESS_COL_MAX_X).trim()
    if (addressPart === '') continue
    if (PHONE_LINE_RE.test(addressPart)) continue
    current.addressLines.push(addressPart)
  }
  flush()
  return drops
}
