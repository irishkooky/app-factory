export function PlaceScene({ name }: { name: string }) {
  if (name.startsWith('Suga')) return <Stairs />
  if (name.startsWith('Hida-Furukawa')) return <Station />
  if (name.startsWith('Hida City')) return <Library />
  if (name.startsWith('Keta')) return <ShrineSteps />
  if (name.startsWith('Tabata')) return <Cliff />
  if (name.startsWith('Kisho')) return <WeatherShrine />
  if (name.startsWith('Hijiri')) return <RiverBridge />
  if (name.startsWith('Shin-Kobe')) return <MountainStation />
  if (name.startsWith('Akashi')) return <Suspension />
  if (name.startsWith('Kamakura')) return <SeaCrossing />
  if (name.startsWith('Enoden')) return <CoastTrain />
  return <LanternGate />
}

const frame = {
  width: '100%',
  height: '100%',
  display: 'block',
} as const

function Stairs() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="The steep stone stairs with red railings at Suga Shrine">
      <defs>
        <linearGradient id="suga-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6c98a" />
          <stop offset="0.45" stopColor="#f3d7b0" />
          <stop offset="1" stopColor="#9eb6d2" />
        </linearGradient>
      </defs>
      <rect width="390" height="760" fill="url(#suga-sky)" />
      <path d="M0 760 L0 210 L78 168 L96 760Z" fill="#c4b29a" />
      <path d="M390 760 L390 210 L312 168 L294 760Z" fill="#b7a48c" />
      <path d="M0 430 L70 392 L78 760 H0Z" fill="#d9c8b2" />
      <path d="M390 430 L320 392 L312 760 H390Z" fill="#cbb89f" />
      <path d="M8 250 h62 v46 H8z" fill="#efe4d4" />
      <path d="M14 246 h50 l-4-14 h-42z" fill="#3a342c" />
      <path d="M16 268 h16 v14 H16z M40 268 h16 v14 H40z" fill="#8fb0cc" />
      <path d="M10 340 h58 v40 H10z" fill="#f4eadc" />
      <path d="M14 336 h50 l-3-12 h-44z" fill="#4a4036" />
      <path d="M18 354 h14 v12 H18z M40 354 h14 v12 H40z" fill="#9ec0dc" />
      <path d="M6 430 h64 v48 H6z" fill="#efe6da" />
      <path d="M10 426 h56 l-3-12 h-50z" fill="#3e362e" />
      <path d="M16 444 h16 v14 H16z M40 444 h16 v14 H40z" fill="#b7d0e4" />
      <path d="M4 530 h70 v56 H4z" fill="#f7f1e8" />
      <path d="M8 526 h62 l-4-14 h-54z" fill="#2f2a24" />
      <path d="M14 546 h18 v16 H14z M42 546 h18 v16 H42z" fill="#8fb4d0" />
      <path d="M0 640 h84 v70 H0z" fill="#efe4d6" />
      <path d="M4 636 h76 l-4-16 h-68z" fill="#3a332c" />
      <path d="M320 248 h62 v44 h-62z" fill="#efe4d4" />
      <path d="M324 244 h54 l4-12 h-46z" fill="#3a342c" />
      <path d="M330 264 h14 v12 h-14z M352 264 h14 v12 h-14z" fill="#8fb0cc" />
      <path d="M318 338 h64 v42 h-64z" fill="#f4eadc" />
      <path d="M322 334 h56 l4-12 h-48z" fill="#4a4036" />
      <path d="M316 432 h68 v50 h-68z" fill="#efe6da" />
      <path d="M320 428 h60 l4-12 h-52z" fill="#3e362e" />
      <path d="M312 534 h74 v58 h-74z" fill="#f7f1e8" />
      <path d="M316 530 h66 l4-14 h-58z" fill="#2f2a24" />
      <path d="M306 648 h84 v72 h-84z" fill="#efe4d6" />
      <path d="M310 644 h76 l4-16 h-68z" fill="#3a332c" />
      <path d="M108 760 L168 118 h54 L282 760Z" fill="#b7aa98" />
      <path d="M124 730 h142 M132 680 h126 M138 630 h114 M144 580 h102 M150 530 h90 M156 480 h78 M162 430 h66 M168 380 h54 M174 330 h42 M180 280 h30 M186 230 h18" stroke="#f3ece2" strokeWidth="11" strokeLinecap="butt" />
      <path d="M102 760 L164 104" stroke="#e23b32" strokeWidth="11" />
      <path d="M288 760 L226 104" stroke="#e23b32" strokeWidth="11" />
      <path d="M118 700 h10 M128 600 h10 M140 500 h10 M152 400 h10 M164 300 h10 M176 210 h10" stroke="#f7f3ec" strokeWidth="5" />
      <path d="M272 700 h10 M262 600 h10 M250 500 h10 M238 400 h10 M226 300 h10 M214 210 h10" stroke="#f7f3ec" strokeWidth="5" />
      <path d="M156 118 h78 l-10-22 h-58z" fill="#c4372f" />
      <path d="M168 96 h54 l-8-16 h-38z" fill="#8d241e" />
      <rect x="186" y="78" width="18" height="10" fill="#f2c14e" />
      <path d="M148 150 h18 v28 h-18z" fill="#d9cfc2" />
      <path d="M224 150 h18 v28 h-18z" fill="#d9cfc2" />
      <circle cx="157" cy="188" r="7" fill="#efe6da" />
      <circle cx="233" cy="188" r="7" fill="#efe6da" />
      <path d="M70 760 c8-40 6-70-8-110" fill="none" stroke="#2f6b40" strokeWidth="8" />
      <circle cx="62" cy="640" r="16" fill="#3d7a45" />
      <circle cx="78" cy="628" r="12" fill="#2f6840" />
    </svg>
  )
}

