import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let renderer, camera, controls, scene, animId
let gridHelper

export function initScene(canvas) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1117)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = false

  camera = new THREE.PerspectiveCamera(60, 1, 0.01, 500)
  camera.position.set(6, 5, 7)
  camera.lookAt(0, 0, 0)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 0.5
  controls.maxDistance = 50

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 10, 5)
  scene.add(dirLight)

  gridHelper = new THREE.GridHelper(20, 20, 0x2a3a5c, 0x1e2d40)
  scene.add(gridHelper)

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(canvas.parentElement)
  onResize()

  animate()

  return scene
}

function onResize() {
  const container = renderer.domElement.parentElement
  const w = container.clientWidth
  const h = container.clientHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function animate() {
  animId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

export function getScene() { return scene }
export function getCamera() { return camera }
export function getRenderer() { return renderer }
export function getControls() { return controls }

export function updateGridHelper(width, depth) {
  scene.remove(gridHelper)
  gridHelper.geometry.dispose()
  const size = Math.max(width, depth) / 100 * 1.2
  const divs = Math.ceil(size * 2)
  gridHelper = new THREE.GridHelper(size * 2, divs, 0x2a3a5c, 0x1e2d40)
  scene.add(gridHelper)
}
