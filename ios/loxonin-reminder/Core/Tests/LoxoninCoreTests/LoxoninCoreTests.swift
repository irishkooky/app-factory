import Foundation
import Testing
@testable import LoxoninCore

struct LoxoninCoreTests {
    private let now = Date(timeIntervalSince1970: 2_000_000_000)

    @Test func acceptsExactThirtyDayBoundaryAndRejectsBeyond() throws {
        try RecordPolicy.validate(now.addingTimeInterval(-RecordPolicy.historyLimit), now: now)
        #expect(throws: RecordValidationError.olderThanThirtyDays) {
            try RecordPolicy.validate(now.addingTimeInterval(-RecordPolicy.historyLimit - 0.001), now: now)
        }
        #expect(throws: RecordValidationError.futureDate) {
            try RecordPolicy.validate(now.addingTimeInterval(0.001), now: now)
        }
    }

    @Test func closeRecordChecksBothSidesAndDuplicates() {
        let before = IntakeRecord(takenAt: now.addingTimeInterval(-60))
        let same = IntakeRecord(takenAt: now)
        let after = IntakeRecord(takenAt: now.addingTimeInterval(60))
        let boundary = IntakeRecord(takenAt: now.addingTimeInterval(4 * 60 * 60))
        let matches = RecordPolicy.closeRecords(to: now, in: [before, same, after, boundary])
        #expect(Set(matches.map(\.id)) == Set([before.id, same.id, after.id]))
    }

    @Test func newestRecordDrivesReminderAndOldBackfillDoesNotChangeIt() {
        let latest = IntakeRecord(takenAt: now.addingTimeInterval(-60))
        let old = IntakeRecord(takenAt: now.addingTimeInterval(-86_400))
        let settings = ReminderSettings(notificationsEnabled: true, reminderIntervalMinutes: 210)
        let first = ReminderPlan.next(records: [latest], settings: settings, now: now)
        let afterBackfill = ReminderPlan.next(records: [latest, old], settings: settings, now: now)
        #expect(first == afterBackfill)
        #expect(afterBackfill?.recordID == latest.id)
    }

    @Test func deletingLatestRebasesAndExpiredPlanIsNotScheduled() {
        let latest = IntakeRecord(takenAt: now.addingTimeInterval(-60))
        let remaining = IntakeRecord(takenAt: now.addingTimeInterval(-60 * 60))
        let settings = ReminderSettings(notificationsEnabled: true, reminderIntervalMinutes: 120)
        #expect(ReminderPlan.next(records: [latest, remaining], settings: settings, now: now)?.recordID == latest.id)
        #expect(ReminderPlan.next(records: [remaining], settings: settings, now: now)?.recordID == remaining.id)
        #expect(ReminderPlan.next(records: [IntakeRecord(takenAt: now.addingTimeInterval(-3 * 60 * 60))], settings: settings, now: now) == nil)
    }

    @Test func settingsBoundsAreEnforced() {
        #expect(ReminderSettings(reminderIntervalMinutes: 120).isValid)
        #expect(ReminderSettings(reminderIntervalMinutes: 360).isValid)
        #expect(!ReminderSettings(reminderIntervalMinutes: 121).isValid)
    }

    @Test func corruptFileBlocksWritesUntilExplicitReset() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let url = directory.appendingPathComponent("data.json")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data("not-json".utf8).write(to: url)
        let repository = LocalDataRepository(fileURL: url)

        #expect(throws: (any Error).self) { try repository.load() }
        #expect(throws: LocalDataError.writesBlocked) { try repository.save(StoredAppData()) }
        #expect(String(data: try Data(contentsOf: url), encoding: .utf8) == "not-json")

        try repository.reset()
        #expect(try repository.load() == StoredAppData())
        try? FileManager.default.removeItem(at: directory)
    }

    @Test func saveRejectsUnsupportedSchema() {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let repository = LocalDataRepository(fileURL: url)
        #expect(throws: LocalDataError.unsupportedSchema(999)) {
            try repository.save(StoredAppData(schemaVersion: 999))
        }
    }
}
