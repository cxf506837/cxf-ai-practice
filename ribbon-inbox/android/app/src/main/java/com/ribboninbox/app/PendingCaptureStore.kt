package com.ribboninbox.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.UUID

class PendingCaptureStore(context: Context) {
    private val preferences = context.getSharedPreferences("pending-captures", Context.MODE_PRIVATE)
    @Synchronized fun all(): JSONArray = JSONArray(preferences.getString("queue", "[]"))
    @Synchronized fun append(text: String, subject: String) {
        val queue = all()
        if (queue.length() >= 50 || queue.toString().length + text.length > 2000000) throw IOException("待保存分享过多，请先整理草稿")
        queue.put(JSONObject().put("captureId", UUID.randomUUID().toString()).put("text", text)
            .put("subject", subject).put("receivedAt", System.currentTimeMillis()))
        if (!preferences.edit().putString("queue", queue.toString()).commit()) throw IOException("分享未能保存，请重试")
    }
    @Synchronized fun acknowledge(id: String) {
        val queue = all(); val remaining = JSONArray()
        for (i in 0 until queue.length()) { val capture = queue.getJSONObject(i); if (capture.getString("captureId") != id) remaining.put(capture) }
        if (!preferences.edit().putString("queue", remaining.toString()).commit()) throw IOException("交接未完成，请重试")
    }
}
