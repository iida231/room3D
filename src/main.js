import * as THREE from 'three'
import { initScene, getScene, getCamera, getRenderer, getControls, updateGridHelper } from './scene.js'
import { createRoom, toggleCeiling, setFloorColor, setWallColor } from './room.js'
import { createRoomObject, FURNITURE_DEFAULTS } from './objects.js'
import { loadState, saveState, resetState, setRoom, addObjectData, updateObjectData, removeObjectData, getState, getSaves, createSave, renameSave, deleteSave, getSaveById, restoreState } from './store.js'
import { initUI, setRoomInputs, showProperties, hideProperties, updateObjectList, setCeilingButtonText, showSaveModal, updateSavesList } from './ui.js'
import { createDimensionLabels, createFurnitureDimensions, removeFurnitureDimensions } from './dimensions.js'
import { printFloorPlan } from './pdf.js'

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

let roomObjects = []
let selectedId = null
let propSnapshot = null

// ── ドラッグ状態 ───────────────────────
const drag = {
  pending: false,   // pointerdown でオブジェクトに当たった
  active: false,    // 移動閾値を超えた（実際にドラッグ中）
  obj: null,
  startClient: { x: 0, y: 0 },
  plane: null,
  offsetXZ: { x: 0, z: 0 },   // 床ドラッグ用オフセット
  offsetWall: { h: 0, v: 0 }, // 壁ドラッグ用オフセット（水平, 垂直）
}

// ── 初期化 ─────────────────────────────
function init() {
  const canvas = document.getElementById('three-canvas')
  const scene = initScene(canvas)

  const state = loadState()
  setRoomInputs(state.room)

  // 部屋の生成
  createRoom(scene, state.room.width, state.room.depth, state.room.height, {
    floor: state.room.floorColor,
    wall: state.room.wallColor,
  })
  updateGridHelper(state.room.width, state.room.depth)
  createDimensionLabels(scene, state.room.width, state.room.depth, state.room.height)

  // 保存済みオブジェクトを復元
  state.objects.forEach(data => {
    const obj = createRoomObject(data.type, { ...data }, scene, state.room)
    obj.id = data.id
    roomObjects.push(obj)
  })
  refreshList()

  initUI({
    onRoomChange: handleRoomChange,
    onAddObject: handleAddObject,
    onSelectObject: handleSelectById,
    onUpdateSelected: handleUpdateSelected,
    onDeleteSelected: handleDeleteSelected,
    onRoomColorChange: handleRoomColorChange,
    onSaveSnapshot: handleSaveSnapshot,
    onRestoreSnapshot: handleRestoreSnapshot,
    onRenameObject: handleRenameObject,
    onSaveDesign: (name) => { updateSavesList(createSave(name)) },
    onLoadDesign: handleLoadDesign,
    onRenameSave: (id, name) => { updateSavesList(renameSave(id, name)) },
    onDeleteSave: (id) => { updateSavesList(deleteSave(id)) },
  })

  // ポインターイベント（選択＋ドラッグ）
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup',   onPointerUp)

  // ヘッダーボタン
  document.getElementById('btn-toggle-ceiling').addEventListener('click', () => {
    const visible = toggleCeiling()
    setCeilingButtonText(visible)
  })

  document.getElementById('btn-pdf').addEventListener('click', () => {
    printFloorPlan(getState())
  })

  document.getElementById('btn-save').addEventListener('click', () => {
    showSaveModal(getSaves())
  })

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('すべての配置をリセットしますか？')) return
    roomObjects.forEach(o => o.dispose(scene))
    roomObjects = []
    selectedId = null
    hideProperties()

    const s = resetState()
    setRoomInputs(s.room)
    createRoom(scene, s.room.width, s.room.depth, s.room.height, {
      floor: s.room.floorColor,
      wall: s.room.wallColor,
    })
    updateGridHelper(s.room.width, s.room.depth)
    createDimensionLabels(scene, s.room.width, s.room.depth, s.room.height)

    // デフォルトオブジェクトを再構築
    s.objects.forEach(data => {
      const obj = createRoomObject(data.type, { ...data }, scene, s.room)
      obj.id = data.id
      roomObjects.push(obj)
    })
    refreshList()
  })
}

// ── 部屋サイズ変更 ─────────────────────
function handleRoomChange(dims) {
  const scene = getScene()
  const state = getState()
  setRoom(dims)
  createRoom(scene, dims.width, dims.depth, dims.height, {
    floor: state.room.floorColor,
    wall: state.room.wallColor,
  })
  updateGridHelper(dims.width, dims.depth)
  createDimensionLabels(scene, dims.width, dims.depth, dims.height)

  // 壁オブジェクトの位置を更新
  roomObjects.forEach(obj => {
    if (obj.updateRoomDims) obj.updateRoomDims(dims)
  })
}

