const { Blowfish } = require('javascript-blowfish');

const bf = new Blowfish('yrhan');
const storedPassword = "ok/hR9ydYiE=";

try {
  const decrypted = bf.trimZeros(bf.decrypt(bf.base64Decode(storedPassword)));
  console.log("Decrypted:", decrypted);
} catch (e) {
  console.log("Error:", e.message);
}
