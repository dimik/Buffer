( // Module boilerplate to support browser globals and AMD.
    (typeof define === 'function' && function (m) { define('Buffer', m); }) ||
    (function (m) { window.Buffer = m(); })
)(function () {

    'use strict';

    function Buffer(subject, encoding) {
        switch(typeof subject) {
            case 'string':
                var buf = createBufferBySize(Buffer.byteLength(subject, encoding = encoding || 'utf8'));

                buf.write(subject, 0, encoding);

                return buf;
            case 'number':
                return createBufferBySize(subject > 0 ? Math.floor(subject) : 0);
            case 'object':
                if(isArray(subject) || subject instanceof ArrayBuffer) {
                    return createBufferFromSource(subject);
                }
                else if(Buffer.isBuffer(subject)) {
                    var buf = createBufferBySize(subject.length);

                    subject.copy(buf, 0, 0, buf.length);

                    return buf;
                }
            default:
                throw new TypeError('must start with number, buffer, array or string');
        }
    }

    function createBufferFromSource(source, offset, length) {
        return extend(new Uint8Array(source, offset, length), proto);
    }

    function createBufferBySize(length) {
        return extend(new Uint8Array(new ArrayBuffer(length)), proto);
    }

    var proto = {
        constructor: Buffer,
        valueOf: function () {
            return this.buffer;
        },
        toString: function (encoding, start, end) {
            var len = this.length;

            encoding = String(encoding || 'utf8').toLowerCase();
            start = ~~start;
            end = isUndefined(end)? len : ~~end;

            if(start < 0) {
                start = 0;
            }
            if(end > len) {
                end = len;
            }
            if(end <= start) {
                return '';
            }

            var offset = start,
                length = offset > 0? end - offset : end;

            switch(encoding) {
                case 'utf8':
                case 'utf-8':
                    return utf8Read(this, offset, length);
                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                    return ucs2Read(this, offset, length);
                case 'hex':
                    return hexRead(this, offset, length);
                case 'raw':
                case 'ascii':
                case 'binary':
                    return rawRead(this, offset, length);
                case 'base64':
                    return base64Read(this, offset, length);
                default:
                    throw new TypeError('Unknown encoding: ' + encoding);
            }
        },
        toJSON: function () {
            return {
                type: 'Buffer',
                data: Array.prototype.slice.call(this, 0)
            };
        },
        write: function (s, offset, length, encoding) {
            // allow write(string, encoding)
            if(typeof offset === 'string' && length == null) {
                encoding = offset;
                offset = 0;
            }
            // allow write(string, offset[, length], encoding)
            else if(isFinite(offset)) {
                offset = ~~offset;
                if(isFinite(length)) {
                    length = ~~length;
                }
                else {
                    encoding = length;
                    length = null;
                }
            }

            var remaining = this.length - offset;

            if(length == null || length > remaining) {
                length = remaining;
            }

            encoding = String(encoding || 'utf8').toLowerCase();

            if(s.length > 0 && (length < 0 || offset < 0)) {
                throw new RangeError('attempt to write beyond buffer bounds');
            }

            switch(encoding) {
                case 'utf-8':
                case 'utf8':
                    return utf8Write(this, s, offset, length);
                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                    return ucs2Write(this, s, offset, length);
                case 'hex':
                    return hexWrite(this, s, offset, length);
                case 'raw':
                case 'ascii':
                case 'binary':
                    return rawWrite(this, s, offset, length);
                case 'base64':
                    return base64Write(this, s, offset, length);
                default:
                    throw new TypeError('Unknown encoding: ' + encoding);
            }
        },
        slice: function (start, end) {
            var len = this.length;

            start = ~~start;
            end = isUndefined(end) ? len : ~~end;

            if(start < 0) {
                start += len;

                if(start < 0) {
                    start = 0;
                }
            }
            else if(start > len) {
                start = len;
            }

            if(end < 0) {
                end += len;

                if(end < 0) {
                    end = 0;
                }
            }
            else if(end > len) {
                end = len;
            }

            if(end < start) {
                end = start;
            }

            return createBufferFromSource(this.buffer, start, end);
        },
        copy: function (targetBuffer, targetStart, sourceStart, sourceEnd) {
            var len = this.length;

            targetStart = ~~targetStart;
            sourceStart = ~~sourceStart;
            sourceEnd = isUndefined(sourceEnd) ? len : ~~sourceEnd;

            if(!inRange(sourceEnd, sourceStart, len)) {
                sourceEnd = len;
            }

            if(targetStart < 0 || targetStart > targetBuffer.length) {
                targetStart = 0;
            }

            if(sourceStart < 0 || sourceStart > sourceEnd) {
                sourceStart = 0;
            }

            for(var i = 0, l = sourceEnd - sourceStart; i < l; i++) {
                targetBuffer[i + targetStart] = this[i + sourceStart];
            }
        },
        fill: function (value, offset, end) {
            var len = this.length;

            offset = ~~offset;
            end = isUndefined(end)? len : ~~end;

            if(!inRange(end, 0, len)) {
                end = len;
            }

            if(offset < 0 || offset > end) {
                offset = 0;
            }

            var n = 0;

            switch(typeof value) {
                case 'string':
                    if(value.length) {
                        n = value.charCodeAt(0);
                        break;
                    }
                default:
                    n = ~~value;
            }

            for(var i = offset; i < end; i++) {
                this[i] = n;
            }
        },
        inspect: function () {
            var str = '';
            var max = Buffer.INSPECT_MAX_BYTES;

            if(this.length > 0) {
                str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
                if(this.length > max) {
                    str += ' ... ';
                }
            }

            return '<Buffer ' + str + '>';
        }
    };

    function checkOffset(offset, ext, length) {
        if(offset < 0 || offset + ext > length) {
            throw new RangeError('index out of range');
        }
    }

    var methods = {
        Int8: 'Int8',
        UInt8: 'UInt8',
        Int16LE: 'Int16',
        Int16BE: 'int16',
        UInt16LE: 'UInt16',
        UInt16BE: 'Uint16',
        Int32LE: 'Int32',
        Int32BE: 'Int32',
        UInt32LE: 'UInt32',
        UInt32BE: 'UInt32',
        FloatLE: 'Float32',
        FloatBE: 'Float32',
        DoubleLE: 'Float64',
        DoubleBE: 'Float64'
    };

    for(var method in methods) {
        proto['read' + method] = function (offset, noAssert) {
            return (new DataView(this.buffer))['get' + methods[method]](
                ~~offset,
                method.substr(-2, 2) === 'LE'
            );
        };
        proto['write' + method] = function (value, offset, noAssert) {
            return (new DataView(this.buffer))['set' + methods[method]](
                ~~offset,
                +value,
                method.substr(-2, 2) === 'LE'
            );
        };
    }

    Buffer.isBuffer = function (subject) {
        /* duck typing */
        return subject.toString === proto.toString;
    };

    Buffer.isEncoding = function (encoding) {
        switch((encoding + '').toLowerCase()) {
            case 'hex':
            case 'utf8':
            case 'utf-8':
            case 'ascii':
            case 'binary':
            case 'base64':
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
            case 'raw':
                return true;
            default:
                return false;
        }
    };

    Buffer.concat = function(list, length) {
        if(!isArray(list)) {
            throw new TypeError('Usage: Buffer.concat(list[, length])');
        }

        if(typeof length === 'undefined') {
            length = 0;
            for(var i = 0; i < list.length; i++) {
                length += list[i].length;
            }
        }
        else {
            length = ~~length;
        }

        if(length < 0) {
            length = 0;
        }

        if(list.length === 0) {
            return new Buffer(0);
        }
        else if(list.length === 1) {
            return list[0];
        }

        var buffer = new Buffer(length);
        var pos = 0;

        for(var i = 0; i < list.length; i++) {
            var buf = list[i];
            buf.copy(buffer, pos);
            pos += buf.length;
        }

        return buffer;
    };

    Buffer.byteLength = function (s, encoding) {
        s = String(s);
        encoding = String(encoding || 'utf8').toLowerCase();

        switch(encoding) {
            case 'utf8':
            case 'utf-8':
                return utf8ByteLength(s);
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
                return ucs2ByteLength(s);
            case 'hex':
                return hexByteLength(s);
            case 'raw':
            case 'ascii':
            case 'binary':
                return rawByteLength(s);
            case 'base64':
                return base64ByteLength(s);
            default:
                throw new TypeError('Unknown encoding: ' + encoding);
        }
    };

    Buffer.INSPECT_MAX_BYTES = 50;

    /**
     * base64
     */
    function base64ByteLength(s) {
        return s.length;
    }

    function base64Read(buf, offset, length) {
        var s = "";

        for(var i = offset; i < length; i++) {
            s += window.btoa(buf[i]);
        }

        return s;
    }

    function base64Write(buf, s, offset, length) {
        for(var i = 0, n = offset; n - offset < length && i < s.length; i++) {
            buf[n++] = window.atob(s.charCodeAt(i));
        }

        return n - offset;
    }

    /**
     * raw, ascii, binary
     */
    function rawByteLength(s) {
        return s.length;
    }

    function rawRead(buf, offset, length) {
        var s = "";

        for(var i = offset; i < length; i++) {
            s += String.fromCharCode(buf[i]);
        }

        return s;
    }

    function rawWrite(buf, s, offset, length) {
        for(var i = 0, n = offset; n - offset < length && i < s.length; i++) {
            buf[n++] = s.charCodeAt(i);
        }

        return n - offset;
    }

    /**
     * ucs2, utf16le
     */
    function ucs2ByteLength(s) {
        var length = 0;

        for(var i = 0, l = s.length; i < l; i++) {
            length += s.charCodeAt(i) <= 0xFFFF? 2 : 4;
        }

        return length;
    }

    function ucs2Read(buf, offset, length) {
        var s = "", n, charCode, leadByte = null, leadSurrogate = null,
            toStringChars = function (charCode) {
                if(charCode <= 0xFFFF) {
                    s += String.fromCharCode(charCode);
                }
                else {
                    charCode -= 0x10000;
                    s += String.fromCharCode(0xD800 + ((charCode >> 10) & 0x3ff));
                    s += String.fromCharCode(0xDC00 + (charCode & 0x3ff));
                }
            };

        for(var i = offset; i < length; i++) {
            n = buf[i];

            if(leadByte === null) {
                leadByte = n;
                continue;
            }

            charCode = (n << 8) + leadByte;
            leadByte = null;

            if(leadSurrogate !== null) {
                /* trail surrogate */
                if(inRange(charCode, 0xDC00, 0xDFFF)) {
                    toStringChars(0x10000 + (leadSurrogate - 0xD800) * 0x400 + (charCode - 0xDC00));
                    leadSurrogate = null;
                    continue;
                }
            }

            /* lead surrogate */
            if(inRange(charCode, 0xD800, 0xDBFF)) {
                leadSurrogate = charCode;
                continue;
            }

            toStringChars(charCode);
        }

        return s;
    }

    function ucs2Write(buf, s, offset, length) {
        var n = offset,
            toViewBytes = function (charCode) {
                buf[n++] = charCode & 0x00FF;
                buf[n++] = charCode >> 8;
            };

        for(var i = 0; n - offset < length && i < s.length; i++) {
            var charCode = s.charCodeAt(i);

            /* 2 bytes ucs2 */
            if(charCode <= 0xFFFF) {
                toViewBytes(charCode);
            }
            /* 4 bytes utf-16 only */
            else {
                /* lead surrogate */
                toViewBytes(Math.floor((charCode - 0x10000) / 0x400) + 0xD800);
                /* trail surrogate */
                toViewBytes(((charCode - 0x10000) % 0x400) + 0xDC00);
            }
        }

        return n - offset;
    }

    /**
     * hex
     */
    function hexByteLength(s) {
        return s.length >>> 1;
    }

    function toHex(n) {
        return (n < 16? '0' : '') + n.toString(16);
    }

    function hexRead(buf, offset, length) {
        var s = "";

        for(var i = offset; i < length; i++) {
            s += toHex(buf[i]);
        }

        return s;
    }

    function hexWrite(buf, s, offset, length) {
        for(var i = 0, n = offset; n - offset < length && i < s.length; i++) {
            buf[n++] = parseInt(s.substr(i * 2, 2), 16);
        }

        return n - offset;
    }

    /**
     * utf8
     */
    function utf8ByteLength(s) {
        var length = 0;

        for(var i = 0, l = s.length; i < l; i++) {
            var charCode = s.charCodeAt(i);

            length += charCode < 0x80? 1 : charCode < 0x800? 2 : charCode < 0x10000? 3 : charCode < 0x200000? 4 : charCode < 0x4000000? 5 : 6;
        }

        return length;
    }

    function utf8Read(buf, offset, length) {
        var s = "";

        for(var n, i = offset; i < length; i++) {
            n = buf[i];
            s += String.fromCharCode(
                n > 251 && n < 254 && i + 5 < length? /* six bytes */
                /* (n - 252 << 32) is not possible in ECMAScript! So...: */
                (n - 252) * 1073741824 + (buf[++i] - 128 << 24) + (buf[++i] - 128 << 18) + (buf[++i] - 128 << 12) + (buf[++i] - 128 << 6) + buf[++i] - 128
                : n > 247 && n < 252 && i + 4 < length? /* five bytes */
                (n - 248 << 24) + (buf[++i] - 128 << 18) + (buf[++i] - 128 << 12) + (buf[++i] - 128 << 6) + buf[++i] - 128
                : n > 239 && n < 248 && i + 3 < length? /* four bytes */
                (n - 240 << 18) + (buf[++i] - 128 << 12) + (buf[++i] - 128 << 6) + buf[++i] - 128
                : n > 223 && n < 240 && i + 2 < length? /* three bytes */
                (n - 224 << 12) + (buf[++i] - 128 << 6) + buf[++i] - 128
                : n > 191 && n < 224 && i + 1 < length? /* two bytes */
                (n - 192 << 6) + buf[++i] - 128
                : n /* n < 127 ? */ /* one byte */
            );
        }

        return s;
    }

    function utf8Write(buf, s, offset, length) {
        for(var i = 0, n = offset; n - offset < length && i < s.length; i++) {
            var charCode = s.charCodeAt(i);

            /* one byte */
            if(charCode < 0x80) {
                buf[n++] = charCode;
            }
            /* two bytes */
            else if(charCode < 0x800) {
                buf[n++] = 192 + (charCode >>> 6);
                buf[n++] = 128 + (charCode & 63);
            }
            /* three bytes */
            else if(charCode < 0x10000) {
                buf[n++] = 224 + (charCode >>> 12);
                buf[n++] = 128 + (charCode >>> 6 & 63);
                buf[n++] = 128 + (charCode & 63);
            }
            /* four bytes */
            else if(charCode < 0x200000) {
                buf[n++] = 240 + (charCode >>> 18);
                buf[n++] = 128 + (charCode >>> 12 & 63);
                buf[n++] = 128 + (charCode >>> 6 & 63);
                buf[n++] = 128 + (charCode & 63);
            }
            else if (charCode < 0x4000000) {
            /* five bytes */
                buf[n++] = 248 + (charCode >>> 24);
                buf[n++] = 128 + (charCode >>> 18 & 63);
                buf[n++] = 128 + (charCode >>> 12 & 63);
                buf[n++] = 128 + (charCode >>> 6 & 63);
                buf[n++] = 128 + (charCode & 63);
            }
            /* six bytes */
            else /* if (charCode <= 0x7fffffff) */ {
                buf[n++] = 252 + /* (charCode >>> 32) is not possible in ECMAScript! So...: */ (charCode / 1073741824);
                buf[n++] = 128 + (charCode >>> 24 & 63);
                buf[n++] = 128 + (charCode >>> 18 & 63);
                buf[n++] = 128 + (charCode >>> 12 & 63);
                buf[n++] = 128 + (charCode >>> 6 & 63);
                buf[n++] = 128 + (charCode & 63);
            }
        }

        return n - offset;
    }

    function isUndefined(subject) {
        return typeof subject === 'undefined';
    }

    function isArray(subject) {
        if(typeof Array.isArray === 'function') {
            return Array.isArray(subject);
        }
        else {
            return Object.prototype.toString.call(subject) === '[object Array]';
        }
    }

    function inRange(n, min, max) {
        return min <= n && n <= max;
    }

    function extend(target, source) {
        var slice = Array.prototype.slice,
            hasOwnProperty = Object.prototype.hasOwnProperty;

        slice.call(arguments, 1).forEach(function (o) {
            for(var key in o) {
                hasOwnProperty.call(o, key) && (target[key] = o[key]);
            }
        });

        return target;
    }

    return Buffer;

});
