#!/usr/bin/env node
/* ============================================================================
   annotate-steps.mjs — 실습 스크린샷에 번호 콜아웃(박스/핀) + 라벨을 구워 넣는다.
   입력:  images/steps.recipe.json  (capture-steps.mjs가 자동 생성하거나 손으로 작성)
   출력:  images/<out>.png          (슬라이드에서 <figure class="shot"><img src="./images/<out>.png">)

   recipe.json 형식:
   [
     {
       "in": "_raw/gemini-home.png",        // 원본(크롭 전) 경로, images/ 기준
       "out": "gemini-home.png",            // 결과 파일명, images/ 에 저장
       "title": "Gemini 접속",              // 좌상단 제목 칩 (hideTitle:true면 생략)
       "hideTitle": false,
       "compactLabels": true,               // true면 번호 배지만, false면 라벨 칩까지
       "cropTop": 0, "cropBottom": 0,       // 잘라낼 상/하 픽셀(원본 기준)
       "targetWidth": 1600,                 // 결과 가로 px
       "redact": [[x,y,w,h], ...],          // 가릴 영역(개인정보)
       "callouts": [
         ["1", x, y, w, h, "프롬프트 입력창"],          // box 모드: 요소를 사각형으로 감싸고 번호
         ["2", bx, by, tx, ty, "삽입 버튼", "pin"]      // pin 모드: (bx,by)에 번호, (tx,ty)로 선 연결
       ]
     }
   ]
   좌표는 모두 "크롭 전 원본" 픽셀 기준. capture-steps.mjs가 DOM boundingBox로 자동 채운다.
   ============================================================================ */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const imgDir = path.join(root, 'images')
const recipePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(imgDir, 'steps.recipe.json')

// 색은 스크린샷 위에 항상 잘 보이도록 고정(테마 무관). 파랑 계열 + 번호 흰색.
const C = { stroke: '#2563EB', badge: '#2563EB', pinLine: '#60A5FA', pinRing: '#0F172A', label: '#1D4ED8', titleBg: '#0F172A', redact: '#111827' }

function svgOverlay({ width, height, recipe, scale }) {
  const offsetY = recipe.cropTop ?? 0
  const sx = (v) => v * scale
  const sy = (v) => Math.max(0, v - offsetY) * scale

  const redactions = (recipe.redact ?? [])
    .map(([x, y, w, h]) => `<rect x="${sx(x)}" y="${sy(y)}" width="${w * scale}" height="${h * scale}" rx="10" fill="${C.redact}" opacity="0.92"/>`)
    .join('')

  const callouts = (recipe.callouts ?? [])
    .map(([n, x, y, w, h, label = '', mode = 'box']) => {
      if (mode === 'pin') {
        const bx = sx(x), by = sy(y), tx = sx(w), ty = sy(h)
        const endX = bx + (tx - bx) * 0.82, endY = by + (ty - by) * 0.82
        return `
          <line x1="${bx}" y1="${by}" x2="${endX}" y2="${endY}" stroke="${C.pinLine}" stroke-width="4" stroke-linecap="round" opacity="0.95"/>
          <circle cx="${tx}" cy="${ty}" r="9" fill="${C.pinRing}" stroke="${C.pinLine}" stroke-width="4"/>
          <circle cx="${bx}" cy="${by}" r="17" fill="${C.badge}"/>
          <text x="${bx}" y="${by + 9}" text-anchor="middle" font-size="24" font-weight="800" fill="#fff" font-family="Arial, sans-serif">${n}</text>`
      }
      const rx = sx(x), ry = sy(y), rw = w * scale, rh = h * scale
      const badge = 40
      const bxc = Math.min(Math.max(rx + 8, badge / 2 + 2), width - badge / 2 - 2)
      const byc = Math.min(Math.max(ry + 8, badge / 2 + 2), height - badge / 2 - 2)
      const labelY = ry < 70 ? 84 : Math.max(8, ry - 28)
      const labelMarkup = (recipe.compactLabels || !label) ? '' : `
        <rect x="${rx + 40}" y="${labelY}" width="${Math.max(150, label.length * 21)}" height="42" rx="21" fill="${C.label}"/>
        <text x="${rx + 58}" y="${labelY + 28}" font-size="22" font-weight="700" fill="#fff" font-family="Arial, sans-serif">${escapeXml(label)}</text>`
      return `
        <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="14" fill="none" stroke="${C.stroke}" stroke-width="6"/>
        <circle cx="${bxc}" cy="${byc}" r="${badge / 2}" fill="${C.badge}"/>
        <text x="${bxc}" y="${byc + 10}" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="Arial, sans-serif">${n}</text>
        ${labelMarkup}`
    })
    .join('')

  const titleMarkup = (recipe.hideTitle || !recipe.title) ? '' : `
      <rect x="22" y="22" width="${Math.min(width - 44, recipe.title.length * 26 + 52)}" height="52" rx="26" fill="${C.titleBg}" opacity="0.86"/>
      <text x="50" y="56" font-size="27" font-weight="800" fill="#fff" font-family="Arial, sans-serif">${escapeXml(recipe.title)}</text>`

  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${redactions}${titleMarkup}${callouts}</svg>`,
  )
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
}

const recipes = JSON.parse(await fs.readFile(recipePath, 'utf8'))
let done = 0
for (const recipe of recipes) {
  const input = path.resolve(imgDir, recipe.in)
  const output = path.join(imgDir, recipe.out)
  const meta = await sharp(input).metadata()
  const cropTop = recipe.cropTop ?? 0
  const cropBottom = recipe.cropBottom ?? 0
  const crop = { left: 0, top: cropTop, width: meta.width, height: meta.height - cropTop - cropBottom }
  const targetWidth = recipe.targetWidth ?? 1600
  const scale = targetWidth / crop.width
  const targetHeight = Math.round(crop.height * scale)

  await sharp(input)
    .extract(crop)
    .resize(targetWidth)
    .composite([{ input: svgOverlay({ width: targetWidth, height: targetHeight, recipe, scale }), left: 0, top: 0 }])
    .png({ quality: 92 })
    .toFile(output)
  console.log(`annotated → images/${recipe.out}  (${recipe.callouts?.length || 0} callouts)`)
  done++
}
console.log(`done: ${done} screenshot(s)`)
