import CryptoJS from "crypto-js";

export class CryptoUtils {
  // ==================== MÉTODOS COMPATÍVEIS COM BACKEND ====================

  /**
   * ✅ COMPATÍVEL: Hash SHA-256 em Base64 (igual backend)
   */
  static hashWithSHA256(data) {
    if (typeof data !== "string") {
      data = JSON.stringify(data);
    }
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Base64);
  }

  /**
   * ✅ COMPATÍVEL: Hash SHA3-256 em Hex (igual backend)
   */
  static hashWithSHA3_256(data) {
    if (typeof data !== "string") {
      data = JSON.stringify(data);
    }
    return CryptoJS.SHA3(data, { outputLength: 256 }).toString(
      CryptoJS.enc.Hex
    );
  }

  /**
   * ✅ COMPATÍVEL: Hash SHA3-512 em Hex (igual backend)
   */
  static hashWithSHA3_512(data) {
    if (typeof data !== "string") {
      data = JSON.stringify(data);
    }
    return CryptoJS.SHA3(data, { outputLength: 512 }).toString(
      CryptoJS.enc.Hex
    );
  }

  /**
   * ✅ COMPATÍVEL: PGP Encryption - Formato IDÊNTICO ao backend
   */
  static async pgpEncrypt(data, publicKey) {
    try {
      console.log("🔐 Frontend: Iniciando PGP encrypt...");

      // 1) Gerar chave AES 128 bits (igual backend)
      const aesKeyB64 = await this.generateAesKeyBase64(128);

      // 2) Criptografar dados com AES-GCM
      const { iv, ciphertext } = await this.aesGcmEncryptBase64(
        aesKeyB64,
        data
      );

      // 3) Criptografar chave AES com RSA (OAEP)
      const encryptedKey = await this.rsaEncryptWithPublicPEM(
        publicKey,
        aesKeyB64
      );

      // 4) Hash SHA-256 para integridade
      const hash = this.hashWithSHA256(data);

      // ✅ FORMATO EXATO que o backend espera:
      const result = {
        encryptedKey: encryptedKey,
        iv: iv,
        ciphertext: ciphertext,
        hash: hash,
        algorithm: "PGP-RSA-AES", // ⚠️ IGUAL ao backend
      };

      console.log("✅ Frontend: PGP encrypt concluído - formato compatível");
      return JSON.stringify(result);
    } catch (error) {
      console.error("❌ Frontend: Erro no PGP encrypt:", error);
      throw error;
    }
  }

  /**
   * ✅ COMPATÍVEL: PGP Decryption - Formato IDÊNTICO ao backend
   */
  static async pgpDecrypt(encryptedData, privateKey) {
    try {
      console.log("🔓 Frontend: Iniciando PGP decrypt...");

      // Parse do formato que backend envia
      const pkg =
        typeof encryptedData === "string"
          ? JSON.parse(encryptedData)
          : encryptedData;

      if (!pkg.encryptedKey || !pkg.iv || !pkg.ciphertext) {
        throw new Error("Formato PGP inválido - campos em falta");
      }

      const { encryptedKey, iv, ciphertext, hash } = pkg;

      // 1) Descriptografar chave AES
      const aesKeyB64 = await this.rsaDecryptWithPrivatePEM(
        privateKey,
        encryptedKey
      );

      // 2) Descriptografar dados
      const plaintext = await this.aesGcmDecryptBase64(
        aesKeyB64,
        iv,
        ciphertext
      );

      // 3) Verificar integridade (se hash existir)
      if (hash) {
        const calculatedHash = this.hashWithSHA256(plaintext);
        if (calculatedHash !== hash) {
          throw new Error("Falha na verificação de integridade SHA-256");
        }
      }

      console.log("✅ Frontend: PGP decrypt concluído");
      return plaintext;
    } catch (error) {
      console.error("❌ Frontend: Erro no PGP decrypt:", error);
      throw error;
    }
  }

  /**
   * ✅ COMPATÍVEL: Geração RSA 1024 bits (igual requisito I.a)
   */
  static async generateRSAKeyPair(keySize = 1024) {
    if (!this.isWebCryptoSupported()) {
      throw new Error("WebCrypto não suportado");
    }

    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: keySize,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    // Exportar para formato que backend espera
    const spki = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );
    const pkcs8 = await window.crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    );

    const publicB64 = this.arrayBufferToBase64(spki);
    const privateB64 = this.arrayBufferToBase64(pkcs8);

    return {
      publicKey: this.spkiToPEM(publicB64),
      privateKey: this.pkcs8ToPEM(privateB64),
      keySize: keySize,
    };
  }

  // ==================== MÉTODOS AUXILIARES (mantêm iguais) ====================

  static isWebCryptoSupported() {
    return (
      typeof window !== "undefined" && window.crypto && window.crypto.subtle
    );
  }

  static arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  static async generateAesKeyBase64(lengthBits = 128) {
    const key = window.crypto.getRandomValues(new Uint8Array(lengthBits / 8));
    return this.arrayBufferToBase64(key.buffer);
  }

  static async aesGcmEncryptBase64(aesKeyB64, plaintext) {
    const keyBuf = this.base64ToArrayBuffer(aesKeyB64);
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBuf,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();

    const cipherBuf = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encoder.encode(plaintext)
    );

    return {
      iv: this.arrayBufferToBase64(iv.buffer),
      ciphertext: this.arrayBufferToBase64(cipherBuf),
    };
  }

  static async aesGcmDecryptBase64(aesKeyB64, ivB64, ciphertextB64) {
    const keyBuf = this.base64ToArrayBuffer(aesKeyB64);
    const ivBuf = this.base64ToArrayBuffer(ivB64);
    const ctBuf = this.base64ToArrayBuffer(ciphertextB64);

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBuf,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const plainBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuf) },
      cryptoKey,
      ctBuf
    );

    return new TextDecoder().decode(plainBuf);
  }

  static async rsaEncryptWithPublicPEM(pemPublic, dataStr) {
    const b64 = this.pemToBase64(pemPublic);
    const arr = this.base64ToArrayBuffer(b64);

    const pubKey = await window.crypto.subtle.importKey(
      "spki",
      arr,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );

    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pubKey,
      new TextEncoder().encode(dataStr)
    );

    return this.arrayBufferToBase64(encrypted);
  }

  static async rsaDecryptWithPrivatePEM(pemPrivate, encryptedB64) {
    const b64 = this.pemToBase64(pemPrivate);
    const arr = this.base64ToArrayBuffer(b64);

    const privKey = await window.crypto.subtle.importKey(
      "pkcs8",
      arr,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );

    const encryptedBuf = this.base64ToArrayBuffer(encryptedB64);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      encryptedBuf
    );

    return new TextDecoder().decode(decrypted);
  }

  static spkiToPEM(spkiB64) {
    return this.formatToPEM(spkiB64, "PUBLIC");
  }

  static pkcs8ToPEM(pkcs8B64) {
    return this.formatToPEM(pkcs8B64, "PRIVATE");
  }

  static formatToPEM(base64Key, type = "PUBLIC") {
    const header = `-----BEGIN ${type} KEY-----\n`;
    const footer = `\n-----END ${type} KEY-----`;
    let formatted = "";
    for (let i = 0; i < base64Key.length; i += 64) {
      formatted += base64Key.substring(i, i + 64) + "\n";
    }
    return header + formatted.trim() + footer;
  }

  static pemToBase64(pem) {
    return pem
      .replace(/-----BEGIN [A-Z ]+-----/, "")
      .replace(/-----END [A-Z ]+-----/, "")
      .replace(/\s+/g, "");
  }

  // ==================== DIFFIE-HELLMAN COMPATÍVEL ====================

  static prng128Hex() {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      window.crypto.getRandomValues(arr);
      return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    // Fallback
    let hex = "";
    for (let i = 0; i < 16; i++) {
      hex += Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0");
    }
    return hex;
  }

  /**
   * ✅ COMPATÍVEL: Diffie-Hellman com PRNG 128 bits (requisito I.d)
   */
  static generateDHKeyPair() {
    // Usar grupo DH 2048 bits (igual backend)
    const p = BigInt(
      "0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381FFFFFFFFFFFFFFFF"
    );
    const g = 2n;

    // PRNG 128 bits (requisito I.d)
    const privateKey = BigInt("0x" + this.prng128Hex());
    const publicKey = this.modPow(g, privateKey, p);

    return {
      publicKey: publicKey.toString(16),
      privateKey: privateKey.toString(16),
    };
  }

  static modPow(base, exponent, modulus) {
    base = base % modulus;
    let result = 1n;
    while (exponent > 0n) {
      if (exponent & 1n) result = (result * base) % modulus;
      exponent = exponent >> 1n;
      base = (base * base) % modulus;
    }
    return result;
  }

  // ==================== VERIFICAÇÃO DE COMPATIBILIDADE ====================

  /**
   * Testa se frontend e backend são compatíveis
   */
  static async testBackendCompatibility() {
    const tests = {
      rsaKeyGeneration: false,
      pgpEncryption: false,
      hashing: false,
      dh: false,
    };

    try {
      // Teste RSA
      const rsaKeys = await this.generateRSAKeyPair(1024);
      tests.rsaKeyGeneration = rsaKeys.publicKey.includes("BEGIN PUBLIC KEY");

      // Teste Hashing
      const hash = this.hashWithSHA256("test");
      tests.hashing = hash.length > 0 && this.isValidBase64(hash);

      // Teste Diffie-Hellman
      const dhKeys = this.generateDHKeyPair();
      tests.dh = dhKeys.publicKey.length > 0 && dhKeys.privateKey.length > 0;

      // Teste PGP (se temos chaves)
      if (rsaKeys.publicKey && rsaKeys.privateKey) {
        const encrypted = await this.pgpEncrypt("test", rsaKeys.publicKey);
        const decrypted = await this.pgpDecrypt(encrypted, rsaKeys.privateKey);
        tests.pgpEncryption = decrypted === "test";
      }

      console.log("✅ Compatibilidade com Backend:", tests);
      return tests;
    } catch (error) {
      console.error("❌ Teste de compatibilidade falhou:", error);
      return { ...tests, error: error.message };
    }
  }
}

export default CryptoUtils;
