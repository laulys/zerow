import { ArrowUp, Check as Tick, ChevronDown, Keyboard as KeyboardGlyph, Mic, Undo2, X } from 'lucide-react'
import { Stage, Phone, Thread, Bubble, Check, Collapse, Roll, Text, type Act } from '../../kit'
import './zerow.css'

// Zerow, an expense-splitting app for iOS: the «Nuevo gasto» conversation.
// You tell Zerow what you paid, it asks what is missing, then it answers with
// a draft of the expense on the brand gradient. The draft does not count
// until you say so: «Sí, sumarlo» is tapped and the card confirms on itself.
//
// Started from examples/messages (a phone, the kit's Thread and Bubble, a
// composer whose words are typed and sent, a touch instead of a cursor), with
// the card arriving in the thread the way examples/ai-cards opens its cards.
//
// What is Zerow's and not Messages':
// - The conversation starts at the top, under the header, and grows down; a
//   short history never hangs from the composer with a void above it.
// - Bubbles are plain pills with no tails; yours are lime, Zerow's are a
//   lifted graphite, each of Zerow's turns under its orb and name.
// - Lime belongs to the person: their bubbles, the mic, the check. The one
//   thing on the gradient is the expense still to review.
// - The whole phone shows, because the story starts in the composer at its
//   foot and is read under the header at its top.
//
// The loop: the conversation leaves in one reverse stagger while the header
// and the composer stay, and the empty state (Zerow's own examples) returns.
//
// Real strings: the title, the group, both sides of the conversation, the
// draft's status, title, amount and split with its two actions, the placeholder. The examples of
// the empty state are filler: words at realistic fidelity, bars below it.

const NBSP = ' '
const M1 = 'Pagué el tranvía de todos'
const Z1 = '¿Cuánto fue?'
const M2 = '12 euros'
const Z2 = `Así quedas: te deberán 45,23${NBSP}€ en vez de 36,23${NBSP}€.`
const EXAMPLES = ['«Cena 80 euros, pagó Ana, entre todos»', '«Taxi 45 dólares para Luis y para mí»']

type Turn = 'no' | 'typing' | 'said'
type S = {
  draft: string
  focus: boolean
  m1: boolean
  z1: Turn
  m2: boolean
  z2: Turn
  card: boolean
  saved: boolean
  /** The loop's exit: the conversation leaves, the header and composer stay. */
  leaving: boolean
}

const initial: S = { draft: '', focus: false, m1: false, z1: 'no', m2: false, z2: 'no', card: false, saved: false, leaving: false }
// The frame most people see: the expense on screen with its result
const poster: S = { ...initial, m1: true, z1: 'said', m2: true, z2: 'said', card: true, saved: true }

// Where the finger rests between taps, in stage pixels: empty screen above the composer
const REST = { x: 200, y: 610 }

async function script(a: Act<S>) {
  await a.wait(700)
  a.mark('type')
  // Off the placeholder's words, in the field's empty half
  await a.click({ at: 'compose', x: 0.62, y: 0.5 })
  await a.set({ focus: true })
  await a.wait(260)
  await a.type('draft', M1, { interval: 44 })
  await a.wait(320)
  a.mark('send')
  await a.click('send')
  await a.set({ m1: true, draft: '' })
  await a.wait(600)
  a.mark('asks')
  await a.set({ z1: 'typing' })
  await a.wait(800)
  await a.set({ z1: 'said' })
  await a.wait(750)
  a.mark('answer')
  await a.type('draft', M2, { interval: 75 })
  await a.wait(320)
  await a.click('send')
  await a.set({ m2: true, draft: '', focus: false })
  await a.wait(600)
  a.mark('balance')
  await a.set({ z2: 'typing' })
  await a.wait(900)
  await a.set({ z2: 'said' })
  await a.wait(550)
  a.mark('card')
  await a.set({ card: true })
  await a.wait(1500)
  a.mark('yes')
  // On the button's empty end, clear of its label
  await a.click({ at: 'yes', x: 0.92, y: 0.7 })
  await a.set({ saved: true })
  a.mark('saved')
  await a.wait(2500)
  a.mark('exit')
  await a.set({ leaving: true })
  await a.wait(720)
  // Hidden now: put the conversation back unseen, then let the empty state return
  await a.snap({ ...initial, leaving: true })
  await a.set({ leaving: false })
  // The finger is long gone; the touch shows nothing between taps
  await a.move(REST)
  await a.wait(150)
}

