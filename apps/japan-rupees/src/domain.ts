export const FX = {
  inrPer100Jpy: 58.94,
  asOf: '2026-11-13',
  source: 'RBI reference rate',
} as const

export type Style = 'budget' | 'mid' | 'comfort'

export type CityId = 'tokyo' | 'hakone' | 'kyoto' | 'nara' | 'osaka' | 'hiroshima' | 'fukuoka'

export type TripInput = {
  days: number
  style: Style
  cities: readonly CityId[]
  returnToTokyo: boolean
}

export type MoneyLine = {
  id: string
  label: string
  jpy: number | null
  inr: number
  note: string
}

export type Stay = {
  id: CityId
  label: string
  nights: number
  dayTrip: boolean
}

export type TripQuote = {
  nights: number
  stays: Stay[]
  lines: MoneyLine[]
  totalInr: number
  rail: {
    ticketsJpy: number
    passJpy: number
    passLabel: string
    passWins: boolean
    chargedJpy: number
  }
  assumptions: string[]
  veg: string[]
}

export type TripResult = { ok: true; quote: TripQuote } | { ok: false; reason: string }

const MAIN = ['tokyo', 'kyoto', 'osaka', 'hiroshima', 'fukuoka'] as const
type MainCity = (typeof MAIN)[number]

const NIGHT_PRIORITY: readonly CityId[] = ['tokyo', 'kyoto', 'osaka', 'hiroshima', 'fukuoka', 'hakone', 'nara']

export const CITY_LABEL: Record<CityId, string> = {
  tokyo: 'Tokyo',
  hakone: 'Hakone',
  kyoto: 'Kyoto',
  nara: 'Nara',
  osaka: 'Osaka',
  hiroshima: 'Hiroshima',
  fukuoka: 'Fukuoka',
}

const STAY: Record<CityId, Record<Style, number>> = {
  tokyo: { budget: 5500, mid: 12000, comfort: 28000 },
  hakone: { budget: 7000, mid: 14000, comfort: 36000 },
  kyoto: { budget: 5000, mid: 11000, comfort: 26000 },
  nara: { budget: 4500, mid: 9000, comfort: 22000 },
  osaka: { budget: 4500, mid: 9000, comfort: 22000 },
  hiroshima: { budget: 4500, mid: 9000, comfort: 20000 },
  fukuoka: { budget: 4500, mid: 9000, comfort: 20000 },
}

const FOOD: Record<Style, number> = { budget: 3500, mid: 6000, comfort: 12000 }
const LOCAL: Record<Style, number> = { budget: 800, mid: 1200, comfort: 1800 }
const FLIGHT_INR: Record<Style, number> = { budget: 70000, mid: 98000, comfort: 160000 }

const FARE: Record<string, number> = {
  'tokyo|kyoto': 14170,
  'tokyo|osaka': 14720,
  'tokyo|hiroshima': 18580,
  'tokyo|fukuoka': 23390,
  'kyoto|osaka': 580,
  'kyoto|hiroshima': 11860,
  'kyoto|fukuoka': 17520,
  'osaka|hiroshima': 10540,
  'osaka|fukuoka': 15720,
  'hiroshima|fukuoka': 9110,
}

const HAKONE_ONE_WAY = 3200
const NARA_FROM_KYOTO = 720
const NARA_FROM_OSAKA = 820

const VEG = [
  'Say this: Niku mo sakana mo dashimo nashi de onegaishimasu. No meat, no fish, and no fish stock.',
  'Miso soup and noodle broth are usually fish. A photo of vegetables does not mean the dish is vegetarian.',
  'In Kyoto, shojin ryori is temple food and the reliable vegetarian meal.',
  'At a convenience store, read the label. Edamame, fruit, and some inari are safer than onigiri.',
  'Nishi-Kasai in Tokyo has many Indian restaurants. CoCo Ichibanya can make a vegetable curry if you ask for no meat.',
  'Eggs and dairy show up in a lot of otherwise vegetarian food. For a stricter diet, add tamago mo gyunyu mo nashi.',
]

export function inrFromJpy(jpy: number): number {
  return Math.round((jpy * FX.inrPer100Jpy) / 100)
}

function fare(from: MainCity, to: MainCity): number {
  if (from === to) return 0
  return FARE[`${from}|${to}`] ?? FARE[`${to}|${from}`] ?? 0
}

function passFor(days: number): { jpy: number; label: string } {
  if (days <= 7) return { jpy: 50000, label: '7-day ordinary pass, official web price' }
  if (days <= 14) return { jpy: 80000, label: '14-day ordinary pass, official web price' }
  return { jpy: 100000, label: '21-day ordinary pass, official web price' }
}

function allocate(cities: readonly CityId[], nights: number): Record<CityId, number> {
  const counts = {
    tokyo: 0, hakone: 0, kyoto: 0, nara: 0, osaka: 0, hiroshima: 0, fukuoka: 0,
  }
  const order = NIGHT_PRIORITY.filter((id) => cities.includes(id))
  let remaining = nights
  for (const id of order) {
    if (remaining <= 0) break
    counts[id] = 1
    remaining -= 1
  }
  const housed = order.filter((id) => counts[id] > 0)
  let index = 0
  while (remaining > 0 && housed.length > 0) {
    const id = housed[index % housed.length]
    if (id) counts[id] += 1
    remaining -= 1
    index += 1
  }
  return counts
}

