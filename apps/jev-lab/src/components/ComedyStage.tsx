import type { CSSProperties } from 'react'
import type { GameState, HallwayState, PartyState } from '../lib/comedy'

const colors = ['#ef826b', '#78b7b4', '#f1c966', '#8b9dc9', '#b59ac0', '#8baf7b']

function Person({ color, facing = 1, awkward = false, coat = false, variant = 0 }: {
  color: string; facing?: number; awkward?: boolean; coat?: boolean; variant?: number
}) {
  return (
    <svg viewBox="0 0 100 140" className="person-illustration" aria-hidden="true">
      <ellipse cx="50" cy="133" rx="33" ry="5" fill="#20243b" opacity=".12" />
      <g stroke="#20243b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M38 106 L34 128 L22 130 M62 106 L66 128 L78 130" fill="none" />
        <path d="M30 72 Q50 62 70 72 L75 110 Q50 118 25 110 Z" fill={coat ? '#74798c' : color} />
        <path d={facing === 1 ? 'M29 78 Q12 91 16 99 M70 78 Q78 90 91 81' : 'M71 78 Q88 91 84 99 M30 78 Q22 90 9 81'} fill="none" />
        <path d={facing === 1 ? 'M88 83 L94 75 M88 82 L98 81' : 'M12 83 L6 75 M12 82 L2 81'} fill="none" strokeWidth="2" />
        <path d="M45 62 L44 74 L51 81 L57 73 L56 62" fill="#f6d6b8" />
        <path d="M23 28 Q25 8 51 10 Q79 12 78 37 L75 51 Q68 70 50 70 Q29 67 24 49 Z" fill="#f6d6b8" />
        {variant % 3 === 0 ? <path d="M23 35 Q17 7 47 7 Q82 4 81 34 Q61 31 54 19 Q45 35 23 35Z" fill="#20243b" />
          : variant % 3 === 1 ? <path d="M22 34 Q19 12 43 8 Q59 -1 72 12 Q84 17 79 35 L66 21 Q46 30 22 34Z" fill="#685447" />
            : <path d="M22 30 Q23 8 49 8 Q77 7 80 31 L66 26 L65 18 L58 27 L40 25 L32 32Z" fill="#20243b" />}
        {awkward ? <><path d="M34 42 L41 44 M60 44 L67 42 M43 57 Q50 52 57 57" fill="none" /><path d="M83 39 Q93 53 85 55 Q78 55 83 39" fill="#a6dadd" strokeWidth="1.5" /></>
          : <><path d="M37 43 L37 47 M63 43 L63 47 M44 56 Q50 61 57 55" fill="none" /></>}
        <path d="M50 43 L48 50 L52 50" fill="none" strokeWidth="1.5" />
        <ellipse cx="31" cy="51" rx="5" ry="2.5" fill="#e99985" stroke="none" />
        <ellipse cx="69" cy="51" rx="5" ry="2.5" fill="#e99985" stroke="none" />
        {coat && <path d="M42 74 L48 97 L38 91 M58 74 L52 97 L62 91 M50 97 L50 112" fill="none" strokeWidth="2" />}
        {variant % 3 === 2 && <><rect x="29" y="39" width="16" height="12" rx="4" fill="none" strokeWidth="2" /><rect x="56" y="39" width="16" height="12" rx="4" fill="none" strokeWidth="2" /><path d="M45 43 L56 43" strokeWidth="2" /></>}
      </g>
    </svg>
  )
}

function Hallway({ state }: { state: HallwayState }) {
  return (
    <div className="hallway-stage">
      <div className="hallway-key"><span>壁側</span><span>3組の気遣いを、同時に観察。</span><span>窓側</span></div>
      {state.pairs.map((pair, pairIndex) => (
        <div key={pair.id} className={`corridor ${pair.actors.every((actor) => actor.passed) ? 'cleared' : ''}`}>
          <span className="corridor-number">{String(pairIndex + 1).padStart(2, '0')}</span>
          <span className="wall-label">壁</span><span className="window-label">窓</span>
          <div className="corridor-wall" /><div className="corridor-window" aria-hidden="true"><i /><i /><i /></div>
          <div className="corridor-centerline" />
          {pair.actors.map((actor, actorIndex) => (
            <div key={actor.id}>
              <div className={`speech-balloon hall-balloon balloon-${actorIndex} ${actor.passed ? 'passed-balloon' : ''}`}>{actor.passed ? '失礼しました〜！' : actor.bubble}</div>
              <div className={`hall-person ${actor.passed ? 'has-passed' : ''}`} style={{ '--actor-x': `${actor.x}%`, '--actor-shift': `${40 - actor.x * .8}px`, '--lane-y': actor.lane === 'wall' ? '49px' : actor.lane === 'window' ? '83px' : '66px' } as CSSProperties}>
                <Person color={colors[pairIndex * 2 + actorIndex]} facing={actor.direction} awkward={pair.awkward > 0 && !actor.passed} variant={pairIndex * 2 + actorIndex} />
                <span className="actor-name">{actor.name}{actor.passed && ' ✓'}</span>
              </div>
            </div>
          ))}
          <div className="corridor-comment" key={`${state.turn}-${pair.id}`}><span>{pair.actors.every((actor) => actor.passed) ? '通れた！' : state.turn === 0 ? ['あっ。', 'どうぞどうぞ。', '目が合った。'][pairIndex] : pair.caption}</span></div>
        </div>
      ))}
    </div>
  )
}

