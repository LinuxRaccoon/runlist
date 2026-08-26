// Netlify Function: /.netlify/functions/scan-drops
//
// Receives a base64-encoded photo of a drop/delivery sheet, sends it to
// Gemini with a prompt + JSON schema asking for exactly the fields RunList
// needs (house number/name + postcode per drop), and returns clean JSON.
//
// The Gemini API key lives only here, as a Netlify environment variable
// (GEMINI_API_KEY) — it is never sent to or visible from the browser.

const MODEL = 'gemini-3.5-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const PROMPT = `You are reading a photo of a UK delivery/drop sheet. It may be a simple list of postcodes, or a more complex "Van Loading Check Sheet" style document with multiple drops, each having a customer name, house number or name, street, town, and postcode — often mixed in with unrelated load/unload checkboxes, tote numbers, or product/stock details.

Extract ONLY each drop's house number or house name, and its UK postcode. Ignore customer names, street/town names, load/unload checkboxes, tote counts, product substitutions, and any other content.

Return every drop you can find, in the order they appear top to bottom on the page. If a field is illegible or missing for a drop, use an empty string for that field rather than guessing. A UK postcode looks like "PO20 0TY" or "GU29 0JG".`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    drops: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          houseNumberOrName: { type: 'string' },
          postcode: { type: 'string' },
        },
        required: ['houseNumberOrName', 'postcode'],
      },
    },
  },
  required: ['drops'],
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server is not configured with a Gemini API key.' }),
    }
  }

  let imageBase64, mimeType
  try {
    const body = JSON.parse(event.body)
    imageBase64 = body.imageBase64
    mimeType = body.mimeType || 'image/jpeg'
    if (!imageBase64) throw new Error('missing imageBase64')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Expected JSON body with imageBase64.' }) }
  }

  const requestBody = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini API error:', res.status, errText)
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `Gemini API returned an error (${res.status}).` }),
      }
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Gemini returned no readable result.' }) }
    }

    const parsed = JSON.parse(text)
    const drops = Array.isArray(parsed.drops) ? parsed.drops : []

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drops }),
    }
  } catch (err) {
    console.error('scan-drops function error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected server error during scan.' }) }
  }
}
