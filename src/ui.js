import { FURNITURE_DEFAULTS } from './objects.js'

let onRoomChange, onAddObject, onSelectObject, onUpdateSelected, onDeleteSelected, onRoomColorChange
let onSaveSnapshot, onRestoreSnapshot
let onRenameObject, onSaveDesign, onLoadDesign, onRenameSave, onDeleteSave

export function initUI(callbacks) {
  onRoomChange = callbacks.onRoomChange
  onAddObject = callbacks.onAddObject
  onSelectObject = callbacks.onSelectObject
  onUpdateSelected = callbacks.onUpdateSelected
  onDeleteSelected = callbacks.onDeleteSelected
  onRoomColorChange = callbacks.onRoomColorChange
  onSaveSnapshot = callbacks.onSaveSnapshot
  onRestoreSnapshot = callbacks.onRestoreSnapshot
  onRenameObject = callbacks.onRenameObject
  onSaveDesign = callbacks.onSaveDesign
  onLoadDesign = callbacks.onLoadDesign
  onRenameSave = callbacks.onRenameSave
  onDeleteSave = callbacks.onDeleteSave

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

  // 一時保存・戻るボタン
  document.getElementById('btn-snapshot-save').addEventListener('click', onSaveSnapshot)
  document.getElementById('btn-snapshot-restore').addEventListener('click', onRestoreSnapshot)

  // 保存モーダル
  document.getElementById('btn-save-confirm').addEventListener('click', () => {
    const name = document.getElementById('save-name-input').value
    onSaveDesign(name)
    document.getElementById('save-name-input').value = ''
  })
  document.getElementById('save-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-save-confirm').click()
  })
  document.getElementById('btn-modal-close').addEventListener('click', () => {
    document.getElementById('save-modal').classList.add('hidden')
  })
  document.getElementById('save-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden')
  })
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
  const displayName = obj.data.name ?? `${def.label} #${obj.id}`
  document.getElementById('prop-title').textContent = `${def.icon} ${displayName}`

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

export function updateObjectList(objects, selectedId, onSelect, onRename) {
  const ul = document.getElementById('object-list')
  ul.innerHTML = ''
  objects.forEach(obj => {
    const def = FURNITURE_DEFAULTS[obj.type]
    const displayName = obj.data.name ?? `${def.label} #${obj.id}`

    const li = document.createElement('li')
    li.dataset.id = obj.id
    if (obj.id === selectedId) li.classList.add('selected')

    const icon = document.createElement('span')
    icon.className = 'list-icon'
    icon.textContent = def.icon

    const label = document.createElement('span')
    label.className = 'list-label'
    label.textContent = displayName

    const editBtn = document.createElement('button')
    editBtn.className = 'btn-list-rename'
    editBtn.title = '名前を変更'
    editBtn.textContent = '✏'
    editBtn.addEventListener('click', e => {
      e.stopPropagation()
      startListRename(label, obj, def, onRename)
    })

    li.appendChild(icon)
    li.appendChild(label)
    li.appendChild(editBtn)
    li.addEventListener('click', () => onSelect(obj.id))
    ul.appendChild(li)
  })
}

function startListRename(labelSpan, obj, def, onRename) {
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'list-name-input'
  input.value = labelSpan.textContent
  input.maxLength = 40
  labelSpan.replaceWith(input)
  input.focus()
  input.select()

  const commit = () => {
    const newName = input.value.trim() || `${def.label} #${obj.id}`
    labelSpan.textContent = newName
    input.replaceWith(labelSpan)
    onRename(obj.id, newName)
  }

  input.addEventListener('blur', commit)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur()
    if (e.key === 'Escape') input.replaceWith(labelSpan)
  })
}

export function setCeilingButtonText(visible) {
  document.getElementById('btn-toggle-ceiling').textContent = visible ? '天井を隠す' : '天井を表示'
}

export function showSaveModal(saves) {
  document.getElementById('save-modal').classList.remove('hidden')
  document.getElementById('save-name-input').value = ''
  document.getElementById('save-name-input').focus()
  renderSavesList(saves)
}

export function updateSavesList(saves) {
  renderSavesList(saves)
}

function renderSavesList(saves) {
  const ul = document.getElementById('saves-list')
  ul.innerHTML = ''
  if (!saves.length) {
    ul.innerHTML = '<li class="saves-empty">保存済みデータがありません</li>'
    return
  }
  saves.forEach(save => {
    const li = document.createElement('li')
    li.className = 'save-item'

    const info = document.createElement('div')
    info.className = 'save-info'

    const nameDiv = document.createElement('div')
    nameDiv.className = 'save-name'
    nameDiv.textContent = save.name

    const dateDiv = document.createElement('div')
    dateDiv.className = 'save-date'
    dateDiv.textContent = formatDate(save.savedAt)

    info.appendChild(nameDiv)
    info.appendChild(dateDiv)

    const actions = document.createElement('div')
    actions.className = 'save-actions'

    const loadBtn = document.createElement('button')
    loadBtn.className = 'btn-save-action btn-save-load'
    loadBtn.textContent = '読み込み'
    loadBtn.addEventListener('click', () => {
      if (confirm(`「${save.name}」を読み込みますか？\n現在の変更は上書きされます。`)) {
        onLoadDesign(save.id)
      }
    })

    const renameBtn = document.createElement('button')
    renameBtn.className = 'btn-save-action btn-save-rename'
    renameBtn.title = '名前変更'
    renameBtn.textContent = '✏'
    renameBtn.addEventListener('click', () => startSaveRename(nameDiv, save))

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'btn-save-action btn-save-delete'
    deleteBtn.title = '削除'
    deleteBtn.textContent = '✕'
    deleteBtn.addEventListener('click', () => {
      if (confirm(`「${save.name}」を削除しますか？`)) {
        onDeleteSave(save.id)
      }
    })

    actions.appendChild(loadBtn)
    actions.appendChild(renameBtn)
    actions.appendChild(deleteBtn)

    li.appendChild(info)
    li.appendChild(actions)
    ul.appendChild(li)
  })
}

function startSaveRename(nameDiv, save) {
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'save-name-edit-input'
  input.value = save.name
  input.maxLength = 40
  nameDiv.replaceWith(input)
  input.focus()
  input.select()

  const commit = () => {
    const newName = input.value.trim() || save.name
    save.name = newName
    nameDiv.textContent = newName
    input.replaceWith(nameDiv)
    onRenameSave(save.id, newName)
  }

  input.addEventListener('blur', commit)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur()
    if (e.key === 'Escape') input.replaceWith(nameDiv)
  })
}

function formatDate(iso) {
  const d = new Date(iso)
  const M = d.getMonth() + 1
  const D = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${M}/${D} ${h}:${m}`
}
