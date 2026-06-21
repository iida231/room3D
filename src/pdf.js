import { FURNITURE_DEFAULTS } from './objects.js'

export function printFloorPlan(state) {
  const canvas = document.createElement('canvas')
  canvas.width = 794   // A4 portrait at 96dpi
  canvas.height = 1123
  drawPage(canvas.getContext('2d'), canvas.width, canvas.height, state.room, state.objects)

  const url = canvas.toDataURL('image/png')
  const win = window.open('')
  win.document.write(`<!DOCTYPE html><html><head><title>間取り図</title>
    <style>*{margin:0;padding:0}body{background:#fff}img{display:block;width:100%}
    @media print{@page{margin:0;size:A4 portrait}img{width:100%;height:100vh;object-fit:contain}}</style>
    </head><body><img src="${url}">
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
    </body></html>`)
  win.document.close()
}

// ── ページ全体 ─────────────────────────────────────────────────

function drawPage(ctx, pw, ph, room, objects) {
  const mg = 45

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, pw, ph)

  // タイトル
  ctx.fillStyle = '#1a2340'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('Room Planner 3D — 間取り図', mg, mg + 20)

  ctx.fillStyle = '#555'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(new Date().toLocaleDateString('ja-JP'), pw - mg, mg + 20)

  ctx.fillStyle = '#333'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(
    `部屋: 幅 ${room.width} cm × 奥行 ${room.depth} cm × 高さ ${room.height} cm`,
    mg, mg + 44
  )

  // プランエリア（寸法線スペースを確保）
  const dimPad = 52
  const planTop    = mg + 60 + dimPad
  const planLeft   = mg + dimPad
  const planRight  = pw - mg - 20
  const planBottom = ph - mg - 210

  const aW = planRight - planLeft
  const aH = planBottom - planTop
  const scale = Math.min(aW / room.width, aH / room.depth)
  const dW = room.width  * scale
  const dH = room.depth  * scale
  const ox = planLeft + (aW - dW) / 2
  const oy = planTop  + (aH - dH) / 2

  const toC = (x, z) => [
    ox + (x + room.width  / 2) * scale,
    oy + (z + room.depth  / 2) * scale,
  ]

  // 床
  ctx.fillStyle = hexAlpha(room.floorColor, 0.2)
  ctx.fillRect(ox, oy, dW, dH)

  // 壁オブジェクト（窓・ドア）
  objects.filter(o => o.type === 'window' || o.type === 'door').forEach(o => {
    drawWallObj(ctx, o, room, scale, ox, oy)
  })

  // 床家具
  objects.filter(o => o.type !== 'window' && o.type !== 'door').forEach(o => {
    drawFloorObj(ctx, o, scale, toC)
  })

  // 部屋アウトライン（最前面）
  ctx.strokeStyle = '#1a2340'
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeRect(ox, oy, dW, dH)

  // 部屋寸法線
  roomDims(ctx, room, ox, oy, dW, dH)

  // スケールバー
  scaleBar(ctx, scale, ox + dW, oy + dH + dimPad - 10)

  // 凡例
  legend(ctx, objects, mg, ph - mg - 200, pw - 2 * mg)
}

// ── 床家具（上面） ─────────────────────────────────────────────

