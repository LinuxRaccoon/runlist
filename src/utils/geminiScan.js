/**
 * Sends a photo to the scan-drops Netlify function for AI-based extraction.
 * Returns an array of { houseNumberOrName, postcode } in page order.
 * Throws on network failure or a non-OK response — callers should catch
 * and fall back to the free Tesseract path or show an error.
 */
export async function scanImageWithGemini(imageFile) {
  const { base64, mimeType } = await fileToBase64(imageFile)

  const res = await fetch('/.netlify/functions/scan-drops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  })

  if (!res.ok) {
    let message = `Scan failed (${res.status})`
    try {
      const body = await res.json()
      if (body.error) message = body.error
    } catch {
      // ignore — use default message
    }
    throw new Error(message)
  }

  const data = await res.json()
  return Array.isArray(data.drops) ? data.drops : []
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // reader.result looks like "data:image/jpeg;base64,AAAA..."
      const [header, base64] = reader.result.split(',')
      const mimeMatch = header.match(/data:(.*);base64/)
      resolve({ base64, mimeType: mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg' })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
