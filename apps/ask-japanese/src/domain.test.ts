import { filterAnswers } from './domain.ts'

function check(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
  }
}

const tipping = filterAnswers('tip', 'all')
if (!tipping.some((answer) => answer.id === 'tip')) throw new Error('a search for tip should find the tipping answer')
if (tipping.some((answer) => answer.topic === 'onsen')) throw new Error('tip should not return an onsen answer')

const onsen = filterAnswers('', 'onsen')
check('onsen count', onsen.length, 2)
if (onsen.some((answer) => answer.topic !== 'onsen')) throw new Error('the onsen filter should stay on onsen')

const phrase = filterAnswers('dashimo', 'food')
check('phrase', phrase.length, 1)
check('phrase id', phrase[0]?.id, 'veg')

const blank = filterAnswers('zzzz-not-a-thing', 'all')
check('no match', blank.length, 0)

console.log('ask-japanese domain ok')
