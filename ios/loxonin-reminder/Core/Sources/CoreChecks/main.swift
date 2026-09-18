import Foundation
import LoxoninCore

enum CheckFailure: Error { case failed(String) }

func require(_ condition: @autoclosure () throws -> Bool, _ message: String) throws {
    guard try condition() else { throw CheckFailure.failed(message) }
}

let now = Date(timeIntervalSince1970: 2_000_000_000)
try RecordPolicy.validate(now.addingTimeInterval(-RecordPolicy.historyLimit), now: now)
do {
    try RecordPolicy.validate(now.addingTimeInterval(0.001), now: now)
    throw CheckFailure.failed("未来日時が許可された")
} catch RecordValidationError.futureDate {}
do {
    try RecordPolicy.validate(now.addingTimeInterval(-RecordPolicy.historyLimit - 0.001), now: now)
    throw CheckFailure.failed("30日より古い日時が許可された")
} catch RecordValidationError.olderThanThirtyDays {}

let before = IntakeRecord(takenAt: now.addingTimeInterval(-60))
let after = IntakeRecord(takenAt: now.addingTimeInterval(60))
let boundary = IntakeRecord(takenAt: now.addingTimeInterval(4 * 60 * 60))
try require(Set(RecordPolicy.closeRecords(to: now, in: [before, after, boundary]).map(\.id)) == Set([before.id, after.id]), "前後の近接判定")

let latest = IntakeRecord(takenAt: now.addingTimeInterval(-60))
let old = IntakeRecord(takenAt: now.addingTimeInterval(-86_400))
let remaining = IntakeRecord(takenAt: now.addingTimeInterval(-60 * 60))
let settings = ReminderSettings(notificationsEnabled: true, reminderIntervalMinutes: 210)
try require(ReminderPlan.next(records: [latest, old], settings: settings, now: now)?.recordID == latest.id, "最新記録の予約判定")
try require(ReminderPlan.next(records: [remaining], settings: settings, now: now)?.recordID == remaining.id, "最新削除後の再計算")
let changedSettings = ReminderSettings(notificationsEnabled: true, reminderIntervalMinutes: 240)
try require(ReminderPlan.next(records: [latest], settings: changedSettings, now: now)?.triggerAt == latest.takenAt.addingTimeInterval(240 * 60), "設定変更の再計算")
let exactDeadline = IntakeRecord(takenAt: now.addingTimeInterval(-210 * 60))
try require(ReminderPlan.next(records: [exactDeadline], settings: settings, now: now) == nil, "予定時刻ちょうどの再発火防止")
try require(ReminderPlan.next(records: [old], settings: ReminderSettings(notificationsEnabled: false), now: now) == nil, "通知OFF")

let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
let url = directory.appendingPathComponent("data.json")
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
try Data("broken".utf8).write(to: url)
let repository = LocalDataRepository(fileURL: url)
do { _ = try repository.load() } catch {}
do {
    try repository.save(StoredAppData())
    throw CheckFailure.failed("破損後の書き込みが許可された")
} catch LocalDataError.writesBlocked {}
try require(String(data: Data(contentsOf: url), encoding: .utf8) == "broken", "破損ファイルが上書きされた")
try repository.reset()
try require(try repository.load() == StoredAppData(), "明示リセット")
let roundTrip = StoredAppData(records: [latest], settings: changedSettings)
try repository.save(roundTrip)
try require(try repository.load() == roundTrip, "正常保存round trip")
do {
    try repository.save(StoredAppData(schemaVersion: 999))
    throw CheckFailure.failed("未対応schemaが保存された")
} catch LocalDataError.unsupportedSchema(999) {}
try? FileManager.default.removeItem(at: directory)

print("CoreChecks: all checks passed")
