export type PlayerId = string

export type Player = {
  id: PlayerId
  name: string
  /** 参加者リスト内の並び順に対応する色インデックス */
  colorIndex: number
  score: number
}

export type GameMode = 'talk' | 'mission' | 'point' | 'fortune'

export type Screen =
  | 'setup' // 参加者登録
  | 'menu' // モード選択 + スコアボード
  | 'oracle' // 赤ちゃんが選ぶ画面
  | 'reveal' // 選ばれた人の発表
  | 'card' // お題/ミッション/占いの表示
  | 'countdown' // 指さし用カウントダウン
  | 'score' // 採点
  | 'award' // 表彰式

export type Session = {
  players: Player[]
  babyName: string
  /** 赤ちゃんに選ばせるか（false なら大人がシャッフル） */
  useBaby: boolean
  round: number
}
