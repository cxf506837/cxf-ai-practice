package com.ribboninbox.app
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import java.util.Base64
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class SecretStore(context: Context) {
    private val preferences = context.getSharedPreferences("personal-model",Context.MODE_PRIVATE)
    private val alias = "ribbon-inbox-personal-model-v1"
    private fun key(create: Boolean): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias,null) as? SecretKey)?.let { return it }
        check(create)
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build())
            generateKey()
        }
    }
    fun read(): String? {
        val encoded = preferences.getString("ciphertext",null) ?: return null
        return String(SecretCipher.decrypt(key(false),Base64.getDecoder().decode(encoded)),Charsets.UTF_8)
    }
    fun save(secret: String) {
        val data = secret.toByteArray(Charsets.UTF_8)
        try { check(preferences.edit().putString("ciphertext",Base64.getEncoder().encodeToString(SecretCipher.encrypt(key(true),data))).commit()) }
        finally { data.fill(0) }
    }
    fun remove() { check(preferences.edit().remove("ciphertext").commit()) }
    fun configured() = preferences.contains("ciphertext")
}
