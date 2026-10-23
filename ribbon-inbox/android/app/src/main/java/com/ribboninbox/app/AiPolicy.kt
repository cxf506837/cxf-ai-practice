package com.ribboninbox.app
object AiPolicy {
    const val IMAGE_LIMIT = 4 * 1024 * 1024
    fun text(value: String,max: Int) = value.codePointCount(0,value.length) <= max
    fun secret(value: String) = value.length in 16..256 && value.all { it in '!'..'~' }
    fun imageMime(bytes: ByteArray): String? = when {
        bytes.size >= 8 && bytes.take(8) == listOf(137.toByte(),80.toByte(),78.toByte(),71.toByte(),13.toByte(),10.toByte(),26.toByte(),10.toByte()) -> "image/png"
        bytes.size >= 3 && bytes[0] == 255.toByte() && bytes[1] == 216.toByte() && bytes[2] == 255.toByte() -> "image/jpeg"
        bytes.size >= 12 && String(bytes.copyOfRange(0,4),Charsets.US_ASCII) == "RIFF" && String(bytes.copyOfRange(8,12),Charsets.US_ASCII) == "WEBP" -> "image/webp"
        else -> null
    }
    fun image(data: String): Boolean {
        if (data.length > IMAGE_LIMIT * 4 / 3 + 100) return false
        val match = Regex("^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$").matchEntire(data) ?: return false
        return try { val bytes = java.util.Base64.getDecoder().decode(match.groupValues[2]); bytes.size <= IMAGE_LIMIT && imageMime(bytes) == match.groupValues[1] } catch (_: Exception) { false }
    }
}
