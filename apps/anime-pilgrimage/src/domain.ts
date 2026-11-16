export type Spot = {
  name: string
  area: string
  why: string
  access: string
  manners: string
  mapsQuery: string
}

export type Anime = {
  id: string
  title: string
  year: number
  blurb: string
  route: string
  spots: Spot[]
}

export const ANIME: readonly Anime[] = [
  {
    id: 'your-name',
    title: 'Your Name',
    year: 2016,
    blurb: 'Itomori is fictional. These four places are the ones fans and the towns themselves point to.',
    route: 'Do the Tokyo stairs in half a day. The three Hida stops are one walk from Hida-Furukawa Station. Reach that station from Nagoya on the Limited Express Hida.',
    spots: [
      {
        name: 'Suga Shrine stairs',
        area: 'Yotsuya, Tokyo',
        why: 'The red-railed Otokozaka stairs are the model for the staircase in the last scene.',
        access: 'About 7 minutes on foot from Yotsuya-sanchome Station on the Tokyo Metro Marunouchi Line. Address 5 Sugacho, Shinjuku.',
        manners: 'This is a home street. Leave the stairs clear for people who live here, and bow once at the shrine if you walk up.',
        mapsQuery: 'Suga Shrine Yotsuya Tokyo',
      },
      {
        name: 'Hida-Furukawa Station',
        area: 'Hida, Gifu',
        why: 'The station, the footbridge, and the bus rotary are the model for Taki arriving in search of Itomori.',
        access: 'JR Takayama Line, about 15 minutes from Takayama. From Tokyo, take the shinkansen to Nagoya and then the Limited Express Hida.',
        manners: 'Stand clear of the rotary. Trains line up the way they do in the film only at one time of day, and the timetable changes.',
        mapsQuery: 'JR Hida-Furukawa Station',
      },
      {
        name: 'Hida City Library',
        area: 'Hida, Gifu',
        why: 'The library is the model for the room where Taki searches for the town.',
        access: 'About 5 minutes on foot from Hida-Furukawa Station, 2-22 Honmachi, Furukawa-cho.',
        manners: 'Closed on Mondays. Ask the staff before you take a photo inside.',
        mapsQuery: 'Hida City Library Furukawa',
      },
      {
        name: 'Keta Wakamiya Shrine',
        area: 'Hida, Gifu',
        why: 'The stone steps are the model for the scene where Taki asks around the shrine.',
        access: 'About 14 minutes on foot from Hida-Furukawa Station.',
        manners: 'It is a working shrine. The Furukawa Festival is 19 and 20 April if you want the drums, not the film set.',
        mapsQuery: 'Keta Wakamiya Shrine Hida',
      },
    ],
  },
  {
    id: 'weathering',
    title: 'Weathering With You',
    year: 2019,
    blurb: 'The famous rooftop building was demolished. These two stops are the ones a public source actually names.',
    route: 'Start at Tabata, then ride to Shinjuku and change to the Chuo Line for Koenji. Half a day, all inside Tokyo.',
    spots: [
      {
        name: 'Tabata Station, south exit',
        area: 'Kita, Tokyo',
        why: 'Kita City Central Library says the cliff road outside the south exit is the setting of an important scene. The flat nearby is a home, so it is not on this list.',
        access: 'JR Yamanote or Keihin-Tohoku to Tabata. Use the south exit and look at the road along the cliff.',
        manners: 'Do not hunt for the apartment. People live on that street.',
        mapsQuery: 'Tabata Station South Exit Tokyo',
      },
      {
        name: 'Kisho Shrine at Koenji Hikawa',
        area: 'Koenji, Tokyo',
        why: 'The weather shrine of Japan, inside Koenji Hikawa Shrine. The JR East Chuo Line guide says it appears in the film.',
        access: 'About 2 minutes from JR Koenji Station, 4-44-19 Koenji-Minami, Suginami. On weekends the Chuo Rapid skips Koenji, so take the local train.',
        manners: 'Gates close around 17:00. Do not photograph prayer plaques up close. They belong to other people.',
        mapsQuery: 'Koenji Hikawa Shrine Kisho Shrine',
      },
    ],
  },
  {
    id: 'suzume',
    title: 'Suzume',
    year: 2022,
    blurb: 'The hometown in Kyushu is a fictional town. The bridge, the station, and the bridge to Kobe are the clear real shots.',
    route: 'Ochanomizu is a Tokyo half day. Shin-Kobe to Maiko is a short JR ride. The shinkansen from Tokyo to Shin-Kobe is about 3 hours.',
    spots: [
      {
        name: 'Hijiribashi',
        area: 'Ochanomizu, Tokyo',
        why: 'The Japan National Tourism Organization notes that this view of the bridges and Ochanomizu Station appears in the film.',
        access: 'JR Ochanomizu Station, Hijiribashi exit. The bridge is over the Kanda River.',
        manners: 'Stay on the sidewalk. The view is the point, not a climb onto the railing.',
        mapsQuery: 'Hijiribashi Ochanomizu',
      },
      {
        name: 'Shin-Kobe Station',
        area: 'Kobe',
        why: 'Suzume boards the shinkansen here on the way to Tokyo.',
        access: 'The shinkansen station itself. You do not need to leave the concourse to see the shot.',
        manners: 'The platforms are a working railway. Stay behind the line.',
        mapsQuery: 'Shin-Kobe Station',
      },
      {
        name: 'Akashi Kaikyo Bridge',
        area: 'Maiko, Kobe',
        why: 'The bridge she crosses by car into Kobe.',
        access: 'JR Maiko Station on the Sanyo line, then the Maiko Marine Promenade if you want to walk out over the water. The promenade charges admission.',
        manners: 'The best free view is from the Maiko side. Do not stop a car on the bridge.',
        mapsQuery: 'Akashi Kaikyo Bridge Maiko Marine Promenade',
      },
    ],
  },
  {
    id: 'slam-dunk',
    title: 'Slam Dunk',
    year: 1993,
    blurb: 'Shohoku High is fictional. The crossing by the sea is the one location that is simply true.',
    route: 'A day trip from Tokyo. JR to Kamakura, or Odakyu to Fujisawa, then the Enoden. See the crossing, ride toward Enoshima, and ride back.',
    spots: [
      {
        name: 'Kamakurakokomae Crossing No. 1',
        area: 'Koshigoe, Kamakura',
        why: 'The level crossing in the anime opening. Sea on the far side, Enoden train, green and cream.',
        access: 'Enoden Kamakurakokomae Station. From Kamakura Station it is about 20 minutes and about ¥260. The crossing is a two-minute walk.',
        manners: 'Do not stand on the road, the crossing, or the tracks. Kamakura City asks visitors to take photos from the spot by Koshigoe Rakko Park.',
        mapsQuery: 'Kamakurakokomae Station Enoden',
      },
      {
        name: 'Enoden toward Enoshima',
        area: 'Shonan coast',
        why: 'The coast between Koshigoe and Shichirigahama is the scenery around that opening. Enoshima is a few stops toward Fujisawa.',
        access: 'Stay on the same Enoden train. Enoshima Station is the stop for the island.',
        manners: 'The high school up the hill from the crossing is a real school. It is not open to visitors.',
        mapsQuery: 'Enoshima Station Enoden',
      },
    ],
  },
  {
    id: 'demon-slayer',
    title: 'Demon Slayer',
    year: 2019,
    blurb: 'The mountains and the Mugen Train are fiction. The city streets of the first episode are Asakusa.',
    route: 'One morning. Asakusa, then the Sumida river, then leave. Do not pad the day with places the story invented.',
    spots: [
      {
        name: 'Nakamise and Kaminarimon',
        area: 'Asakusa, Tokyo',
        why: 'The Taisho Tokyo that Tanjiro walks, with the lantern street and the temple gate, is drawn from Asakusa.',
        access: 'Tokyo Metro Ginza Line to Asakusa, or the Tobu Skytree line, or the Tsukuba Express. The gate is Kaminarimon, and Nakamise runs up to Senso-ji.',
        manners: 'This is a living shopping street. Go early, buy something if you stand in a shop, and do not block the gate for a long photo.',
        mapsQuery: 'Kaminarimon Senso-ji Asakusa',
      },
    ],
  },
]

export function animeById(id: string): Anime | undefined {
  return ANIME.find((anime) => anime.id === id)
}
