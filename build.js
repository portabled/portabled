if (require.main===module) {

  var fs = require('fs');
  var path = require('path');

  var build = (function(){
    var mo = {};
  	exportAll(mo);
    return mo.exports;
  })();

  var combineOnly = process.argv[2]==='--combine';

  var totalBuildStats = build.buildStats();

  if (!combineOnly) {
    buildEQ80_parts(function() {
      combineEQ80_module();
      console.log('\n');
      console.log('ISOLATION');
      console.log('=======');
      require('./isolation/build.js');

      console.log('SHELL');
      console.log('------------');
      require('./shell/build.js');
      console.log('\n');


      totalBuildStats = totalBuildStats();
      console.log(totalBuildStats);
    });
  }
  else {
  	combineEQ80_module();
  }

}
else {
  var persistence = require('./persistence/lib/persistence.html');
  var loader = require('./loader/lib/loader.html');

  exportAll(module);
}



function buildEQ80_parts(callback) {
  console.log('Building ALL of it:');
  console.log('============');
  console.log('\n');
  console.log('PERSISTENCE');
  console.log('------------');
  setTimeout(function() {
    require('./persistence/build.js');
    console.log('\n');
    console.log('LOADER');
    console.log('------------');
    //setTimeout(function() {
      require('./loader/build.js');
      console.log('\n');

      callback();
    //}, 1);
  }, 1);
}


function combineEQ80_module() {
  console.log('EQ80 MODULE');
  console.log('=======');

  var eq80BuildStats = build.buildStats();
  var persistence = require('./persistence/lib/persistence.html');
  var loader = require('./loader/lib/loader.html');


  eq80BuildStats = eq80BuildStats();

  var libJS =
      '// EQ80 library\n'+
      'var build = '+eq80BuildStats+';\n\n'+
      persistence+'\n\n\n'+
      loader+'\n\n\n'+
      'persistence();';

  var testsFilesObj = build.getFiles('tests');
  var testsFiles = testsFilesObj.files();
  var lib_tests = '';
  for (var i = 0; i < testsFiles.length; i++) {
    if (/\.js$/.test(testsFiles[i])) {
      lib_tests+=
        '// '+testsFiles[i]+'\n'+
        testsFilesObj.read(testsFiles[i])+'\n\n';
    }
  }

  var eq80Wrapped = build.wrapScript({
    lib: libJS,
    lib_tests: lib_tests,
    lib_exports: build.functionBody(exportAll)+''
  });




  console.log('  '+eq80Wrapped.length+' in lib/eq80.html');
  fs.writeFileSync('lib/eq80.html', eq80Wrapped);
}


