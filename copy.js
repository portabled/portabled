if (typeof WScript!=='undefined' && typeof ActiveXObject!=='undefined') {
  var sh = new ActiveXObject('WScript.Shell');
  sh.Run('node '+WScript.ScriptFullName+' '+WScript.Arguments.join(' '));
  WScript.Exit(0);
}

var fs = require('fs');
var path = require('path');
var build = require('./lib/eq80.html');
var persistence = build.persistence;
//
run();

function run() {

  var input = collectInput();
  if (!input) return;

  if (input==='*'){
    copyAll();
    return;
  }

  var file = input.file;
  var inputAllFiles = input.allFiles;
  var isInputDir = input.isInputDir;


  var outputFile = process.argv[3] || path.basename(file)+'-files';
  var isOutputDir = fs.existsSync(outputFile) ? fs.statSync(outputFile).isDirectory() : !isInputDir;

  if (isOutputDir) {
    console.log('Writing at '+path.resolve(outputFile)+'...')
    for (var i = 0; i < inputAllFiles.length; i++) {
      var targetPath = inputAllFiles[i].path;
      if (targetPath.slice(-1)==='/' || targetPath.slice(-1)==='\\') continue;
      if (targetPath.charAt(0)==='/' || targetPath.charAt(0)==='\\') targetPath = targetPath.slice(1);
      targetPath = path.join(process.argv[3], targetPath);
      var writeDir = path.dirname(targetPath);
      createDirRecursive(writeDir);

      var content = inputAllFiles[i].content;
      if (!content && typeof content !== 'string') {
        try {
          content = fs.readFileSync(inputAllFiles[i].contentPath)+'';
        }
        catch (err) {
          console.log('  '+(i+1)+'. '+targetPath+' '+JSON.stringify(inputAllFiles[i])+' ...');
          content = fs.readFileSync(inputAllFiles[i].contentPath)+'';
        }
      }
      fs.writeFileSync(targetPath, content);
      if ((i+1)%20===1) {
        console.log('  '+(i+1)+'. '+targetPath+' ...');
      }
    }
    console.log('All '+inputAllFiles.length+' saved.');
  }
  else {
    if (fs.existsSync(outputFile)) {
      console.log('Extracting EQ80 files from '+outputFile+'...');
      var outputFileHTML = fs.readFileSync(outputFile)+'';
      var parsedOutputFile = persistence.parseHTML(outputFileHTML);
      console.log((parsedOutputFile.files.length||'none')+' found.');

      updateParsedHTMLContent(
        outputFileHTML,
        parsedOutputFile,
        inputAllFiles,
        function(file) { return fs.readFileSync(file.contentPath); });

      console.log('Saving ['+resultHTML.length+']...');
      fs.writeFileSync(outputFile+'.bak', fs.readFileSync(outputFile));
      fs.writeFileSync(outputFile, resultHTML);
    }
    else {
      var totalSize= 0;
      var manufacturedHTML = '';
      for (var i = 0; i < inputAllFiles.length; i++) {
        var content = inputAllFiles[i].content;
        if (!content && typeof content!=='string') content = fs.readFileSync(inputAllFiles[i].contentPath)+'';
        totalSize += content.length;
        manufacturedHTML+='<!--'+persistence.formatFileInner(inputAllFiles[i].path, content)+'-->\n';
      }
      manufacturedHTML =
        '<!doctype html><html><head><meta charset="utf-8"><title>'+file+' EXPORT</title>\n'+
        '<!--'+persistence.formatTotalsInner(+new Date(), totalSize)+'-->\n'+
        '</head><body>\n'+
        manufacturedHTML+
        '</body></html>';
      fs.writeFileSync(outputFile, manufacturedHTML);
    }
  }

  function copyAll() {
    var root = path.resolve(__dirname);
    var sourcePath = path.join(root,'index.html');
    var srcDirPath = path.join(root, 'src');
    if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).isDirectory()) {
      console.log('[copy.js] Run without parameters and not from original directory (looking for '+sourcePath+'): the default action of shell extraction and update cannot be performed.');
      return;
    }

    var targetShells = fs.readdirSync(root);
    // leave only .html files in the list
    for (var i = 0; i < targetShells.length; i++) {
      if (/\.html\.updated\.html$/.test(targetShells[i]) || !/\.html$/.test(targetShells[i])) {
        targetShells.splice(i,1);
        i--;
      }
      else {
        targetShells[i] = path.resolve(root, targetShells[i]);
      }
    }

    if (!targetShells.length) {
      console.log('No shell HTML files found in '+root);
      return;
    }

    console.log('Processing '+targetShells.length+' shells...');
    var parsedShells = [];
    var latestParsed;
    for (var i = 0; i <targetShells.length; i++) {

      // HACK: limit the count for debugging
      //if (parsedShells.length>=3 && !/(index|empty)\.html/.test(targetShells[i])) continue;

      var content = fs.readFileSync(targetShells[i])+'';
      var parsed = parseShell(content);
      if (!parsed) continue;

      parsed.content = content;
      parsed.path = targetShells[i];
      parsedShells.push(parsed);
      if (!latestParsed
          || (!latestParsed.totals && parsed.totals)
          || (parsed.totals && parsed.totals.timestamp > latestParsed.totals.timestamp)) {
        latestParsed = parsed;
      }

    }

    if (parsedShells.length) {
      if (parsedShells.length===1) {
        console.log('Only one shell file detected: '+parsedShells[0].path);
        return;
      }

      console.log(latestParsed.path+' ('+(latestParsed.totals ? new Date(latestParsed.totals.timestamp) : 'no timestamp')+') to be copied to '+(parsedShells.length-1)+' shells');
      for (var i = 0; i < parsedShells.length; i++) {
        if (parsedShells[i].path===latestParsed.path)continue;

        console.log('  ...'+parsedShells[i].path+'   '+(parsedShells[i].totals && parsedShells[i].totals.timestamp ? new Date(parsedShells[i].totals.timestamp) : ''));
        var allFiles = [];
        for (var j = 0; j < parsedShells[i].files.length; j++) {
          var entry = parsedShells[i].files[j];
          allFiles.push(entry);
        }


        var updatedHTML = updateParsedHTMLContent(
          latestParsed.content,
          latestParsed,
          allFiles,
          function (entry) {
            return entry.content;
          },
          true /* deleteExistingFiles */);

        fs.writeFileSync(parsedShells[i].path+'.bak', fs.readFileSync(parsedShells[i].path));
        fs.writeFileSync(parsedShells[i].path, updatedHTML);

        parsedShells[i] = null;
      }

    }
  }

  function parseShell(fileContent) {
    var versions = {};
    extractVersions(fileContent, function(name, details) { versions[name||'shell'] = details; });
    extractCompressedDocWrite(fileContent, function(decompressed) {
      extractVersions(decompressed, function(name, details) { versions[name||'shell'] = details; });
    });

    if (!versions.loader || !versions.persistence || !versions.isolation || !versions.shell)
      return null;

    var parsed = persistence.parseHTML(fileContent);
    parsed.versions = versions;

    return parsed;

    function extractVersions(content, callback) {
      var versionPattern = /(([a-zA-Z]+)\.|\s)build\s*=\s*(\{[^\}]+\})/gm;
      while (true) {
        var versionMatch = versionPattern.exec(content);
        if (!versionMatch) break;
        try {
          var ver = eval('('+versionMatch[3]+')');
          if(ver && typeof ver==='object' && ver.timestamp)
            callback(versionMatch[2], ver);
        }
        catch (error) { }
      }
    }

    function extractCompressedDocWrite(content, callback) {
      var pos = 0;
      var docWritePattern = /\b([a-z]*doc)\.write\(/gm;
      while (pos < content.length) {
        docWritePattern.lastIndex=pos;
        var docWriteMatch = docWritePattern.exec(content);
        if (!docWriteMatch) return;

        var posDocClose = content.indexOf(docWriteMatch[1]+'.close()', docWriteMatch.index);
        if (posDocClose<0) return;

        pos = posDocClose+(docWriteMatch[1]+'.close()').length;

        try {
          var innerScript = content.slice(docWriteMatch.index, pos);
          var fn = new Function(docWriteMatch[1], innerScript);
          var result;
          var callCount = 0;
          fn({
            write: function(decompressed) { result = decompressed; callCount++; },
            close: function() { }
          });
          if (callCount && typeof result==='string') callback(result);
        }
        catch (err) { }

      }
    }
  }

  function createDirRecursive(dir) {
    if (fs.existsSync(writeDir)) return;
    //console.log('...creating '+dir+'...');
    var parent = path.dirname(dir);
    if (parent && (parent !== dir)) {
      //console.log(parent+'!=='+dir);
      createDirRecursive(parent);
    }
    try {
      fs.mkdirSync(dir);
    }
    catch (error) { }
  }

  function findScript(html, filter) {
    var pos = 0;
    var tolo = html.toLowerCase();
    while (true) {
      var spos = tolo.indexOf('<'+'script', pos);
      if (spos<pos) return;
      pos = spos + ('<'+'script').length;
      var clpos = tolo.indexOf('>', pos);
      if (clpos < pos) return;
      pos = spos+1;

      var epos = tolo.indexOf('</'+'script');
      if (epos<pos) return;
      pos = epos+('</'+'script').length;

      var jsText = html.slice(clpos+1, epos);
      var pass = filter(jsText);
      if (pass) return jsText;
    }
  }
}


