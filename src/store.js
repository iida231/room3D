const STORAGE_KEY = 'room3d_v2'

// 4.3畳 ベッドルーム (291cm × 241cm) の初期設定
const defaultState = () => ({
  room: { width: 291, depth: 241, height: 240, floorColor: '#8b7355', wallColor: '#c8c8dc' },
  objects: [
    {
      id: 1, type: 'closet',
      w: 60, d: 136, h: 200, color: '#b0a090',
      x: 116, y: 0, z: 0, rot: 0,
      wall: 'north', wallOffset: 0, wallHeightOffset: 120,
    },
    {
      id: 2, type: 'door',
      w: 80, d: 5, h: 200, color: '#8b4513',
      x: 0, y: 0, z: 0, rot: 0,
      wall: 'north', wallOffset: -65, wallHeightOffset: 0,
    },
  ],
})

let state = defaultState()

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) state = JSON.parse(raw)
  } catch {
    state = defaultState()
  }
  return state
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState() {
  state = defaultState()
  saveState()
  return state
}

export function getState() { return state }

export function setRoom(dims) {
  Object.assign(state.room, dims)
  saveState()
}

export function addObjectData(data) {
  state.objects.push(data)
  saveState()
}

export function updateObjectData(id, newData) {
  const obj = state.objects.find(o => o.id === id)
  if (obj) Object.assign(obj, newData)
  saveState()
}

export function removeObjectData(id) {
  state.objects = state.objects.filter(o => o.id !== id)
  saveState()
}
