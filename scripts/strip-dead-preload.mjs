#!/usr/bin/env node
// Slidev가 index.html에 주입하는 <link rel="preload">는 마크다운의 원본 상대 경로를
// 그대로 쓰는데, 실제 이미지는 해시된 경로로 번들되므로 프리로드가 404가 된다.
// 빌드 후 dist의 html에서 ./images/ 를 가리키는 죽은 프리로드를 제거한다.
// 사용: node scripts/strip-dead-preload.mjs [distDir=dist]
import fs from 'node:fs/promises'
import path from 'node:path'

const distName = process.argv[2] || 'dist'
const dist = path.resolve(new URL('..', import.meta.url).pathname, distName)
for (const file of ['index.html', '404.html']) {
  const p = path.join(dist, file)
  let html
  try { html = await fs.readFile(p, 'utf8') } catch { continue }
  const cleaned = html.replace(/<link rel="preload" as="image" href="[^"]*\/\.\/images\/[^"]*">/g, '')
  if (cleaned !== html) {
    await fs.writeFile(p, cleaned)
    console.log(`stripped dead preload from ${distName}/${file}`)
  }
}
