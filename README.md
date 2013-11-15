Buffer
======

Browser version of <a href="http://nodejs.org/api/buffer.html">NodeJS Buffer</a>.

Description
============

This class provides the same behavior and interface as <a href="http://nodejs.org/api/buffer.html">NodeJS Buffer</a>.
And can be used within browser environment.

Example
------------
```javascript
var str = '𐐀 мир труд 𝄞май€';
var utf16Buf = new Buffer(str, 'utf16le');

console.log('buffer', utf16Buf, utf16Buffer.toString('utf16le'));
console.log('buffer to utf-8', utf16Buf.toString('utf8'));

var hexBuf = new Buffer('aabbccddee', 'hex');
console.log(hexBuf.toString('hex'))

/*
 * Buffer copy example.
 */
var buf1 = new Buffer(26);
var buf2 = new Buffer(26);

for(var i = 0; i < 26; i++) {
    buf1[i] = i + 97; // 97 is ASCII a
    buf2[i] = 33; // ASCII !
}

buf1.copy(buf2, 8, 16, 20);
console.log(buf2.toString('ascii', 0, 25)); // !!!!!!!!qrst!!!!!!!!!!!!!

/*
 * Buffer slice example.
 */
var buf1 = new Buffer(26);

for(var i = 0; i < 26; i++) {
    buf1[i] = i + 97; // 97 is ASCII a
}

var buf2 = buf1.slice(0, 3);

console.log(buf2.toString('ascii', 0, buf2.length)); // abc
buf1[0] = 33;
console.log(buf2.toString('ascii', 0, buf2.length)); // !bc

/*
 * Buffer fill example.
 */
var b = new Buffer(50);
b.fill('h');
console.log(b.toString('hex'));
*/

/**
 * Buffer inspect.
 */
var myBuf = new Buffer('quick brown fox jumps over the lazy dog');
console.log(myBuf.inspect());

// How many bytes will be returned when buffer.inspect() is called.
Buffer.INSPECT_MAX_BYTES = 50; // default
```