// Zerow's face: a sphere of dots, front ones lime and back ones ink. The
// app's own construction (a golden-angle spiral, tilted), held still.
const ORB = (() => {
  const size = 18
  const n = 26
  const dot = size * 0.12
  const R = size / 2 - dot
  const golden = Math.PI * (3 - Math.sqrt(5))
  const ang = 0.6 * 0.06 * Math.PI * 2
  const tilt = 0.45
  const [ca, sa, ct, st] = [Math.cos(ang), Math.sin(ang), Math.cos(tilt), Math.sin(tilt)]
  return Array.from({ length: n }, (_, i) => {
    const py = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - py * py)
    const px = Math.cos(golden * i) * r
    const pz = Math.sin(golden * i) * r
    const x = px * ca - pz * sa
    const z = px * sa + pz * ca
    const y = py * ct - z * st
    const depth = (py * st + z * ct + 1) / 2
    const front = depth > 0.55
    return { cx: size / 2 + x * R, cy: size / 2 + y * R, r: (dot * (0.5 + 0.7 * depth)) / 2, front, alpha: front ? 0.35 + 0.65 * depth : 0.45 + 0.55 * depth, depth }
  }).sort((p, q) => p.depth - q.depth)
})()

function Orb() {
  return (
    <svg className="zg-orb" viewBox="0 0 18 18" width="18" height="18" aria-hidden>
      {ORB.map((d, i) => (
        <circle key={i} cx={d.cx.toFixed(2)} cy={d.cy.toFixed(2)} r={d.r.toFixed(2)} className={d.front ? 'zg-orb__front' : 'zg-orb__back'} opacity={d.alpha.toFixed(2)} />
      ))}
    </svg>
  )
}

/** Who is talking: Zerow's orb and its name above each of its messages. */
function Speaker({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="zg-speaker" style={style}>
      <Orb />
      <span>Zerow</span>
    </div>
  )
}

/** A message's words at the app's body size, inside the kit's bubble. */
function Msg({ children }: { children: string }) {
  return <span className="zg-msg">{children}</span>
}

// The order things leave in at the end of the loop, last arrival first
const out = (n: number) => ({ ['--zg-out' as string]: n }) as React.CSSProperties

