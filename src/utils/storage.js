const STORAGE_KEY = 'runlist:current-run'

/**
 * @typedef {Object} Stop
 * @property {string} id
 * @property {string} postcode
 * @property {string} detail   // house number/name, editable
 * @property {'pending'|'delivered'} status
 */

/** @returns {Stop[]} */
export function loadRun() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @param {Stop[]} stops */
export function saveRun(stops) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stops))
  } catch {
    // localStorage can throw in private-browsing/full-storage edge cases;
    // the run just won't persist across a reload in that case.
  }
}

export function clearRun() {
  localStorage.removeItem(STORAGE_KEY)
}

let idCounter = 0
export function makeId() {
  idCounter += 1
  return `${Date.now()}-${idCounter}`
}