function exportAll(module) {
  var fs = require('fs');
  var path = require('path');

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
    getFiles: getFiles,
    createLink: createLink
  };

  /**
   * options: {
   *   title: string;
   *   early_html: string;
   *   boot_html: string;
   *   shell_html: string;
   *   files: map of path/content, or array of strings;
   *   timestamp: number;
   *   defaultBackground: string;
   *   favicon: string;
   * }
   */
  function wrapEQ80(options) {

    var fileTotalHTML='';
    var fileTotalSize = 0;
    var fileTotalCount = 0;

    var fdir = getFiles(options.files);
    var fileList = fdir.files();

    for (var i = 0; i < fileList.length; i++) {
      var n = persistence.formatFileInner(fileList[i], fdir.read(fileList[i]));
      var sz = n.length - n.indexOf('\n') - 1; // size is counted only for content
      fileTotalSize += sz;
      fileTotalCount++;
      fileTotalHTML=fileTotalHTML?fileTotalHTML+'\n<!--'+n+'-->':'<!--'+n+'-->';
    }

    options.fileTotalSize = fileTotalSize;
    options.fileTotalCount = fileTotalCount;
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
      (options.early_html?options.early_html:'')+
      '<'+'script data-legit=mi> // pushing BOOT\n'+
      '(function(doc) {\n'+
      '  if (doc.open) doc.open();\n'+
      '  doc.write('+jsStringLong(options.boot_html)+');\n'+
      '  if (doc.close) doc.close();\n'+
      '})(loader.boot.contentWindow.document || loader.boot.window.document);\n'+
      'loader.boot.style.display="block"; //# '+'sourceURL=/BOOT-docwrite.html\n'+
      '</'+'script>\n'+
      '<'+'script data-legit=mi> // pushing SHELL\n'+
      '(function(doc) {\n'+
      '  if (doc.open) doc.open();\n'+
      '  doc.write('+jsStringLong(options.shell_html)+');\n'+
      '  if (doc.close) doc.close();\n'+
      '})(loader.shell.contentWindow.document || loader.shell.window.document); //# '+'sourceURL=/SHELL-docwrite.html\n'+
      '</'+'script>\n'+
      fileTotalHTML+
      '</body></html>';
  }


  function getFiles(filelist) {

    var list = [];
    var map = {};
    var redirects = {};

    // iterate and populate list/map
    // (this also eliminates duplicates)
    addFiles(filelist);


    return {
      files: function() { return list; },
      read: function(fi) {
        var content = map[fi];
        if (typeof content==='function') {
          content=content();
        }
        else if (typeof content!=='string') {
          content = fs.readFileSync(redirects[fi] || fi);
        }
        return content;
      }
    };

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
          if (typeof content==='string' || typeof content==='function') {
            addFileContent(k,content);
          }
          else if (content && typeof content.length==='number') {
            for (var i = 0; i < content.length; i++) {
              var subcontent = content[i];
              if (typeof subcontent==='string') {
                subcontent = path.resolve(subcontent);
                addFileStr(subcontent, subcontent.length, k);
              }
            }
          }
        }
      }
    }

    function addFileContent(file, content) {
      delete redirects[file];
      if (!map[file]) list.push(file);
      map[file] = content;
    }

    function addFileContentRead(file, skipPathStrLength, redirectRoot) {
      if (redirectRoot) {
        var newPath = path.join(redirectRoot, file.slice(skipPathStrLength));
        if (newPath.charCodeAt(0)!==47) newPath = '/'+newPath;
        addFileContent(newPath);
        redirects[newPath] = file;
      }
      else {
        addFileContent(file);
      }
    }

    function addFileStr(file, skipPathStrLength, redirectRoot) {
      if (file!=='/' && !fs.existsSync(file)) {
        // TODO: handle globs??
        return;
      }

      var stat = file === '/' ? null : fs.statSync(file);
      if (stat && stat.isFile()) {
        addFileContentRead(file, skipPathStrLength, redirectRoot);
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
            addFileContentRead(f, skipPathStrLength, redirectRoot);
          }

          if (stat.isDirectory()) {
            dirs.push(f);
          }
        }
      }
    }
  }

  function wrapScript(replacements) {
    var result = functionBody(
      (template_content+'').replace(/\<\/\[script/g, '</'+'script').replace(
        /\"\#build_functions\#\"/,
        functionBody+'\n'+
        functionArgs+'\n'+
        jsString+'\n'+
        jsStringLong+'\n'),
      replacements);

    result = result.replace(/^\s+/, '').replace(/\s+$/, '')+'\n';
    return result;
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
    if (str===null) return 'null';
    else if (typeof str==='undefined') return 'undefined';
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
    if (!str) {
      if (typeof str==='string') return '""';
      else if (typeof str==='undefined') return 'undefined';
      else return 'null';
    }

    var _JSON = typeof JSON!=='undefined'? JSON : typeof window === 'undefined' ? null : window.JSON;
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

  // <script>document.body.innerHTML = '' </[script> <script id=submodule_script>

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

  // # sourceURL=/submodule_script.js </[script>
  /* <style>
  .prepared {
    opacity: 0.5;
  }
  .running {
    opacity: 1;
    color: cornflowerblue;
    font-weight: bold;
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

    var testFilter = location.hash;
    if (testFilter && testFilter.charAt(0)==='#') testFilter = testFilter.slice(1);

    var summary = document.createElement('h2');
    summary.style.color = 'black';

    if ('textContent' in summary) summary.textContent = 'Tests (total '+tests.length+'):';
    else summary.innerText = tests.length+'Tests (total '+tests.length+'):';
    var successCount = 0;
    var failCount = 0;
    document.body.appendChild(summary);

    var testList = document.createElement('div');
    testList.style.color = 'black';

    var disabledTestList = document.createElement('div');
    disabledTestList.style.color = 'gold';

    var runIndex = 0;
    var testsToRun = [];
    for (var i = 0; i < tests.length; i++) {
      addTestRow(i);
    }

    document.body.appendChild(testList);
    document.body.appendChild(disabledTestList);

    setTimeout(function() {
      continueRunTests();
    }, 10);

    function continueRunTests() {
      if (runIndex === testsToRun.length) return;
      var t = testsToRun[runIndex];
      runIndex++;

      if (t.disabled) {
        setTimeout(continueRunTests, 1);
        return;
      }

      var start = +new Date();
      t.testEntry.className = 'running';
      t.run(function(error) {
        var finish = +new Date();
        var tm = document.createElement('span');
        if ('textContent' in tm) tm.textContent = ' '+(finish-start)+'ms';
        else tm.innerText = ' '+(finish-start)+'ms';
        tm.style.fontSize = '80%';
        t.testEntry.appendChild(tm);
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
            (testsToRun.length>failCount+successCount?', '+(testsToRun.length-failCount-successCount)+' to finish':'')+'):';

        if ('textContent' in summary) summary.textContent = summaryText;
        else summary.innerText = summaryText;

        setTimeout(continueRunTests, 5);
      });
    }

    function addTestRow(i) {
      var t = tests[i];
      var testEntry = document.createElement('div');
      if (testFilter && t.name.toLowerCase().indexOf(testFilter.toLowerCase())<0) {
      	testEntry.className = 'disabled';
        t.disabled = true;
        disabledTestList.appendChild(testEntry);
      }
      else{
      	testEntry.className = 'prepared';
        testsToRun.push(t);
      	testList.appendChild(testEntry);
      }

      if ('textContent' in testEntry) testEntry.textContent = t.name;
      else testEntry.innerText = t.name;
      t.testEntry = testEntry;
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

  // # sourceURL=/tests_scripts.js </[script>
  }
}