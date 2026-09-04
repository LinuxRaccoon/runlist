const MAX_DIMENSION = 1600 // plenty for reading text; keeps upload fast and cheap

/**
 * Sends a photo to the scan-drops Netlify function for AI-based extraction.
 * Returns an array of { houseNumberOrName, postcode } in page order.
 * Throws on network failure or a non-OK response — callers should catch
 * and fall back to the free Tesseract path or show an error.
 */
export async function scanImageWithGemini(imageFile) {
  const { base64, mimeType } = await resizeAndEncode(imageFile)

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

/**
 * Downscales the photo (if larger than MAX_DIMENSION on its longest side)
 * and re-encodes as JPEG before sending. Phone camera photos are often
 * 4000px+ across — Gemini reads text just as well from a much smaller
 * image, and a smaller upload is faster and less likely to time out.
 */
function resizeAndEncode(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight))
      const width = Math.round(img.naturalWidth * scale)
      const height = Math.round(img.naturalHeight * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = reader.result.split(',')[1]
            resolve({ base64, mimeType: 'image/jpeg' })
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        0.85
      )
    }

    img.onerror = reject
    img.src = url
  })
}
