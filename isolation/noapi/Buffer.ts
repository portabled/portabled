(function() {

  var NewUnit8Array: typeof Uint8Array = typeof Uint8Array === 'function' ? Uint8Array : Array as any;

  (this as any).Buffer  = Buffer;

  function Buffer(data: any, encoding?: string, offset?: number) {
    var buf: Uint8Array;
    if (typeof data==='number') {
      buf = new NewUnit8Array(data as number);
    }
    else if (typeof data==='string') {
      if (encoding=='base64') {
        var len = decodeBase64(data as string, null, 0);
        buf = new NewUnit8Array(len);
        decodeBase64(data as string, buf, 0);
      }
    	else if (encoding=='utf8'|| !encoding) {
        var len = encodeUTF8(data as string, null, 0);
        buf = new NewUnit8Array(len);
        encodeUTF8(data as string, buf, 0);
      }
    }
    else if (typeof data==='object'&& data && typeof data.length==='number') {
      buf =new NewUnit8Array(data.length - (offset|0));
      for (var i = offset|0; i < data.length; i++) {
        buf[i - (offset|0)] = data[i] as number;
      }
    }
    else if (typeof data==='object'&& data && typeof data.byteLength==='number') {
      var dataAccess = new Uint8Array(data);
      buf =new NewUnit8Array(data.byteLength - (offset|0));
      for (var i = offset|0; i < data.byteLength; i++) {
        buf[i - (offset|0)] = dataAccess[i] as number;
      }
    }
    else {
      throw new Error('Buffer only supports initialization from length, array or string at the moment.');
    }

    attachBufferMethods(buf);

    return buf;
  }

  function attachBufferMethods(buf: Uint8Array) {
    buf.toString = toString;
    (buf as any).byteLength = buf.length;
    buf.slice = slice;
  }

  // Buffer methods (from node/index.d.ts of typescript 2.5.2
  /*
    write(string: string, offset?: number, length?: number, encoding?: string): number;
    toString(encoding?: string, start?: number, end?: number): string;
    toJSON(): { type: 'Buffer', data: any[] };
    equals(otherBuffer: Buffer): boolean;
    compare(otherBuffer: Buffer, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;
    copy(targetBuffer: Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
    slice(start?: number, end?: number): Buffer;
    writeUIntLE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;
    writeUIntBE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;
    writeIntLE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;
    writeIntBE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;
    readUIntLE(offset: number, byteLength: number, noAssert?: boolean): number;
    readUIntBE(offset: number, byteLength: number, noAssert?: boolean): number;
    readIntLE(offset: number, byteLength: number, noAssert?: boolean): number;
    readIntBE(offset: number, byteLength: number, noAssert?: boolean): number;
    readUInt8(offset: number, noAssert?: boolean): number;
    readUInt16LE(offset: number, noAssert?: boolean): number;
    readUInt16BE(offset: number, noAssert?: boolean): number;
    readUInt32LE(offset: number, noAssert?: boolean): number;
    readUInt32BE(offset: number, noAssert?: boolean): number;
    readInt8(offset: number, noAssert?: boolean): number;
    readInt16LE(offset: number, noAssert?: boolean): number;
    readInt16BE(offset: number, noAssert?: boolean): number;
    readInt32LE(offset: number, noAssert?: boolean): number;
    readInt32BE(offset: number, noAssert?: boolean): number;
    readFloatLE(offset: number, noAssert?: boolean): number;
    readFloatBE(offset: number, noAssert?: boolean): number;
    readDoubleLE(offset: number, noAssert?: boolean): number;
    readDoubleBE(offset: number, noAssert?: boolean): number;
    swap16(): Buffer;
    swap32(): Buffer;
    swap64(): Buffer;
    writeUInt8(value: number, offset: number, noAssert?: boolean): number;
    writeUInt16LE(value: number, offset: number, noAssert?: boolean): number;
    writeUInt16BE(value: number, offset: number, noAssert?: boolean): number;
    writeUInt32LE(value: number, offset: number, noAssert?: boolean): number;
    writeUInt32BE(value: number, offset: number, noAssert?: boolean): number;
    writeInt8(value: number, offset: number, noAssert?: boolean): number;
    writeInt16LE(value: number, offset: number, noAssert?: boolean): number;
    writeInt16BE(value: number, offset: number, noAssert?: boolean): number;
    writeInt32LE(value: number, offset: number, noAssert?: boolean): number;
    writeInt32BE(value: number, offset: number, noAssert?: boolean): number;
    writeFloatLE(value: number, offset: number, noAssert?: boolean): number;
    writeFloatBE(value: number, offset: number, noAssert?: boolean): number;
    writeDoubleLE(value: number, offset: number, noAssert?: boolean): number;
    writeDoubleBE(value: number, offset: number, noAssert?: boolean): number;
    fill(value: any, offset?: number, end?: number): this;
    indexOf(value: string | number | Buffer, byteOffset?: number, encoding?: string): number;
    lastIndexOf(value: string | number | Buffer, byteOffset?: number, encoding?: string): number;
    entries(): IterableIterator<[number, number]>;
    includes(value: string | number | Buffer, byteOffset?: number, encoding?: string): boolean;
    keys(): IterableIterator<number>;
    values(): IterableIterator<number>;
  */

  function slice(this: Uint8Array) {
    var newBuf = (this as any).constructor.prototype.slice.apply(this, arguments);
    attachBufferMethods(newBuf);
    return newBuf;
  }

  function encodeUTF8(text: string, buf: {[index: number]:number;}, start: number): number {
    var pos = start|0;

    for (var i = 0; i < text.length; i++) {
      var ch = text.charCodeAt(i);

      if (ch<0x80) {
        if (buf)
        	buf[pos] = ch;
        pos++;
      }
      else if (ch<0x800) {
        if (buf) {
          buf[pos] = 0xC0 | ((ch >> 6)&0xFF);
          buf[pos+1] = 0x80 | (ch &0xFF);
        }
        pos+=2;
      }
      else {
        // TODO: treat Unicode surrogate pair stuff
        if (buf) {
          buf[pos] = 0xE0 | ((ch >> 12)&0xFF);
          buf[pos+1] = 0x80 | ((ch >> 6)&0xFF);
          buf[pos+2] = 0x80 | (ch &0xFF);
        }
        pos+=3;
      }
    }

    return pos;
  }

  function decodeUTF8(data: Uint8Array) {
    var result = '';
    for (var i = 0; i< data.length; i++) {
      var b = data[i];
      var ch;
      if (!(b&0x80)) {
        ch = b;
      }
      else {
        if ((b&0xE0)===0xC0) {
          ch = (b<<6) | (data[i+1] & 0xC0);
          i++;
        }
        else {
          ch = (b<<12) | ((data[i+1] & 0xC0)<<6) | (data[i+2] & 0xC0);
          i+=2;
        }
      }

      result += String.fromCharCode(ch);
    }

    return result;
  }

  function b64Code(ch: number): number {
    if (ch>=65/*A*/ && ch<=90/*Z*/) return ch - 65;
    if (ch>=97/*a*/ && ch<=122/*z*/) return ch - 97 + 26;
    if (ch>=48/*0*/ && ch<=57/*9*/) return ch - 48 + 26 + 26;
    if (ch==43/*+*/ || ch==45/*-*/) return 62;
    if (ch==47/*/*/ || ch==95/*_*/) return 63;
    if (ch==61/*=*/) return -1;
    else if (ch==32 || ch==9 || ch==13 || ch==10 || /\s/.test(String.fromCharCode(ch))) return -2; // whitespace
    else return -3; // invalid
  }

  function decodeBase64(b64: string, buf: {[index: number]:number;}, start: number): number {

    var phase = 0;
    var accum = 0;
    var pos = start|0;

    for(var i = 0; i < b64.length; i++) {
      var ch = b64.charCodeAt(i)
      var co = b64Code(ch);

      if (phase>=0) { // processing normal base64 codes

        if (co>=0) {
          phase = (phase+1)%4;
          accum = (accum<<6) | co;

          if (!phase) {
            if (buf) {
              buf[pos] = (accum >> 16) & 0xFF;
              buf[pos+1] = (accum >> 8) & 0xFF;
              buf[pos+2] = accum & 0xFF;
            }

            pos += 3;
            accum = 0;
          }
        }
        else if (co==-1) phase = -1; // TODO: enforce block size before setting
        else if (co==-3) throw new Error('The string to be decoded is not correctly encoded.');
      }
      else if (phase==-1) { // met single filler, allow second filler or space
        if (co==-1) phase = -2;
        else if (co!=-2) throw new Error('The string to be decoded is not correctly encoded.');
      }
      else if (phase==-2) { // met second filler, allow spaces only
        if (co!=-2) throw new Error('The string to be decoded is not correctly encoded.');
      }
    }


    if (phase==-1) { // ended with single filler
      if (buf) {
        buf[pos] = (accum>>10) & 0xFF;
        buf[pos+1] = (accum>>2) & 0xFF;
      }
      pos+=2;
    }
    else if (phase==-2) { // ended with double filler
      if (buf) {
      	buf[pos] = (accum >> 4) & 0xFF;
      }
      pos++;
    }
    else if (phase) // ended on non-4 block without a filler
      throw new Error('The string to be decoded is not correctly encoded.');

    return pos;
  }

  function toString(encoding?: string) {
    if (!encoding || encoding==='utf8') {
      return decodeUTF8(this);
    }

    throw new Error('Parameters are too weird.');
  }

})();