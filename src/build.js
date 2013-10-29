/*global require, process, console */
'use strict';

var home = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE);
var typescriptRepository = home + '/typescript';
var definitelyTypedRepository = home + '/DefinitelyTyped';
var codemirrorRepository = home + '/CodeMirror';

var fs = require('fs');
var child_process = require('child_process');

var typescriptRepositoryExists;
checkAndImportLatestCodeMirrorTypings(function() {
  checkAndImportLatestCodeMirrorJS(function() {
    checkAndImportLatestTypeScript(function() {
      compileMain();
    });
  });
});

inline('teapo.html','../index.html');

function inline(htmlFile, htmlOutput) {
  var watches = [];
  inlineCore();
  var requestedInline = null;

  onFileChanged(htmlFile, requestInline);

  requestInline();

  function requestInline() {
    if (requestedInline) {
      clearTimeout(requestedInline);
      requestedInline = null;
    }

    setTimeout(function() {
      for (var i = 0; i < watches.length; i++) {
        var stopWatching = watches[i];
        stopWatching();
      }
  
      watches = [];

      inlineCore();
    }, 300);
  }

  function inlineCore() {
    var watchFileNames = [];
    var html = fs.readFileSync(htmlFile)+'';
    var convertedOutput = [];
    var offset = 0;
    var srcRegex = / inline=['"]([^'"]*)['"]/g;
    var match;

    console.log('Inlining '+htmlFile+'...');
    while (match = srcRegex.exec(html)) {
      if (!fs.existsSync(match[1])) {
        offset = srcRegex.lastIndex;
        continue;
      }

      var closeElementPos = html.indexOf('</',srcRegex.lastIndex);
      convertedOutput.push(html.slice(offset, match.index));
      convertedOutput.push(html.slice(srcRegex.lastIndex, closeElementPos));
      convertedOutput.push(fs.readFileSync(match[1])+'');
      offset = closeElementPos;

      console.log('  '+htmlFile+' -> '+match[1]);
      watchFileNames.push(match[1]);
    }
    if (offset<html.length)
      convertedOutput.push(html.slice(offset));
    fs.writeFileSync(htmlOutput, convertedOutput.join(''));

    for (var i = 0; i < watchFileNames.length; i++) {
      var stopWatching = onFileChanged(
        watchFileNames[i],
        function() {
          requestInline();
        });
      watches.push(stopWatching);
    }
  }
}

function compileMain() {
  runTypeScriptCompiler(
    'teapo.ts', null,
    function(txt) {
      console.log('teapo.js: '+txt+'...');
    },
    ['--sourcemap'/*,'--module','amd',*/]);
}

function checkAndImportLatestTypeScript(callback) {
  checkAndImportExternal(
    typescriptRepository+'/bin/',
    ['tsc.js', 'typescriptServices.js', 'jquery.d.ts', 'lib.d.ts'],
    'imports/typescript',
    function(detected) {
      if (detected)
        console.log('TypeScript repository is found, using it for compilation, refreshing typings');
      else
        console.log('TypeScript repository is not detected, using existing imports');
    },
    function(imported) {
      typescriptRepositoryExists = imported;
      if (imported) 
        recompileTypescriptServices();
      else
        callback(false);
    });

  function recompileTypescriptServices() {
    console.log('Generating typings for TypeScript itself:'); 
    runTypeScriptCompiler(
      typescriptRepository+'/src/services/typescriptServices.ts', 'typings',
      function(txt) {
        deleteGeneratedJs(txt);
      },
      '--declaration');
  
    function deleteGeneratedJs(txt) {
      fs.exists('typings/typescriptServices.js', function(exists) {
        if (!exists)
          return;
  
        fs.unlink('typings/typescriptServices.js', function(error) {
          if (error)
            console.log('TypeScript typings: '+txt+' '+error);
          else
            console.log('TypeScript typings: '+txt+' -- cleaned');

          callback(true);
        });
      });
    }
  }
}


function checkAndImportLatestCodeMirrorTypings(callback) {
  checkAndImportExternal(
    definitelyTypedRepository+'/codemirror/',
    ['codemirror.d.ts'],
    'typings',
    function(detected) {
      if (detected)
        console.log('DefiniteyTyped repository is found, copying CodeMirror typings');
      else
        console.log('DefiniteyTyped repository is not detected, no refresh');
    },
    callback);
}

function checkAndImportLatestCodeMirrorJS(callback) {
  checkAndImportExternal(
    codemirrorRepository,
    [
      'lib/codemirror.js','lib/codemirror.css',
      'mode/javascript/javascript.js',
      'addon/hint/show-hint.js','addon/hint/show-hint.css','addon/hint/javascript-hint.js',
      'addon/comment/comment.js','addon/comment/continuecomment.js',
      'addon/edit/closebracket.js','addon/edit/matchbracket.js','addon/edit/trailingspace.js',
      'selection/active-line.js'
    ],
    'imports/codemirror',
    function(detected) {
      if (detected)
        console.log('CodeMirror repository is found, copying JS and CSS');
      else
        console.log('CodeMirror repository is not detected, no refresh');
    },
    callback);
}

function checkAndImportExternal(sourceDir, files, targetDir, handleDetected, callback) {
  if (!callback) {
    callback = handleDetected;
    handleDetected = function() { };
  }

  fs.exists(sourceDir, function(exists) {
    if (!exists) {
      if (handleDetected)
        handleDetected(false);
      if (callback)
        callback(false);
      return;
    }

    handleDetected(true);
    var reported=false;
    importFiles(sourceDir, files, targetDir, function (error) {
      if (error)
        console.log('Import to '+targetDir+' failed: '+error.message);
      if (reported)
        return;
      reported = true;

      var imported = exists && !error;
      if (callback)
        callback(imported);
    });
  });
}