// ── 床・壁の色変更 ─────────────────────
function handleRoomColorChange(colors) {
  setRoom(colors)
  if (colors.floorColor) setFloorColor(colors.floorColor)
  if (colors.wallColor)  setWallColor(colors.wallColor)
}

// ── オブジェクト追加 ────────────────────
function handleAddObject(type) {
  const scene = getScene()
  const state = getState()
  const def = FURNITURE_DEFAULTS[type]

  let initData = {}
  if (type === 'aircon') {
    initData = { y: state.room.height - def.h - 10, wall: 'north', wallOffset: 0, wallHeightOffset: state.room.height - def.h - 10 }
  } else if (type === 'door') {
    initData = { wall: 'south', wallOffset: 0, wallHeightOffset: 0 }
  } else if (type === 'window') {
    initData = { wall: 'north', wallOffset: 0, wallHeightOffset: 100 }
  }

  const obj = createRoomObject(type, initData, scene, state.room)
  roomObjects.push(obj)
  addObjectData({ id: obj.id, type, ...obj.data })

  handleSelectById(obj.id)
  refreshList()
}

// ── 選択 ───────────────────────────────
function handleSelectById(id) {
  const scene = getScene()

  // 前の選択のハイライト解除
  if (selectedId !== null) {
    const prev = roomObjects.find(o => o.id === selectedId)
    if (prev) prev.removeHighlight(scene)
  }

  selectedId = id
  const obj = roomObjects.find(o => o.id === id)
  if (obj) {
    propSnapshot = { ...obj.data }
    obj.addHighlight(scene)
    showProperties(obj)
    createFurnitureDimensions(scene, obj)
  } else {
    hideProperties()
    removeFurnitureDimensions(scene)
  }
  refreshList()
}

// ── プロパティ更新 ─────────────────────
function handleUpdateSelected(newData) {
  if (selectedId === null) return
  const scene = getScene()
  const state = getState()
  const obj = roomObjects.find(o => o.id === selectedId)
  if (!obj) return

  if (obj.updateRoomDims) {
    obj.update(newData, scene, state.room)
  } else {
    obj.update(newData, scene)
  }
  updateObjectData(selectedId, newData)
  createFurnitureDimensions(scene, obj)
}

// ── デザイン読み込み ────────────────────
function handleLoadDesign(id) {
  const scene = getScene()
  const savedState = getSaveById(id)
  if (!savedState) return

  roomObjects.forEach(o => o.dispose(scene))
  roomObjects = []
  selectedId = null
  propSnapshot = null
  hideProperties()
  removeFurnitureDimensions(scene)

  const s = restoreState(savedState)
  setRoomInputs(s.room)
  createRoom(scene, s.room.width, s.room.depth, s.room.height, {
    floor: s.room.floorColor,
    wall: s.room.wallColor,
  })
  updateGridHelper(s.room.width, s.room.depth)
  createDimensionLabels(scene, s.room.width, s.room.depth, s.room.height)

  s.objects.forEach(data => {
    const obj = createRoomObject(data.type, { ...data }, scene, s.room)
    obj.id = data.id
    roomObjects.push(obj)
  })
  refreshList()

  document.getElementById('save-modal').classList.add('hidden')
}

// ── オブジェクト名前変更 ────────────────
function handleRenameObject(id, name) {
  updateObjectData(id, { name })
  refreshList()
  if (selectedId === id) {
    const obj = roomObjects.find(o => o.id === id)
    if (obj) showProperties(obj)
  }
}

// ── スナップショット ────────────────────
function handleSaveSnapshot() {
  if (selectedId === null) return
  const obj = roomObjects.find(o => o.id === selectedId)
  if (!obj) return
  propSnapshot = { ...obj.data }
}

function handleRestoreSnapshot() {
  if (selectedId === null || !propSnapshot) return
  const scene = getScene()
  const state = getState()
  const obj = roomObjects.find(o => o.id === selectedId)
  if (!obj) return

  const newData = { ...propSnapshot }
  if (obj.updateRoomDims) {
    obj.update(newData, scene, state.room)
  } else {
    obj.update(newData, scene)
  }
  updateObjectData(selectedId, newData)
  showProperties(obj)
  createFurnitureDimensions(scene, obj)
}

// ── 削除 ───────────────────────────────
function handleDeleteSelected() {
  if (selectedId === null) return
  const scene = getScene()
  removeFurnitureDimensions(scene)
  const obj = roomObjects.find(o => o.id === selectedId)
  if (obj) {
    obj.dispose(scene)
    roomObjects = roomObjects.filter(o => o.id !== selectedId)
    removeObjectData(selectedId)
  }
  selectedId = null
  hideProperties()
  refreshList()
}

