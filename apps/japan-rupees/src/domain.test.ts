import { quoteTrip } from './domain.ts'

function check(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
  }
}

const classic = quoteTrip({
  days: 7,
  style: 'mid',
  cities: ['tokyo', 'kyoto', 'osaka'],
  returnToTokyo: false,
})
if (!classic.ok) throw new Error('a normal trip should quote')
check('classic total', classic.quote.totalInr, 174122)
check('classic nights', classic.quote.nights, 6)
check('tokyo nights', classic.quote.stays.find((stay) => stay.id === 'tokyo')?.nights, 2)
check('kyoto nights', classic.quote.stays.find((stay) => stay.id === 'kyoto')?.nights, 2)
check('osaka nights', classic.quote.stays.find((stay) => stay.id === 'osaka')?.nights, 2)
check('classic tickets', classic.quote.rail.ticketsJpy, 14750)
check('classic pass loses', classic.quote.rail.passWins, false)
check('classic charged', classic.quote.rail.chargedJpy, 14750)
check('lines sum', classic.quote.lines.reduce((sum, line) => sum + line.inr, 0), classic.quote.totalInr)
if (!classic.quote.assumptions.some((line) => line.includes('2026-11-13') && line.includes('58.94'))) {
  throw new Error('the quote should show the FX rate and its date')
}
if (!classic.quote.veg.some((line) => line.includes('dashimo nashi'))) {
  throw new Error('the quote should include the vegetarian phrase')
}

const longWay = quoteTrip({
  days: 7,
  style: 'mid',
  cities: ['tokyo', 'kyoto', 'hiroshima', 'fukuoka'],
  returnToTokyo: true,
})
if (!longWay.ok) throw new Error('the long route should quote')
check('long tickets', longWay.quote.rail.ticketsJpy, 58530)
check('long pass wins', longWay.quote.rail.passWins, true)
check('long charged', longWay.quote.rail.chargedJpy, 50000)
check('rail line uses the pass', longWay.quote.lines.find((line) => line.id === 'rail')?.jpy, 50000)

const hakone = quoteTrip({
  days: 5,
  style: 'budget',
  cities: ['tokyo', 'hakone'],
  returnToTokyo: false,
})
if (!hakone.ok) throw new Error('Hakone should quote')
check('hakone tickets', hakone.quote.rail.ticketsJpy, 6400)
check('hakone pass stays off', hakone.quote.rail.passWins, false)

const short = quoteTrip({
  days: 3,
  style: 'mid',
  cities: ['tokyo', 'kyoto', 'osaka'],
  returnToTokyo: false,
})
if (!short.ok) throw new Error('a short trip should quote')
check('osaka becomes a day trip', short.quote.stays.find((stay) => stay.id === 'osaka')?.dayTrip, true)
check('day trip fare', short.quote.rail.ticketsJpy, 15330)

check('no city', quoteTrip({ days: 7, style: 'mid', cities: [], returnToTokyo: false }).ok, false)
check('too short', quoteTrip({ days: 2, style: 'mid', cities: ['tokyo'], returnToTokyo: false }).ok, false)

console.log('japan-rupees domain ok')
