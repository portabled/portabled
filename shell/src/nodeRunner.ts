declare namespace nodeRunner {

  type Options = {
    drive: persistence.Drive;
    cwd: string;
    scriptText: string;
    scriptPath: string;
    argv: string[];

    onprocesscreated(proc);
      // TODO: onprocesscreated -> enhance
      // this._runningProcesses.push({proc,onstop});
      // this._applyConsole(proc);

    onfinish(error: Error, exitCode: number);
  }

}

function nodeRunner(options: nodeRunner.Options) {
  var commandStart =+new Date();

  var text = options.scriptText;

  if (text.charAt(0)==='#') {
    // ignore leads
    var posLineEnd = text.indexOf('\n');
    if (posLineEnd>0 && posLineEnd<300) {
      var firstLine = text.slice(0, posLineEnd);
      if (posLineEnd===1)
        firstLine = ' ';
      else
        firstLine = '//'+firstLine.slice(0, firstLine.length-2);
      text = firstLine + text.slice(posLineEnd);
    }
  }

  // TODO: start
  // this._terminal.writeAsCommand('node ' + args);
  // var ani = this._beginCommand();
  // this._runningProcessCount++;


  isolation.createApiHost(
    options.drive,
    {
      scriptPath: options.scriptPath,
      argv: options.argv,
      cwd: options.cwd,
    },
    proc => {

      var stopped = false;
      var onstop = (err: Error)=>{
        if (stopped) return;
        stopped = true;
        options.onfinish(err, proc.exitCode);
      };

      options.onprocesscreated(proc);

      proc.ondispose = () => {
        onstop(null);
      };

      proc.runGlobal(text, options.scriptPath, (error, result) => {
        if (error) onstop(error);
      });

    });


}