// ── ポインターイベント・ドラッグ ────────

function setMouseFromEvent(e) {
  const canvas = getRenderer().domElement
  const rect = canvas.getBoundingClientRect()
  mouse.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )
}

function pickObject(e) {
  setMouseFromEvent(e)
  raycaster.setFromCamera(mouse, getCamera())
  const meshes = []
  roomObjects.forEach(o => {
    if (!o.mesh) return
    if (o.mesh.isMesh) meshes.push(o.mesh)
    else o.mesh.traverse(c => { if (c.isMesh) meshes.push(c) })
  })
  const hits = raycaster.intersectObjects(meshes, false)
  if (!hits.length) return null
  let cur = hits[0].object
  while (cur) {
    if (cur.userData.roomObjectId !== undefined)
      return roomObjects.find(o => o.id === cur.userData.roomObjectId) ?? null
    cur = cur.parent
  }
  return null
}

function getWorldPoint(e, plane) {
  setMouseFromEvent(e)
  raycaster.setFromCamera(mouse, getCamera())
  const pt = new THREE.Vector3()
  return raycaster.ray.intersectPlane(plane, pt) ? pt : null
}

function getDragPlane(obj) {
  const { room } = getState()
  const rw = room.width / 100, rd = room.depth / 100
  if (obj.type === 'window' || obj.type === 'door') {
    switch (obj.data.wall) {
      case 'north': return new THREE.Plane(new THREE.Vector3( 0, 0,  1),  rd / 2)
      case 'south': return new THREE.Plane(new THREE.Vector3( 0, 0, -1),  rd / 2)
      case 'east':  return new THREE.Plane(new THREE.Vector3(-1, 0,  0),  rw / 2)
      case 'west':  return new THREE.Plane(new THREE.Vector3( 1, 0,  0),  rw / 2)
    }
  }
  return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
}

function wallHorizontal(obj, pt) {
  return (obj.data.wall === 'north' || obj.data.wall === 'south') ? pt.x : pt.z
}

function onPointerDown(e) {
  if (e.button !== 0) return
  const obj = pickObject(e)
  if (!obj) { drag.obj = null; return }

  handleSelectById(obj.id)

  const plane = getDragPlane(obj)
  const pt    = getWorldPoint(e, plane)

  drag.pending     = true
  drag.active      = false
  drag.obj         = obj
  drag.plane       = plane
  drag.startClient = { x: e.clientX, y: e.clientY }

  if (pt) {
    if (obj.type === 'window' || obj.type === 'door') {
      drag.offsetWall = {
        h: obj.data.wallOffset / 100 - wallHorizontal(obj, pt),
        v: (obj.data.wallHeightOffset / 100 + obj.data.h / 200) - pt.y,
      }
    } else {
      drag.offsetXZ = { x: obj.data.x / 100 - pt.x, z: obj.data.z / 100 - pt.z }
    }
  }

  getControls().enabled = false
  e.currentTarget.setPointerCapture(e.pointerId)
}

function onPointerMove(e) {
  if (!drag.pending && !drag.active) return

  const dx = e.clientX - drag.startClient.x
  const dy = e.clientY - drag.startClient.y
  if (!drag.active && Math.hypot(dx, dy) < 5) return
  drag.active = true
  e.currentTarget.style.cursor = 'grabbing'

  const pt = getWorldPoint(e, drag.plane)
  if (!pt) return

  const obj = drag.obj
  if (obj.type === 'window' || obj.type === 'door') {
    const hw      = (wallHorizontal(obj, pt) + drag.offsetWall.h) * 100
    const centerY =  pt.y + drag.offsetWall.v
    obj.moveOnWall(hw, (centerY - obj.data.h / 200) * 100, getState().room)
  } else {
    obj.moveXZ((pt.x + drag.offsetXZ.x) * 100, (pt.z + drag.offsetXZ.z) * 100)
  }

  showProperties(obj)
  createFurnitureDimensions(getScene(), obj)
}

function onPointerUp(e) {
  if (e.button !== 0) return
  e.currentTarget.style.cursor = ''
  getControls().enabled = true

  if (drag.active && drag.obj) {
    updateObjectData(drag.obj.id, drag.obj.data)
  } else if (!drag.active && !drag.obj && selectedId !== null) {
    // 空白クリック → 選択解除
    const prev = roomObjects.find(o => o.id === selectedId)
    if (prev) prev.removeHighlight(getScene())
    removeFurnitureDimensions(getScene())
    selectedId = null
    hideProperties()
    refreshList()
  }

  drag.pending = false
  drag.active  = false
  drag.obj     = null
  drag.plane   = null
}

// ── リスト更新 ─────────────────────────
function refreshList() {
  updateObjectList(roomObjects, selectedId, handleSelectById, handleRenameObject)
}

init()
