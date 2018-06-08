declare var fs: typeof import('fs'), path: typeof import('path');
//, require, process;




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

  type FileWatcherCallback =
    (fileName: string, eventKind: typeof import('typescript').FileWatcherEventKind) => void;
  type FileWatcher = import('typescript').FileWatcher;
  type DirectoryWatcherCallback = (fileName: string) => void

  interface ChakraHost {
    args: string[];
    currentDirectory: string;
    executingFile: string;
    newLine?: string;
    useCaseSensitiveFileNames?: boolean;
    echo(s: string): void;
    quit(exitCode?: number): void;
    fileExists(path: string): boolean;
    directoryExists(path: string): boolean;
    createDirectory(path: string): void;
    resolvePath(path: string): string;
    readFile(path: string): string | undefined;
    writeFile(path: string, contents: string): void;
    getDirectories(path: string): string[];
    readDirectory(path: string, extensions?: ReadonlyArray<string>, basePaths?: ReadonlyArray<string>, excludeEx?: string, includeFileEx?: string, includeDirEx?: string): string[];
    watchFile?(path: string, callback: FileWatcherCallback): FileWatcher;
    watchDirectory?(path: string, callback: DirectoryWatcherCallback, recursive?: boolean): FileWatcher;
    realpath(path: string): string;
    getEnvironmentVariable?(name: string): string;
  }

  var chakraHost: ChakraHost = {
    newLine: '\n',
    args: args,
    useCaseSensitiveFileNames: true,
    echo: function(text) {
      console.log(text);
    },
    readFile: function (path) {
      return fs.readFileSync(path)+'';
    },
    writeFile: function (file, data) {
      //console.log('writeFile(',file,',',data.length);
      result[file] = data;
      result.files.push({file:file, data:data});
    },
    resolvePath: function(file) { return path.resolve(file); },
    fileExists: function (file) { return fs.existsSync(file) && fs.statSync(file).isFile(); },
    realpath: (path: string) => {
      return fs.realpathSync(path);
    },
    directoryExists: function(file) {
      return path.resolve(file) === '/' || fs.existsSync(file) && fs.statSync(file).isDirectory();
    },
    createDirectory: (dir) => {
      fs.mkdirSync(dir);
    },
    getDirectories: (dir: string) => {
      var dirFiles = fs.readdirSync(dir);
      var result: string[] = [];
      for (let i = 0; i < dirFiles.length; i++) {
        if (fs.statSync(path.resolve(dir, dirFiles[i])).isDirectory())
          result.push(dirFiles[i]);
      }
      return result;
    },
    executingFile: tscPath,
    currentDirectory: process.cwd(),
    readDirectory: readDirectory,
    quit: function() { }
  };

  var tsc = eval(tscScript);
  tsc(chakraHost, ts);

  return result;
}