function Station() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="Hida-Furukawa station and its footbridge">
      <rect width="390" height="760" fill="#d5e6c4" />
      <path d="M0 280 C80 180 140 260 230 190 C300 140 340 180 390 150 V320 H0Z" fill="#7ea15c" />
      <path d="M0 340 C100 280 180 360 280 300 C330 270 360 300 390 280 V400 H0Z" fill="#5e8744" />
      <rect x="70" y="360" width="210" height="150" fill="#d08948" />
      <path d="M52 360 L175 250 L298 360Z" fill="#6b3424" />
      <rect x="148" y="410" width="54" height="100" fill="#241c16" />
      <rect x="92" y="400" width="36" height="28" fill="#f6e4b4" />
      <rect x="222" y="400" width="36" height="28" fill="#f6e4b4" />
      <path d="M20 330 H370" stroke="#8a6842" strokeWidth="14" />
      <path d="M250 330 v90 M310 330 v90" stroke="#4e3828" strokeWidth="8" />
      <rect y="520" width="390" height="240" fill="#6d5a40" />
      <path d="M30 600 H360" stroke="#e4d3ae" strokeWidth="4" />
      <path d="M30 640 H360" stroke="#e4d3ae" strokeWidth="4" />
      <rect x="150" y="560" width="90" height="36" rx="4" fill="#c4372f" />
    </svg>
  )
}

function Library() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="Hida City Library, a low building with a glass front">
      <rect width="390" height="420" fill="#c5d6e8" />
      <rect y="420" width="390" height="340" fill="#e2d2b0" />
      <rect x="28" y="300" width="334" height="250" fill="#f4efe8" />
      <rect x="48" y="330" width="294" height="140" fill="#7eafd4" />
      <path d="M70 390 h28 M110 360 v80 M150 360 v80 M190 360 v80 M230 360 v80 M270 360 v80 M310 360 v80" stroke="#f7f4ee" strokeWidth="6" />
      <rect x="168" y="470" width="54" height="80" fill="#2a3138" />
      <circle cx="70" cy="560" r="36" fill="#3c7a4c" />
      <circle cx="320" cy="570" r="44" fill="#2c6640" />
    </svg>
  )
}

function ShrineSteps() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="Stone steps through cedars at Keta Wakamiya Shrine">
      <rect width="390" height="760" fill="#d7e4c8" />
      <path d="M0 760 C40 200 10 80 0 0 H120 C70 180 50 360 90 760Z" fill="#1e5530" />
      <path d="M390 760 C330 220 360 80 390 0 H270 C330 200 310 380 280 760Z" fill="#163f24" />
      <path d="M155 150 h80 l-10-22 h-60z" fill="#c4372f" />
      <path d="M175 128 h40 l-6-14 h-28z" fill="#8d241e" />
      <path d="M145 700 h100 M150 630 h90 M156 560 h78 M162 490 h66 M168 420 h54 M174 350 h42 M180 280 h30" stroke="#d9cdb8" strokeWidth="14" />
      <circle cx="70" cy="300" r="28" fill="#2f6b40" />
      <circle cx="330" cy="260" r="34" fill="#245c32" />
    </svg>
  )
}

