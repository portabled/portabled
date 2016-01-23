var buildStart = new Date();

var fs = fs || require('fs');
var path = path || require('path');
var ts = ts || require('../imports/ts/typescript.js');


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
    var eq80;
    var eq80path = '../eq80/eq80.html';
    var eq80html = module.exports.html = (fs.readFileSync(eq80path)+'');

    var eq80script =  /\<script.*\>([\s\S]*)\<\/script\>/.exec(eq80html)[1] + '//'+'# '+'sourceURL=' + path.resolve(eq80path);
    var eq80script = 'var noui = true;'+eq80script;

    eval(eq80script);

    for (var k in eq80) if (eq80.hasOwnProperty(k)) {
      module.exports[k] = eq80[k];
    }
  })();
}

function eq80_build() {

  var eq80Script = buildMainScript();

  var html = [
    '<!doctype html><head><meta charset="utf-8"><title>mini shell </title>',
    fs.readFileSync('../favicon.base64.html'),
    '<'+'style data-legit=mi> *{display:none;background:black;color:black;} html,body{display:block;background:black;color:black;margin:0;padding:0;height:100%;overflow:hidden;} </'+'style>',
    '</head><body>',
    '<'+'script data-legit=mi>',
    eq80Script,
    'eq80();',
    '//'+'# '+'sourceURL=eq80.js',
    '</'+'script>'
  ];




  var eq80Path = path.resolve('eq80.html');
  var fullHtml = html.join('\n');
  fs.writeFileSync(eq80Path, html.join('\n'));

  console.log(fullHtml.length+' characters saved at ', createLink(eq80Path, html));

}

function buildMainScript() {

  console.log('Compiling boot...');
  var boot = compile(['boot', '../persistence/API.d.ts', '../typings/webSQL.d.ts']);

  console.log('Compiling persistence...');
  var persistence = compile(['../persistence', '../typings/webSQL.d.ts']);

  var buildEnd = new Date();

  var result =
      'function eq80() {\n'+

      injectBuildDiagnostics()+'\n\n'+
      'eq80.persistence = init_persistence();\n'+
      'if (typeof noui !== "undefined" && noui) return;\n'+
      '\n\n'+


      boot['output.js']+'// boot \n\n'+

      'function init_persistence() {\n'+
      '\n\n'+
      persistence['output.js']+'// persistene \n\n'+
      'return persistence;\n'+
      '}\n'+
      '}';

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

  var ops = ts.getDefaultCompilerOptions();

  var outputs = {};

  ops.target = ts.ScriptTarget.ES5;
  ops.declaration = true;
  ops.outFile = 'output.js';
  // ops.module = ts.ModuleKind.CommonJS;

  var basehost = ts.createCompilerHost(ops);

  OverrideHost.prototype = basehost;

  var cohost = new OverrideHost();

  cohost.writeFile = function(name, text) {
    outputs[name] = text;
  };

  var expandFiles = dirExpand(files);

  var prog = ts.createProgram(expandFiles, ops, cohost);

  prog.emit();

  var diagnostics = ts.getPreEmitDiagnostics(prog);

  for (var i = 0; i < diagnostics.length; i++) {
    var dg = diagnostics[i];
    if (!dg) continue;
    var pos = dg.file ? ts.getLineAndCharacterOfPosition(dg.file, dg.start) : null;
    if (typeof dg.messageText === 'string') {
      if (pos)
    		console.log(dg.file.fileName, pos.line, pos.character, dg.messageText);
      else
    		console.log('GLOBAL', dg.messageText);
    }
    else {
      if (pos)
      	console.log(dg.file.fileName, pos.line, pos.character);
      else
        console.log('GLOBAL');
      var chain = dg.messageText;
      while (chain) {
        console.log('  '+chain.messageText);
        chain = chain.next;
      }
    }
  }
  if (!diagnostics.length) {
    console.log('compiled with zero problems');
  }
  else if (diagnostics.length>1) {
    console.log(diagnostics.length+' compile messages');
  }

  return outputs;

  function OverrideHost() {}
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
      return link;
    }
  }
  catch (error) { }

  var link = document.createElement('a');
  if ('textContent' in link) link.textContent = filename;
  else link.innerText = filename;
  link.href = '#';
  link.onclick = function(e) {
    if (e.preventDefault) e.preventDefault();
    if ('cancelBubble' in e) e.cancelBubble = true;

    var blankWindow = window.open('_blank'+(+new Date()));

    if (blankWindow.document.open)
      blankWindow.document.open();
    blankWindow.document.write(typeof content.join === 'function' ? [content.join('\n')] : [content]);
    if (blankWindow.document.close)
      blankWindow.document.close();

    return true;
  };

  return link;
}