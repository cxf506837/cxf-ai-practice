package com.ribboninbox.app

import java.net.URI

object AssetRoutes {
    const val ORIGIN = "https://appassets.androidplatform.net"

    fun resolve(url: String): String? {
        val uri = try { URI(url) } catch (_: IllegalArgumentException) { return null }
            catch (_: java.net.URISyntaxException) { return null }
        if (uri.scheme != "https" || uri.host != "appassets.androidplatform.net" || uri.port != -1 || uri.userInfo != null) return null
        val path = uri.path ?: return null
        if (path.contains('\\') || path.contains('\u0000') || path.split('/').any { it == ".." || it == "." }) return null
        return "site" + if (path.isEmpty() || path.endsWith('/')) "$path/index.html".replace("//", "/") else path
    }
}
