import LoxoninCore
import SwiftUI

private enum HomeSheet: Identifiable { case backfill; var id: Int { 0 } }

struct HomeView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let store: AppStore
    let showSettings: () -> Void
    @State private var sheet: HomeSheet?
    @State private var pendingNow: Date?
    @State private var localError: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                summary
                reminderCard
                recordActions
                DisclaimerView()
            }
            .padding()
        }
        .background(Color("AppBackground").ignoresSafeArea())
        .navigationTitle("ロキソニン記録")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: showSettings) { Image(systemName: "gearshape") }
                    .accessibilityLabel("設定を開く")
            }
        }
        .sheet(item: $sheet) { _ in AddRecordSheet(store: store) }
        .alert("記録を確認", isPresented: Binding(
            get: { pendingNow != nil }, set: { if !$0 { pendingNow = nil } }
        )) {
            Button("追加する") {
                guard let date = pendingNow else { return }
                Task { await add(date, confirmed: true) }
            }
            Button("キャンセル", role: .cancel) { pendingNow = nil }
        } message: {
            Text("近い時刻の記録があります。すでに服用した記録を追加しますか？")
        }
        .alert("記録できません", isPresented: Binding(
            get: { localError != nil }, set: { if !$0 { localError = nil } }
        )) { Button("閉じる", role: .cancel) {} } message: { Text(localError ?? "") }
    }

    private var summary: some View {
        Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(spacing: 14) { metricCards }
            } else {
                HStack(spacing: 14) { metricCards }
            }
        }
    }

    @ViewBuilder private var metricCards: some View {
            MetricCard(title: "今日の記録", value: "\(store.todayCount)回", icon: "checkmark.circle.fill")
            MetricCard(
                title: "最後の記録",
                value: store.latestRecord?.takenAt.formatted(date: .abbreviated, time: .shortened) ?? "まだありません",
                icon: "clock.fill"
            )
    }

    private var reminderCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("次の確認リマインダー", systemImage: "bell.badge.fill")
                .font(.headline)
            if let scheduled = store.scheduledReminderAt, let latest = store.latestRecord {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    let total = scheduled.timeIntervalSince(latest.takenAt)
                    let remaining = max(0, scheduled.timeIntervalSince(context.date))
                    VStack(alignment: .leading, spacing: 10) {
                        Text(remainingDuration(remaining))
                            .font(.title2.bold()).monospacedDigit()
                        ProgressView(value: min(1, max(0, 1 - remaining / max(total, 1))))
                        Text(scheduled, format: .dateTime.month().day().hour().minute())
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
            } else {
                Text(reminderStatusText).foregroundStyle(.secondary)
                Button("通知設定を確認", action: showSettings).buttonStyle(.bordered)
            }
        }
        .cardStyle()
    }

    private var recordActions: some View {
        VStack(spacing: 12) {
            Button {
                Task { await add(Date(), confirmed: false) }
            } label: {
                Label(store.isMutating ? "保存中…" : "いま飲んだ", systemImage: "plus.circle.fill")
                    .font(.title3.bold()).frame(maxWidth: .infinity).padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent).controlSize(.large)
            .disabled(store.isMutating || store.loadErrorMessage != nil)
            .accessibilityHint("現在時刻で服用記録を保存します")

            Button("日時を指定して記録") { sheet = .backfill }
                .buttonStyle(.bordered)
                .disabled(store.isMutating || store.loadErrorMessage != nil)
        }
        .cardStyle()
    }

    private var reminderStatusText: String {
        if !store.settings.notificationsEnabled { return "通知はOFFです。許可は説明を確認してから設定できます。" }
        if store.permission == .denied { return "iPhoneの設定で通知が許可されていません。" }
        if store.latestRecord == nil { return "記録後、設定時間が経った時刻に確認をお知らせします。" }
        return "現在、予約されている確認リマインダーはありません。"
    }

    private func add(_ date: Date, confirmed: Bool) async {
        switch await store.addRecord(at: date, confirmed: confirmed) {
        case .saved: pendingNow = nil
        case .needsConfirmation: pendingNow = date
        case .failed(let message): localError = message
        }
    }

    private func remainingDuration(_ seconds: TimeInterval) -> String {
        let minutes = Int(ceil(seconds / 60))
        return "あと \(minutes / 60)時間 \(minutes % 60)分"
    }
}

private struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Image(systemName: icon).foregroundStyle(Color("AccentColor"))
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.headline).lineLimit(2).minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, minHeight: 110, alignment: .leading)
        .cardStyle()
    }
}

struct AddRecordSheet: View {
    @Environment(\.dismiss) private var dismiss
    let store: AppStore
    @State private var date = Date()
    @State private var needsConfirmation = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker(
                        "日時",
                        selection: $date,
                        in: Date().addingTimeInterval(-RecordPolicy.historyLimit)...Date(),
                        displayedComponents: [.date, .hourAndMinute]
                    )
                } header: { Text("服用した日時") } footer: { Text("過去30日以内の、すでに服用した日時を記録できます。") }
            }
            .navigationTitle("日時を指定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("キャンセル") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { Task { await save(confirmed: false) } }.disabled(store.isMutating)
                }
            }
            .confirmationDialog("近い時刻の記録があります", isPresented: $needsConfirmation, titleVisibility: .visible) {
                Button("記録を追加") { Task { await save(confirmed: true) } }
                Button("キャンセル", role: .cancel) {}
            } message: { Text("すでに服用した記録を追加しますか？") }
            .alert("保存できません", isPresented: Binding(
                get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } }
            )) { Button("閉じる", role: .cancel) {} } message: { Text(errorMessage ?? "") }
        }
    }

    private func save(confirmed: Bool) async {
        switch await store.addRecord(at: date, confirmed: confirmed) {
        case .saved: dismiss()
        case .needsConfirmation: needsConfirmation = true
        case .failed(let message): errorMessage = message
        }
    }
}

struct DisclaimerView: View {
    var body: some View {
        Text("服用を促す通知ではありません。用法・用量は薬の説明書や医師・薬剤師の指示を確認してください。")
            .font(.footnote).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8)
    }
}

extension View {
    func cardStyle() -> some View {
        padding(18)
            .background(Color("CardBackground"), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 12, y: 4)
    }
}
