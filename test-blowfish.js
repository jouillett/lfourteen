const { Blowfish } = require('javascript-blowfish');

const secretKey = 'yrhan';
const bf = new Blowfish(secretKey);
const plainText = '1234';

const encrypted = bf.encrypt(plainText);
console.log('암호화된 텍스트:', encrypted);
const decrypted = bf.trimZeros(bf.decrypt(encrypted));
console.log('복호화된 텍스트:', decrypted);