export default function ZerowGasto() {
  return (
    <Stage<S>
      width={400}
      height={775}
      initial={initial}
      poster={poster}
      script={script}
      theme="dark"
      fidelity="realistic"
      cursor={{ at: REST, style: 'touch' }}
      className="zg"
    >
      {(s) => {
        const chat = s.m1 || s.leaving
        return (
          <>
            <div className="zg-wash" />
            <Phone width={340} dark className="zg-phone">
              <header className="zg-head">
                <span className="zg-close">
                  <X size={20} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
                </span>
                <div className="zg-head__mid">
                  <div className="zg-title">Nuevo gasto</div>
                  <span className="zg-pill">
                    Lisboa 2026
                    <ChevronDown size={16} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
                  </span>
                </div>
                <span className="zg-head__end" />
              </header>

              <div className="zg-body">
                {/* The empty state: what the loop opens on and returns to */}
                <div className="zg-empty" data-hide={chat || undefined}>
                  <Text filler className="zg-hint" style={{ fontSize: 15 }}>
                    Escribe qué pagaste, cuánto y para quién.
                  </Text>
                  <Text filler className="zg-eg" style={{ fontSize: 13 }}>
                    Por ejemplo
                  </Text>
                  {EXAMPLES.map((ex) => (
                    <span key={ex} className="zg-chip">
                      <Text filler style={{ fontSize: 15 }}>
                        {ex}
                      </Text>
                    </span>
                  ))}
                </div>

                <Thread className={`zg-thread${s.leaving ? ' zg-leaving' : ''}`}>
                  {s.m1 && (
                    <Bubble from="me" tail={false} source="draft" style={out(6)}>
                      <Msg>{M1}</Msg>
                    </Bubble>
                  )}
                  {s.z1 !== 'no' && <Speaker style={out(5)} />}
                  {s.z1 !== 'no' && (
                    <Bubble from="them" tail={false} typing={s.z1 === 'typing'} style={out(4)}>
                      <Msg>{Z1}</Msg>
                    </Bubble>
                  )}
                  {s.m2 && (
                    <Bubble from="me" tail={false} source="draft" style={out(3)}>
                      <Msg>{M2}</Msg>
                    </Bubble>
                  )}
                  {s.z2 !== 'no' && <Speaker style={out(2)} />}
                  {s.z2 !== 'no' && (
                    <Bubble from="them" tail={false} typing={s.z2 === 'typing'} style={out(1)}>
                      <Msg>{Z2}</Msg>
                    </Bubble>
                  )}
                  <Collapse open={s.card} reveal="drop" className="zg-arrive" style={out(0)}>
                    <div className="zg-card" data-saved={s.saved || undefined}>
                      <div className="zg-status">
                        <Check on={s.saved} size={16} />
                        <Roll>{s.saved ? 'Sumado' : 'Por revisar · aún no cuenta'}</Roll>
                      </div>
                      <div className="zg-what">
                        <span className="zg-name">Tranvía 28</span>
                        <span className="zg-amount">
                          12
                          <span className="zg-cents">,00{NBSP}€</span>
                        </span>
                      </div>
                      <div className="zg-split">
                        Pagaste tú · 3,00{NBSP}€ cada uno, entre 4
                      </div>
                      {/* The two buttons give way to one quiet line; the card closes up around it */}
                      <div className="zg-foot">
                        <Collapse open={!s.saved}>
                          <div className="zg-actions">
                            <span className="zg-btn zg-btn--soft">No es así</span>
                            <span className="zg-btn zg-btn--dark" data-target="yes">
                              <Tick size={20} strokeWidth={2} absoluteStrokeWidth aria-hidden />
                              Sí, sumarlo
                            </span>
                          </div>
                        </Collapse>
                        <Collapse open={s.saved}>
                          <span className="zg-undo">
                            <Undo2 size={16} strokeWidth={2} absoluteStrokeWidth aria-hidden />
                            Deshacer
                          </span>
                        </Collapse>
                      </div>
                    </div>
                  </Collapse>
                </Thread>
              </div>

              <div className="zg-bar" data-target="compose">
                <span className="zg-input">
                  <span className="zg-draft" data-target="draft" data-typing data-has={s.draft ? '' : undefined}>
                    {s.draft}
                    {s.focus && <i className="zg-caret" data-snap />}
                  </span>
                  <span className="zg-ph" data-hide={s.draft ? '' : undefined}>
                    Cuéntame un gasto…
                  </span>
                </span>
                <span className="zg-keys" data-hide={s.draft ? '' : undefined}>
                  <KeyboardGlyph size={24} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
                </span>
                {/* The lime disc is one object: its mic turns into the send arrow while there are words */}
                <span className="zg-mic" data-target="send" data-send={s.draft ? '' : undefined}>
                  <Mic className="zg-mic__mic" size={24} strokeWidth={2} absoluteStrokeWidth aria-hidden />
                  <ArrowUp className="zg-mic__send" size={22} strokeWidth={2.4} absoluteStrokeWidth aria-hidden />
                </span>
              </div>
            </Phone>
          </>
        )
      }}
    </Stage>
  )
}
