import LoxoninCore
import SwiftUI
import UIKit

struct SettingsView: View {
    let store: AppStore

    var body: some View {
        Form {
            Section {
                Toggle("通知をONにする", isOn: Binding(
                    get: { store.settings.notificationsEnabled },
                    set: { value in Task { await store.setNotificationsEnabled(value) } }
                ))
                .disabled(store.isMutating || store.loadErrorMessage != nil)

                Picker("確認までの時間", selection: Binding(
                    get: { store.settings.reminderIntervalMinutes },
                    set: { value in Task { await store.setInterval(value) } }
                )) {
                    ForEach(ReminderSettings.allowedIntervals, id: \.self) { minutes in
                        Text(intervalLabel(minutes)).tag(minutes)
                    }
                }
                .disabled(store.isMutating || store.loadErrorMessage != nil)

                Button("5秒後にテスト通知") { Task { await store.sendTestNotification() } }
                    .disabled(store.isMutating || !store.settings.notificationsEnabled || store.permission != .authorized)

                if store.permission == .unknown && !store.settings.notificationsEnabled {
                    Label("通知は自動では許可を求めません。上のスイッチをONにすると、説明に同意した操作としてiPhoneの許可画面を表示します。", systemImage: "hand.tap")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if store.permission == .denied {
                    Button("iPhoneの通知設定を開く", action: Self.openSystemSettings)
                }
            } header: {
                Text("確認リマインダー")
            } footer: {
                Text("これは服用間隔や薬効切れの判定ではなく、体調と服用記録を確認する通知までの時間です。過ぎた予定は再通知しません。")
            }

            Section("データ") {
                Label("記録と設定はこのiPhone内に保存されます", systemImage: "iphone")
                Text("Web版やほかの端末とは自動同期しません。ログインや外部通信はありません。")
                    .font(.footnote).foregroundStyle(.secondary)
            }

            Section { DisclaimerView() }
        }
        .scrollContentBackground(.hidden)
        .background(Color("AppBackground").ignoresSafeArea())
        .navigationTitle("設定")
    }

    static func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    private func intervalLabel(_ minutes: Int) -> String {
        minutes % 60 == 0 ? "\(minutes / 60)時間" : "\(minutes / 60)時間\(minutes % 60)分"
    }
}