export function quoteTrip(input: TripInput): TripResult {
  if (!Number.isInteger(input.days) || input.days < 3 || input.days > 18) {
    return { ok: false, reason: 'Choose between 3 and 18 days.' }
  }
  const cities = [...new Set(input.cities)]
  if (cities.length === 0) return { ok: false, reason: 'Pick at least one city.' }
  const nights = input.days - 1
  const counts = allocate(cities, nights)
  const housedMain = MAIN.filter((id) => cities.includes(id) && counts[id] > 0)
  const dayMain = MAIN.filter((id) => cities.includes(id) && counts[id] === 0)

  let jrJpy = 0
  for (let index = 0; index < housedMain.length - 1; index += 1) {
    const from = housedMain[index]
    const to = housedMain[index + 1]
    if (from && to) jrJpy += fare(from, to)
  }
  for (const id of dayMain) {
    const base = [...housedMain].reverse().find((city) => MAIN.indexOf(city) < MAIN.indexOf(id)) ?? housedMain[0]
    if (base) jrJpy += fare(base, id) * 2
  }
  if (input.returnToTokyo) {
    const last = housedMain[housedMain.length - 1]
    if (last && last !== 'tokyo') jrJpy += fare(last, 'tokyo')
  }

  const hakoneJpy = cities.includes('hakone') ? HAKONE_ONE_WAY * 2 : 0
  if (cities.includes('nara')) {
    jrJpy += (cities.includes('kyoto') ? NARA_FROM_KYOTO : NARA_FROM_OSAKA) * 2
  }

  const pass = passFor(input.days)
  const ticketsJpy = jrJpy + hakoneJpy
  const passBundle = pass.jpy + hakoneJpy
  const passWins = jrJpy > 0 && passBundle < ticketsJpy
  const chargedJpy = passWins ? passBundle : ticketsJpy

  const lodgingJpy = cities.reduce((sum, id) => sum + STAY[id][input.style] * counts[id], 0)
  const foodJpy = FOOD[input.style] * input.days
  const localJpy = LOCAL[input.style] * input.days

  const lines: MoneyLine[] = [
    {
      id: 'flights',
      label: 'Flights from Bengaluru',
      jpy: null,
      inr: FLIGHT_INR[input.style],
      note: 'Round trip, one adult. Budget and mid are economy. Comfort is a roomier cabin.',
    },
    {
      id: 'stay',
      label: 'Places to sleep',
      jpy: lodgingJpy,
      inr: inrFromJpy(lodgingJpy),
      note: `${nights} nights, one person, one room.`,
    },
    {
      id: 'food',
      label: 'Food',
      jpy: foodJpy,
      inr: inrFromJpy(foodJpy),
      note: 'Vegetarian meals. The budget line is higher than a meat-eater convenience-store diet.',
    },
    {
      id: 'local',
      label: 'Local trains and buses',
      jpy: localJpy,
      inr: inrFromJpy(localJpy),
      note: 'IC card taps inside each city.',
    },
    {
      id: 'rail',
      label: passWins ? 'Japan Rail Pass' : 'Intercity trains',
      jpy: chargedJpy,
      inr: inrFromJpy(chargedJpy),
      note: passWins
        ? hakoneJpy > 0
          ? `${pass.label}. The Hakone ride stays extra, because Odakyu is not on the pass.`
          : pass.label
        : 'Point-to-point tickets. Cheaper than a rail pass on this route.',
    },
  ]

  const stays: Stay[] = NIGHT_PRIORITY.filter((id) => cities.includes(id)).map((id) => ({
    id,
    label: CITY_LABEL[id],
    nights: counts[id],
    dayTrip: counts[id] === 0,
  }))

  const assumptions = [
    'These are estimates for one adult, not a fare quote.',
    `The exchange rate is ₹${FX.inrPer100Jpy} per ¥100, the ${FX.source} dated ${FX.asOf}.`,
    `A ${input.days}-day trip means ${nights} nights. You fly on the first day and the last day.`,
    'Flights are Bengaluru to Tokyo and back. Budget uses ₹70,000, near the low end of November 2026 published ranges, and a bag may cost extra. Mid uses ₹98,000, near Japan Airlines economy snapshots that month. Comfort uses ₹160,000 as a planning number for a roomier seat.',
    'A 7-day ordinary Japan Rail Pass is ¥50,000 on the official website. A 14-day pass is ¥80,000. A 21-day pass is ¥100,000. An overseas agent charges more. The pass does not include Nozomi or Mizuho without an extra ticket.',
    'Tokyo to Kyoto, reserved ordinary, regular season, is ¥14,170. Other train figures are planning fares.',
    'Budget lodging is a hostel or capsule. Mid is a business hotel. Comfort is a nicer hotel, and a ryokan night in Hakone.',
    'Flying home from Osaka or Fukuoka is often a similar airfare. Turn on the train back to Tokyo only if you will actually ride it.',
  ]

  return {
    ok: true,
    quote: {
      nights,
      stays,
      lines,
      totalInr: lines.reduce((sum, line) => sum + line.inr, 0),
      rail: {
        ticketsJpy,
        passJpy: pass.jpy,
        passLabel: pass.label,
        passWins,
        chargedJpy,
      },
      assumptions,
      veg: VEG,
    },
  }
}
