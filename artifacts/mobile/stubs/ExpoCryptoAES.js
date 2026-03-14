// Stub for ExpoCryptoAES native module.
// The real module only exists in custom native builds (not Expo Go).
// Safe to stub because PKCE is disabled (usePKCE: false) so AES crypto
// functions are never actually called at runtime.
const stub = {
  encryptAsync: () => Promise.resolve(""),
  decryptAsync: () => Promise.resolve(""),
  generateKeyAsync: () => Promise.resolve(""),
};
module.exports = stub;
module.exports.default = stub;
