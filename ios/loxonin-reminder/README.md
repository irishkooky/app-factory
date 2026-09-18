# ロキソニン記録 iOS版

iPhone内だけで服用した事実を記録し、設定時間後に体調と記録を確認するためのローカル通知を1件予約するSwiftUIアプリです。iOS 17以降に対応します。

## 実機で開く

1. Mac App StoreからXcodeをインストールします。
2. `LoxoninReminder.xcodeproj` をXcodeで開きます。
3. `LoxoninReminder` ターゲットの **Signing & Capabilities** で、自分のTeamを選択します。
4. Bundle Identifier `work.ichigoooo.LoxoninReminder` が他と重なる場合は、自分専用の値へ変更します。
5. USB接続またはWi-Fi接続したiPhoneを実行先に選び、Runします。

追加のパッケージ取得や外部サービスの設定はありません。通知許可は初回起動時に自動表示せず、設定画面で通知をONにしたときだけiOSへ要求します。拒否後は設定アプリへの導線を表示します。

## 仕様

- ホーム: 今日の記録数、最後の記録日時、予約済み確認リマインダー、現在時刻または過去30日以内の日時指定記録
- 履歴: 日別の全記録と確認付き削除
- 設定: 通知ON/OFF、120〜360分（30分刻み、初期値210分）、5秒後のテスト通知
- 保存: Application Support内のschemaVersion付きJSON。atomic保存し、読取破損時は明示リセットまで書込みを止めます
- 通知: 最新記録のみを基準に固定IDで最大1件。過去の期限は再発火せず、古い日時の追加で最新予約を変えません

記録と設定はWeb版やほかの端末へ自動同期しません。ログイン、外部DB、ネットワーク通信は使いません。通知はOSの許可状態や端末設定の影響を受け、アプリが終了していても配信はiOSが管理します。

服用を促す通知ではありません。用法・用量は薬の説明書や医師・薬剤師の指示を確認してください。

## 検証

Xcode 27.0（27A266a）とiPhone 18 Pro Simulator（iOS 27.0）で次を確認しました。

- iOSアプリのビルド成功
- ホーム・設定・履歴の表示、記録追加、削除確認から削除後の「0回」表示と空履歴
- 再起動後も記録と通知設定が保持されること
- 通知許可ダイアログで許可した後、通知ONと次回予約が表示されること
- 5秒後のテスト通知が配信されたこと（SpringBoardのローカル通知ログで確認。バナー表示の目視は未確認）
- `Core/Tests` のSwift Testing 7件がすべて成功
- `CoreChecks` の全チェック成功（日時境界、近接記録、最新予約、削除・設定変更後の再計算、期限切れ/OFF、JSON round trip、schema拒否、破損時書込み停止）

実機でのビルド・通知配信・操作は未検証です。

Coreの再確認:

```sh
CLANG_MODULE_CACHE_PATH=/tmp/loxonin-clang-cache \
SWIFTPM_MODULECACHE_OVERRIDE=/tmp/loxonin-swift-module-cache \
swift run --package-path Core --scratch-path /tmp/loxonin-core-build \
  --cache-path /tmp/loxonin-swift-cache --disable-sandbox CoreChecks
```

Swift TestingはXcode付属のSwiftツールチェーンで実行しました。
