package com.ribboninbox.app

object ShareCapture {
    const val MAX_TEXT = 100000
    fun accepts(action: String?, mime: String?, text: String?, subject: String?): Boolean =
        action == "android.intent.action.SEND" && mime == "text/plain" && !text.isNullOrBlank() &&
        text.length <= MAX_TEXT && (subject?.length ?: 0) <= 2000
}
