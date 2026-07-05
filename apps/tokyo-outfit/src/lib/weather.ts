export interface TodayWeather {
  dateISO: string
  maxTemp: number
  minTemp: number
  precipProb: number
  weatherCode: number
}

const TOKYO_FORECAST_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=1'

interface OpenMeteoResponse {
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max?: (number | null)[]
  }
}

export async function fetchTodayWeather(): Promise<TodayWeather> {
  const res = await fetch(TOKYO_FORECAST_URL)
  if (!res.ok) {
    throw new Error(`天気情報の取得に失敗しました (status: ${res.status})`)
  }
  const data = (await res.json()) as OpenMeteoResponse
  const daily = data.daily
  if (!daily || daily.time.length === 0) {
    throw new Error('天気情報のレスポンスが不正です')
  }
  return {
    dateISO: daily.time[0],
    maxTemp: daily.temperature_2m_max[0],
    minTemp: daily.temperature_2m_min[0],
    precipProb: daily.precipitation_probability_max?.[0] ?? 0,
    weatherCode: daily.weather_code[0],
  }
}

export function weatherCodeToLabel(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: '快晴' }
  if (code === 1) return { emoji: '🌤️', label: '晴れ' }
  if (code === 2) return { emoji: '⛅', label: '晴れ時々くもり' }
  if (code === 3) return { emoji: '☁️', label: 'くもり' }
  if (code >= 45 && code <= 48) return { emoji: '🌫️', label: '霧' }
  if (code >= 51 && code <= 67) return { emoji: '🌧️', label: '雨' }
  if (code >= 71 && code <= 77) return { emoji: '🌨️', label: '雪' }
  if (code >= 80 && code <= 82) return { emoji: '🌦️', label: 'にわか雨' }
  if (code >= 85 && code <= 86) return { emoji: '🌨️', label: 'にわか雪' }
  if (code >= 95 && code <= 99) return { emoji: '⛈️', label: '雷雨' }
  return { emoji: '🌡️', label: '不明' }
}

export interface TempBand {
  label: string
  advice: string
  topsWarmth: number
  bottomsWarmth: number
  outerNeed: 'no' | 'optional' | 'required'
  outerWarmth?: number
}

export function tempToBand(maxTemp: number): TempBand {
  if (maxTemp >= 28) {
    return {
      label: '真夏日和',
      advice: '半袖で軽やかに過ごしましょう。',
      topsWarmth: 1,
      bottomsWarmth: 1,
      outerNeed: 'no',
    }
  }
  if (maxTemp >= 23) {
    return {
      label: '暖かい一日',
      advice: '薄手の長袖や半袖がちょうど良さそうです。',
      topsWarmth: 2,
      bottomsWarmth: 2,
      outerNeed: 'no',
    }
  }
  if (maxTemp >= 18) {
    return {
      label: '過ごしやすい陽気',
      advice: '羽織りがあると安心です。',
      topsWarmth: 2,
      bottomsWarmth: 2,
      outerNeed: 'optional',
      outerWarmth: 2,
    }
  }
  if (maxTemp >= 12) {
    return {
      label: '肌寒い一日',
      advice: 'ジャケットやニットを一枚。',
      topsWarmth: 3,
      bottomsWarmth: 3,
      outerNeed: 'required',
      outerWarmth: 3,
    }
  }
  if (maxTemp >= 6) {
    return {
      label: '寒い一日',
      advice: 'コートの季節です。しっかり暖かく。',
      topsWarmth: 4,
      bottomsWarmth: 4,
      outerNeed: 'required',
      outerWarmth: 4,
    }
  }
  return {
    label: '真冬の寒さ',
    advice: 'しっかり防寒して出かけましょう。',
    topsWarmth: 5,
    bottomsWarmth: 5,
    outerNeed: 'required',
    outerWarmth: 5,
  }
}