function collectInput() {
  var file = process.argv[2];
  if (!file) {
    console.log('copy.js  nonode-file|directory  [output-nonode-file|directory]');
    return;
  }
  if (!fs.existsSync(file)) {
    if (file==='*')
      return '*';

    console.log('File not found: '+file);
    return;
  }

  var isInputDir = fs.statSync(file).isDirectory();
  if (!isInputDir) {
    console.log('Loading '+file+'...');
    var fullHtml = fs.readFileSync(file)+'';

    console.log('Extracting files...');
    var parsedHTML = persistence.parseHTML(fullHtml);
    var allFiles = parsedHTML.files;
  }
  else {
    console.log('Searching for files in '+file+'...');
    var allFiles = [];
    var scanDirs = [file];
    var scannedDirCount = 0;
    while (scanDirs.length) {
      var dir = scanDirs.pop();
      var dirFileList = fs.readdirSync(dir);
      scannedDirCount++;
      for (var i = 0; i < dirFileList.length; i++) {
        if (dirFileList[i]==='.'||dirFileList[i]==='..') continue;
        var dirFile = path.join(dir, dirFileList[i]);
        if (fs.statSync(dirFile).isFile()) {

          var addPath = dirFile.slice(file.length).replace(/\\/g, '/');
          if (addPath.charCodeAt(0)!==47) addPath = '/'+addPath;
          allFiles.push({path:addPath, contentPath: dirFile}); // don't try to read it all in, too much data

          if (allFiles.length%500===0) {
            console.log('  ...'+allFiles.length+'. '+allFiles[allFiles.length-1].path+' in '+scannedDirCount+' directories');
          }
        }

        if (fs.statSync(dirFile).isDirectory()) scanDirs.push(dirFile);
      }
    }
  }

  console.log((allFiles.length||'none')+' found.');

  return { file: file, allFiles: allFiles, isInputDir: isInputDir };
}

