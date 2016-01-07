namespace shell.build {

  export function typescriptBuild(files: string[], baseDir: string, drive: persistence.Drive) {

    var fileList = expandGlobs(files, baseDir, drive);

    var emitAnchor: string;
    for (var i = 0; i < fileList.length; i++) {
      if (!/\.d\.ts$/.test(fileList[i]) && /\.ts$/.test(fileList[i])) {
        emitAnchor = fileList[i];
        break;
      }
    }

		var options = ts.getDefaultCompilerOptions();
    options.target = ts.ScriptTarget.ES5;
    options.out = emitAnchor+'.js';

    var svc = createService();

    var result = svc.getEmitOutput(emitAnchor);
    if (!result.outputFiles.length)
      throw new Error('No result of the build.');

    var program = svc.getProgram();

    var errorList =
        program.getSyntacticDiagnostics().
    			concat(program.getGlobalDiagnostics()).
    			concat(program.getSemanticDiagnostics());

    if (errorList.length) {
      var errorFiles = 0;
      var errorFileMap = {};
      var errors: string[] = [];
      for (var i = 0; i < errorList.length; i++) {
        var err = errorList[i];

        if (!errorFileMap.hasOwnProperty(err.file.fileName)) {
          errorFileMap[err.file.fileName] = 1;
          errorFiles++;
        }

        var pos = err.file ? err.file.getLineAndCharacterOfPosition(err.start) : null;
        var msgText: string;
        if (typeof err.messageText==='string') {
          msgText = <string>err.messageText;
        }
        else if (err.messageText) {
          var msgs: string[] = [];
          var next: any = err.messageText;
          while (next) {
            var cat = next.category;
            if (cat && cat !== err.category)
            	msgs.push('['+ts.DiagnosticCategory[next.category]+'] '+next.messageText);
            else
              msgs.push(next.messageText);
            next = next.next;
          }
          msgText = msgs.join('\n    + ');
        }

        errors.push(
          (err.file ? err.file.fileName + ' ' : '') +
          (ts.DiagnosticCategory[err.category]) + err.code +
          (pos ? ' @' + pos.line + ':' + pos.character : ' @@' + err.start) + ' ' + msgText);
      }

      console.log(
        {TypescriptCompilation:  files.join(', ')+' ' + errors.length + ' messsages in ' + errorFiles+' files' });
      console.log(
        errors.join('\n'));

    }

    return result.outputFiles[0].text;


    function createService() {
    	var registry = ts.createDocumentRegistry(true);
      var cache = {};
      var host: ts.LanguageServiceHost = {
        getCompilationSettings: () => options,
        getNewLine: () => '\n',
        getProjectVersion: () => '1.0',
        getScriptFileNames: () => fileList,
        getScriptVersion: () => '1',
        getScriptSnapshot: (file: string) => {
          if (cache[file]) return cache[file];
          var content = drive.read(file);
          var snap = ts.ScriptSnapshot.fromString(content);
          cache[file] = snap;
          return snap;
        },
        getLocalizedDiagnosticMessages: null,
        getCancellationToken: null,
        getCurrentDirectory: () => '/',
        getDefaultLibFileName: () => '/src/imports/ts/lib.d.ts',
        log: s => console.log({tslog: s}),
        trace: s => console.log({ tstrace: s }),
        error: s => console.log({ tserror: s }),
        useCaseSensitiveFileNames: () => true,
        resolveModuleNames: (moduleNames: string[], containingFile: string) => {
          console.log('resolveModuleNames ', moduleNames, ' ', containingFile);
          var result: ts.ResolvedModule[] = [];
          for (var i = 0; i < moduleNames.length;i++) {
            result.push({
              resolvedFileName: moduleNames[i],
              isExternalLibraryImport: true
            });
          }
          return result;
        }
  		};

      var svc = ts.createLanguageService(
        host,
        registry);

    	return svc;
  	}

    function expandGlobs(files: string[], baseDir: string, drive: persistence.Drive) {

      var matchers: RegExp[] = [];
      for (var i = 0; i < files.length; i++) {
        var glob = globRegExp(files[i], baseDir);
        var fi = files[i];
        matchers.push(glob);
      }

      var allFiles = drive.files();
      var matchFiles: string[] = [];
      for (var i = 0; i < allFiles.length; i++) {

        var fi = allFiles[i];

        for (var j = 0; j < matchers.length; j++) {
          if (matchers[j].test(fi)) {
            matchFiles.push(fi);
            break;
          }
        }

      }
      return matchFiles;
    }
  }

}