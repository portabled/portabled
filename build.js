var fs = require('fs');
var path = require('path');

if (require.main===module) {
  console.log('TODO: build all of it!');
}
else {
  module.exports = {
    compileTS: compileTS,
    buildStats: buildStats,
    jsString: jsString,
    jsStringLong: jsStringLong,
    functionBody: functionBody,
    functionArgs: functionArgs,
    wrapScript: wrapScript,
    substitute: substitute,
    wrapEQ80: wrapEQ80,
    createLink: createLink
  };
}


/**
 * options: {
 *   title: string;
 *   boot_html: string;
 *   shell_html: string;
 *   files: map of path/content, or array of strings;
 *   timestamp: number;
 *   defaultBackground: string;
 *   favicon: string;
 * }
 */
function wrapEQ80(options) {

  var persistence = require('./persistence/lib/persistence.html');
  var loader = require('./loader/lib/loader.html');
  var isolation = require('./isolation/lib/isolation.html');

  var fileTotalHTML='';
  var fileTotalSize = 0;
  addFiles(options.files);
  var totalsComment = '<!--'+persistence.formatTotalsInner(options.timestamp || +new Date(), fileTotalSize)+'-->';


  return ''+
    '<!doctype html><head><meta charset="utf-8"><title> '+(options.title||'mini shell')+' </title>\n'+
  	'<meta http-equiv="x-ua-compatible" cpmtemt="IE=edge">'+
		totalsComment+'\n'+
		(options.favicon||'')+'\n'+
    '<HTA:APPLICATION id="htaHeader" SINGLEINSTANCE="no"></HTA:APPLICATION>'+
    '<style data-legit=mi> *{display:none;'+(options.defaultBackground||'background:black;color:black;')+'} html,body{display:block;background:black;color:black;margin:0;padding:0;height:100%;overflow:hidden;} </style>\n'+
    '</head><body>\n'+
    '<'+'script data-legit=mi>\n'+
  	loader+'\n\n\n'+
    persistence+'\n\n\n'+
    'loader(window, document); //# sourceURL=/EQ80.js\n'+
    '</'+'script>\n'+
    '<'+'script data-legit=mi> // pushing BOOT\n'+
    '(function(doc) {\n'+
    '  if (doc.open) doc.open();\n'+
    '  doc.write('+jsStringLong(options.boot_html)+');\n'+
    '  if (doc.close) doc.close();\n'+
    '})(loader.boot.contentDocument || loader.boot.document);\n'+
    'loader.boot.style.display="block"; //# '+'sourceURL=/BOOT-docwrite.html\n'+
    '</'+'script>\n'+
    '<'+'script data-legit=mi> // pushing SHELL\n'+
    '(function(doc) {\n'+
    '  if (doc.open) doc.open();\n'+
    '  doc.write('+jsStringLong(options.shell_html)+');\n'+
    '  if (doc.close) doc.close();\n'+
    '})(loader.shell.contentDocument || loader.shell.document); //# '+'sourceURL=/SHELL-docwrite.html\n'+
    '</'+'script>\n'+
    fileTotalHTML+
    '</body></html>';

  function addFiles(files) {
    if (!files) return;

    if (typeof files==='string') {
      addFileStr(files);
      return;
    }

    if (typeof files==='function') {
      addFiles(files());
      return;
    }

    if (files.length && typeof files.length==='number') {
      for (var i = 0; i < files.length; i++) {
      	addFiles(files[i]);
      }
    }

    if (typeof files==='object') {
      for (var k in files) if (k.charCodeAt(0)===47 && files.hasOwnProperty(k)) { // k is path thus starts with slash
        var content = files[k];
        if (typeof content==='string') {
          addFileContent(k, content);
        }
      }
    }
  }

  function addFileContent(file, content) {
    var n = persistence.formatFileInner(file, content);
    var sz = n.length - n.indexOf('\n') - 1; // size is counted only for content
    fileTotalSize += sz;
    fileTotalHTML=fileTotalHTML?fileTotalHTML+'\n<!--'+n+'-->':'<!--'+n+'-->';
  }

  function addFileStr(file) {
    if (file!=='/' && !fs.existsSync(file)) {
      // TODO: handle globs??
      return
    }

    var stat = file === '/' ? null : fs.statSync(file);
    if (stat && stat.isFile()) {
      addFileExact(file);
    }

    if (stat && !stat.isDirectory()) return;

    var dirs = [file];
    while (dirs.length) {
      var d = dirs.pop();
      var files = fs.readdirSync(d);
      for (var i = 0; i <files.length; i++) {
        if (files[i]==='.' || files[i]==='..') continue;
        var f = path.join(d, files[i]);
        var stat = fs.statSync(f);

        if (stat.isFile()) {
          addFileExact(f);
        }

        if (stat.isDirectory()) {
          dirs.push(f);
        }
      }
    }
  }

  function addFileExact(file) {
    var content = fs.readFileSync(file)+'';
    addFileContent(file, content);
  }
}



