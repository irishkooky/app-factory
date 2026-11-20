export type PhraseCard = {
  jp: string
  romaji: string
  en: string
}

export const PHRASES: Record<string, PhraseCard> = {
  tip: { jp: 'チップはいりません', romaji: 'Chippu wa irimasen', en: 'No tip. A nod is enough.' },
  cash: { jp: 'カード大丈夫ですか', romaji: 'Kaado daijoubu desu ka', en: 'Is a card all right?' },
  shoes: { jp: '靴を脱ぎます', romaji: 'Kutsu o nugimasu', en: 'I will take my shoes off.' },
  bow: { jp: 'ありがとうございます', romaji: 'Arigatou gozaimasu', en: 'Thank you.' },
  bump: { jp: 'すみません', romaji: 'Sumimasen', en: 'Excuse me. Sorry.' },
  'walk-eat': { jp: 'ここで食べます', romaji: 'Koko de tabemasu', en: 'I will eat here, not walking.' },
  photos: { jp: '写真いいですか', romaji: 'Shashin ii desu ka', en: 'May I take a photo?' },
  shrine: { jp: '参拝します', romaji: 'Sanpai shimasu', en: 'I will pay my respects quietly.' },
  quiet: { jp: 'すみません', romaji: 'Sumimasen', en: 'Excuse me. I will keep my voice down.' },
  'pay-train': { jp: 'タッチします', romaji: 'Tatchi shimasu', en: 'I will tap the card.' },
  escalator: { jp: '左側で止まります', romaji: 'Hidarigawa de tomarimasu', en: 'I will stand on the left.' },
  pass: { jp: '指定席お願いします', romaji: 'Shiteiseki onegaishimasu', en: 'A reserved seat, please.' },
  luggage: { jp: 'このホテルまでお願いします', romaji: 'Kono hoteru made onegaishimasu', en: 'Please send this to the hotel.' },
  veg: {
    jp: '肉も魚も出汁もなしでお願いします',
    romaji: 'Niku mo sakana mo dashimo nashi de onegaishimasu',
    en: 'No meat, no fish, and no fish stock.',
  },
  spice: { jp: '辛めでお願いします', romaji: 'Karaime de onegaishimasu', en: 'A little spicy, please.' },
  konbini: { jp: 'これお願いします', romaji: 'Kore onegaishimasu', en: 'This one, please.' },
  'onsen-how': { jp: '男ですか', romaji: 'Otoko desu ka', en: 'Is this the bath for men?' },
  tattoo: { jp: '貸し切りお願いします', romaji: 'Kashikiri onegaishimasu', en: 'A private bath, please.' },
  safe: { jp: '大丈夫です', romaji: 'Daijoubu desu', en: 'I am all right.' },
  quake: { jp: '大丈夫です', romaji: 'Daijoubu desu', en: 'I am all right.' },
  trash: { jp: 'ゴミ箱はどこですか', romaji: 'Gomibako wa doko desu ka', en: 'Where is a rubbish bin?' },
  english: { jp: 'これお願いします', romaji: 'Kore onegaishimasu', en: 'This one, please.' },
  heat: { jp: '水ください', romaji: 'Mizu kudasai', en: 'Water, please.' },
}

export function phraseFor(id: string): PhraseCard {
  return (
    PHRASES[id] ?? {
      jp: 'すみません',
      romaji: 'Sumimasen',
      en: 'Excuse me.',
    }
  )
}