const partyEventText = {
  quiet: { main: '今なら、帰れる…？', friend: 'ふぅ〜。', effect: 'しーん…' },
  dish: { main: '頼んだ料理、今きた。', friend: '熱いうちに！', effect: 'ジュ〜ッ' },
  story: { main: '「最後にひとつだけ」が始まった。', friend: 'で、その時さ〜', effect: 'まだ序章' },
  toast: { main: 'おかわりが、届いてしまった。', friend: 'もう一杯だけ！', effect: 'カンパーイ' },
}

function Party({ state }: { state: PartyState }) {
  const event = partyEventText[state.event]
  return (
    <div className={`party-room event-${state.event} ${state.escaped ? 'escaped' : ''}`}>
      <div className="izakaya-sign">居酒屋 <strong>もう一軒</strong><small>本日も帰りどき不明</small></div>
      <div className="paper-lantern lantern-one" aria-hidden="true">のむ</div><div className="paper-lantern lantern-two" aria-hidden="true">たべる</div>
      <div className="party-event"><span className="event-pin" />{state.escaped ? 'おつかれさまでした！' : event.main}</div>
      <div className="exit-door"><span>出口 →</span><i /><small>おうち</small></div>
      <div className="wall-menu" aria-hidden="true"><span>枝豆</span><span>からあげ</span><span>おかわり</span></div>
      <div className="party-friends">
        {[{ name: '話が長い友人', color: colors[1] }, { name: '注文した友人', color: colors[2] }, { name: 'まだ帰らない友人', color: colors[4] }].map((friend, index) => (
          <div className={`party-friend friend-${index}`} key={friend.name}>
            <div className="speech-balloon friend-balloon">{state.escaped ? ['あれ？', '帰った…', 'またね〜'][index] : index === 0 ? event.friend : index === 1 ? 'これ食べる？' : 'まだ早くない？'}</div>
            <Person color={friend.color} variant={index + 1} facing={index === 2 ? -1 : 1} />
            <span className="friend-name">{friend.name}</span>
          </div>
        ))}
      </div>
      <div className="izakaya-table" aria-hidden="true">
        <div className="table-top"><div className="snack-plate"><i /><i /><i /><i /></div><div className="mug mug-one" /><div className="mug mug-two" /><div className="chopsticks" /><div className="small-plate" /></div>
        <div className="table-leg leg-one" /><div className="table-leg leg-two" />
      </div>
      <div className="party-sfx" key={state.turn}>{state.escaped ? 'スッ…' : event.effect}</div>
      <div className={`party-protagonist ${state.coat ? 'has-coat' : ''} ${state.escaped ? 'went-home' : ''}`}>
        <div className="speech-balloon protagonist-balloon">{state.bubble}</div>
        <Person color={colors[0]} coat={state.coat} awkward={!state.escaped} variant={0} />
        <span className="protagonist-label">本当は、帰りたい人</span>
      </div>
      <div className="party-checklist" aria-label="帰る準備">
        <span className={state.announced ? 'checked' : ''}>{state.announced ? '✓' : '○'} 帰る宣言</span>
        <span className={state.paid ? 'checked' : ''}>{state.paid ? '✓' : '○'} お会計</span>
        <span className={state.coat ? 'checked' : ''}>{state.coat ? '✓' : '○'} 上着</span>
      </div>
    </div>
  )
}

export function ComedyStage({ state, pending }: { state: GameState; pending: boolean }) {
  return (
    <div className={`comedy-stage ${pending ? 'is-thinking' : ''}`}>
      {state.kind === 'hallway' ? <Hallway state={state} /> : <Party state={state} />}
      {state.finished && <div className="ending-ribbon"><span>本日のあるある</span><strong>{state.ending}</strong><small>おつかれさまでした。次は、違う結末になるかも。</small></div>}
    </div>
  )
}
