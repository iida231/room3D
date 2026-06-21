import * as THREE from 'three'

let idCounter = 1

export const FURNITURE_DEFAULTS = {
  aircon:    { color: '#c8e6f8', w: 80, d: 25, h: 30, icon: '❄️', label: 'エアコン' },
  desk:      { color: '#d4a96a', w: 120, d: 60, h: 75, icon: '🪑', label: '机' },
  sofa:      { color: '#8b7a6e', w: 180, d: 85, h: 85, icon: '🛋️', label: 'ソファー' },
  tv:        { color: '#2c2c2c', w: 120, d: 8, h: 70, icon: '📺', label: 'テレビ' },
  closet:    { color: '#b0a090', w: 90, d: 60, h: 200, icon: '👕', label: 'クローゼット' },
  shelf:     { color: '#c8b89a', w: 90, d: 30, h: 120, icon: '📦', label: '棚' },
  bookshelf: { color: '#a08060', w: 80, d: 30, h: 180, icon: '📚', label: '本棚' },
  custom:    { color: '#a0c4ff', w: 50, d: 50, h: 50, icon: '⬛', label: '直方体' },
  window:    { color: '#64c8ff', w: 90, d: 5, h: 100, icon: '🪟', label: '窓' },
  door:      { color: '#8b4513', w: 80, d: 5, h: 200, icon: '🚪', label: 'ドア' },
}

export class RoomObject {
  constructor(type, data = {}) {
    this.id = idCounter++
    this.type = type
    const def = FURNITURE_DEFAULTS[type]
    this.data = {
      x: 0, y: 0, z: 0,
      w: def.w, d: def.d, h: def.h,
      rot: 0,
      color: def.color,
      wall: 'north',
      wallOffset: 0,
      wallHeightOffset: 120,
      ...data,
    }
    this.mesh = null
    this.edgeMesh = null
  }

  build(scene) {
    this.mesh = this._createMesh()
    this.mesh.userData.roomObjectId = this.id
    this._applyTransform()
    scene.add(this.mesh)
  }

  _createMesh() {
    const { w, d, h, color } = this.data
    const geo = new THREE.BoxGeometry(w / 100, h / 100, d / 100)
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color) })
    return new THREE.Mesh(geo, mat)
  }

  _applyTransform() {
    if (!this.mesh) return
    const { x, y, z, rot, h } = this.data
    this.mesh.position.set(x / 100, y / 100 + h / 200, z / 100)
    this.mesh.rotation.y = (rot * Math.PI) / 180
  }

  moveXZ(x, z) {
    this.data.x = x
    this.data.z = z
    this._applyTransform()
  }

  update(newData, scene) {
    Object.assign(this.data, newData)
    if (!this.mesh) return

    // ジオメトリのサイズ変更
    const { w, d, h, color } = this.data
    this.mesh.geometry.dispose()
    this.mesh.geometry = new THREE.BoxGeometry(w / 100, h / 100, d / 100)
    this.mesh.material.color.set(color)
    this._applyTransform()

    if (this.edgeMesh) {
      this.removeHighlight(scene)
      this.addHighlight(scene)
    }
  }

  addHighlight(scene) {
    const edges = new THREE.EdgesGeometry(this.mesh.geometry)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 2 })
    this.edgeMesh = new THREE.LineSegments(edges, lineMat)
    this.mesh.add(this.edgeMesh)
  }

  removeHighlight(scene) {
    if (this.edgeMesh) {
      this.mesh.remove(this.edgeMesh)
      this.edgeMesh.geometry.dispose()
      this.edgeMesh = null
    }
  }

  dispose(scene) {
    if (this.edgeMesh) this.removeHighlight(scene)
    if (this.mesh) {
      scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      this.mesh.material.dispose()
      this.mesh = null
    }
  }

  get label() { return FURNITURE_DEFAULTS[this.type]?.label ?? this.type }
  get icon() { return FURNITURE_DEFAULTS[this.type]?.icon ?? '⬛' }
}

export class WallObject extends RoomObject {
  constructor(type, data = {}) {
    super(type, data)
  }

  build(scene, roomDims) {
    this.mesh = this._createMesh()
    this.mesh.userData.roomObjectId = this.id
    this._placeOnWall(roomDims)
    scene.add(this.mesh)
    this._roomDims = roomDims
  }

