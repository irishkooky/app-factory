import Foundation
import LoxoninCore
import Observation

enum AddRecordResult {
    case saved
    case needsConfirmation
    case failed(String)
}

@MainActor
@Observable
final class AppStore {
    private(set) var records: [IntakeRecord] = []
    private(set) var settings = ReminderSettings()
    private(set) var permission: NotificationPermission = .unknown
    private(set) var scheduledReminderAt: Date?
    private(set) var isMutating = false
    var noticeMessage: String?
    var errorMessage: String?
    var loadErrorMessage: String?

    private let repository: LocalDataRepository
    private let notifications: NotificationService

    init(repository: LocalDataRepository, notifications: NotificationService = NotificationService()) {
        self.repository = repository
        self.notifications = notifications
        do {
            let data = try repository.load()
            records = RecordPolicy.sortedNewestFirst(data.records)
            settings = data.settings
        } catch {
            loadErrorMessage = "保存データを読み込めませんでした。データ保護のため、リセットするまで変更できません。"
            errorMessage = error.localizedDescription
        }
    }

    var todayCount: Int {
        let calendar = Calendar.autoupdatingCurrent
        return records.filter { calendar.isDateInToday($0.takenAt) }.count
    }

    var latestRecord: IntakeRecord? { RecordPolicy.latestRecord(in: records) }

    func refreshAndReconcile() async {
        permission = await notifications.permission()
        if permission == .denied && settings.notificationsEnabled {
            scheduledReminderAt = nil
        }
        await reconcileNotifications()
    }

    func addRecord(at date: Date, confirmed: Bool = false) async -> AddRecordResult {
        guard !isMutating else { return .failed("保存処理中です。") }
        do {
            try RecordPolicy.validate(date, now: Date())
        } catch RecordValidationError.futureDate {
            return .failed("未来の日時は記録できません。")
        } catch {
            return .failed("記録できるのは過去30日以内です。")
        }

        if !confirmed && !RecordPolicy.closeRecords(to: date, in: records).isEmpty {
            return .needsConfirmation
        }

        isMutating = true
        defer { isMutating = false }
        var next = records
        next.append(IntakeRecord(takenAt: date))
        next = RecordPolicy.sortedNewestFirst(next)
        do {
            try repository.save(StoredAppData(records: next, settings: settings))
            records = next
            noticeMessage = "服用記録を保存しました。"
            await reconcileNotifications()
            return .saved
        } catch {
            return .failed("記録を保存できませんでした。\n\(error.localizedDescription)")
        }
    }

    func deleteRecord(id: UUID) async {
        guard !isMutating else { return }
        isMutating = true
        defer { isMutating = false }
        let next = records.filter { $0.id != id }
        do {
            try repository.save(StoredAppData(records: next, settings: settings))
            records = next
            noticeMessage = "記録を削除しました。"
            await reconcileNotifications()
        } catch {
            errorMessage = "記録を削除できませんでした。\n\(error.localizedDescription)"
        }
    }

    func setInterval(_ minutes: Int) async {
        guard !isMutating else { return }
        isMutating = true
        defer { isMutating = false }
        var next = settings
        next.reminderIntervalMinutes = minutes
        _ = await persistSettings(next)
    }

    func setNotificationsEnabled(_ enabled: Bool) async {
        guard !isMutating else { return }
        isMutating = true
        defer { isMutating = false }
        if enabled {
            do {
                permission = try await notifications.requestPermission()
            } catch {
                errorMessage = "通知の許可を確認できませんでした。\n\(error.localizedDescription)"
                return
            }
            guard permission == .authorized else {
                errorMessage = "通知が許可されていません。iPhoneの設定から変更できます。"
                return
            }
        }
        var next = settings
        next.notificationsEnabled = enabled
        _ = await persistSettings(next)
    }

    func sendTestNotification() async {
        guard !isMutating else { return }
        isMutating = true
        defer { isMutating = false }
        guard settings.notificationsEnabled, permission == .authorized else {
            errorMessage = "通知をONにしてからテストしてください。"
            return
        }
        do {
            try await notifications.scheduleTest()
            noticeMessage = "5秒後のテスト通知を設定しました。"
        } catch {
            errorMessage = "テスト通知を設定できませんでした。\n\(error.localizedDescription)"
        }
    }

    func resetCorruptData() async {
        guard !isMutating else { return }
        isMutating = true
        defer { isMutating = false }
        do {
            try repository.reset()
            records = []
            settings = ReminderSettings()
            loadErrorMessage = nil
            errorMessage = nil
            await notifications.cancelAll()
            scheduledReminderAt = nil
            noticeMessage = "端末内のデータをリセットしました。"
        } catch {
            errorMessage = "データをリセットできませんでした。\n\(error.localizedDescription)"
        }
    }

    @discardableResult
    private func persistSettings(_ next: ReminderSettings) async -> Bool {
        do {
            try repository.save(StoredAppData(records: records, settings: next))
            settings = next
            noticeMessage = "設定を保存しました。"
            await reconcileNotifications()
            return true
        } catch {
            errorMessage = "設定を保存できませんでした。\n\(error.localizedDescription)"
            return false
        }
    }

    private func reconcileNotifications() async {
        let plan = ReminderPlan.next(records: records, settings: settings, now: Date())
        let result = await notifications.reconcile(
            plan: plan,
            permission: permission,
            cancelTestNotification: !settings.notificationsEnabled || permission != .authorized
        )
        switch result {
        case .scheduled(let date):
            scheduledReminderAt = date
        case .notScheduled:
            scheduledReminderAt = nil
        case .failed(let message):
            scheduledReminderAt = nil
            errorMessage = "記録は保存されましたが、確認リマインダーを設定できませんでした。\n\(message)"
        case .superseded:
            break
        }
    }
}
