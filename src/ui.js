import { FURNITURE_DEFAULTS } from './objects.js'

let onRoomChange, onAddObject, onSelectObject, onUpdateSelected, onDeleteSelected, onRoomColorChange

export function initUI(callbacks) {
  onRoomChange = callbacks.onRoomChange
  onAddObject = callbacks.onAddObject
  onSelectObject = callbacks.onSelectObject
  onUpdateSelected = callbacks.onUpdateSelected
  onDeleteSelected = callbacks.onDeleteSelected
  onRoomColorChange = callbacks.onRoomColorChange

  // 部屋サイズ
  ;['room-width', 'room-depth', 'room-height'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      onRoomChange({
        width: +document.getElementById('room-width').value,
        depth: +document.getElementById('room-depth').value,
        height: +document.getElementById('room-height').value,
      })
    })
  })

  // 床・壁の色
  document.getElementById('room-floor-color').addEventListener('input', e => {
    onRoomColorChange({ floorColor: e.target.value })
  })
  document.getElementById('room-wall-color').addEventListener('input', e => {
    onRoomColorChange({ wallColor: e.target.value })
  })

  // 窓・ドア追加
  document.getElementById('btn-add-window').addEventListener('click', () => onAddObject('window'))
  document.getElementById('btn-add-door').addEventListener('click', () => onAddObject('door'))

  // 家具追加ボタン
  document.querySelectorAll('.btn-furniture').forEach(btn => {
    btn.addEventListener('click', () => onAddObject(btn.dataset.type))
  })

  // プロパティパネルの入力
  const propInputIds = ['prop-x', 'prop-z', 'prop-y', 'prop-w', 'prop-d', 'prop-h', 'prop-rot', 'prop-color', 'prop-wall', 'prop-wall-offset', 'prop-wall-height-offset']
  propInputIds.forEach(id => {
    const el = document.getElementById(id)
    el.addEventListener('change', flushProps)
    el.addEventListener('input', id === 'prop-color' ? flushProps : null)
  })

  // 削除ボタン
  document.getElementById('btn-delete-selected').addEventListener('click', onDeleteSelected)
}

function flushProps() {
  const isWall = !document.getElementById('prop-wall-section').classList.contains('hidden')
  const data = {
    x: +document.getElementById('prop-x').value,
    z: +document.getElementById('prop-z').value,
    y: +document.getElementById('prop-y').value,
    w: +document.getElementById('prop-w').value,
    d: +document.getElementById('prop-d').value,
    h: +document.getElementById('prop-h').value,
    rot: +document.getElementById('prop-rot').value,
    color: document.getElementById('prop-color').value,
  }
  if (isWall) {
    data.wall = document.getElementById('prop-wall').value
    data.wallOffset = +document.getElementById('prop-wall-offset').value
    data.wallHeightOffset = +document.getElementById('prop-wall-height-offset').value
  }
  onUpdateSelected(data)
}

export function setRoomInputs(room) {
  document.getElementById('room-width').value = room.width
  document.getElementById('room-depth').value = room.depth
  document.getElementById('room-height').value = room.height
  if (room.floorColor) document.getElementById('room-floor-color').value = room.floorColor
  if (room.wallColor)  document.getElementById('room-wall-color').value  = room.wallColor
}

export function showProperties(obj) {
  document.getElementById('prop-empty').classList.add('hidden')
  document.getElementById('prop-content').classList.remove('hidden')

  const def = FURNITURE_DEFAULTS[obj.type]
  document.getElementById('prop-title').textContent = `${def.icon} ${def.label} #${obj.id}`

  const isWall = obj.type === 'window' || obj.type === 'door'
  const wallSection = document.getElementById('prop-wall-section')
  const rotSection = document.getElementById('prop-rotation-section')
  const colorSection = document.getElementById('prop-color-section')
  const wallHeightRow = document.getElementById('prop-wall-height-row')

  wallSection.classList.toggle('hidden', !isWall)
  rotSection.classList.toggle('hidden', isWall)

  // 窓のみ高さ位置を表示
  if (isWall) {
    wallHeightRow.classList.toggle('hidden', obj.type === 'door')
    document.getElementById('prop-wall').value = obj.data.wall ?? 'north'
    document.getElementById('prop-wall-offset').value = obj.data.wallOffset ?? 0
    document.getElementById('prop-wall-height-offset').value = obj.data.wallHeightOffset ?? 120
  }

  document.getElementById('prop-x').value = obj.data.x ?? 0
  document.getElementById('prop-z').value = obj.data.z ?? 0
  document.getElementById('prop-y').value = obj.data.y ?? 0
  document.getElementById('prop-w').value = obj.data.w
  document.getElementById('prop-d').value = obj.data.d
  document.getElementById('prop-h').value = obj.data.h
  document.getElementById('prop-rot').value = obj.data.rot ?? 0
  document.getElementById('prop-color').value = obj.data.color ?? def.color

  // 家具の位置行の表示制御
  const posXRow = document.getElementById('prop-x').closest('.form-row')
  const posZRow = document.getElementById('prop-z').closest('.form-row')
  const posYRow = document.getElementById('prop-y').closest('.form-row')
  posXRow.classList.toggle('hidden', isWall)
  posZRow.classList.toggle('hidden', isWall)
  posYRow.classList.toggle('hidden', isWall)
}

export function hideProperties() {
  document.getElementById('prop-empty').classList.remove('hidden')
  document.getElementById('prop-content').classList.add('hidden')
}

export function updateObjectList(objects, selectedId, onSelect) {
  const ul = document.getElementById('object-list')
  ul.innerHTML = ''
  objects.forEach(obj => {
    const def = FURNITURE_DEFAULTS[obj.type]
    const li = document.createElement('li')
    li.dataset.id = obj.id
    li.innerHTML = `<span class="list-icon">${def.icon}</span>${def.label} #${obj.id}`
    if (obj.id === selectedId) li.classList.add('selected')
    li.addEventListener('click', () => onSelect(obj.id))
    ul.appendChild(li)
  })
}

export function setCeilingButtonText(visible) {
  document.getElementById('btn-toggle-ceiling').textContent = visible ? '天井を隠す' : '天井を表示'
}