function wrapScript(replacements) {
  return functionBody(
    (template_content+'').replace(
      /\"\#build_functions\#\"/,
    	functionBody+'\n'+
    	functionArgs+'\n'+
    	jsString+'\n'+
    	jsStringLong+'\n'),
    replacements);
}

function buildStats() {
	var buildStartTime = +new Date();

  return completeBuildStats;

  function completeBuildStats() {
    var platform;
    try { platform = require('nowindow').navigator.userAgent }
    catch (error) {
      platform = 'node '+process.version+' on '+process.platform+'/'+process.arch;
    }

    var buildFinishTime = new Date();

    return {
      timestamp: +buildFinishTime,
      taken: buildFinishTime-buildStartTime,
      platform: jsString(platform),

      toString: function() {
        return (
          '{\n'+
          '    timestamp: '+(+buildFinishTime)+', // '+buildFinishTime+'\n'+
          '    taken: '+(buildFinishTime-buildStartTime)+',\n'+
          '    platform: '+jsString(platform)+'\n'+
          '}');
      }
    };

  }
}

function substitute(bodyText, replacements) {
  if (typeof replacements==='function') {
    var update = bodyText.replace(
      /\"\#([\S]+)\#\"/g,
      function(str, token) {
        return replacements(token)||'';
      });
  }
  else {
    var update = bodyText.replace(
      /\"\#([\S]+)\#\"/g,
      function(str, token) {
        var r = replacements[token];
        if (typeof r==='function') return r()||'';
        else return r||'';
      });
  }
  return update;
}

function functionBody(fn, replacements) {
  // first skip until (
  // then skip until )
  // then skip until {
  // then take everything until the last }
  var match =
      /^[^\(]*\([^\)]*\)[^\{]*\{([\s\S]*)\}[^\}]*$/.exec(fn+'');
      // /^[^\(]*\([^\)]*\)[^\{]*\{([ \t]*\n)([\s\S]*)([ \t]*\n[ \t]*)\}[^\}]*$/.exec(fn+'');
  if (!match) return null;

  var bodyText = match[1];
  if (!replacements) return bodyText;
  else return substitute(bodyText, replacements);
}

