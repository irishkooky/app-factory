import SwiftUI

enum AppTab: Hashable {
    case home, history, settings
}

struct RootView: View {
    let store: AppStore
    @State private var selectedTab: AppTab = .home
    @State private var showResetConfirmation = false

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeView(store: store) { selectedTab = .settings }
            }
            .tabItem { Label("ホーム", systemImage: "house.fill") }
            .tag(AppTab.home)

            NavigationStack { HistoryView(store: store) }
                .tabItem { Label("履歴", systemImage: "clock.arrow.circlepath") }
                .tag(AppTab.history)

            NavigationStack { SettingsView(store: store) }
                .tabItem { Label("設定", systemImage: "gearshape.fill") }
                .tag(AppTab.settings)
        }
        .background(Color("AppBackground"))
        .safeAreaInset(edge: .top) {
            if let message = store.loadErrorMessage {
                VStack(alignment: .leading, spacing: 8) {
                    Label(message, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote.weight(.semibold))
                    Button("端末内データをリセット") { showResetConfirmation = true }
                        .font(.footnote.weight(.bold))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(.red.opacity(0.14))
            }
        }
        .overlay(alignment: .top) {
            if let message = store.noticeMessage {
                NoticeBanner(message: message) { store.noticeMessage = nil }
                    .padding()
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .alert("処理できませんでした", isPresented: Binding(
            get: { store.errorMessage != nil },
            set: { if !$0 { store.errorMessage = nil } }
        )) {
            Button("閉じる", role: .cancel) { store.errorMessage = nil }
            if store.permission == .denied {
                Button("設定を開く") { SettingsView.openSystemSettings() }
            }
        } message: {
            Text(store.errorMessage ?? "")
        }
        .confirmationDialog("端末内の記録と設定をすべて削除しますか？", isPresented: $showResetConfirmation, titleVisibility: .visible) {
            Button("リセット", role: .destructive) { Task { await store.resetCorruptData() } }
            Button("キャンセル", role: .cancel) {}
        } message: {
            Text("この操作は取り消せません。読み込めなかった元データも削除されます。")
        }
    }
}

private struct NoticeBanner: View {
    let message: String
    let dismiss: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
            Text(message).font(.subheadline.weight(.semibold))
            Spacer()
            Button(action: dismiss) { Image(systemName: "xmark") }
                .accessibilityLabel("閉じる")
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.1), radius: 12, y: 5)
    }
}
