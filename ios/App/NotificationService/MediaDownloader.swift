import UserNotifications
import UniformTypeIdentifiers
import MobileCoreServices

/// Describes a piece of media the backend wants attached to a notification.
///
/// The backend can put the URL under any of the accepted keys (see
/// `Self.urlKeys`). An explicit `media_type` hint is only needed when the URL
/// has no file extension (e.g. a signed S3/CDN link like `.../asset?sig=…`).
struct MediaReference {
    let url: URL
    /// Optional UTI-ish hint, e.g. "image", "image/png", "gif", "video", "audio".
    let typeHint: String?
    /// When true iOS hides the thumbnail in the collapsed banner (still shown
    /// when the notification is expanded). Handy for tall marketing images.
    let thumbnailHidden: Bool

    /// Custom-data keys that may carry the media URL, in priority order.
    static let urlKeys = [
        "media_url", "image_url", "image", "attachment_url",
        "attachment-url", "media-url", "picture", "fcm_image",
    ]

    init?(userInfo: [AnyHashable: Any]) {
        var found: URL?

        for key in Self.urlKeys {
            if let raw = userInfo[key] as? String,
               let candidate = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)),
               candidate.scheme == "https" || candidate.scheme == "http" {
                found = candidate
                break
            }
        }

        // FCM nests the image under `fcm_options.image` — support that too.
        if found == nil,
           let fcmOptions = userInfo["fcm_options"] as? [AnyHashable: Any],
           let raw = fcmOptions["image"] as? String,
           let candidate = URL(string: raw) {
            found = candidate
        }

        guard let url = found else { return nil }

        self.url = url
        self.typeHint = (userInfo["media_type"] as? String)?.lowercased()

        if let flag = userInfo["media_thumbnail_hidden"] as? Bool {
            self.thumbnailHidden = flag
        } else if let flag = userInfo["media_thumbnail_hidden"] as? String {
            self.thumbnailHidden = (flag as NSString).boolValue
        } else {
            self.thumbnailHidden = false
        }
    }
}

/// Downloads notification media to a temporary file and wraps it in a
/// `UNNotificationAttachment`. All work happens off the main thread on a
/// background `URLSession`; the completion is called with `nil` on any failure
/// so the caller can still deliver the un-attached notification.
enum MediaDownloader {

    @discardableResult
    static func download(
        _ media: MediaReference,
        completion: @escaping (UNNotificationAttachment?) -> Void
    ) -> URLSessionDownloadTask {
        let task = URLSession.shared.downloadTask(with: media.url) { location, response, error in
            guard let location, error == nil else {
                completion(nil)
                return
            }

            let ext = fileExtension(for: media, response: response)
            let attachment = makeAttachment(from: location, ext: ext, media: media)
            completion(attachment)
        }

        task.resume()
        return task
    }

    /// Move the temp download to a uniquely named file with the right extension,
    /// because `UNNotificationAttachment` infers the media type from the path
    /// extension. Getting this wrong is the #1 reason attachments silently drop.
    private static func makeAttachment(
        from location: URL,
        ext: String,
        media: MediaReference
    ) -> UNNotificationAttachment? {
        let fileManager = FileManager.default
        let directory = fileManager.temporaryDirectory
            .appendingPathComponent(ProcessInfo.processInfo.globallyUniqueString, isDirectory: true)

        do {
            try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)

            let filename = ext.isEmpty ? "media" : "media.\(ext)"
            let destination = directory.appendingPathComponent(filename)
            try fileManager.moveItem(at: location, to: destination)

            var options: [String: Any] = [:]
            if media.thumbnailHidden {
                options[UNNotificationAttachmentOptionsThumbnailHiddenKey] = true
            }

            return try UNNotificationAttachment(
                identifier: "media",
                url: destination,
                options: options.isEmpty ? nil : options
            )
        } catch {
            return nil
        }
    }

    /// Work out the file extension from, in order: the URL path, an explicit
    /// `media_type` hint, then the HTTP `Content-Type`. Falls back to "jpg"
    /// because images are by far the most common attachment.
    private static func fileExtension(
        for media: MediaReference,
        response: URLResponse?
    ) -> String {
        let pathExt = media.url.pathExtension
        if !pathExt.isEmpty, pathExt.count <= 5 {
            return pathExt.lowercased()
        }

        if let hint = media.typeHint, let ext = extensionForHint(hint) {
            return ext
        }

        if let mime = (response as? HTTPURLResponse)?
            .value(forHTTPHeaderField: "Content-Type")?
            .split(separator: ";").first.map(String.init),
           let ext = extensionForMime(mime.trimmingCharacters(in: .whitespaces)) {
            return ext
        }

        return "jpg"
    }

    private static func extensionForHint(_ hint: String) -> String? {
        switch hint {
        case "image", "photo", "picture": return "jpg"
        case "png": return "png"
        case "gif": return "gif"
        case "jpg", "jpeg": return "jpg"
        case "video", "mp4", "movie": return "mp4"
        case "audio", "sound": return "mp3"
        case "aiff": return "aiff"
        case "wav": return "wav"
        default:
            // Allow a raw MIME string as the hint too, e.g. "image/webp".
            return hint.contains("/") ? extensionForMime(hint) : nil
        }
    }

    private static func extensionForMime(_ mime: String) -> String? {
        switch mime.lowercased() {
        case "image/jpeg", "image/jpg": return "jpg"
        case "image/png": return "png"
        case "image/gif": return "gif"
        case "image/webp": return "webp"
        case "video/mp4": return "mp4"
        case "video/quicktime": return "mov"
        case "audio/mpeg", "audio/mp3": return "mp3"
        case "audio/x-aiff", "audio/aiff": return "aiff"
        case "audio/wav", "audio/x-wav": return "wav"
        default: return nil
        }
    }
}
