import * as THREE from 'three'

let dimObjects = []

function makeLabel(text) {
  const cw = 320, ch = 60
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, cw, ch)
  ctx.fillStyle = 'rgba(8, 18, 40, 0.82)'
  ctx.beginPath()
  ctx.roundRect(3, 3, cw - 6, ch - 6, 9)
  ctx.fill()

  ctx.strokeStyle = 'rgba(136, 170, 255, 0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(3, 3, cw - 6, ch - 6, 9)
  ctx.stroke()

  ctx.fillStyle = '#dde8ff'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cw / 2, ch / 2)

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.5, 0.28, 1)
  return sprite
}

function makeLine(a, b) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b])
  const mat = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.55 })
  return new THREE.Line(geo, mat)
}

function makeEndTick(pt, perpDir) {
  const size = 0.045
  const a = pt.clone().addScaledVector(perpDir, size)
  const b = pt.clone().addScaledVector(perpDir, -size)
  return makeLine(a, b)
}

export function createDimensionLabels(scene, width, depth, height) {
  removeDimensionLabels(scene)

  const w = width / 100
  const d = depth / 100
  const gap = 0.32
  const y = 0.005

  // -- 幅 (X軸, 南端外側) --
  const wy = y
  const wz = d / 2 + gap * 0.5
  const p1 = new THREE.Vector3(-w / 2, wy, wz)
  const p2 = new THREE.Vector3(w / 2, wy, wz)
  const perpW = new THREE.Vector3(0, 0, 1)
  const wLine = makeLine(p1, p2)
  scene.add(wLine)
  dimObjects.push(wLine)
  const wt1 = makeEndTick(p1, perpW)
  scene.add(wt1); dimObjects.push(wt1)
  const wt2 = makeEndTick(p2, perpW)
  scene.add(wt2); dimObjects.push(wt2)

  const wLabel = makeLabel(`幅  ${width} cm`)
  wLabel.position.set(0, wy, d / 2 + gap)
  scene.add(wLabel)
  dimObjects.push(wLabel)

  // -- 奥行 (Z軸, 東端外側) --
  const dx = w / 2 + gap * 0.5
  const q1 = new THREE.Vector3(dx, y, -d / 2)
  const q2 = new THREE.Vector3(dx, y, d / 2)
  const perpD = new THREE.Vector3(1, 0, 0)
  const dLine = makeLine(q1, q2)
  scene.add(dLine)
  dimObjects.push(dLine)
  const dt1 = makeEndTick(q1, perpD)
  scene.add(dt1); dimObjects.push(dt1)
  const dt2 = makeEndTick(q2, perpD)
  scene.add(dt2); dimObjects.push(dt2)

  const dLabel = makeLabel(`奥行  ${depth} cm`)
  dLabel.position.set(w / 2 + gap, y, 0)
  scene.add(dLabel)
  dimObjects.push(dLabel)

  // -- 高さ (Y軸, 南西コーナー外側) --
  if (height) {
    const h = height / 100
    const hx = -(w / 2 + gap * 0.5)
    const hz = d / 2
    const r1 = new THREE.Vector3(hx, 0, hz)
    const r2 = new THREE.Vector3(hx, h, hz)
    const perpH = new THREE.Vector3(-1, 0, 0)
    const hLine = makeLine(r1, r2)
    scene.add(hLine); dimObjects.push(hLine)
    const ht1 = makeEndTick(r1, perpH)
    scene.add(ht1); dimObjects.push(ht1)
    const ht2 = makeEndTick(r2, perpH)
    scene.add(ht2); dimObjects.push(ht2)

    const hLabel = makeLabel(`高さ  ${height} cm`)
    hLabel.position.set(-(w / 2 + gap), h / 2, hz)
    scene.add(hLabel); dimObjects.push(hLabel)
  }
}

export function removeDimensionLabels(scene) {
  dimObjects.forEach(obj => {
    scene.remove(obj)
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose()
      obj.material.dispose()
    }
  })
  dimObjects = []
}

