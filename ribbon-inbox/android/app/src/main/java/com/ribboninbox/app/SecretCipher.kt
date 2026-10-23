package com.ribboninbox.app
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

object SecretCipher {
    private val context = "ribbon-inbox-personal-key-v1".toByteArray(Charsets.UTF_8)
    fun encrypt(key: SecretKey, data: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key); cipher.updateAAD(context)
        require(cipher.iv.size == 12)
        return cipher.iv + cipher.doFinal(data)
    }
    fun decrypt(key: SecretKey, data: ByteArray): ByteArray {
        require(data.size >= 28)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, data.copyOfRange(0,12))); cipher.updateAAD(context)
        return cipher.doFinal(data.copyOfRange(12,data.size))
    }
}
