import * as THREE from 'three'

let roomGroup = null
let ceilingMesh = null
let floorMesh = null
let roomEdgeLines = null

export function createRoom(scene, width, depth, height, colors = {}) {
  if (roomGroup) {
    scene.remove(roomGroup)
    roomGroup.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
  }

  floorMesh = null
  roomEdgeLines = null

  const w = width / 100
  const d = depth / 100
  const h = height / 100

  roomGroup = new THREE.Group()

  // 床
  floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: colors.floor ?? 0x8b7355, side: THREE.DoubleSide })
  )
  floorMesh.rotation.x = -Math.PI / 2
  floorMesh.name = 'floor'
  floorMesh.userData.isRoom = true
  roomGroup.add(floorMesh)

  // 天井
  ceilingMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0xdde0e8, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false })
  )
  ceilingMesh.rotation.x = Math.PI / 2
  ceilingMesh.position.y = h
  ceilingMesh.name = 'ceiling'
  ceilingMesh.userData.isRoom = true
  roomGroup.add(ceilingMesh)

  // 部屋の輪郭ライン（塗りつぶし壁なし）
  const boxGeo = new THREE.BoxGeometry(w, h, d)
  const edgesGeo = new THREE.EdgesGeometry(boxGeo)
  boxGeo.dispose()
  roomEdgeLines = new THREE.LineSegments(
    edgesGeo,
    new THREE.LineBasicMaterial({ color: colors.wall ?? 0xc8c8dc, transparent: true, opacity: 0.5 })
  )
  roomEdgeLines.position.y = h / 2
  roomEdgeLines.name = 'room-edges'
  roomEdgeLines.userData.isRoom = true
  roomGroup.add(roomEdgeLines)

  scene.add(roomGroup)
  return roomGroup
}

export function setFloorColor(color) {
  if (floorMesh) floorMesh.material.color.set(color)
}

export function setWallColor(color) {
  if (roomEdgeLines) roomEdgeLines.material.color.set(color)
}

export function toggleCeiling() {
  if (ceilingMesh) {
    ceilingMesh.visible = !ceilingMesh.visible
    return ceilingMesh.visible
  }
  return true
}

export function getRoomGroup() { return roomGroup }
