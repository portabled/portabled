var buildStart = new Date();

var fs = fs || require('fs');
var path = path || require('path');
var _process = process;


if (require.main===module) {
  console.log('Bulding from this terminal...');
  eq80_build();
}
else {
  module.exports.compile = compile;
  module.exports.dirExpand = dirExpand;
  module.exports.jsString = jsString;
  module.exports.jsStringLong = jsStringLong;
  module.exports.createLink = createLink;

  (function() {
    var eq80path = '../eq80/eq80.js';
    var eq80script = module.exports.script = fs.readFileSync(eq80path);
    var eq80html = module.exports.html =
        '<!doctype html><head><meta charset="utf-8"><title>mini shell </title>\n'+
				'<style data-legit=mi> *{display:none;background:black;color:black;} html,body{display:block;background:black;color:black;margin:0;padding:0;height:100%;overflow:hidden;} </style>\n'+
        '</head><body>\n'+
        '<'+'script data-legit=mi>\n'+
        eq80script+'\n'+
        '</'+'script'+'>';

    var eq80 = eval('(function() { '+eq80script+' \n return eq80; })()');

    for (var k in eq80) if (!(k in Date)) {
      module.exports[k] = eq80[k];
    }
  })();
}

function eq80_build() {

  var eq80Script = buildMainScript();

  var withSourceURL =
      eq80Script + '//'+'# '+'sourceURL=eq80.js';




  var eq80Path = path.resolve('eq80.js');
  fs.writeFileSync(eq80Path, withSourceURL);

  console.log(withSourceURL.length+' characters saved at ', createLink(eq80Path, withSourceURL));

}

function buildMainScript() {

  console.log('Compiling persistence + boot...');
  var boot = compile(['../persistence', '../typings/webSQL.d.ts', 'boot', '../persistence/API.d.ts', '../typings/webSQL.d.ts']);

  var buildEnd = new Date();

  var result =
      'function eq80() {\n'+

      injectBuildDiagnostics()+'\n\n'+
      'var persistence=eq80.persistence={};\n\n'+
      boot['output.js'].replace(/var persistence\;/g, '/*var persistence;*/')+'\n\n'+
      'if (typeof window!=="undefined" && window && window.document) boot();\n'+
      '}'+'\n'+
      'eq80();';

  return result;

  function injectBuildDiagnostics() {

    var platform;
    try { platform = require('nowindow').navigator.userAgent }
    catch (error) {
      platform = 'node '+process.version+' on '+process.platform+'/'+process.arch;
    }

    var result = [
      'eq80.build = {',
      '  timestamp: '+(+buildEnd)+', // ' + buildEnd,
      '  taken: '+(buildEnd - buildStart)+',',
      '  platform: '+(typeof JSON !== 'undefined' && typeof JSON.stringify === 'function' ? JSON.stringify(platform) : '"'+platform+'"'),
      '}'
    ];

    return result.join('\n');
  }

}








