namespace encodings {

  export type Encoding = (text: string) => string;

  export function base64(text: string): any {
    if (text && text.charCodeAt(0)===42) {
      var bin = _atob!(text.slice(1));
      var buf: any = typeof Uint8Array==='function' ? new Uint8Array(bin.length) : [];
      for (var i = 0; i < bin.length; i++) {
        buf[i] = bin.charCodeAt(i);
      }
      return buf;
    }
    else {
    	return _atob!(text);
    }
  }

  export declare namespace base64 {
    var btoa: (text: string) => string;
    var atob: (text: string) => string;
  }

  var _btoa: { (text: string): string } | null = base64.btoa = (typeof btoa === 'function' ? ((text: string) => btoa(text)) : null)!;
  var _atob: { (text: string): string } | null = base64.atob = (typeof atob === 'function' ? ((text: string) => atob(text)) : null)!;

  if (!_btoa) {

    class InvalidCharacterError extends Error { constructor(message: string) { super(message) } }

    var e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    base64.btoa = _btoa = function (r) {
      for (var o, n, a = String(r), i = 0, c = e, d = ""; a.charAt(0 | i) || (c = "=", i % 1); d += c.charAt(63 & o >> 8 - i % 1 * 8)) { if (n = a.charCodeAt(i += .75), n > 255) throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."); o = o as any << 8 | n }
      return d
    };
    base64.atob = _atob = function (r) {
      var o = String(r).replace(/=+$/, ""); if (o.length % 4 == 1) throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded."); for (var n, a, i = 0, c = 0, d = ""; a = o.charAt(c++); ~a && (n = i % 4 ? 64 * (n as any) + a : a, i++ % 4) ? d += String.fromCharCode(255 & n >> (-2 * i & 6)) : 0)a = e.indexOf(a);
      return d
    }
  }
}