import Foundation

public struct IntakeRecord: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public let takenAt: Date

    public init(id: UUID = UUID(), takenAt: Date) {
        self.id = id
        self.takenAt = takenAt
    }
}

public struct ReminderSettings: Codable, Equatable, Sendable {
    public static let allowedIntervals = Array(stride(from: 120, through: 360, by: 30))

    public var notificationsEnabled: Bool
    public var reminderIntervalMinutes: Int

    public init(notificationsEnabled: Bool = false, reminderIntervalMinutes: Int = 210) {
        self.notificationsEnabled = notificationsEnabled
        self.reminderIntervalMinutes = reminderIntervalMinutes
    }

    public var isValid: Bool {
        Self.allowedIntervals.contains(reminderIntervalMinutes)
    }
}

public struct StoredAppData: Codable, Equatable, Sendable {
    public static let currentSchemaVersion = 1

    public var schemaVersion: Int
    public var records: [IntakeRecord]
    public var settings: ReminderSettings

    public init(
        schemaVersion: Int = Self.currentSchemaVersion,
        records: [IntakeRecord] = [],
        settings: ReminderSettings = .init()
    ) {
        self.schemaVersion = schemaVersion
        self.records = records
        self.settings = settings
    }
}
