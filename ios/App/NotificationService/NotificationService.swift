import UserNotifications
import MobileCoreServices

/// Notification Service Extension.
///
/// APNs wakes this extension for any push whose payload contains
/// `"mutable-content": 1`. It gives us ~30 seconds to mutate the notification
/// before iOS displays it. We use that window to download rich media (image,
/// GIF, audio, video) referenced by a URL in the payload and attach it, so the
/// notification renders the "Temu style" big image / expandable media banner.
///
/// The extension is intentionally defensive: if the payload has no media, the
/// download fails, or we run out of time, it always delivers the original
/// notification unchanged. A rich push must never degrade into *no* push.
final class NotificationService: UNNotificationServiceExtension {

    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?
    private var downloadTask: URLSessionDownloadTask?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        self.bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent

        guard let bestAttempt = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        let userInfo = request.content.userInfo

        // Apply payload-driven overrides that don't need a network round trip.
        applySound(from: userInfo, to: bestAttempt)
        applyCategory(from: userInfo, to: bestAttempt)
        applyRelevanceScore(from: userInfo, to: bestAttempt)

        // Resolve the media URL. If there's nothing to download, deliver now.
        guard let media = MediaReference(userInfo: userInfo) else {
            contentHandler(bestAttempt)
            return
        }

        downloadTask = MediaDownloader.download(media) { [weak self] attachment in
            guard let self else { return }

            if let attachment {
                bestAttempt.attachments = [attachment]
            }

            self.contentHandler?(bestAttempt)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // iOS is about to kill us — hand back whatever we've assembled so far.
        downloadTask?.cancel()

        if let contentHandler, let bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    // MARK: - Payload-driven overrides

    /// Allows the backend to override the sound per-notification. The named
    /// sound file must be bundled in the app (or this extension) target.
    /// Use `"default"` for the system sound; APNs already handles the top-level
    /// `aps.sound`, so this is only needed when the sound name lives in custom
    /// data or should be swapped based on extension logic.
    private func applySound(
        from userInfo: [AnyHashable: Any],
        to content: UNMutableNotificationContent
    ) {
        guard let name = string(userInfo, "sound_name") ?? string(userInfo, "sound") else {
            return
        }

        if name.lowercased() == "default" {
            content.sound = .default
        } else {
            content.sound = UNNotificationSound(named: UNNotificationSoundName(name))
        }
    }

    /// Attaching a category id lets iOS render the action buttons registered by
    /// the main app (see AppDelegate). APNs normally sets this via
    /// `aps.category`, but we also honour a custom-data key for flexibility.
    private func applyCategory(
        from userInfo: [AnyHashable: Any],
        to content: UNMutableNotificationContent
    ) {
        if let category = string(userInfo, "category"), content.categoryIdentifier.isEmpty {
            content.categoryIdentifier = category
        }
    }

    /// iOS 15+ uses relevanceScore (0.0–1.0) to rank notifications inside a
    /// summary / notification stack — higher scores float to the top.
    private func applyRelevanceScore(
        from userInfo: [AnyHashable: Any],
        to content: UNMutableNotificationContent
    ) {
        guard let raw = userInfo["relevance_score"] else { return }

        if let number = raw as? NSNumber {
            content.relevanceScore = number.doubleValue
        } else if let text = raw as? String, let value = Double(text) {
            content.relevanceScore = value
        }
    }

    private func string(_ userInfo: [AnyHashable: Any], _ key: String) -> String? {
        guard let value = userInfo[key] as? String, !value.isEmpty else { return nil }
        return value
    }
}