function Cliff() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="Tabata Station above the cliff road">
      <rect width="390" height="360" fill="#b7cce4" />
      <path d="M0 340 H230 L140 760 H0Z" fill="#8d8376" />
      <path d="M230 340 L390 400 V760 H140Z" fill="#6d8aaf" />
      <rect x="150" y="210" width="170" height="130" fill="#efeae2" />
      <path d="M136 210 h198 l-16-28 H152z" fill="#546474" />
      <rect x="176" y="246" width="28" height="22" fill="#9ec4e2" />
      <rect x="220" y="246" width="28" height="22" fill="#9ec4e2" />
      <rect x="264" y="246" width="28" height="22" fill="#9ec4e2" />
      <path d="M20 520 H200" stroke="#e4ddd2" strokeWidth="16" />
      <path d="M30 560 H170" stroke="#cfc6b8" strokeWidth="8" />
    </svg>
  )
}

function WeatherShrine() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="The weather shrine at Koenji Hikawa">
      <rect width="390" height="760" fill="#d7e8f6" />
      <circle cx="280" cy="150" r="54" fill="#f6e27a" />
      <path d="M40 250 h130 a46 46 0 0 0 12-88 58 58 0 0 0-110 26 40 40 0 0 0-32 62z" fill="#f8fbff" />
      <rect x="110" y="360" width="170" height="180" fill="#d08948" />
      <path d="M86 360 h218 l-28-48 H114z" fill="#8d3424" />
      <rect x="172" y="430" width="46" height="110" fill="#241c16" />
      <path d="M70 460 h36 M82 448 v36 M284 460 h36 M296 448 v36" stroke="#ead7a4" strokeWidth="6" />
      <path d="M40 620 H350" stroke="#c9d8c4" strokeWidth="8" />
    </svg>
  )
}

function RiverBridge() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="Hijiribashi over the Kanda River">
      <rect width="390" height="760" fill="#d5e4f2" />
      <path d="M0 300 H390 V760 H0Z" fill="#3d76a6" />
      <path d="M10 300 Q195 80 380 300" fill="none" stroke="#e4ded4" strokeWidth="22" />
      <path d="M30 340 H360" stroke="#4e463c" strokeWidth="10" />
      <rect x="40" y="390" width="110" height="22" rx="4" fill="#e23b34" />
      <rect x="220" y="450" width="120" height="18" rx="4" fill="#f2c14e" />
      <path d="M0 560 H390" stroke="#1c3c58" strokeWidth="14" />
      <path d="M0 620 H390" stroke="#16344e" strokeWidth="8" />
    </svg>
  )
}

function MountainStation() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="Shin-Kobe Station between the mountains">
      <rect width="390" height="760" fill="#c5def2" />
      <path d="M0 520 L110 160 L230 520Z" fill="#3d7a45" />
      <path d="M160 540 L280 80 L390 540Z" fill="#2d6640" />
      <rect x="70" y="430" width="200" height="140" fill="#f2eee8" />
      <path d="M54 430 h232 l-18-32 H72z" fill="#4d6274" />
      <rect x="140" y="480" width="56" height="90" fill="#24303a" />
      <path d="M0 570 H390 V760 H0Z" fill="#d9d3c8" />
    </svg>
  )
}

function Suspension() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="Akashi Kaikyo Bridge">
      <rect width="390" height="380" fill="#b7d4ee" />
      <rect y="380" width="390" height="380" fill="#2c6e9a" />
      <path d="M48 400 V180 M342 400 V180" stroke="#e7eef3" strokeWidth="12" />
      <path d="M48 200 Q195 360 342 200" fill="none" stroke="#f4f7fa" strokeWidth="4" />
      <path d="M48 210 Q195 340 342 210" fill="none" stroke="#f4f7fa" strokeWidth="2" />
      <rect x="16" y="392" width="358" height="16" fill="#d5dee6" />
      <path d="M48 210 v190 M342 210 v190" stroke="#e7eef3" strokeWidth="1" />
    </svg>
  )
}

