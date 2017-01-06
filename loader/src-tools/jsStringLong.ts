function jsStringLong(str: string): string {
  if (str===null) return 'null';
  else if (typeof str==='undefined') return 'undefined';
  var wordCounts = {};
  var singleWordSet = {};
  var wordArray = [];
  var dummy = {};

  str.replace(/[a-zA-Z0-9_]+/g, function(w) {
    var key = w in dummy ? '*'+w : w;
    if (singleWordSet[key]) {
      wordCounts[key] = 2;
    }
    else if (wordCounts[key]) {
      wordCounts[key]++;
    }
    else {
      singleWordSet[key] = 1;
      wordArray.push(w);
    }
  } as any);

  wordArray.sort(function(w1, w2) {
    var k1 = w1 in dummy ? '*'+w1 : w1;
    var k2 = w2 in dummy ? '*'+w2 : w2;
    var n1 = wordCounts[k1];
    var n2 = wordCounts[k2];
    return n1 > n2 ? -1 : n2 > 1 ? +1 : 0;
  });
  var replaceTable = {};
  for (var i = 0; i < wordArray.length; i++) {
    var k = wordArray[i] in dummy ? '*' + wordArray[i] : wordArray[i];
    replaceTable[k] = toLetterNumber(i);
  }

  var compressed = str.replace(/(\s+)|([a-zA-Z0-9_]+)/g, function(match, whitespace, word) {
    if (word) {
      var k = word in dummy ? '*' + word : word;
      return replaceTable[k];
    }

    return whitespace.
    replace(/  +/g, function(spaces) {
      return 'Z'+spaces.length;
    }).
    replace(/\n/g, 'Z');
  });

  var wordarr = [];
  var lineLen = 0;
  for (var i = 0; i < wordArray.length; i++) {
    var nextWord = wordArray[i];
    if (lineLen) {
      wordarr[wordarr.length-1] += ','+nextWord;
    }
    else {
      if (i) nextWord = '"+\n"'+nextWord;
      wordarr.push(nextWord);
    }

    lineLen+=nextWord.length+1;
    if (lineLen>100)
      lineLen = 0;
  }

  return [
    '(function(d,c,s,r,m,nn,n) { var k = 0;',
    'return c.replace(/([a-zA-Y]+)|(Z[0-9]*)/g, function(x,t,w) {',
    'if (w=="Z") return "\\n";',
    'else if (w&&w.charCodeAt(0)=='+('Z').charCodeAt(0)+') return s[m=parseInt(w.slice(1))] || (s[m] = Array(m+1).join(" "));',
    'if (r.hasOwnProperty(w)) return r[w];',
    'nn=0,m=1;',
    'for(var i=0;i<t.length;i++){',
    'var n=t.charCodeAt(i);',
    'nn+=m*(n-(n>'+(('a').charCodeAt(0)-1)+' ? '+('a').charCodeAt(0)+':'+(('A').charCodeAt(0)-26)+'));',
    'm*='+(25+26)+';',
    '}',
    'if (nn<100 && !r[nn]) return r[nn] = d[nn];', // cache word lookups for 100 most frequent words
    'else return d[nn];',
    '});\n',
    '}(("'+wordarr.join(',')+'").split(","),"'+compressed.replace(/\\/g, '\\\\').replace(/\"/g, '\\"').replace(/\r/g, '\\r')+'",[],{}))'
  ].join('\n');

  function toLetterNumber(num) {
    if (!num) return 'a';
    var base = 26+25; // a-z A-Y (leave out uppercase Z)
    var result = [];
    while (num) {
      var n = num % base;
      if (n<26)
        result.push(String.fromCharCode('a'.charCodeAt(0)+n));
      else
        result.push(String.fromCharCode('A'.charCodeAt(0)+n-26));
      num = (num / base)|0;
    }
    return result.join('');
  }
}
