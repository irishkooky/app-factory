import LoxoninCore
import SwiftUI
import UserNotifications

@main
struct LoxoninReminderApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var store: AppStore
    private let notificationDelegate = NotificationDelegate()

    init() {
        let applicationSupport = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first!
        let fileURL = applicationSupport
            .appendingPathComponent("LoxoninReminder", isDirectory: true)
            .appendingPathComponent("data.json")
        _store = State(initialValue: AppStore(repository: LocalDataRepository(fileURL: fileURL)))
        UNUserNotificationCenter.current().delegate = notificationDelegate
    }

    var body: some Scene {
        WindowGroup {
            RootView(store: store)
                .tint(Color("AccentColor"))
                .task { await store.refreshAndReconcile() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        Task { await store.refreshAndReconcile() }
                    }
                }
        }
    }
}
