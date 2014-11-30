module portabled.build.functions {

  export function typescriptBuild() {
    
    typescriptBuild.mainTS.compilerOptions.out = 'index.js';

    var files = typescriptBuild.mainTS.host.getScriptFileNames();
    var nonDeclFile = null;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.slice(f.length - '.d.ts'.length) === '.d.ts')
        continue;
      nonDeclFile = f;
      break;
    }
    
    var emitOutput = typescriptBuild.mainTS.service().getEmitOutput(nonDeclFile);
    if (emitOutput.emitOutputStatus !== ts.EmitReturnStatus.Succeeded) {

      var errors: string[] = [];
      var errorFiles = 0;

      for (var i = 0; i < files.length; i++) {
        var syntactic = typescriptBuild.mainTS.service().getSyntacticDiagnostics(files[i]);
        var semantic = typescriptBuild.mainTS.service().getSemanticDiagnostics(files[i]);
        
        var both = syntactic ?
          (semantic ? syntactic.concat(semantic) : syntactic) :
          (semantic ? semantic : null);

        if (!both || !both.length)
          continue;

        errorFiles++;
        var fileSnapshot = typescriptBuild.mainTS.host.getScriptSnapshot(files[i]);
        var linestarts = fileSnapshot.getLineStartPositions();
        for (var j = 0; j < both.length; j++) {
          var err = both[j];

          var pos = err.file ? err.file.getLineAndCharacterFromPosition(err.start) : null;
          errors.push(
            err.file.filename +
            ' ' +(ts.DiagnosticCategory[err.category]) +
            (pos ? ' @'+pos.line + ':' + pos.character : ' @@' + err.start) + ' ' + err.messageText);
        }
      }
      alert(
        ts.EmitReturnStatus[emitOutput.emitOutputStatus] + ' building ' + nonDeclFile + ', ' + errors.length + ' errors in ' + errorFiles+' files:\n'+
        errors.join('\n'));
    }

    if (emitOutput.outputFiles)
      return emitOutput.outputFiles[0].text;
    
    
  }
    
  export module typescriptBuild {
 
    export var mainTS: typescript.TypeScriptService;

  }
  
}