function jsStringLong(str) {
  var wordCounts = {};
  var wordArray = [];
  str.replace(/[a-zA-Z0-9_]+/g, function(w) {
    var key = '*'+w;
    if (wordCounts[key]) {
      wordCounts[key]++;
    }
    else {
    	wordCounts[key] = 1;
      wordArray.push(w);
    }
  });
  wordArray.sort(function(w1, w2) {
    var n1 = wordCounts['*'+w1];
    var n2 = wordCounts['*'+w2];
    return n1 > n2 ? -1 : n2 > 1 ? +1 : 0;
  });
  var replaceTable = {};
  for (var i = 0; i < wordArray.length; i++) {
    replaceTable['*'+wordArray[i]] = toLetterNumber(i);
  }

  var compressed = str.replace(/(\s+)|([a-zA-Z0-9_]+)/g, function(match, whitespace, word) {
    if (word) return replaceTable['*'+word];
    return whitespace.
    	replace(/ +/g, function(spaces) {
      	if(spaces.length<2) return spaces;
        else return 'Z'+spaces.length;
      }).
    	replace(/\n/g, 'Z');
  });

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
    '}("'+wordArray.join(',')+'".split(","),"'+compressed.replace(/\\/g, '\\\\').replace(/\"/g, '\\"').replace(/\r/g, '\\r')+'",[],{}))'
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


function jsString(str) {
  var hasNewlines = false && str.indexOf('\n')>=0;
  var _JSON = typeof JSON!=='undefined'? JSON : typeof window === 'undefined' ? null : window.JSON;
  if (_JSON && typeof _JSON.stringify === 'function')
    return hasNewlines ? ('[\n  '+_JSON.stringify(str).replace(/\</g, '<"+"').replace(/([^\\])\\n/g, '$1",\n  "')+'\n  ].join("\\n")') : _JSON.stringify(str).replace(/\<\/script\>/gi, '<"+"/script>');
  else
  	return (hasNewlines ? '[\n  "' : '"') + str.replace(/[\"\s\\\<]/g, function(ch) {
      if (ch==' ') return ch;
      else if (ch==='\n') return hasNewlines ? '",\n  "' : '\\n';
      else if (ch==='\r') return '\\r';
      else if (ch==='\\') return '\\\\';
      else if (ch==='<' || ch === '>') return ch+'"+"';
      else return '\\u'+(0x10000 + ch.charCodeAt(0)).toString(16).slice(1);
  	}) + (hasNewlines ? '"].join("\\n")' : '"');
}


function compile(files) {

  var tscScript = path.resolve('../imports/ts/tsc.js');

  var process;

  var args = dirExpand(files);
  args.push('--pretty');
  args.push('--out');
  args.push('output.js');
  var outputs = {};

  var ChakraHost = {
    args: args,
    currentDirectory: _process.cwd(),
    executingFile: tscScript,
    newLine: '\n',
    useCaseSensitiveFileNames: true,
    echo: function(s) { console.log(s); },
    quit: function(exitCode) { return; },
    fileExists: function(path) { return fs.existsSync(path) && !fs.statSync(path).isDirectory(); },
    directoryExists: function(path) { return fs.existsSync(path) && !fs.statSync(path).isDirectory(); },
    createDirectory: function(path) { return; }, // directories are created when files are written
    resolvePath: function(path_) { return path.resolve(path_); },
    readFile: function(path) { return fs.readFileSync(path); },
    writeFile: function(path, contents) { outputs[path] = contents; },
    readDirectory: function(path, extension, exclude) { return fs.readdirSync(path); }
  };

  var tscScript = fs.readFileSync(tscScript);
  eval(tscScript);

  return outputs;

  /*
  ops.target = ts.ScriptTarget.ES5;
  ops.declaration = true;
  ops.outFile = 'output.js';
  // ops.module = ts.ModuleKind.CommonJS;
  */

}

function dirExpand(files, regexp) {
  if (!regexp) regexp = /\.ts$/;
  var result = [];
  for (var i = 0; i < files.length; i++) {
    var fi = files[i];
    var fiStat = fs.statSync(fi);
    if (fiStat.isFile()) {
      if (regexp.test(fi)) result.push(fi);
      continue;
    }

    var dirFiles = fs.readdirSync(fi);
    for (var j = 0; j < dirFiles.length; j++) dirFiles[j] = path.resolve(files[i], dirFiles[j]);
    var list = dirExpand(dirFiles, regexp);
    if (!list.length) continue;
    if (list.length===1) result.push(list[0]);
    else result = result.concat(list);
  }
  //console.log('dirExpand(',files,', '+regexp+'):');
  //console.log(result.length,' ('+exc.length+') skipped: ',exc);
  return result;
}

function createLink(filename, content) {

  try { var window = require('nowindow'); }
  catch (error) { return '<'+'A'+'>'; }

  var document = window.document;

  try {
    if (window.Blob
        && window.URL
        && typeof window.URL.createObjectURL==='function') {

      var blob = new window.Blob(typeof content.join === 'function' ? [content.join('\n')] : [content], { type: 'text/html' });
      var url = window.URL.createObjectURL(blob);

  		var link = document.createElement('a');

      link.href = url;
      //link.download = filename;
      if ('textContent' in link) link.textContent = filename;
      else link.innerText = filename;

      if (window.navigator.msSaveOrOpenBlob) {
        link.onclick = function(e) {
    			if (!e) e = window.event;
          e.cancelBubble = true;
          if (e.preventDefault) e.preventDefault();
          window.navigator.msSaveOrOpenBlob(blob, filename);
        };
      }
      return link;
    }
  }
  catch (error) { }

  var link = document.createElement('a');
  if ('textContent' in link) link.textContent = filename;
  else link.innerText = filename;
  link.href = '#';
  link.onclick = function(e) {
    if (!e) e = window.event;
    if (e.preventDefault) e.preventDefault();
    if ('cancelBubble' in e) e.cancelBubble = true;

    var blankWindow = window.open('about:blank', '_blank'+(+new Date()));

    if (blankWindow.document.open)
      blankWindow.document.open();
    blankWindow.document.write(typeof content.join === 'function' ? [content.join('\n')] : [content]);
    if (blankWindow.document.close)
      blankWindow.document.close();

    return true;
  };

  return link;
}