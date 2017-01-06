function jsString(str: string): string {
  if (!str) {
    if (typeof str==='string') return '""';
    else if (typeof str==='undefined') return 'undefined';
    else return 'null';
  }

  var _JSON = typeof JSON!=='undefined'? JSON : typeof window === 'undefined' ? null : (window as any).JSON;
  var result = '"';
  var stretchStart = 0;
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    var fix;
    switch (code) {
      case 10: fix = i==str.length-1 ? '\\n' : '\\n"+\n  "'; break;
      case 13: fix = '\\r'; break;
      case 92: fix = '\\\\'; break;
      case 34: fix = '\\\"'; break;
      case 9: fix = '\\t'; break;
      default:
        if (code < 32 || // transcribe control codes
            ((code&0xFF00)===0xFD00) || ((code&0xFF00)==0xFF00)) { // transcribe potentially corrupt Unicode
          fix = '\\u'+(0x10000 + code).toString(16).slice(1);
          break;
        }
        continue;
    }

    if (stretchStart!==i) {
      result += str.slice(stretchStart, i) + fix;
    }
    else {
      result += fix;
    }

    stretchStart = i+1;
  }

  if (stretchStart)
    result += str.slice(stretchStart)+'"';
  else
    result = '"'+str+'"';

  return result;
}