function drawFloorObj(ctx, obj, scale, toC) {
  const { w, d, h, x, z, rot, color, type } = obj
  const [cx, cy] = toC(x, z)
  const wPx = w * scale
  const dPx = d * scale
  const rotRad = ((rot ?? 0) * Math.PI) / 180
  const def = FURNITURE_DEFAULTS[type]

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-rotRad)

  ctx.fillStyle = hexAlpha(color, 0.55)
  ctx.fillRect(-wPx / 2, -dPx / 2, wPx, dPx)
  ctx.strokeStyle = darken(color)
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  ctx.strokeRect(-wPx / 2, -dPx / 2, wPx, dPx)

  if (wPx > 18 && dPx > 12) {
    const nameSize = clamp(Math.min(wPx, dPx) / 5, 7, 11)
    ctx.fillStyle = '#111'
    ctx.font = `bold ${nameSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(def?.label ?? type, 0, -nameSize * 0.6)

    const dimSize = clamp(Math.min(wPx, dPx) / 6, 6, 9)
    ctx.font = `${dimSize}px sans-serif`
    ctx.fillStyle = '#333'
    ctx.fillText(`${w}×${d}×${h}`, 0, nameSize * 0.8)
  }

  ctx.restore()
}

// ── 壁オブジェクト（窓・ドア） ────────────────────────────────

function drawWallObj(ctx, obj, room, scale, ox, oy) {
  const { w, wallOffset, wall, color, type } = obj
  const wPx = w * scale
  const thick = Math.max(6, scale * 4)
  const ofsPx = (wallOffset ?? 0) * scale
  const cx0 = ox + (room.width / 2) * scale
  const cy0 = oy + (room.depth / 2) * scale
  const dW = room.width  * scale
  const dH = room.depth  * scale

  let rx, ry, rw, rh
  switch (wall) {
    case 'north': rx = cx0 + ofsPx - wPx / 2; ry = oy - thick / 2;       rw = wPx;  rh = thick; break
    case 'south': rx = cx0 + ofsPx - wPx / 2; ry = oy + dH - thick / 2;  rw = wPx;  rh = thick; break
    case 'east':  rx = ox + dW - thick / 2;    ry = cy0 + ofsPx - wPx / 2; rw = thick; rh = wPx;  break
    case 'west':  rx = ox - thick / 2;         ry = cy0 + ofsPx - wPx / 2; rw = thick; rh = wPx;  break
    default: return
  }

  ctx.fillStyle = hexAlpha(color, 0.85)
  ctx.fillRect(rx, ry, rw, rh)
  ctx.strokeStyle = darken(color)
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.strokeRect(rx, ry, rw, rh)

  const def = FURNITURE_DEFAULTS[type]
  if (Math.max(rw, rh) > 20) {
    ctx.fillStyle = '#111'
    ctx.font = '8px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(def?.label ?? type, rx + rw / 2, ry + rh / 2)
  }
}

// ── 部屋寸法線 ────────────────────────────────────────────────

function roomDims(ctx, room, ox, oy, dW, dH) {
  const pad = 36
  dimLine(ctx, ox, oy - pad,  ox + dW, oy - pad,  `幅  ${room.width} cm`, false)
  dimLine(ctx, ox - pad, oy,  ox - pad, oy + dH,  `奥行  ${room.depth} cm`, true)
}

function dimLine(ctx, x1, y1, x2, y2, label, vertical) {
  ctx.strokeStyle = '#3355aa'
  ctx.fillStyle   = '#3355aa'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])

  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.setLineDash([])

  endTick(ctx, x1, y1, vertical)
  endTick(ctx, x2, y2, vertical)

  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  if (vertical) {
    ctx.save()
    ctx.translate(mx, my)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(label, 0, -9)
    ctx.restore()
  } else {
    ctx.fillText(label, mx, my - 9)
  }
}

function endTick(ctx, x, y, vertical) {
  const len = 6
  ctx.beginPath()
  if (vertical) { ctx.moveTo(x - len, y); ctx.lineTo(x + len, y) }
  else           { ctx.moveTo(x, y - len); ctx.lineTo(x, y + len) }
  ctx.stroke()
}

// ── スケールバー ──────────────────────────────────────────────

function scaleBar(ctx, scale, rightX, y) {
  const barLen = 100 * scale  // 100cm
  const x1 = rightX - barLen
  ctx.strokeStyle = '#333'
  ctx.fillStyle   = '#333'
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(rightX, y); ctx.stroke()
  endTick(ctx, x1, y, false)
  endTick(ctx, rightX, y, false)
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('100 cm', x1 + barLen / 2, y + 5)
}

// ── 凡例 ────────────────────────────────────────────────────

function legend(ctx, objects, x, y, w) {
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke()

  ctx.fillStyle = '#1a2340'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('配置済み家具', x, y + 20)

  if (objects.length === 0) return

  const cols = 3
  const colW = w / cols
  const rowH = 28
  const startY = y + 36

  objects.forEach((obj, i) => {
    const def = FURNITURE_DEFAULTS[obj.type]
    if (!def) return
    const col = i % cols
    const row = Math.floor(i / cols)
    const lx = x + col * colW
    const ly = startY + row * rowH

    // カラースウォッチ
    ctx.fillStyle = obj.color
    ctx.fillRect(lx, ly, 14, 14)
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 0.5
    ctx.strokeRect(lx, ly, 14, 14)

    // 名前と寸法
    ctx.fillStyle = '#111'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${def.icon} ${def.label} #${obj.id}`, lx + 18, ly)

    ctx.font = '10px sans-serif'
    ctx.fillStyle = '#444'
    const dims = (obj.type === 'window' || obj.type === 'door')
      ? `W${obj.w} × H${obj.h} cm`
      : `W${obj.w} × D${obj.d} × H${obj.h} cm`
    ctx.fillText(dims, lx + 18, ly + 13)
  })
}

// ── ユーティリティ ────────────────────────────────────────────

function hexAlpha(hex, alpha) {
  if (!hex || hex.length < 7) return `rgba(150,150,150,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function darken(hex) {
  if (!hex || hex.length < 7) return '#555'
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 50)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 50)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 50)
  return `rgb(${r},${g},${b})`
}

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)) }
