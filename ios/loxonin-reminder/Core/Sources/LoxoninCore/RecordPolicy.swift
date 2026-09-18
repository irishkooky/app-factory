import Foundation

public enum RecordValidationError: Error, Equatable, Sendable {
    case futureDate
    case olderThanThirtyDays
}

public enum RecordPolicy {
    public static let historyLimit: TimeInterval = 30 * 24 * 60 * 60
    public static let closeRecordInterval: TimeInterval = 4 * 60 * 60

    public static func validate(_ date: Date, now: Date) throws {
        if date > now { throw RecordValidationError.futureDate }
        if date < now.addingTimeInterval(-historyLimit) {
            throw RecordValidationError.olderThanThirtyDays
        }
    }

    public static func closeRecords(
        to date: Date,
        in records: [IntakeRecord]
    ) -> [IntakeRecord] {
        records
            .filter { abs($0.takenAt.timeIntervalSince(date)) < closeRecordInterval }
            .sorted { $0.takenAt > $1.takenAt }
    }

    public static func sortedNewestFirst(_ records: [IntakeRecord]) -> [IntakeRecord] {
        records.sorted {
            if $0.takenAt == $1.takenAt { return $0.id.uuidString < $1.id.uuidString }
            return $0.takenAt > $1.takenAt
        }
    }

    public static func latestRecord(in records: [IntakeRecord]) -> IntakeRecord? {
        sortedNewestFirst(records).first
    }
}

public struct ReminderPlan: Equatable, Sendable {
    public let recordID: UUID
    public let triggerAt: Date

    public init(recordID: UUID, triggerAt: Date) {
        self.recordID = recordID
        self.triggerAt = triggerAt
    }

    public static func next(
        records: [IntakeRecord],
        settings: ReminderSettings,
        now: Date
    ) -> ReminderPlan? {
        guard settings.notificationsEnabled,
              settings.isValid,
              let latest = RecordPolicy.latestRecord(in: records)
        else { return nil }

        let triggerAt = latest.takenAt.addingTimeInterval(
            TimeInterval(settings.reminderIntervalMinutes * 60)
        )
        guard triggerAt > now else { return nil }
        return ReminderPlan(recordID: latest.id, triggerAt: triggerAt)
    }
}
