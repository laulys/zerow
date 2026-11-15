// Record one loop of a stage as an H.264 video, frame by frame.
//
//   node scripts/record.mjs "<url>/?capture=<example>" --out demo.mp4
//        [--from <mark>] [--lead 800] [--fps 60] [--scale 2] [--bg "#0e0e10"]
//        [--crf 16] [--max 40] [--frames <dir>]
//
// The page runs on the kit's virtual clock (kit/clock.ts), installed before
// any of its code loads: time moves only when this script steps it, by
// exactly 1/fps, and every timer, animation frame and CSS transition moves
// with it. Each frame is shot after its step, so the video is the same on
// every render and nothing drops or doubles, however slow the screenshots.
//
//   --from   the first act.mark() of the loop (the one the script sets
//            earliest). The loop is the stretch between two of its arrivals.
//   --lead   ms between the loop's start and that mark, so the video opens on
//            the loop's first frame, not on the mark.
//   --bg     page color behind the stage's rounded corners.
//
// Needs playwright-core, esbuild (both already here through vite) and ffmpeg.

import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { launch } from './browser.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const url = argv.find((a) => !a.startsWith('--'))
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
if (!url) {
  console.error('usage: node scripts/record.mjs <url> --out demo.mp4 [--from <mark>] [--lead 800] [--fps 60] [--scale 2]')
  process.exit(2)
}
const out = path.resolve(opt('out', 'shots/loop.mp4'))
const fps = Number(opt('fps', 60))
const scale = Number(opt('scale', 2))
const lead = Number(opt('lead', 0))
const from = opt('from', null)
const bg = opt('bg', null)
const crf = String(opt('crf', 16))
const maxSeconds = Number(opt('max', 40))
const framesDir = path.resolve(opt('frames', `${out}.frames`))

// The kit's clock as one script the page can run before anything else
const clock = await build({ entryPoints: [path.join(here, '../kit/clock.ts')], bundle: true, format: 'iife', globalName: '__ssClockLib', write: false, platform: 'browser', target: 'es2020' })
const clockSource = clock.outputFiles[0].text

const browser = await launch()
const context = await browser.newContext({ viewport: { width: 640, height: 960 }, deviceScaleFactor: scale })
const page = await context.newPage()
page.on('pageerror', (e) => console.error(`page error: ${e.message}`))
await page.addInitScript(`${clockSource};__ssClockLib.installVirtualClock({ fps: ${fps} });`)
await page.goto(url, { waitUntil: 'load' })
if (bg) await page.addStyleTag({ content: `html, body, #root, #example { background: ${bg} !important; }` })

const step = () => page.evaluate(() => window.__stageshow.clock.step())
const stage = () => page.evaluate(() => {
  const el = document.querySelector('.ss-stage')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height, mark: el.getAttribute('data-mark') }
})

// Let the example mount and its fonts load before the first frame counts
let box = null
for (let i = 0; i < 600 && !box; i++) {
  await step()
  box = await stage()
}
if (!box) {
  console.error('record: no .ss-stage on the page')
  await browser.close()
  process.exit(1)
}
await page.evaluate(() => document.fonts.ready)

await rm(framesDir, { recursive: true, force: true })
await mkdir(framesDir, { recursive: true })
const name = (i) => path.join(framesDir, `f${String(i).padStart(5, '0')}.png`)

// Shoot every frame from here on, and note where the loop's first mark lands
const arrivals = []
let last = null
let count = 0
const limit = Math.round(maxSeconds * fps)
const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) }
// H.264 with 4:2:0 color needs even pixel dimensions
if ((clip.width * scale) % 2) clip.width -= 1
if ((clip.height * scale) % 2) clip.height -= 1
while (count < limit) {
  await step()
  const now = await stage()
  await writeFile(name(count), await page.screenshot({ clip, type: 'png' }))
  if (now.mark !== last) {
    if (from ? now.mark === from : arrivals.length === 0 || now.mark === arrivals[0].mark) arrivals.push({ mark: now.mark, frame: count })
    last = now.mark
  }
  count++
  if (arrivals.length >= 2) break
  if (count % 120 === 0) console.log(`record: ${count} frames (${(count / fps).toFixed(1)}s), mark ${now.mark ?? 'none'}`)
}
await browser.close()
if (arrivals.length < 2) {
  console.error(`record: the loop's first mark${from ? ` "${from}"` : ''} did not come round twice in ${maxSeconds}s`)
  process.exit(1)
}

const period = arrivals[1].frame - arrivals[0].frame
const start = Math.max(0, arrivals[0].frame - Math.round((lead / 1000) * fps))
console.log(`record: one loop is ${period} frames (${(period / fps).toFixed(2)}s) at ${fps}fps, from frame ${start}; ${clip.width * scale}x${clip.height * scale}px`)

await mkdir(path.dirname(out), { recursive: true })
const ffmpeg = spawn('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-start_number', String(start), '-i', path.join(framesDir, 'f%05d.png'), '-frames:v', String(period), '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' })
const code = await new Promise((resolve) => ffmpeg.on('close', resolve))
if (code !== 0) {
  console.error('record: ffmpeg failed')
  process.exit(1)
}
if (!argv.includes('--keep')) await rm(framesDir, { recursive: true, force: true })
console.log(`video -> ${out}`)
