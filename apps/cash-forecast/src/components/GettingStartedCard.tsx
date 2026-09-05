import { Button, Card } from '@heroui/react'
import { RULE_PRESETS, type RulePreset } from '../lib/rulePresets'

export function RulePresetButtons({ onSelect }: { onSelect: (preset: RulePreset) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {RULE_PRESETS.map((preset) => (
        <Button
          key={preset.id}
          variant="secondary"
          onPress={() => onSelect(preset)}
          // Button 既定の nowrap を外し、補足が長くても枠内で折り返す
          className="h-auto w-full justify-start py-3 text-left whitespace-normal"
        >
          {/* button の内容モデル上 div は不正なため span にする（flex は className でそのまま効く） */}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span>{preset.label}</span>
            <span className="text-xs text-muted">{preset.hint}</span>
          </span>
        </Button>
      ))}
    </div>
  )
}

export function GettingStartedCard({ onSelectPreset }: { onSelectPreset: (preset: RulePreset) => void }) {
  return (
    <Card>
      <Card.Content className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">毎月の予定を登録しましょう</h2>
          <p className="text-sm text-muted">
            給与や家賃など毎月の入出金を登録すると、12ヶ月先までの残高が自動で予測されます。
          </p>
        </div>
        <RulePresetButtons onSelect={onSelectPreset} />
        <p className="text-xs text-muted">単発の入出金は右下の ＋ から追加できます。</p>
      </Card.Content>
    </Card>
  )
}
