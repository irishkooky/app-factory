import { Text, Timeline } from '@app-factory/ui'

export const Basic = () => (
  <Timeline active={2} bulletSize={22} lineWidth={2} maw={420}>
    <Timeline.Item title="プロジェクト作成">
      <Text c="dimmed" size="sm">
        weather-dash を app factory 上に作成しました。
      </Text>
      <Text size="xs" mt={4} c="dimmed">
        2026-07-03 10:00
      </Text>
    </Timeline.Item>

    <Timeline.Item title="初回デプロイ">
      <Text c="dimmed" size="sm">
        v1.0.0 を本番環境へデプロイしました。
      </Text>
      <Text size="xs" mt={4} c="dimmed">
        2026-07-04 15:20
      </Text>
    </Timeline.Item>

    <Timeline.Item title="機能追加: 週間予報">
      <Text c="dimmed" size="sm">
        Open-Meteo APIから週間予報を取得する機能を追加しました。
      </Text>
      <Text size="xs" mt={4} c="dimmed">
        2026-07-05 18:40
      </Text>
    </Timeline.Item>

    <Timeline.Item title="次回リリース予定" lineVariant="dashed">
      <Text c="dimmed" size="sm">
        v1.4.2 のデプロイを予定しています。
      </Text>
      <Text size="xs" mt={4} c="dimmed">
        2026-07-06 予定
      </Text>
    </Timeline.Item>
  </Timeline>
)
