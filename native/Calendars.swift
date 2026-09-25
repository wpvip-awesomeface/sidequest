import Cocoa
import WebKit
import EventKit

final class CalendarBridge: NSObject, WKScriptMessageHandlerWithReply {
    private let store = EKEventStore()
    var allowedPort: (() -> Int?)?
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.protocol == "http", message.frameInfo.securityOrigin.host == "127.0.0.1", message.frameInfo.securityOrigin.port == allowedPort?(), let body = message.body as? [String: Any] else { replyHandler(nil, "Calendar requests must come from Sidequest."); return }
        let status = EKEventStore.authorizationStatus(for: .event)
        if body["operation"] as? String == "status" { replyHandler(["authorized": status == .fullAccess], nil); return }
        let read = { [weak self] in
            guard let self = self else { replyHandler(nil, "Calendar connection closed."); return }
            self.store.reset()
            let calendars = self.store.calendars(for: .event)
            if body["operation"] as? String == "list" {
                replyHandler(["calendars": calendars.map { ["id": $0.calendarIdentifier, "name": $0.title, "account": $0.source.title] }], nil)
                return
            }
            guard body["operation"] as? String == "events", let ids = body["ids"] as? [String], !ids.isEmpty, ids.count <= 50 else { replyHandler(nil, "Choose calendars before syncing."); return }
            let selected = calendars.filter { ids.contains($0.calendarIdentifier) }
            guard selected.count == Set(ids).count else { replyHandler(nil, "A selected calendar is no longer available. Choose your calendars again."); return }
            let start = Calendar.current.startOfDay(for: Date())
            let end = Calendar.current.date(byAdding: .day, value: 14, to: start)!
            let predicate = self.store.predicateForEvents(withStart: start, end: end, calendars: selected)
            let events = self.store.events(matching: predicate).filter { event in
                event.status != .canceled && !(event.attendees?.contains(where: { $0.isCurrentUser && $0.participantStatus == .declined }) ?? false)
            }
            guard events.count <= 1000 else { replyHandler(nil, "More than 1,000 events in the next two weeks. Choose fewer calendars."); return }
            let rows: [[String: Any]] = events.map { event in
                ["calendarId": event.calendar.calendarIdentifier, "externalId": event.calendarItemIdentifier,
                 "title": event.title ?? "Untitled event", "start": event.startDate.timeIntervalSince1970 * 1000,
                 "end": event.endDate.timeIntervalSince1970 * 1000,
                 "occurrence": (event.occurrenceDate ?? event.startDate).timeIntervalSince1970 * 1000,
                 "allDay": event.isAllDay, "location": event.location ?? ""]
            }
            replyHandler(["events": rows], nil)
        }
        if status == .fullAccess { read(); return }
        if status == .notDetermined && body["requestAccess"] as? Bool == true {
            store.requestFullAccessToEvents { granted, _ in DispatchQueue.main.async {
                if granted { read() } else { replyHandler(nil, "Calendar access was not granted. You can enable Sidequest in System Settings → Privacy & Security → Calendars.") }
            }}
        } else { replyHandler(nil, "Allow calendar access in System Settings → Privacy & Security → Calendars, then try again.") }
    }
}
