module shell.actions {

  export function copyOrMove(move: boolean, env: ActionContext) {

    function ExtendContext() { }
    ExtendContext.prototype = env;
    var contextCopy: copyMoveImport.ExtendedActionContext = <any>new ExtendContext();
    contextCopy.from = env.repl.coreModules.path.resolve(env.cursorPath);
    contextCopy.dirSource = false;
    try {
      if (env.repl.coreModules.fs.statSync(contextCopy.from).isDirectory())
        contextCopy.dirSource = true;
    }
    catch (error) { }

    contextCopy.title = move ? 'Move (F6)' : 'Copy (F5)';
    contextCopy.buttonText = move ? 'Move' : 'Copy';
    contextCopy.sourceFiles =[];

    var filesToCopy: string[] = getDirFiles(env.drive, env.cursorPath);
    for (var i = 0; i < filesToCopy.length; i++) {
      contextCopy.sourceFiles.push(makeSourceEntry(filesToCopy[i]));
    }

    return copyMoveImport(contextCopy);

    function makeSourceEntry(path: string) {
      return {
        path: path,
        getContent: () => env.repl.coreModules.fs.readFileSync(path) + '',
        remove: move ? () => env.drive.write(path, null) : null
      };
    }

  }

}