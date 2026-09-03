export type ProviderId = 'qwen' | 'anthropic' | 'openai' | 'gemini' | 'deepseek'
export type ProviderKind = 'openai-compat' | 'anthropic'

export type ProviderDef = {
  id: ProviderId
  label: string // 表示名(例: 'Qwen (Alibaba Cloud)')
  short: string // 短縮表示名(例: 'Qwen')。結果カードのBadgeに使う
  kind: ProviderKind
  envKey: string // secrets名。例 'DASHSCOPE_API_KEY'
  baseUrl?: string // openai-compat のみ。末尾スラッシュなし
  /** この secrets 名に値があれば baseUrl を上書きする(例: Qwen の東京リージョンのワークスペース専用ドメイン) */
  baseUrlEnvKey?: string
  color: string // Mantine color 名('orange' 'violet' 'green' 'blue' 'gray')
  /** openai-compat のリクエストボディで max_tokens を渡すキー名。GPT-5系は max_completion_tokens 必須(既定 'max_tokens') */
  maxTokensParam?: 'max_tokens' | 'max_completion_tokens'
}

export type ModelDef = {
  id: string // アプリ内ID。apiModel と同じでよい
  provider: ProviderId
  label: string // 表示名(例: 'Qwen3.8 Max')
  apiModel: string // APIに渡すモデル名
  inputPerM: number // USD / 1M input tokens
  outputPerM: number // USD / 1M output tokens
  defaultOn: boolean // 初期状態でチェックON
  extraBody?: Record<string, unknown> // openai-compat の追加パラメータ(例: { enable_thinking: false })
  note?: string // 一言(例: 'オープンウェイト')
}

export const USD_JPY = 150

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'qwen',
    label: 'Qwen (Alibaba Cloud Model Studio)',
    short: 'Qwen',
    kind: 'openai-compat',
    envKey: 'DASHSCOPE_API_KEY',
    // 既定はシンガポール(国際版)。キーはリージョンに紐づくので、東京等で発行した場合は QWEN_BASE_URL で
    // https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/compatible-mode/v1 を指定する
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    baseUrlEnvKey: 'QWEN_BASE_URL',
    color: 'orange',
  },
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    short: 'Claude',
    kind: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    color: 'violet',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    short: 'OpenAI',
    kind: 'openai-compat',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    color: 'green',
    // GPT-5系は max_tokens を受け付けず max_completion_tokens が必須
    maxTokensParam: 'max_completion_tokens',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    short: 'Gemini',
    kind: 'openai-compat',
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    color: 'blue',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    short: 'DeepSeek',
    kind: 'openai-compat',
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1',
    color: 'gray',
  },
]

export const MODELS: ModelDef[] = [
  // 単価は 2026-09-02 時点の各社公式ページの公開価格(USD / 1M tokens、キャッシュ・バッチ割引なし)
  // Qwen: https://www.alibabacloud.com/help/en/model-studio/model-pricing (国際版・シンガポール)
  {
    id: 'qwen3.8-max',
    provider: 'qwen',
    label: 'Qwen3.8 Max',
    apiModel: 'qwen3.8-max',
    inputPerM: 2.0,
    outputPerM: 6.0,
    defaultOn: true,
    extraBody: { enable_thinking: false },
    note: 'フラッグシップ',
  },
  {
    id: 'qwen3.7-plus',
    provider: 'qwen',
    label: 'Qwen3.7 Plus',
    apiModel: 'qwen3.7-plus',
    inputPerM: 0.4,
    outputPerM: 1.6,
    defaultOn: false,
    extraBody: { enable_thinking: false },
    note: '256Kまでの単価',
  },
  {
    id: 'qwen3.8-flash',
    provider: 'qwen',
    label: 'Qwen3.8 Flash',
    apiModel: 'qwen3.8-flash',
    inputPerM: 0.15,
    outputPerM: 0.47,
    defaultOn: true,
    extraBody: { enable_thinking: false },
    note: '重み公開版は Flash-Next(別物)',
  },
  // Claude: https://claude.com/pricing
  {
    id: 'claude-opus-5',
    provider: 'anthropic',
    label: 'Claude Opus 5',
    apiModel: 'claude-opus-5',
    inputPerM: 5,
    outputPerM: 25,
    defaultOn: false,
    note: '採点者にも使う',
  },
  {
    id: 'claude-sonnet-5',
    provider: 'anthropic',
    label: 'Claude Sonnet 5',
    apiModel: 'claude-sonnet-5',
    inputPerM: 2,
    outputPerM: 10,
    defaultOn: true,
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    apiModel: 'claude-haiku-4-5',
    inputPerM: 1,
    outputPerM: 5,
    defaultOn: true,
  },
  // OpenAI: https://developers.openai.com/api/docs/pricing
  {
    id: 'gpt-5.6-luna',
    provider: 'openai',
    label: 'GPT-5.6 Luna',
    apiModel: 'gpt-5.6-luna',
    inputPerM: 0.2,
    outputPerM: 1.2,
    defaultOn: true,
  },
  {
    id: 'gpt-5.4-mini',
    provider: 'openai',
    label: 'GPT-5.4 mini',
    apiModel: 'gpt-5.4-mini',
    inputPerM: 0.75,
    outputPerM: 4.5,
    defaultOn: false,
  },
  {
    id: 'gpt-5.4-nano',
    provider: 'openai',
    label: 'GPT-5.4 nano',
    apiModel: 'gpt-5.4-nano',
    inputPerM: 0.2,
    outputPerM: 1.25,
    defaultOn: true,
  },
  // Gemini: https://ai.google.dev/gemini-api/docs/pricing (2026-12-31 までの価格)
  {
    id: 'gemini-3.8-flash',
    provider: 'gemini',
    label: 'Gemini 3.8 Flash',
    apiModel: 'gemini-3.8-flash',
    inputPerM: 0.75,
    outputPerM: 3.75,
    defaultOn: false,
  },
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    label: 'Gemini 3.5 Flash-Lite',
    apiModel: 'gemini-3.5-flash-lite',
    inputPerM: 0.3,
    outputPerM: 2.5,
    defaultOn: true,
  },
  // DeepSeek: https://api-docs.deepseek.com/quick_start/pricing (オフピーク価格。ピーク時は2倍)
  {
    id: 'deepseek-v4-flash',
    provider: 'deepseek',
    label: 'DeepSeek V4 Flash',
    apiModel: 'deepseek-v4-flash',
    inputPerM: 0.22,
    outputPerM: 0.66,
    defaultOn: false,
    note: 'オフピーク価格',
  },
]

export const JUDGE_MODEL = 'claude-opus-5'

/** 必ず見つかる前提。見つからなければ実装バグとして throw する */
export function getProvider(id: ProviderId): ProviderDef {
  const provider = PROVIDERS.find((p) => p.id === id)
  if (!provider) {
    throw new Error(`未知のプロバイダです: ${id}`)
  }
  return provider
}

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id)
}
