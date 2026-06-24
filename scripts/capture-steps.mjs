#!/usr/bin/env node
/* ============================================================================
   capture-steps.mjs — 실습 화면을 캡처하고 클릭/입력 대상의 bbox를 DOM에서 자동 추출.
   → images/_raw/<id>.png  +  images/steps.recipe.json  생성 → 이어서 `pnpm annotate`.

   설정: steps.config.mjs (steps.config.example.mjs 복사). 형식:
   export default {
     // 로그인 상태가 필요하면 실제 Chrome을 원격 디버깅으로 띄워 연결:
     //   (mac) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     //          --remote-debugging-port=9222 --user-data-dir="$HOME/.cdp-chrome"
     cdp: 'http://127.0.0.1:9222',   // launch:true면 무시
     launch: false,                   // 공개 페이지(로그인 불필요)면 true: 자체 chromium 실행
     viewport: { width: 1512, height: 895 },
     shots: [{
       id: 'home', url: 'https://example.com', title: '홈 화면',
       waitMs: 2000, cropTop: 0, cropBottom: 0,
       targets: [
         { label: '검색창', role: 'textbox', name: /검색|search/i, mode: 'box' },
         { label: '제출', css: 'button[type=submit]', mode: 'pin' },
       ],
     }],
   }
   대상 지정: { css } | { role, name } | { text } | { placeholder }.  mode: 'box'(감싸기) | 'pin'(선 연결).
   ============================================================================ */
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-chromium'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const imgDir = path.join(root, 'images')
const rawDir = path.join(imgDir, '_raw')
await fs.mkdir(rawDir, { recursive: true })

const configPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'steps.config.mjs')
const config = (await import(configPath)).default

const browser = config.launch
  ? await chromium.launch()
  : await chromium.connectOverCDP(config.cdp || 'http://127.0.0.1:9222')
const context = config.launch ? await browser.newContext({ viewport: config.viewport || { width: 1512, height: 895 } }) : (browser.contexts()[0] ?? await browser.newContext())

function locator(page, t) {
  if (t.css) return page.locator(t.css).first()
  if (t.role) return page.getByRole(t.role, t.name ? { name: t.name } : {}).first()
  if (t.text) return page.getByText(t.text).first()
  if (t.placeholder) return page.getByPlaceholder(t.placeholder).first()
  throw new Error(`target needs css | role(+name) | text | placeholder: ${JSON.stringify(t)}`)
}

async function pageFor(url) {
  if (config.launch) { const p = await context.newPage(); await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 }); return p }
  // CDP: 같은 호스트의 기존 탭 재사용, 없으면 새 탭
  const host = new URL(url).host
  let p = context.pages().find((pg) => { try { return new URL(pg.url()).host === host } catch { return false } })
  if (!p) p = await context.newPage()
  await p.setViewportSize(config.viewport || { width: 1512, height: 895 })
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  return p
}

const recipe = []
for (const shot of config.shots) {
  const page = await pageFor(shot.url)
  await page.waitForTimeout(shot.waitMs ?? 2000)
  const callouts = []
  let n = 0
  for (const t of shot.targets ?? []) {
    n += 1
    try {
      const loc = locator(page, t)
      await loc.waitFor({ state: 'visible', timeout: 15_000 })
      const b = await loc.boundingBox()
      if (!b) throw new Error('no bbox')
      const x = Math.round(b.x), y = Math.round(b.y), w = Math.round(b.width), h = Math.round(b.height)
      if ((t.mode ?? 'box') === 'pin') {
        const cx = x + Math.round(w / 2), cy = y + Math.round(h / 2)
        const bx = Math.max(34, x - 56), by = cy   // 배지를 요소 왼쪽 바깥에 배치
        callouts.push([String(n), bx, by, cx, cy, t.label ?? '', 'pin'])
      } else {
        callouts.push([String(n), x, y, w, h, t.label ?? '', 'box'])
      }
      console.log(`  [${shot.id}] ${n}. ${t.label ?? ''}  bbox=${x},${y},${w},${h} (${t.mode ?? 'box'})`)
    } catch (e) {
      console.warn(`  [${shot.id}] ${n}. ${t.label ?? ''} — 대상 못 찾음: ${e.message}. 레시피에서 좌표를 손으로 채우세요.`)
      callouts.push([String(n), 40, 40 + n * 60, 200, 44, t.label ?? '(좌표 수정 필요)', t.mode ?? 'box'])
    }
  }
  const raw = path.join(rawDir, `${shot.id}.png`)
  await page.screenshot({ path: raw, fullPage: false })
  recipe.push({
    in: `_raw/${shot.id}.png`, out: `${shot.id}.png`, title: shot.title ?? '',
    hideTitle: shot.hideTitle ?? false, compactLabels: shot.compactLabels ?? true,
    cropTop: shot.cropTop ?? 0, cropBottom: shot.cropBottom ?? 0,
    targetWidth: shot.targetWidth ?? 1600, redact: shot.redact ?? [], callouts,
  })
  console.log(`captured → images/_raw/${shot.id}.png`)
}

await fs.writeFile(path.join(imgDir, 'steps.recipe.json'), JSON.stringify(recipe, null, 2))
await browser.close()
console.log(`\n레시피 작성: images/steps.recipe.json (${recipe.length} shot). 확인 후 → pnpm annotate`)
