import LoxoninCore
import SwiftUI

struct HistoryView: View {
    let store: AppStore
    @State private var recordToDelete: IntakeRecord?

    private var groups: [(Date, [IntakeRecord])] {
        let calendar = Calendar.autoupdatingCurrent
        let grouped = Dictionary(grouping: store.records) { calendar.startOfDay(for: $0.takenAt) }
        return grouped.keys.sorted(by: >).map { ($0, grouped[$0] ?? []) }
    }

    var body: some View {
        Group {
            if store.records.isEmpty {
                ContentUnavailableView(
                    "記録はまだありません",
                    systemImage: "clock.badge.questionmark",
                    description: Text("ホームから服用した事実を記録できます。")
                )
            } else {
                List {
                    ForEach(groups, id: \.0) { day, records in
                        Section(day.formatted(date: .long, time: .omitted)) {
                            ForEach(records) { record in
                                HStack {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Color("AccentColor"))
                                    Text(record.takenAt, format: .dateTime.hour().minute())
                                        .font(.body.monospacedDigit())
                                    Spacer()
                                    Button(role: .destructive) { recordToDelete = record } label: {
                                        Image(systemName: "trash")
                                    }
                                    .buttonStyle(.borderless).accessibilityLabel("この記録を削除")
                                    .disabled(store.isMutating)
                                }
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
        }
        .background(Color("AppBackground").ignoresSafeArea())
        .navigationTitle("履歴")
        .confirmationDialog("この服用記録を削除しますか？", isPresented: Binding(
            get: { recordToDelete != nil }, set: { if !$0 { recordToDelete = nil } }
        ), titleVisibility: .visible) {
            Button("削除", role: .destructive) {
                guard let id = recordToDelete?.id else { return }
                recordToDelete = nil
                Task { await store.deleteRecord(id: id) }
            }
            Button("キャンセル", role: .cancel) {}
        } message: {
            Text("削除後、残っている最新記録を基準に確認リマインダーを見直します。")
        }
    }
}