function functionArgs(fn) {
  var match = /^[^\(]*\(\s*([^\)]*)\s*\)/.exec(fn+'');
  return match?match[1]:null;
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





function compileTS(/*args*/){
  function readDirectory(dir, extension, exclude) {
    var result = [];
    var expExclude = [], excludeMap = {};
    for (var i = 0; i < exclude.length; i++) {
      excludeMap[expExclude[i] = path.resolve(dir, exclude[i])] = true;
    }
    addDir(dir);
    return result;

    function addDir(dir) {
      var files = fs.readdirSync(dir || ".").sort();
      var directories = [];

      for (var i = 0; i < files.length; i++) {
        var f = path.resolve(dir, files[i]);
        if (!excludeMap[f]) {
          var stat = fs.statSync(f);
          if (stat.isFile() && (!extension || f.slice(-extension.length)===extension)) result.push(f);
          if (stat.isDirectory()) directories.push(f);
        }
      }

      for (var i = 0; i < directories.length; i++) addDir(directories[i]);
    }
  }

  var tscPath = require.resolve('typescript/lib/tsc.js');
  var tscScript = '(function(){ return function (ChakraHost) { '+fs.readFileSync(tscPath)+'\n}})() //# '+'sourceURL='+tscPath+'@wrapped';

  var result = {files:[]};

  var chakraHost = {
    newLine: '\n',
    args: [],
    useCaseSensitiveFileNames: true,
    echo: function(text) {
      console.log(text);
    },
    readFile: function (path, encoding) {
      return fs.readFileSync(path)+'';
    },
    writeFile: function (file, data, writeByteOrderMark) {
      //console.log('writeFile(',file,',',data.length);
      result[file] = data;
      result.files.push({file:file, data:data});
    },
    resolvePath: function(file) { return path.resolve(file); },
    fileExists: function(file) { return fs.existsSync(file) && fs.statSync(file).isFile(); },
    directoryExists: function(file) {
      return path.resolve(file) === '/' || fs.existsSync(file) && fs.statSync(file).isDirectory();
    },
    createDirectory: function() { },
    executingFile: tscPath,
    currentDirectory: process.cwd(),
    readDirectory: readDirectory,
    quit: function() { }
  };

  for (var i = 0; i < arguments.length; i++) {
    chakraHost.args.push(arguments[i]);
  }

  var tsc = eval(tscScript);
  tsc(chakraHost);

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



function template_content() {

// <script>document.body.innerHTML = '' </script> <script id=submodule_script>

"#lib#"

if (typeof module!=='undefined' && module && module.exports) {

  "#lib_exports#"

}
else {
  document.body.style.color = 'white';

  "#lib_tests#"

  // running tests from HTML page
  var ui = document.createElement('div');
  ui.style.color = 'black';
  ui.innerHTML = '<h2> Tests for submodule... </h2>';
  window.onload = function() {
    runTests(generateTests());
  };

}

//</script>
/* <style>
.prepared {
  opacity: 0.5;
}
.success {
 opacity: 1;
}
.fail {
  opacity: 1;
  color: tomato;
}
.fail pre {
  font-size: 70%;
  margin: 0px; margin-left: 1em;
  padding: 0px;
}
</style><script id=tests_scripts> /* */

"#tests#"

function runTests(tests) {
  var summary = document.createElement('h2');
  summary.style.color = 'black';

  if ('textContent' in summary) summary.textContent = 'Tests (total '+tests.length+'):';
  else summary.innerText = tests.length+'Tests (total '+tests.length+'):';
  var successCount = 0;
  var failCount = 0;
  document.body.appendChild(summary);

  var testList = document.createElement('div');
  testList.style.color = 'black';
  var runIndex = 0;
  for (var i = 0; i < tests.length; i++) {
    addTestRow(i);
  }

  document.body.appendChild(testList);
  setTimeout(function() {
  	continueRunTests();
  }, 100);

  function continueRunTests() {
    if (runIndex === tests.length) return;
    var t = tests[runIndex];
    runIndex++;
    t.run(function(error) {
      if (!error) {
        t.testEntry.className = 'success';
        successCount++;
      }
      else {
        t.testEntry.className = 'fail';
        var errorOutput = document.createElement('pre');
        if ('textContent' in errorOutput) errorOutput.textContent = error;
        else errorOutput.innerText = error;
        t.testEntry.appendChild(errorOutput);
        failCount++;
      }

      var summaryText =
          'Tests ('+
          (failCount?'failed '+failCount:'no fails')+
          ', succeeded '+successCount+
          (tests.length>failCount+successCount?', '+(tests.length-failCount-successCount)+' to finish':'')+'):';

      if ('textContent' in summary) summary.textContent = summaryText;
      else summary.innerText = summaryText;

      setTimeout(continueRunTests, 5);
    });
  }

  function addTestRow(i) {
    var t = tests[i];
    var testEntry = document.createElement('div');
    testEntry.className = 'prepared';
    if ('textContent' in testEntry) testEntry.textContent = t.name;
    else testEntry.innerText = t.name;
    t.testEntry = testEntry;
    testList.appendChild(testEntry);
  }
}


function assert(condition, message) {
  if (!condition) throw new Error(message||'Failure '+condition);
}

assert.equal = (function(){
  function equal(expected, actual, message) {
    if (expected!=actual) throw new Error(message||'Unmatch: '+expected+' != '+actual);
  }
  return equal;
})();

function generateTests() {

  var allTests = [];
  var _dummy = {};

  for (var k in tests) if (!(k in _dummy) && tests[k] && /^[a-z]/.test(k)) {
    collectTests(k, tests[k]);
  }

  return allTests;


  function collectTests(prefix, obj) {
    if (!obj) return;
    for (var k in obj) if (!(k in _dummy) && obj[k]) {
      if (/^[A-Z]/.test(k) && typeof obj[k] === 'function') {
        // TODO: should we construct here?
      }
      else if (/^[a-z]/.test(k)) {
        if (typeof obj[k]==='function') {
          if (k==='generateTests') {
            var moreTests = obj.generateTests();
            collectTests(prefix, moreTests);
          }
          else {
            addTest(prefix+'.'+k, obj, k);
          }
        }
        else if (typeof obj[k]==='object' && /^[a-z]/.test(k)) {
          collectTests(prefix+'.'+k, obj[k]);
        }
      }
    }
  }

  function addTest(fullname, thisObj, key) {
    var args = functionArgs(thisObj[key]);
    if (args && /callback/.test(args)) {
      allTests.push({
        name: fullname,
        run: function(callback) {
          try {
            thisObj[key](callback);
          }
          catch (error) {
            callback(error);
          }
        }
      });
    }
    else {
      allTests.push({
        name: fullname,
        run: function(callback) {
          try {
            thisObj[key]();
          }
          catch (error) {
            callback(error);
            return;
          }

          callback(null);
        }
      });
    }
  }

}

"#build_functions#"

// </script>
}