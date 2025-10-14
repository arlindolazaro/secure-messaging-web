import CryptoJS from "crypto-js";

export class CryptoUtils {
  // Hashing
  static sha256(data) {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  static sha3(data, bits = 256) {
    if (bits === 256) {
      return CryptoJS.SHA3(data, { outputLength: 256 }).toString(
        CryptoJS.enc.Hex
      );
    } else {
      return CryptoJS.SHA3(data, { outputLength: 512 }).toString(
        CryptoJS.enc.Hex
      );
    }
  }

  // Codificação Base64
  static base64Encode(data) {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data));
  }

  static base64Decode(data) {
    return CryptoJS.enc.Base64.parse(data).toString(CryptoJS.enc.Utf8);
  }

  // Geração de chave AES a partir de password
  static deriveAESKey(password, salt = "secure-messaging-salt") {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 1000,
    });
  }

  // Encriptação AES
  static encryptAES(data, key) {
    const encrypted = CryptoJS.AES.encrypt(data, key);
    return encrypted.toString();
  }

  static decryptAES(encryptedData, key) {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  // Validação de formato PEM
  static isValidPEM(pemString, type = "PUBLIC") {
    const pattern = new RegExp(
      `-----BEGIN ${type} KEY-----([A-Za-z0-9+/=\\s]+)-----END ${type} KEY-----`
    );
    return pattern.test(pemString);
  }

  // Extração de Base64 de PEM
  static extractBase64FromPEM(pemString) {
    return pemString
      .replace(/-----BEGIN [A-Z ]+ KEY-----/, "")
      .replace(/-----END [A-Z ]+ KEY-----/, "")
      .replace(/\s/g, "");
  }

  // Formatação para PEM
  static formatToPEM(base64Key, type = "PUBLIC") {
    const header = `-----BEGIN ${type} KEY-----\n`;
    const footer = `\n-----END ${type} KEY-----`;

    let formatted = "";
    for (let i = 0; i < base64Key.length; i += 64) {
      formatted += base64Key.substring(i, i + 64) + "\n";
    }

    return header + formatted.trim() + footer;
  }

  // Geração de ID único
  static generateId() {
    return "id-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  // PRNG 128-bit: retorna hex de 16 bytes (128 bits)
  static prng128Hex() {
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.getRandomValues
    ) {
      const arr = new Uint8Array(16);
      window.crypto.getRandomValues(arr);
      return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    // Fallback para Node / ambientes sem crypto.getRandomValues
    let hex = "";
    for (let i = 0; i < 16; i++) {
      hex += Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0");
    }
    return hex;
  }

  /* -----------------------------
     Helpers: ArrayBuffer <-> Base64
  ------------------------------*/
  static arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // btoa não insere quebras de linha; garante padding correto
    return btoa(binary);
  }

  static base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /* -----------------------------
     PEM helpers
  ------------------------------*/
  static spkiToPEM(spkiB64) {
    const b64 = spkiB64;
    let pem = "-----BEGIN PUBLIC KEY-----\n";
    for (let i = 0; i < b64.length; i += 64) {
      pem += b64.substring(i, i + 64) + "\n";
    }
    pem += "-----END PUBLIC KEY-----";
    return pem;
  }

  static pkcs8ToPEM(pkcs8B64) {
    const b64 = pkcs8B64;
    let pem = "-----BEGIN PRIVATE KEY-----\n";
    for (let i = 0; i < b64.length; i += 64) {
      pem += b64.substring(i, i + 64) + "\n";
    }
    pem += "-----END PRIVATE KEY-----";
    return pem;
  }

  static pemToBase64(pem) {
    return pem
      .replace(/-----BEGIN [A-Z ]+-----/, "")
      .replace(/-----END [A-Z ]+-----/, "")
      .replace(/\s+/g, "");
  }

  /* -----------------------------
     WebCrypto RSA gen/import/export
     Generates RSA 1024 key pair and returns PEM strings
  ------------------------------*/
  static async generateRSAKeyPairWebCrypto(keySize = 1024) {
    if (!window?.crypto?.subtle) {
      throw new Error("WebCrypto não disponível no ambiente");
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

    const spki = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );
    const pkcs8 = await window.crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    );

    const publicB64 = CryptoUtils.arrayBufferToBase64(spki);
    const privateB64 = CryptoUtils.arrayBufferToBase64(pkcs8);

    return {
      publicKeyPEM: CryptoUtils.spkiToPEM(publicB64),
      privateKeyPEM: CryptoUtils.pkcs8ToPEM(privateB64),
    };
  }

  static async importPublicKeyFromPEM(pem) {
    const b64 = CryptoUtils.pemToBase64(pem);
    const arr = CryptoUtils.base64ToArrayBuffer(b64);
    return await window.crypto.subtle.importKey(
      "spki",
      arr,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
  }

  static async importPrivateKeyFromPEM(pem) {
    const b64 = CryptoUtils.pemToBase64(pem);
    const arr = CryptoUtils.base64ToArrayBuffer(b64);
    return await window.crypto.subtle.importKey(
      "pkcs8",
      arr,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );
  }

  /* -----------------------------
     RSA-OAEP encrypt/decrypt (for small payloads like AES keys)
  ------------------------------*/
  static async rsaEncryptWithPublicPEM(pemPublic, dataStr) {
    const pubKey = await CryptoUtils.importPublicKeyFromPEM(pemPublic);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataStr);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pubKey,
      data
    );
    return CryptoUtils.arrayBufferToBase64(encrypted);
  }

  static async rsaDecryptWithPrivatePEM(pemPrivate, encryptedB64) {
    const privKey = await CryptoUtils.importPrivateKeyFromPEM(pemPrivate);
    const encryptedBuf = CryptoUtils.base64ToArrayBuffer(encryptedB64);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      encryptedBuf
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /* -----------------------------
     AES-GCM helpers
  ------------------------------*/
  static async generateAesKeyBase64(lengthBits = 256) {
    const key = window.crypto.getRandomValues(new Uint8Array(lengthBits / 8));
    return CryptoUtils.arrayBufferToBase64(key.buffer);
  }

  static async aesGcmEncryptBase64(aesKeyB64, plaintext) {
    const keyBuf = CryptoUtils.base64ToArrayBuffer(aesKeyB64);
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
      iv: CryptoUtils.arrayBufferToBase64(iv.buffer),
      ciphertext: CryptoUtils.arrayBufferToBase64(cipherBuf),
    };
  }

  static async aesGcmDecryptBase64(aesKeyB64, ivB64, ciphertextB64) {
    const keyBuf = CryptoUtils.base64ToArrayBuffer(aesKeyB64);
    const ivBuf = CryptoUtils.base64ToArrayBuffer(ivB64);
    const ctBuf = CryptoUtils.base64ToArrayBuffer(ciphertextB64);
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

  /* -----------------------------
     PGP-style hybrid encrypt/decrypt
     package: JSON string with { encryptedKey, iv, ciphertext }
  ------------------------------*/
  static async pgpEncrypt(plaintext, recipientPublicPEM) {
    // 1) gerar chave AES (256)
    const aesKeyB64 = await CryptoUtils.generateAesKeyBase64(256);

    // 2) cifrar plaintext com AES-GCM
    const { iv, ciphertext } = await CryptoUtils.aesGcmEncryptBase64(
      aesKeyB64,
      plaintext
    );

    // 3) cifrar AES key com RSA-OAEP
    const encryptedKey = await CryptoUtils.rsaEncryptWithPublicPEM(
      recipientPublicPEM,
      aesKeyB64
    );

    // Retornar objeto JSON com campos explícitos para o backend
    return JSON.stringify({
      encryptedKey: encryptedKey,
      iv: iv,
      ciphertext: ciphertext,
    });
  }

  static async pgpDecrypt(packageJsonStr, recipientPrivatePEM) {
    const pkg =
      typeof packageJsonStr === "string"
        ? JSON.parse(packageJsonStr)
        : packageJsonStr;
    if (!pkg || !pkg.encryptedKey) {
      throw new Error("Formato de pacote PGP inválido");
    }
    const { encryptedKey, iv, ciphertext } = pkg;
    const aesKeyB64 = await CryptoUtils.rsaDecryptWithPrivatePEM(
      recipientPrivatePEM,
      encryptedKey
    );
    const plaintext = await CryptoUtils.aesGcmDecryptBase64(
      aesKeyB64,
      iv,
      ciphertext
    );
    return plaintext;
  }

  /* -----------------------------
     Signing & verification (RSASSA-PKCS1-v1_5 SHA-256)
  ------------------------------*/
  static async importPrivateKeyForSign(pem) {
    const b64 = CryptoUtils.pemToBase64(pem);
    const arr = CryptoUtils.base64ToArrayBuffer(b64);
    return await window.crypto.subtle.importKey(
      "pkcs8",
      arr,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }

  static async importPublicKeyForVerify(pem) {
    const b64 = CryptoUtils.pemToBase64(pem);
    const arr = CryptoUtils.base64ToArrayBuffer(b64);
    return await window.crypto.subtle.importKey(
      "spki",
      arr,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }

  static async signWithPrivatePEM(privatePEM, data) {
    const key = await CryptoUtils.importPrivateKeyForSign(privatePEM);
    const sig = await window.crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      new TextEncoder().encode(data)
    );
    return CryptoUtils.arrayBufferToBase64(sig);
  }

  static async verifyWithPublicPEM(publicPEM, data, signatureB64) {
    const key = await CryptoUtils.importPublicKeyForVerify(publicPEM);
    const sigBuf = CryptoUtils.base64ToArrayBuffer(signatureB64);
    return await window.crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      sigBuf,
      new TextEncoder().encode(data)
    );
  }

  /* -----------------------------
     SHA3-512 alias
  ------------------------------*/
  static sha3_512(data) {
    return CryptoJS.SHA3(data, { outputLength: 512 }).toString(
      CryptoJS.enc.Hex
    );
  }

  /* -----------------------------
     Diffie-Hellman (modular exponentiation using BigInt)
     Uses RFC 3526 group 14 (2048-bit) by default
  ------------------------------*/
  static dh_group_2048_p_hex = `
FFFFFFFF FFFFFFFF C90FDAA2 2168C234 C4C6628B 80DC1CD1
29024E08 8A67CC74 020BBEA6 3B139B22 514A0879 8E3404DD
EF9519B3 CD3A431B 302B0A6D F25F1437 4FE1356D 6D51C245
E485B576 625E7EC6 F44C42E9 A63A3620 FFFFFFFF FFFFFFFF`.replace(/\s+/g, "");

  static dh_generator = 2n;

  static hexToBigInt(hex) {
    return BigInt("0x" + hex);
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

  static generateDHKeyPair(prngHex = null) {
    const p = CryptoUtils.hexToBigInt(CryptoUtils.dh_group_2048_p_hex);
    const g = CryptoUtils.dh_generator;
    const randHex = prngHex || CryptoUtils.prng128Hex();
    const privateKey = BigInt("0x" + randHex);
    const publicKey = CryptoUtils.modPow(g, privateKey, p);
    return {
      privateKey: privateKey.toString(16),
      publicKey: publicKey.toString(16),
    };
  }

  static computeDHSharedSecret(myPrivateHex, otherPublicHex) {
    const p = CryptoUtils.hexToBigInt(CryptoUtils.dh_group_2048_p_hex);
    const a = BigInt("0x" + myPrivateHex);
    const b = BigInt("0x" + otherPublicHex);
    const shared = CryptoUtils.modPow(b, a, p);
    // return hex string
    return shared.toString(16);
  }

  // Validação de força de password
  static validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid:
        password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers,
      details: {
        length: password.length >= minLength,
        upperCase: hasUpperCase,
        lowerCase: hasLowerCase,
        numbers: hasNumbers,
        specialChar: hasSpecialChar,
      },
    };
  }

  /* -----------------------------
     Encrypt/Decrypt PEM using password (PBKDF2 + AES)
     Returns/accepts a JSON string with {salt, iv, ciphertext}
  ------------------------------*/
  static encryptPrivateKeyWithPassword(privatePEM, password) {
    // generate random salt and iv
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString(
      CryptoJS.enc.Hex
    );
    const iv = CryptoJS.lib.WordArray.random(128 / 8).toString(
      CryptoJS.enc.Hex
    );

    // derive key (256-bit) using PBKDF2
    const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
      keySize: 256 / 32,
      iterations: 10000,
    });

    const encrypted = CryptoJS.AES.encrypt(privatePEM, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return JSON.stringify({ salt, iv, ciphertext: encrypted.toString() });
  }

  static decryptPrivateKeyWithPassword(encryptedJsonStr, password) {
    try {
      const obj =
        typeof encryptedJsonStr === "string"
          ? JSON.parse(encryptedJsonStr)
          : encryptedJsonStr;
      const { salt, iv, ciphertext } = obj;

      const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
        keySize: 256 / 32,
        iterations: 10000,
      });

      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      if (!plaintext) throw new Error("Senha inválida ou dados corrompidos");
      return plaintext;
    } catch (e) {
      throw new Error("Falha ao decifrar chave privada: " + e.message);
    }
  }
}