// ── 家具寸法ラベル ────────────────────────────────────────────

let furnitureDimObjects = []

function makeFurnitureLabel(text) {
  const cw = 260, ch = 50
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, cw, ch)
  ctx.fillStyle = 'rgba(40, 20, 0, 0.85)'
  ctx.beginPath(); ctx.roundRect(3, 3, cw - 6, ch - 6, 8); ctx.fill()
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(3, 3, cw - 6, ch - 6, 8); ctx.stroke()
  ctx.fillStyle = '#ffe080'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cw / 2, ch / 2)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.9, 0.17, 1)
  return sprite
}

function makeFurnitureLine(a, b) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b])
  const mat = new THREE.LineBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.7 })
  return new THREE.Line(geo, mat)
}

function makeFurnitureTick(pt, perpDir) {
  const size = 0.035
  const a = pt.clone().addScaledVector(perpDir, size)
  const b = pt.clone().addScaledVector(perpDir, -size)
  return makeFurnitureLine(a, b)
}

function addFurnitureDimLine(scene, p1, p2, perpDir, labelText) {
  const line = makeFurnitureLine(p1, p2)
  scene.add(line); furnitureDimObjects.push(line)
  const t1 = makeFurnitureTick(p1, perpDir)
  scene.add(t1); furnitureDimObjects.push(t1)
  const t2 = makeFurnitureTick(p2, perpDir)
  scene.add(t2); furnitureDimObjects.push(t2)
  const mid = p1.clone().lerp(p2, 0.5).addScaledVector(perpDir, 0.2)
  const label = makeFurnitureLabel(labelText)
  label.position.copy(mid)
  scene.add(label); furnitureDimObjects.push(label)
}

export function createFurnitureDimensions(scene, obj) {
  removeFurnitureDimensions(scene)
  if (obj.type === 'window' || obj.type === 'door') return

  const { w, d, h, x, z, y, rot } = obj.data
  const wm = w / 100, dm = d / 100, hm = h / 100
  const cx = x / 100, cz = z / 100
  const ym = obj.type === 'desk' ? 0 : (y ?? 0) / 100
  const rotRad = ((rot ?? 0) * Math.PI) / 180

  const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotRad)
  const axisX = new THREE.Vector3(1, 0, 0).applyQuaternion(quat)
  const axisZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quat)

  const center = new THREE.Vector3(cx, ym, cz)
  const gap = 0.16

  const frontRight = center.clone().addScaledVector(axisX,  wm / 2).addScaledVector(axisZ,  dm / 2)
  const frontLeft  = center.clone().addScaledVector(axisX, -wm / 2).addScaledVector(axisZ,  dm / 2)
  const backRight  = center.clone().addScaledVector(axisX,  wm / 2).addScaledVector(axisZ, -dm / 2)

  // 幅 (W): 手前エッジ、axisZ 方向に外出し
  const wp1 = frontLeft.clone().addScaledVector(axisZ, gap)
  const wp2 = frontRight.clone().addScaledVector(axisZ, gap)
  addFurnitureDimLine(scene, wp1, wp2, axisZ, `W  ${w} cm`)

  // 奥行 (D): 右エッジ、axisX 方向に外出し
  const dp1 = frontRight.clone().addScaledVector(axisX, gap)
  const dp2 = backRight.clone().addScaledVector(axisX, gap)
  addFurnitureDimLine(scene, dp1, dp2, axisX, `D  ${d} cm`)

  // 高さ (H): 右手前コーナー、垂直ライン
  const hr1 = frontRight.clone().addScaledVector(axisX, gap * 0.6)
  const hr2 = hr1.clone().add(new THREE.Vector3(0, hm, 0))
  addFurnitureDimLine(scene, hr1, hr2, axisX, `H  ${h} cm`)
}

export function removeFurnitureDimensions(scene) {
  furnitureDimObjects.forEach(obj => {
    scene.remove(obj)
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose()
      obj.material.dispose()
    }
  })
  furnitureDimObjects = []
}
