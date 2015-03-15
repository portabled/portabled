module portabled.build.functions {

  export function typescriptBuild() {
    var asyncFn: any = () => typescriptBuildCore();
    asyncFn.toString = () => 'typescriptBuild()';
    return asyncFn;
  }

  function typescriptBuildCore() {
    
    typescriptBuild.mainTS.compilerOptions.out = 'index.js';

    // ensure preloading is stopped
    typescriptBuild.mainTS.service();

    var files = typescriptBuild.mainTS.host.getScriptFileNames();
    var nonDeclFile = null;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.slice(f.length - '.d.ts'.length) === '.d.ts')
        continue;
      nonDeclFile = f;
      break;
    }
    
    var program = typescriptBuild.mainTS.service().getProgram();
    var emitOutputStr: string = null;
    
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
        errors.push(
          (err.file ? err.file.fileName + ' ' : '') +
          (ts.DiagnosticCategory[err.category]) + err.code +
          (pos ? ' @' + pos.line + ':' + pos.character : ' @@' + err.start) + ' ' + err.messageText);
      }

      throw new Error(
        'TypeScript compilation errors/warnings ' + nonDeclFile + ', ' + errors.length + ' errors in ' + errorFiles+' files:\n'+
        errors.join('\n'));
    }

    program.emit(nonDeclFile, (filename, data, orderMark) => emitOutputStr = data);

    return emitOutputStr;
    
    
  }
    
  export module typescriptBuild {
 
    export var mainTS: typescript.TypeScriptService;

  }
  
}