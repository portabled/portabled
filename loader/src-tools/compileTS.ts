declare var fs, path, require, process;




declare namespace compileTS {

  type CompileResult = {
    [file: string]: string;
  } & {
    files: { file: string; data: string; }[];
  };

}

function compileTS(...args: string[]): compileTS.CompileResult {
   function readDirectory(dir, extensions, basePaths, excludePattern,  includeFilePattern, includeDirectoryPattern) {
        var result = [];
     		var incReg = new RegExp(includeFilePattern);
        var excReg = new RegExp(excludePattern);
        var seen = {};
        for (var i = 0; i < basePaths.length; i++) {
          addDir(basePaths[i]);
        }

        addDir(dir);
        return result;
        function addDir(dir) {
            if (seen[dir]) return;
            var files = fs.readdirSync(dir || ".").sort();
            var directories = [];
            for (var i = 0; i < files.length; i++) {
                var f = path.resolve(dir, files[i]);
                if (seen[f]) continue;

                var exclude = excReg.test(f);
                if (exclude) continue;
                if (incReg && !incReg.test(f)) continue;

              var stat = fs.statSync(f);
              if (stat.isFile()) {
                var matchExt = true;
                if (extensions && extensions.length) {
                  matchExt = false;
                  for (var iXt = 0; iXt < extensions.length; iXt++) {
                    if (f.slice(-extensions[iXt].length)===extensions[iXt]) {
                      matchExt = true;
                      break;
                    }
                  }
                }

                if (matchExt)
                  result.push(f);
              }

              if (stat.isDirectory())
                directories.push(f);
            }

            for (var i = 0; i < directories.length; i++)
                addDir(directories[i]);
        }
    }

  var tscPath = require.resolve('typescript/lib/tsc.js');
  var tscScript = '(function(){ return function (ChakraHost, ts) { '+fs.readFileSync(tscPath)+'\n}})() //# '+'sourceURL='+tscPath+'@wrapped';

  var result = {files:[]} as compileTS.CompileResult;

  var ts: any = {};
  var chakraHost = {
    newLine: '\n',
    args: args,
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

  var tsc = eval(tscScript);
  tsc(chakraHost, ts);

  return result;
}
