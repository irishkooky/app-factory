import Foundation
import LoxoninCore
import UserNotifications

enum NotificationPermission: Equatable {
    case unknown, authorized, denied
}

enum ReminderScheduleResult: Equatable {
    case scheduled(Date)
    case notScheduled
    case failed(String)
    case superseded
}

actor NotificationService {
    static let reminderID = "loxonin-reminder.latest-intake"
    static let testID = "loxonin-reminder.test"

    private let center = UNUserNotificationCenter.current()
    private var generation = 0
    private var operationTail: Task<Void, Never>?

    func permission() async -> NotificationPermission {
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral: return .authorized
        case .denied: return .denied
        case .notDetermined: return .unknown
        @unknown default: return .unknown
        }
    }

    func requestPermission() async throws -> NotificationPermission {
        _ = try await center.requestAuthorization(options: [.alert, .sound])
        return await permission()
    }

    func reconcile(
        plan: ReminderPlan?,
        permission: NotificationPermission,
        cancelTestNotification: Bool
    ) async -> ReminderScheduleResult {
        generation += 1
        let currentGeneration = generation
        let previous = operationTail
        let operation = Task<ReminderScheduleResult, Never> { [self] in
            await previous?.value
            return await performReconcile(plan: plan, permission: permission, cancelTestNotification: cancelTestNotification)
        }
        operationTail = Task { _ = await operation.value }
        let result = await operation.value
        return currentGeneration == generation ? result : .superseded
    }

    func scheduleTest() async throws {
        let previous = operationTail
        let operation = Task<Void, Error> { [self] in
            await previous?.value
            try await performTestNotification()
        }
        operationTail = Task { try? await operation.value }
        try await operation.value
    }

    func cancelAll() async {
        generation += 1
        let previous = operationTail
        let operation = Task { [self] in
            await previous?.value
            performCancelAll()
        }
        operationTail = operation
        await operation.value
    }

    private func performReconcile(
        plan: ReminderPlan?,
        permission: NotificationPermission,
        cancelTestNotification: Bool
    ) async -> ReminderScheduleResult {
        center.removePendingNotificationRequests(withIdentifiers: [Self.reminderID])
        if cancelTestNotification {
            center.removePendingNotificationRequests(withIdentifiers: [Self.testID])
        }
        guard permission == .authorized, let plan else { return .notScheduled }
        let interval = plan.triggerAt.timeIntervalSinceNow
        guard interval > 0 else { return .notScheduled }

        let content = UNMutableNotificationContent()
        content.title = "体調と記録を確認する時間です"
        content.body = "記録した服用から設定時間が経ちました。体調と服用記録を確認してください。"
        content.sound = .default
        content.userInfo = ["recordID": plan.recordID.uuidString]
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let request = UNNotificationRequest(identifier: Self.reminderID, content: content, trigger: trigger)
        do {
            try await center.add(request)
            return .scheduled(plan.triggerAt)
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    private func performTestNotification() async throws {
        center.removePendingNotificationRequests(withIdentifiers: [Self.testID])
        let content = UNMutableNotificationContent()
        content.title = "テスト通知"
        content.body = "通知は正常に設定されています。"
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
        try await center.add(UNNotificationRequest(identifier: Self.testID, content: content, trigger: trigger))
    }

    private func performCancelAll() {
        center.removePendingNotificationRequests(withIdentifiers: [Self.reminderID, Self.testID])
    }
}

final class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}
