#!/usr/bin/env node
/* ============================================================================
   visual-qa.mjs — 슬라이드별 라이트/다크 캡처 + 레이아웃·길찾기·밀도 감사.
   출력: .omx/qa/{light,dark}-NN.png  +  .omx/qa/report.json  +  콘솔 요약.
   캡처 이미지는 반드시 "직접 눈으로" 확인한다 — DOM 감사는 일부만 잡는다.
   옵션: --slides N (앞 N장만), --width/--height
   ============================================================================ */
import fs from 'node:fs/promises'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-chromium'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const outDir = path.join(root, '.omx', 'qa')
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d }
const maxSlides = arg('slides') ? Number(arg('slides')) : null
const vw = Number(arg('width', 1280)), vh = Number(arg('height', 720))

const getFreePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) }) })
const port = await getFreePort()
const base = `http://localhost:${port}`
const server = spawn('pnpm', ['exec', 'slidev', 'slides.md', '--port', String(port), '--log', 'warn'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
server.stderr.on('data', (c) => process.stderr.write(c))

const up = async () => { for (let i = 0; i < 120; i++) { try { if ((await fetch(base + '/1')).ok) return true } catch {} await new Promise((r) => setTimeout(r, 500)) } return false }
if (!(await up())) { server.kill(); console.error('slidev 서버 기동 실패'); process.exit(1) }

await fs.rm(outDir, { recursive: true, force: true })
await fs.mkdir(outDir, { recursive: true })

// 브라우저 컨텍스트 안에서 실행되는 감사 함수
const audit = () => {
  const overlay = document.querySelector('vite-error-overlay') ? 'VITE-ERROR-OVERLAY' : null
  const layouts = [...document.querySelectorAll('.slidev-layout')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 10 && r.height > 10 })
  const layout = layouts.at(-1)
  if (!layout) return { error: 'no layout', overlay }
  const lr = layout.getBoundingClientRect()
  const issues = []
  for (const el of layout.querySelectorAll('*')) {
    if (['PATH', 'DEFS', 'SYMBOL', 'G', 'SVG'].includes(el.tagName.toUpperCase())) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const outBottom = Math.round(r.bottom - lr.bottom)
    const outRight = Math.round(r.right - lr.right)
    if (outBottom > 2 || outRight > 2) issues.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), text: (el.innerText || '').slice(0, 30), outBottom, outRight })
  }
  // 길찾기/밀도 휴리스틱
  const cls = String(layout.className)
  const isCoverish = /\b(cover|divider)\b/.test(cls)
  const crumbEl = layout.querySelector('.crumbs, .eyebrow')
  const textLen = (layout.innerText || '').replace(/\s+/g, '').length
  const flags = []
  if (!isCoverish && !crumbEl) flags.push('길찾기 없음(.crumbs/.eyebrow 누락)')
  if (textLen > 360) flags.push(`밀도 높음(본문 ${textLen}자) — 한눈에 볼 한 가지로 분할/compact 검토`)
  if (crumbEl && /\bM\d|모듈\s*\d|module\s*\d/i.test(crumbEl.innerText || '')) flags.push('브레드크럼에 모듈 코드(M1 등) — 수강생이 읽는 평범한 구간명으로')
  const calloutCount = layout.querySelectorAll('.callout, .note').length
  if (calloutCount >= 2) flags.push(`callout/note ${calloutCount}개 — 참고/인용 전용, 슬라이드당 0~1개로`)
  if (/🛑|🚫|❌/.test(layout.innerText || '')) flags.push('경보·금지 이모지 — 텍스트 색/절제된 이모지(✅·⚠️)로 대체')
  return { htmlClass: document.documentElement.className, overlay, issues: issues.slice(0, 8), flags }
}

const browser = await chromium.launch()
const report = {}
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, colorScheme: scheme })
  await page.goto(base + '/#/1', { waitUntil: 'networkidle' })
  const total = await page.evaluate(() => window.__slidev__.nav.total)
  report.total = total
  report[scheme] = {}
  const n1 = maxSlides ? Math.min(maxSlides, total) : total
  for (let n = 1; n <= n1; n++) {
    await page.evaluate((x) => window.__slidev__.nav.go(x), n)
    await page.waitForFunction((x) => window.__slidev__?.nav?.currentPage === x, n, { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(420)
    await page.screenshot({ path: path.join(outDir, `${scheme}-${String(n).padStart(2, '0')}.png`) })
    report[scheme][n] = await page.evaluate(audit)
  }
  await page.close()
}
await browser.close()
server.kill()

await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))

// 콘솔 요약
let overflow = 0, overlays = 0, flagged = 0
for (const scheme of ['light', 'dark']) {
  for (const [n, r] of Object.entries(report[scheme] || {})) {
    if (r.overlay) { overlays++; console.log(`❌ [${scheme} ${n}] ${r.overlay} — 마크다운 import/이미지 경로 에러`) }
    if (r.issues?.length) { overflow++; console.log(`⚠️  [${scheme} ${n}] overflow`, JSON.stringify(r.issues)) }
    if (r.flags?.length) { flagged++; console.log(`•  [${scheme} ${n}] ${r.flags.join(' / ')}`) }
  }
}
const htmlClassDark = report.dark?.[1]?.htmlClass
console.log(`\n총 ${report.total}장 | dark 에뮬레이션 htmlClass="${htmlClassDark}" (라이트 테마면 'light'여야 함)`)
console.log(`오버레이 에러 ${overlays} · overflow ${overflow} · 휴리스틱 플래그 ${flagged}`)
console.log(`캡처: ${path.relative(root, outDir)}/  — 반드시 직접 눈으로 확인`)