  _createMesh() {
    const { w, h, color } = this.data
    const geo = new THREE.BoxGeometry(w / 100, h / 100, 0.02)
    const isWindow = this.type === 'window'
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: isWindow,
      opacity: isWindow ? 0.55 : 0.92,
    })
    return new THREE.Mesh(geo, mat)
  }

  _placeOnWall(roomDims) {
    if (!this.mesh || !roomDims) return
    const { wall, wallOffset, wallHeightOffset, h, rot } = this.data
    const rw = roomDims.width / 100
    const rd = roomDims.depth / 100
    const rh = roomDims.height / 100

    const halfW = rw / 2
    const halfD = rd / 2
    const oy = wallHeightOffset / 100
    const oh = h / 100
    const oo = wallOffset / 100

    let px = 0, py = oy + oh / 2, pz = 0, rotY = 0
    switch (wall) {
      case 'north': px = oo; pz = -halfD + 0.015; rotY = 0; break
      case 'south': px = oo; pz = halfD - 0.015; rotY = Math.PI; break
      case 'east':  px = halfW - 0.015; pz = oo; rotY = -Math.PI / 2; break
      case 'west':  px = -halfW + 0.015; pz = oo; rotY = Math.PI / 2; break
    }
    this.mesh.position.set(px, py, pz)
    this.mesh.rotation.y = rotY
  }

  moveOnWall(wallOffset, wallHeightOffset, roomDims) {
    this.data.wallOffset = wallOffset
    this.data.wallHeightOffset = wallHeightOffset
    this._placeOnWall(roomDims ?? this._roomDims)
  }

  update(newData, scene, roomDims) {
    Object.assign(this.data, newData)
    if (!this.mesh) return
    const { w, h, color } = this.data
    this.mesh.geometry.dispose()
    this.mesh.geometry = new THREE.BoxGeometry(w / 100, h / 100, 0.02)
    this.mesh.material.color.set(color)
    this._placeOnWall(roomDims ?? this._roomDims)
    if (this.edgeMesh) {
      this.removeHighlight(scene)
      this.addHighlight(scene)
    }
  }

  updateRoomDims(roomDims) {
    this._roomDims = roomDims
    this._placeOnWall(roomDims)
  }
}

export class DeskObject extends RoomObject {
  _createMesh() {
    const { w, d, h, color } = this.data
    const wm = w / 100, dm = d / 100, hm = h / 100
    const group = new THREE.Group()

    const topMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color) })
    const legMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7) })

    // 天板
    const top = new THREE.Mesh(new THREE.BoxGeometry(wm, 0.03, dm), topMat)
    top.position.y = hm - 0.015
    group.add(top)

    // 4本脚
    const legW = 0.04, legH = hm - 0.03
    const positions = [
      [wm / 2 - 0.04, legH / 2, dm / 2 - 0.04],
      [-wm / 2 + 0.04, legH / 2, dm / 2 - 0.04],
      [wm / 2 - 0.04, legH / 2, -dm / 2 + 0.04],
      [-wm / 2 + 0.04, legH / 2, -dm / 2 + 0.04],
    ]
    positions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(legW, legH, legW), legMat)
      leg.position.set(x, y, z)
      group.add(leg)
    })

    group.userData.isGroup = true
    return group
  }

  _applyTransform() {
    if (!this.mesh) return
    const { x, z, rot } = this.data
    this.mesh.position.set(x / 100, 0, z / 100)
    this.mesh.rotation.y = (rot * Math.PI) / 180
  }

  update(newData, scene) {
    Object.assign(this.data, newData)
    if (!this.mesh) return

    // グループを再生成
    const oldMesh = this.mesh
    oldMesh.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
    scene.remove(oldMesh)
    this.edgeMesh = null

    this.mesh = this._createMesh()
    this.mesh.userData.roomObjectId = this.id
    this._applyTransform()
    scene.add(this.mesh)
  }

  addHighlight(scene) {
    // グループの場合は全子メッシュにエッジを追加
    this.edgeMesh = []
    this.mesh.traverse(obj => {
      if (obj.isMesh) {
        const edges = new THREE.EdgesGeometry(obj.geometry)
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffd700 }))
        obj.add(line)
        this.edgeMesh.push({ mesh: obj, line })
      }
    })
  }

  removeHighlight(scene) {
    if (Array.isArray(this.edgeMesh)) {
      this.edgeMesh.forEach(({ mesh, line }) => {
        mesh.remove(line)
        line.geometry.dispose()
      })
      this.edgeMesh = null
    }
  }
}

export function createRoomObject(type, data, scene, roomDims) {
  let obj
  if (type === 'window' || type === 'door') {
    obj = new WallObject(type, data)
    obj.build(scene, roomDims)
  } else if (type === 'desk') {
    obj = new DeskObject(type, data)
    obj.build(scene)
  } else {
    obj = new RoomObject(type, data)
    obj.build(scene)
  }
  return obj
}