function updateParsedHTMLContent(
  outputCompleteHTML,
  outputParsed,
  inputAllFiles,
  readInputContent,
  deleteExistingFiles) {

  // map to find matchings
  var outputFileMap = {};
  for (var i = 0; i < outputParsed.files.length; i++) {
    outputFileMap[outputParsed.files[i].path] = outputParsed.files[i];
  }

  var inputFileMap = {};
  for (var i = 0; i < inputAllFiles.length; i++) {
    inputFileMap[inputAllFiles[i].path] = inputAllFiles[i];
  }

  var writtenFiles = 0;

  var resultBuf = [];

  // now go backwards through existing files, and patch (or delete) them
  var reverseFiles = outputParsed.files.slice();
  reverseFiles.sort(function(f1, f2) {
    return f1.start > f2.start ? -1 : f1.start < f2.start ? +1 : 0;
  });

  var offset = outputCompleteHTML.length;
  for (var i = 0; i < reverseFiles.length; i++) {
    var outputFi = reverseFiles[i];
    var matchingInputFile = inputFileMap[outputFi.path];
    if (matchingInputFile) {

      resultBuf.unshift(outputCompleteHTML.slice(outputFi.end, offset));

      var content = matchingInputFile.content;
      if (!content && typeof content!=='string') content = readInputContent(matchingInputFile)+'';
      resultBuf.unshift(
        '<!--'+
        persistence.formatFileInner(matchingInputFile.path, content)+
        '-->');

      offset = outputFi.start;

      writtenFiles++;
      if (writtenFiles%500===0) {
        console.log('  '+writtenFiles+'. '+matchingInputFile.path+' (overwrite)');
      }
    }
    else if (deleteExistingFiles) {
      var deleteChunk = outputCompleteHTML.slice(outputFi.start, outputFi.start+5)+'...'+outputCompleteHTML.slice(outputFi.end-5, outputFi.end);

      resultBuf.unshift(outputCompleteHTML.slice(outputFi.end, offset));
      // skip whole file
      offset = outputFi.start;
    }
  }

  if (reverseFiles.length) {
    var beforeInsertionPoint = outputCompleteHTML.slice(0, offset);
  }
  else {
    offset = outputCompleteHTML.lastIndexOf('-->');
    if (offset>=0) {
      offset += 3; // the length of end-comment
    }
    else {
      offset = outputCompleteHTML.lastIndexOf('</body');
      if (offset<0) {
          offset = outputCompleteHTML.lastIndexOf('<');
        if (offset<0)
          offset = outputCompleteHTML.length;
      }
    }
    var beforeInsertionPoint = outputCompleteHTML.slice(0, offset);
    if (offset<outputCompleteHTML.length)
      resultBuf.push(outputCompleteHTML.slice(offset));
  }

  // now add new files
  for (var i = 0; i < inputAllFiles.length; i++) {
    var newFile = inputAllFiles[i];
    var matchingOutputFile = outputFileMap[newFile.path];
    if (matchingOutputFile) continue; // that's already taken care of

    var content = newFile.content;
    if (!content && typeof content!=='string') content = readInputContent(newFile); // fs.readFileSync(newFile.contentPath)+'';

    var insertChunk = '\n<!--'+persistence.formatFileInner(newFile.path, content)+'-->';
    resultBuf.unshift(insertChunk);

    writtenFiles++;
    if (writtenFiles%500===0) {
      console.log('  '+writtenFiles+'. '+newFile.path+' (new)');
    }
  }

  var resultHTML = beforeInsertionPoint;
  for (var i = 0; i < resultBuf.length; i++) {
    resultHTML += resultBuf[i];
  }

  return resultHTML;
}