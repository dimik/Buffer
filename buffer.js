    function Buffer(subject, encoding) {
        switch(typeof subject) {
            case 'string':
                this.length = Buffer.byteLength(subject, encoding = encoding || 'utf8');
                break;
            case 'number':
                this.length = subject > 0 ? Math.floor(subject) : 0;
                break;
            case 'object':
                this.length = Number(subject.length) > 0 ? Math.floor(subject.length) : 0;
                break;
            default:
                throw new TypeError('must start with number, buffer, array or string');
        }

        if(subject instanceof ArrayBuffer || isArray(subject)) {
            this._buf = subject;
        }
        else {
            this._buf = new ArrayBuffer(this.length);
        }

        if(Buffer.isBuffer(subject)) {
            subject.copy(this, 0, 0, this.length);
        }
        else if(typeof subject === 'string') {
            this.write(subject, 0, encoding);
        }
    }

    Buffer.prototype = {
        constructor: Buffer,
        toString: function (encoding, start, end) {
            encoding = String(encoding || 'utf8').toLowerCase();
            start = start >>> 0;
            end = end == null? this.length : end >>> 0;

            if(start < 0) {
                start = 0;
            }
            if(end > this.length) {
                end = this.length;
            }
            if(end <= start) {
                return '';
            }

            var offset = start,
                length = offset > 0? end - offset : end;

            switch(encoding) {
                case 'utf8':
                case 'utf-8':
                    return utf8Read(this._buf, offset, length);
                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                    return ucs2Read(this._buf, offset, length);
                case 'hex':
                    return hexRead(this._buf, offset, length);
                case 'raw':
                case 'ascii':
                case 'binary':
                    return rawRead(this._buf, offset, length);
                case 'base64':
                    return base64Read(this._buf, offset, length);
                default:
                    throw new TypeError('Unknown encoding: ' + encoding);
            }
        },
        toJSON: function () {
            return {
                type: 'Buffer',
                data: Array.prototype.slice.call(this._buf, 0)
            };
        },
        get: function (index) {
            var view = new Uint8Array(this._buf);

            return view[index];
        },
        set: function (index, value) {
            var view = new Uint8Array(this._buf);

            if(isArray(value) || value instanceof ArrayBuffer) {
                view.set(value, index);
            }
            else {
                view[index] = value;
            }
        },
        write: function (s, offset, length, encoding) {
            // allow write(string, encoding)
            if(typeof offset === 'string' && length == null) {
                encoding = offset;
                offset = 0;
            }
            // allow write(string, offset[, length], encoding)
            else if(isFinite(offset)) {
                offset = Number(offset);
                if(isFinite(length)) {
                    length = Number(length);
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
                    return utf8Write(this._buf, s, offset, length);
                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                    return ucs2Write(this._buf, s, offset, length);
                case 'hex':
                    return hexWrite(this._buf, s, offset, length);
                case 'raw':
                case 'ascii':
                case 'binary':
                    return rawWrite(this._buf, s, offset, length);
                case 'base64':
                    return base64Write(this._buf, s, offset, length);
                default:
                    throw new TypeError('Unknown encoding: ' + encoding);
            }
        },
        slice: function (start, end) {
            return new Buffer(this._buf.slice(start, end));
        },
        copy: function (targetBuffer, targetStart, sourceStart, sourceEnd) {
            targetBuffer.set(targetStart, this._buf.slice(sourceStart, sourceEnd));
        }
    };

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
        Buffer.prototype['read' + method] = function (offset, noAssert) {
            var view = new DataView(this._buf),
                le = method.substr(-2, 2) === 'LE';

            return view['get' + methods[method]](offset, le);
        };
        Buffer.prototype['write' + method] = function (offset, noAssert) {
            var view = new DataView(this._buf),
                le = method.substr(-2, 2) === 'LE';

            return view['set' + methods[method]](offset, le);
        };
    }

    Buffer.isBuffer = function (subject) {
        return subject instanceof Buffer;
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
            length = Number(length);
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
        var view = new Uint8Array(buf),
            s = "";

        for(var i = offset; i < length; i++) {
            s += window.btoa(view[i]);
        }

        return s;
    }

    function base64Write(buf, s, offset, length) {
        var view = new Uint8Array(buf);

        for(var i = 0, n = offset; n - offset < length && i < s.length; i++) {
            view[n++] = window.atob(s.charCodeAt(i));
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
        return String.fromCharCode.apply(String, new Uint8Array(buf, offset, length));
    }

    function rawWrite(buf, s, offset, length) {
        var view = new Uint8Array(buf);

        for(var i = 0, n = offset; n - offset < length && i < s.length; i++) {
            view[n++] = s.charCodeAt(i);
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
        var view = new Uint8Array(buf),
            s = "", n, charCode, leadByte = null, leadSurrogate = null,
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
            n = view[i];

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
        var view = new Uint8Array(buf),
            n = offset,
            toViewBytes = function (charCode) {
                view[n++] = charCode & 0x00FF;
                view[n++] = charCode >> 8;
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

    function hexRead(buf, offset, length) {
        var view = new Uint8Array(buf),
            s = "";

        for(var i = offset; i < length; i++) {
            s += view[i].toString(16);
        }

        return s;
    }

    function hexWrite(buf, s, offset, length) {
        var view = new Uint8Array(buf);

        for(var i = 0, n = offset; n - offset < length && i < s.length; i += 2) {
            view[n++] = parseInt(s.substr(i, 2), 16);
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
        var view = new Uint8Array(buf),
            s = "";

        for(var n, i = offset; i < length; i++) {
            n = view[i];
            s += String.fromCharCode(
                n > 251 && n < 254 && i + 5 < length? /* six bytes */
                /* (n - 252 << 32) is not possible in ECMAScript! So...: */
                (n - 252) * 1073741824 + (view[++i] - 128 << 24) + (view[++i] - 128 << 18) + (view[++i] - 128 << 12) + (view[++i] - 128 << 6) + view[++i] - 128
                : n > 247 && n < 252 && i + 4 < length? /* five bytes */
                (n - 248 << 24) + (view[++i] - 128 << 18) + (view[++i] - 128 << 12) + (view[++i] - 128 << 6) + view[++i] - 128
                : n > 239 && n < 248 && i + 3 < length? /* four bytes */
                (n - 240 << 18) + (view[++i] - 128 << 12) + (view[++i] - 128 << 6) + view[++i] - 128
                : n > 223 && n < 240 && i + 2 < length? /* three bytes */
                (n - 224 << 12) + (view[++i] - 128 << 6) + view[++i] - 128
                : n > 191 && n < 224 && i + 1 < length? /* two bytes */
                (n - 192 << 6) + view[++i] - 128
                : n /* n < 127 ? */ /* one byte */
            );
        }

        return s;
    }

    function utf8Write(buf, s, offset, length) {
        var view = new Uint8Array(buf);

        for(var i = 0, n = offset; n - offset < length && i < s.length; i++) {
            var charCode = s.charCodeAt(i);

            /* one byte */
            if(charCode < 0x80) {
                view[n++] = charCode;
            }
            /* two bytes */
            else if(charCode < 0x800) {
                view[n++] = 192 + (charCode >>> 6);
                view[n++] = 128 + (charCode & 63);
            }
            /* three bytes */
            else if(charCode < 0x10000) {
                view[n++] = 224 + (charCode >>> 12);
                view[n++] = 128 + (charCode >>> 6 & 63);
                view[n++] = 128 + (charCode & 63);
            }
            /* four bytes */
            else if(charCode < 0x200000) {
                view[n++] = 240 + (charCode >>> 18);
                view[n++] = 128 + (charCode >>> 12 & 63);
                view[n++] = 128 + (charCode >>> 6 & 63);
                view[n++] = 128 + (charCode & 63);
            }
            else if (charCode < 0x4000000) {
            /* five bytes */
                view[n++] = 248 + (charCode >>> 24);
                view[n++] = 128 + (charCode >>> 18 & 63);
                view[n++] = 128 + (charCode >>> 12 & 63);
                view[n++] = 128 + (charCode >>> 6 & 63);
                view[n++] = 128 + (charCode & 63);
            }
            /* six bytes */
            else /* if (charCode <= 0x7fffffff) */ {
                view[n++] = 252 + /* (charCode >>> 32) is not possible in ECMAScript! So...: */ (charCode / 1073741824);
                view[n++] = 128 + (charCode >>> 24 & 63);
                view[n++] = 128 + (charCode >>> 18 & 63);
                view[n++] = 128 + (charCode >>> 12 & 63);
                view[n++] = 128 + (charCode >>> 6 & 63);
                view[n++] = 128 + (charCode & 63);
            }
        }

        return n - offset;
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