function importFiles(repository, files, targetDir, callback) {
  var completeCount = 0;
  var error = null;
  files.forEach(function(f) {
    var isComplete = false;
    continueCopyFile(f, function(err) {
      if (isComplete)
        return;
      isComplete = true;

      completeCount++;
      error = error || err;
      if (completeCount===files.length) {
        callback(error);
      }
    });
  });

  function continueCopyFile(f, onCopyComplete) {
    if (repository.charAt(repository.length-1)!=='/')
      repository+='/';
    onFileChanged(
      repository+f,
      function present() {
        copyFile(repository+f, targetDir+f, function(error) {
          console.log('  '+f+' ('+targetDir+') '+(error?error.message:' copied'));
        });
      },
      function absent() {
        console.log('  '+f+' ('+targetDir+') disappeared');
      });

    var shortName;
    if (f.lastIndexOf('/')>0)
      shortName = f.slice(f.lastIndexOf('/')+1);
    else
      shortName = f;

    copyFile(
      repository+f,
      targetDir+'/'+shortName,
      function(error) {
        if (error)
          console.log('  '+error.message+' '+shortName);
        else
          console.log('  copied '+shortName);

        onCopyComplete(error);
      });
  }
}


function ifExists(f, presentCallback, absentCallback) {
    fs.exists(f, function(result) {
        if (result) {
            if (presentCallback)
                presentCallback();
        }
        else {
            if (absentCallback)
                absentCallback();
        }
    });
}

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      if (cb) {
        cb(err);
      }
      else {
          if (err)
            console.log('Copying '+source+': '+err.message);
          else
            console.log('Copied '+source+'.');
      }
      cbCalled = true;
    }
  }
}

function runTypeScriptCompiler(src, out, onchanged, more) {
    var scriptFileName = src.split('/');
    scriptFileName = scriptFileName[scriptFileName.length-1];
    scriptFileName = scriptFileName.split('.')[0];
    if (out)
        scriptFileName = out+'/'+scriptFileName;

    // either use embedded compiler, or from external repository
    var tsc = typescriptRepositoryExists ?
        typescriptRepository+'/bin/tsc.js' :
        'imports/typescript/tsc.js';
  var stopWatching = null;

    var cmdLine = [tsc, src, '--out', scriptFileName+'.js', '--watch'];
    if (more) {
        if (typeof more === 'string')
            cmdLine.push(more);
        else
            cmdLine = cmdLine.concat(more);
    }

    if (onchanged) {
        stopWatching = onFileChanged(scriptFileName+'.js', function(txt) {
          onchanged(txt);
          console.log('');
        });
        runCompiler();
    }
    else {
        runCompiler();
    }
    
    function runCompiler() {
      console.log(' Compile >>> '+cmdLine.join(' '));
      var childProcess = child_process.execFile('node', cmdLine, function (error, stdout, stderr) {
        if (error) {
          console.log(src+' '+error);
          if (stopWatching)
            stopWatching();
        }
      });

        childProcess.stdout.on('data', function(data) {
           printOutput(data); 
        });
        childProcess.stderr.on('data', function(data) {
            console.log('**', data); 
        });
    }
    
    function printOutput(prefix, data) {
        var fullPrefix = '  '+(data?prefix+' ':'')+scriptFileName+' ';
        if (!data) data = prefix;

        var lineEndMarker = " "+String.fromCharCode(8629);
        var normalizeData = (data+'').trimRight().replace(/\r\n/g,'\n').replace(/\n/g, lineEndMarker+"\n") + lineEndMarker;
        var lines = normalizeData.split('\n');
        var dump = fullPrefix+lines.join('\n'+fullPrefix);
        console.log(dump);
    }
}

function onFileChanged(file, callback, absentCallback) {
  var elasticWatchTimeoutMsec = 200;
  var finishWatching = false;
  var executingCallback = false;
  var changeQueued = null;

  var ignoreChanges = false;

  //console.log('*** onFileChanged:fs.watchFile(',file,')...');
  fs.watchFile(file,onChanged);


  function onChanged(statBefore,statAfter) {
    //console.log('***onChanged(',file,')..');
    if (executingCallback || finishWatching)
      return;

    if (changeQueued)
      clearTimeout(changeQueued);

    var changedText = statBefore?
      (statAfter?'changed':'deleted') :
      (statAfter?'created':'does not exist');

    changedText = file+' '+changedText;

    // upon a change, wait a bit for multiple changes to settle
    changeQueued = setTimeout(function() {
        //console.log('***onChanged:changeQueued(',file,')..');
        executingCallback = true;

        if (absentCallback) {
          fs.exists(file, function(exists) {
            //console.log('***onChanged:changeQueued:fs.exists(',file,exists,')..');
            if (exists)
              callback(changedText);
            else
              absentCallback(changedText);
            continueAfterCallback();
          });
        }
        else{
          callback(changedText);
          continueAfterCallback();
        }

        function continueAfterCallback() {
          //console.log('***onChanged:changeQueued:continueAfterCallback(',file,')..');
          // after callback wait a bit again, if the source wanted to modify the file too
          setTimeout(function() {
            //console.log('***onChanged:changeQueued:continueAfterCallback.setTimeout(',file,')..');
            executingCallback = false;
          }, elasticWatchTimeoutMsec);
  
          if (changeQueued)
            clearTimeout(changeQueued);
          changeQueued = null;
        }
      
      },
      elasticWatchTimeoutMsec);
  }

  return function stopWatching() {
    if (!finishWatching) {
      finishWatching =true;
      fs.unwatchFile(file,onChanged);
    }
  }
}