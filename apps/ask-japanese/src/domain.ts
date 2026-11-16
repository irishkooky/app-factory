export type TopicId = 'money' | 'manners' | 'trains' | 'food' | 'onsen' | 'safety'

export type Answer = {
  id: string
  topic: TopicId
  question: string
  answer: string
  say: string
}

export const TOPICS: { id: TopicId; label: string }[] = [
  { id: 'money', label: 'Money' },
  { id: 'manners', label: 'Manners' },
  { id: 'trains', label: 'Trains' },
  { id: 'food', label: 'Food' },
  { id: 'onsen', label: 'Onsen' },
  { id: 'safety', label: 'Safety' },
]

export const ANSWERS: readonly Answer[] = [
  {
    id: 'tip',
    topic: 'money',
    question: 'Do I tip?',
    answer: 'No. A tip on the table can confuse the person who finds it. The price on the menu is the price. A small nod is the thanks.',
    say: 'Arigato gozaimasu. That is enough.',
  },
  {
    id: 'cash',
    topic: 'money',
    question: 'Cash or card?',
    answer: 'Cards and phone payments work in cities, stations, and chain shops. Shrines, small restaurants, lockers, and market stalls still want cash. Keep one ¥10,000 note and a pocket of coins.',
    say: 'Card daijobu desu ka? You are asking if a card is all right.',
  },
  {
    id: 'shoes',
    topic: 'manners',
    question: 'When do shoes come off?',
    answer: 'At homes, ryokan, many restaurants with tatami, and some temple halls. Look for the step up and a shelf of shoes. Slippers in the hall stay out of the toilet. The toilet has its own pair.',
    say: 'You do not need a phrase. Watch what the person ahead of you does.',
  },
  {
    id: 'bow',
    topic: 'manners',
    question: 'Do I bow?',
    answer: 'A small nod is plenty from a visitor. You do not need a deep bow. If someone offers a handshake, take it. Do not do both at full size at once or you will bump heads.',
    say: 'A nod plus arigato gozaimasu covers a shop, a station gate, and a new person.',
  },
  {
    id: 'bump',
    topic: 'manners',
    question: 'What do I say when I bump someone?',
    answer: 'Sumimasen covers sorry, excuse me, and the start of a question. Use it on trains, in doors, and when you need a waiter.',
    say: 'Sumimasen.',
  },
  {
    id: 'walk-eat',
    topic: 'manners',
    question: 'Can I eat while I walk?',
    answer: 'People mostly do not. Step to the side of the street, or sit, then eat. Festivals are the exception, because the street is the dining room.',
    say: 'No phrase needed. Find a ledge.',
  },
  {
    id: 'photos',
    topic: 'manners',
    question: 'Where can I take photos?',
    answer: 'Streets and views are fine. Ask before you photograph a person. At a shrine, skip the close-up of someone praying. At the Slam Dunk crossing, stay off the tracks.',
    say: 'Shashin ii desu ka? That asks if a photo is all right.',
  },
  {
    id: 'shrine',
    topic: 'manners',
    question: 'Shrine or temple, what do I do?',
    answer: 'A shrine has a torii gate and is Shinto. Bow twice, clap twice, bow once. A temple is Buddhist, often with a big roof and incense. Bow once, and do not clap. Both are free to walk into unless a sign names a fee.',
    say: 'You can stay quiet and copy the person in front of you.',
  },
  {
    id: 'quiet',
    topic: 'trains',
    question: 'How quiet is a train?',
    answer: 'Phone calls are rude. Texting is fine. On a short city train, skip the hot meal. A shinkansen is looser about a quiet bento, and still not the place for a call.',
    say: 'If the phone rings, decline it. Sumimasen if you have to push past.',
  },
  {
    id: 'pay-train',
    topic: 'trains',
    question: 'How do I pay for the train?',
    answer: 'Add a Suica or Pasmo card in your phone wallet, or buy an IC card at the airport station. Tap in and tap out. The same card pays convenience stores.',
    say: 'The tap is the whole interaction. You do not show the card to a person.',
  },
  {
    id: 'escalator',
    topic: 'trains',
    question: 'Which side of the escalator?',
    answer: 'In Tokyo, stand on the left and walk on the right. In Osaka, stand on the right. When you are unsure, stand where the still people are standing.',
    say: 'No phrase. Match the city you are in.',
  },
  {
    id: 'pass',
    topic: 'trains',
    question: 'Is a JR Pass worth it?',
    answer: 'Often no, if the trip is Tokyo and Kyoto only. It starts to make sense when you add Hiroshima or a ride back across the country inside 7 days. The trip-in-rupees app on this phone does the comparison for a specific route. Nozomi and Mizuho need an extra ticket even with the pass.',
    say: 'Buy the pass on the official site if the numbers say so. A ticket window can still reserve the seat.',
  },
  {
    id: 'luggage',
    topic: 'trains',
    question: 'What do I do with a suitcase?',
    answer: 'Send it. Yamato and other takkyubin desks, including many convenience stores, will move a bag to the next hotel for around ¥2,000 and a day. Coin lockers at big stations hold a bag for the afternoon. A rush-hour train and a large suitcase is the miserable combination to avoid.',
    say: 'Hotel made onegaishimasu, while pointing at the address of the next hotel.',
  },
  {
    id: 'veg',
    topic: 'food',
    question: 'Can I eat vegetarian?',
    answer: 'Yes, if you say so in a full sentence. Fish stock is in miso soup, noodle broth, and plenty of dishes that look like vegetables. Shojin ryori in Kyoto is the meal that was built for this. Nishi-Kasai in Tokyo has many Indian restaurants.',
    say: 'Niku mo sakana mo dashimo nashi de onegaishimasu.',
  },
  {
    id: 'spice',
    topic: 'food',
    question: 'Will the food be spicy?',
    answer: 'Japanese food is mild. Asking for spicy helps a little and will not match home. An Indian or Nepali restaurant will. Convenience-store snacks are a safe snack when you can read the label or the photo.',
    say: 'Karaime de onegaishimasu asks for spicier. Expect less heat than you asked for.',
  },
  {
    id: 'konbini',
    topic: 'food',
    question: 'What is a convenience store for?',
    answer: 'It is the infrastructure. Meals, ATMs that take foreign cards, umbrellas, a clean shirt, tickets, and a bathroom. 7-Eleven, Lawson, and FamilyMart are the names. The rubbish bin is often inside, which matters because the street has almost none.',
    say: 'Kore onegaishimasu, while pointing. That orders the thing under your finger.',
  },
  {
    id: 'onsen-how',
    topic: 'onsen',
    question: 'How does an onsen work?',
    answer: 'You wash before you soak. Sit on the small stool, soap, rinse, then enter the bath with nothing on. The small towel stays out of the water, usually folded on your head or on the side. Most baths are split by gender. The curtains say 男 for men and 女 for women.',
    say: 'If you cannot read the curtain, follow the line of people who match you, or ask Otoko desu ka?',
  },
  {
    id: 'tattoo',
    topic: 'onsen',
    question: 'I have a tattoo. Can I still go?',
    answer: 'Many public baths still say no, even to a small tattoo. Ask at the desk, or book a private bath, called kashikiri. A private bath is the easy version and you still get the hot water.',
    say: 'Kashikiri, onegaishimasu. You are asking for the private bath.',
  },
  {
    id: 'safe',
    topic: 'safety',
    question: 'Is it safe to walk at night?',
    answer: 'Street crime is low, and walking at night in a city is normal. Solo women travelers generally find the trains calm. Still watch your drink in a nightlife district, and do not leave a bag on the back of a chair.',
    say: 'You will not need a phrase for this. The ordinary caution you already have is the right amount.',
  },
  {
    id: 'quake',
    topic: 'safety',
    question: 'What do I do in an earthquake?',
    answer: 'Drop, cover, and hold. Stay under a table until the shaking stops. Do not run for the stairs during the shake. After it, follow the hotel map. The room card shows the evacuation floor. Trains stop on purpose and then start again.',
    say: 'No phrase in the moment. Afterward, daijobu desu means you are all right.',
  },
  {
    id: 'trash',
    topic: 'safety',
    question: 'Where are the rubbish bins?',
    answer: 'Almost nowhere on the street. Carry a small bag until you are back at a convenience store or the hotel. This is why a pocket tissue and a plastic bag are part of getting dressed in the morning.',
    say: 'You can ask a convenience store clerk with a point and sumimasen.',
  },
  {
    id: 'english',
    topic: 'manners',
    question: 'Will anyone speak English?',
    answer: 'Station signs in cities are bilingual. Restaurant staff may not speak English, and the photo menu still works. Point, smile, and say the phrase. People are used to visitors and will try.',
    say: 'Kore onegaishimasu, with your finger on the picture.',
  },
  {
    id: 'heat',
    topic: 'safety',
    question: 'How hot is summer?',
    answer: 'June to September is humid in a way the forecast number does not capture. A small towel, water from a convenience store, and shade are the system. Temple gardens have less shade than you expect.',
    say: 'Mizu kudasai asks for water.',
  },
]

export function filterAnswers(query: string, topic: TopicId | 'all'): Answer[] {
  const needle = query.trim().toLowerCase()
  return ANSWERS.filter((answer) => {
    if (topic !== 'all' && answer.topic !== topic) return false
    if (!needle) return true
    const haystack = `${answer.question} ${answer.answer} ${answer.say}`.toLowerCase()
    return haystack.includes(needle)
  })
}
