var buildStart = new Date();

var fs = fs || require('fs');
var path = path || require('path');
var ts = ts || require('../imports/ts/typescript.js');


var passResult;
try {
  var nowin = require('nowindow');
  var blankWindow = nowin.open('', '_blank' + (+new Date()));

  if (blankWindow.document.open)
    blankWindow.document.open();
  blankWindow.document.write('Building mi/shell at '+buildStart+'...');
  if (blankWindow.document.close)
    blankWindow.document.close();

  console.log('building to new window...');

  passResult = function() {

    if (nowin.Blob
        && nowin.URL
        && typeof nowin.URL.createObjectURL==='function') {
      try {
        showUsingBlob();
      }
      catch (blobError) {
        showUsingDocumentWrite();
      }
    }
    else {
      showUsingDocumentWrite();
    }


    function showUsingBlob() {
      var blob = new nowin.Blob([html.join('\n')], { type: 'text/html' });
      var url = nowin.URL.createObjectURL(blob);
    	console.log('navigate to ', url);
      setTimeout(function() { blankWindow.location.replace(url) }, 10);
    }

    function showUsingDocumentWrite() {
      blankWindow.document.open();
      blankWindow.document.write(html.join('\n'));
      blankWindow.document.close();
    }

  };
}
catch (error) {
  console.log('building to ../../mi.html ('+error.message+')');
  passResult = function() {
    fs.writeFileSync('../../mi.html', html.join('\n'));
  };
}

var html = [];

var bootUI = fs.readFileSync('boot.html');

var ui = fs.readFileSync('ui.html');

ui = ui.
  replace(/#on-error#/, fs.readFileSync('../shell/onerror.js')).
  replace(/#cm-style#/, fs.readFileSync('../imports/cm/cm.css').replace(/\$/g, '$$$$')).
  replace(/#cm-script#/, fs.readFileSync('../imports/cm/cm.js').replace(/\$/g, '$$$$')).
  replace(/#ts-script#/, fs.readFileSync('../imports/ts/typescript.js').replace(/\$/g, '$$$$'));


var eq80;
var eq80path = '../eq80/eq80.html';
var eq80html = fs.readFileSync(eq80path);
var eq80script =  /\<script.*\>([\s\S]*)\<\/script\>/.exec(eq80html)[1] + '//'+'# '+'sourceURL=' + path.resolve(eq80path);
var eq80script = 'var noui = true;'+eq80script;

eval(eq80script);

// module.exports = eq80;


var shellCore = compile([
  '../shell',
  '../typings',
  '../persistence/API.d.ts',
  '../isolation/noapi', '../isolation/Context.ts',
  '../imports/ts/typescriptServices.d.ts'
])['output.js'];

ui = ui.
	replace(/#shell-script#/, shellCore);

var platform;
try { platform = require('nowindow').navigator.userAgent }
catch (error) {
  platform = 'node '+process.version+' on '+process.platform+'/'+process.arch;
}

var cssFiles = dirExpand(['../shell'], /\.css$/);
for (var i = 0; i < cssFiles.length; i++) {
  cssFiles[i] = fs.readFileSync(cssFiles[i]);
}

ui = ui.
	replace(/#shell-style#/, cssFiles.join('\n'));

var srcFiles = dirExpand(['..'], /.*/);
var srcTotalSize = 0;
for (var i = 0; i < srcFiles.length; i++) {
  var fi = new eq80.persistence.dom.DOMFile(/*node*/null, srcFiles[i], null, 0, 0);
  var fiHTML = '<'+'!-- '+fi.write(fs.readFileSync(srcFiles[i])) + '--'+'>';
  srcTotalSize += fiHTML.length;
  srcFiles[i] = fiHTML;
}

var miBuildDate = new Date();

var totalsComment = '<'+'!-- '+ (new eq80.persistence.dom.DOMTotals(miBuildDate, srcTotalSize, /*node*/null)).updateNode() + ' --'+'>\n';
html.unshift(eq80html.replace(/\<\/title\>/, '<'+'/title>' + totalsComment));

ui = ui.
  replace(/\#built\#/, (+miBuildDate).toString()).
  replace(/\#builtStr\#/, miBuildDate.toString()).
  replace(/\#taken\#/, (miBuildDate - buildStart).toString()).
  replace(/\#style\#/, jsString(cssFiles.join('\n'))).
  replace(/\#cm-style\#/, jsString(fs.readFileSync('../imports/cm/cm.css'))).
  replace(/\#platform\#/, jsString(platform.toString()));

html.push(
	'<'+'script id=bootui data-legit=mi>\n'+
  'if (eq80.boot.contentWindow.document.open) eq80.boot.contentWindow.document.open();\n'+
  'eq80.boot.contentWindow.eq80 = eq80;\n'+
  'eq80.boot.contentWindow.document.write('+jsStringLong(bootUI) +');\n'+
  'if (eq80.boot.contentWindow.document.close) eq80.boot.contentWindow.document.close();\n'+
  '</'+'script>\n'+
	'<'+'script id=shellui data-legit=mi>\n'+
  'eq80.on("load", initUI_onload); \n'+
  'var initUI_interval = setInterval(initUI_timer, 10);\n'+
  'function initUI_onload() {\n'+
  '  initUI();\n'+
  '  eq80.ui.contentWindow.shell.start(eq80.fadeToUI);\n'+
  '}\n'+
  'function initUI_timer() { initUI(); }\n'+
  'function initUI() {\n'+
  '  if (typeof eq80==="undefined") return;\n'+
  '  clearInterval(initUI_interval);\n'+
  '  if (eq80.ui.contentWindow.shell) return;\n'+
  '  try {\n'+
  '    if (eq80.ui.contentWindow.document.open) eq80.ui.contentWindow.document.open();\n'+
  '    eq80.ui.contentWindow.eq80 = eq80; if (eq80.ui.contentWindow.eval("typeof eq80")==="undefined") throw new Error("Wrong ui global!");\n'+
  '    var htmlText='+jsStringLong(ui)+';\n'+
  '    eq80.ui.contentWindow.document.write(htmlText);\n'+
  '    if (eq80.ui.contentWindow.document.close) eq80.ui.contentWindow.document.close();\n'+
  '  } catch(err) { alert(err.stack); }\n'+
  '}//'+'# '+'sourceURL=ui.html\n'+
  '</'+'script>');

html.push(fs.readFileSync('dummy.html'));


html = html.concat(srcFiles);

passResult();





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
  if (typeof nowin.JSON !== 'undefined' && typeof JSON.stringify === 'function')
    return hasNewlines ? ('[\n  '+JSON.stringify(str).replace(/\</g, '<"+"').replace(/([^\\])\\n/g, '$1",\n  "')+'\n  ].join("\\n")') : JSON.stringify(str).replace(/\<\/script\>/gi, '<"+"/script>');
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

    var list = dirExpand(fs.readdirSync(fi), regexp);
    if (!list.length) continue;
    if (list.length===1) result.push(list[0]);
    else result = result.concat(list);
  }
  //console.log('dirExpand(',files,', '+regexp+'):');
  //console.log(result.length,' ('+exc.length+') skipped: ',exc);
  return result;
}