function SeaCrossing() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="The Enoden crossing at Kamakurakokomae, sea beyond the tracks">
      <rect width="390" height="120" fill="#d5eef8" />
      <rect y="120" width="390" height="250" fill="#4f9ec8" />
      <path d="M230 250c28-70 90-96 150-70 8 40 4 70-6 90H248c-8-8-16-14-18-20z" fill="#6d9454" />
      <path d="M300 196c10-16 22-16 28-4" fill="none" stroke="#e7f3e4" strokeWidth="4" />
      <rect y="360" width="390" height="400" fill="#e7d3ae" />
      <path d="M0 392 H390 M0 430 H390" stroke="#4e463c" strokeWidth="7" />
      <path d="M0 16 H390" stroke="none" />
      <path d="M8 348 h250 a16 16 0 0 1 16 16 v40 a16 16 0 0 1-16 16 H8z" fill="#f4efe4" />
      <path d="M250 356 h28 v52 h-12 l-16-26z" fill="#f4efe4" />
      <rect x="8" y="378" width="258" height="16" fill="#2c8a48" />
      <rect x="28" y="360" width="26" height="16" fill="#8ec4e2" />
      <rect x="64" y="360" width="26" height="16" fill="#8ec4e2" />
      <rect x="100" y="360" width="26" height="16" fill="#8ec4e2" />
      <rect x="136" y="360" width="26" height="16" fill="#8ec4e2" />
      <rect x="172" y="360" width="26" height="16" fill="#8ec4e2" />
      <rect x="208" y="360" width="26" height="16" fill="#8ec4e2" />
      <path d="M300 330 v120" stroke="#8d3a32" strokeWidth="8" />
      <path d="M300 348 H210" stroke="#f7f4ee" strokeWidth="10" />
      <path d="M214 348 h16 M234 348 h16 M254 348 h16 M274 348 h16" stroke="#c4372f" strokeWidth="10" />
      <circle cx="36" cy="408" r="7" fill="#2a2622" />
      <circle cx="92" cy="408" r="7" fill="#2a2622" />
      <circle cx="148" cy="408" r="7" fill="#2a2622" />
      <circle cx="204" cy="408" r="7" fill="#2a2622" />
    </svg>
  )
}

function CoastTrain() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="The Enoden along the Shonan coast, Enoshima on the horizon">
      <rect width="390" height="280" fill="#cfe8f6" />
      <rect y="280" width="390" height="150" fill="#4e98c4" />
      <path d="M230 360 q60-70 140-20 v50 H230Z" fill="#7d9a55" />
      <rect y="430" width="390" height="330" fill="#e7d3ae" />
      <path d="M0 520 H390" stroke="#5c5348" strokeWidth="6" />
      <rect x="24" y="470" width="140" height="46" rx="8" fill="#f4ecdf" />
      <rect x="24" y="488" width="140" height="10" fill="#2f8f4e" />
      <rect x="40" y="476" width="18" height="12" fill="#9fd0ea" />
      <rect x="66" y="476" width="18" height="12" fill="#9fd0ea" />
    </svg>
  )
}

function LanternGate() {
  return (
    <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" style={frame} role="img" aria-label="The great red lantern under Kaminarimon">
      <rect width="390" height="760" fill="#161c28" />
      <path d="M24 160 H366 V210 H24Z" fill="#6b3424" />
      <path d="M36 140 H354 V164 H36Z" fill="#8d4030" />
      <path d="M70 210 V640 M320 210 V640" stroke="#4a2820" strokeWidth="22" />
      <ellipse cx="195" cy="390" rx="92" ry="120" fill="#d23a32" />
      <rect x="118" y="372" width="154" height="28" fill="#141414" />
      <path d="M168 210 v70 M222 210 v70" stroke="#e2b15a" strokeWidth="4" />
      <path d="M40 600 H150 M240 600 H350" stroke="#8d5a3c" strokeWidth="10" />
      <path d="M0 680 H390" stroke="#2a241c" strokeWidth="40" />
    </svg>
  )
}
