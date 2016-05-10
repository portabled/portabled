function createChildProcess(
  drive: persistence.Drive,
  window: Window,
  statics: any | { fs; path; process; require; }) {

  var pidCounter = 827;

  return {
    spawn
  };

  function spawn(
  command: string,
   args?: string,
   options?: {
   /** Current working directory of the child process */
   cwd: string,
   /** Environment key-value pairs */
   env: any,
   /** Child's stdio configuration. (See options.stdio)*/
   stdio: any[] | string,
   /** Prepare child to run independently of its parent process. Specific behavior depends on the platform, see options.detached) */
   detached: boolean,
   /** Sets the user identity of the process. (See setuid(2).) */
   uid: number,
   /** Sets the group identity of the process. (See setgid(2).) */
   gid: number,
   /**
          * If true, runs command inside of a shell. Uses '/bin/sh' on UNIX, and 'cmd.exe' on Windows. A different shell can be specified as a string.
          * The shell should understand the -c switch on UNIX, or /s /c on Windows. Defaults to false (no shell).
          */
   shell: boolean | string
   })
  {

    var text = getScriptText(command);


    var proc = new HostedProcess(
      command,
      drive, window);

    var evt = new EventEmitter();
    //   b close, disconnect, error, exit, message

    proc.ondispose = () => {
      // TODO: fire close?
      // TODO: preserve exitCode n  n
      evt.emit('exit');
    };

    proc.cwd = statics.cwd || statics.process.cwd();
    if (statics.env) {
      var empty = {};
      for (var k in statics.env) if (typeof statics.env[k]!=='function' && !(k in empty)) {
        proc.env[k] = statics.env[k];
      }
    }

    if (options.env) {
      var empty = {};
      for (var k in options.env) if (typeof options.env[k]!=='function' && !(k in empty)) {
        proc.env[k] = options.env[k];
      }
    }

    if (args) {
      var argList = args.split(/\s+/);
      for (var i = 1; i < argList.length; i++) {
        proc.argv.push(argList[i]);
      }
    }

    if (typeof statics.enhanceProcess==='function')
      statics.enhanceProcess(proc);

    var cproc = {
      pid: pidCounter++,
      connected: true,

      disconnect,
      kill,
      send,

      addListener: (e,c) => evt.addListener(e,c),
      on: (e, c) => evt.on(e,c),
      once: (e, c) => evt.once(e,c),
      removeListener: (e,c) => evt.removeListener(e,c),
      removeAllListeners: e => evt.removeAllListeners(e),
      setMaxListeners: (n) => evt.setMaxListeners(n),
      listeners: e => evt.listeners(e),
      emit: (e,v) => evt.emit(e,v)
    };

    // process must run asynchronously
    setTimeout(function() {
      proc.eval(text);
    }, 1);

    return cproc;

    function disconnect() {
      if(cproc.connected) {
        cproc.connected = false;
        evt.emit('disconnect');
      }
    }

    function kill(signal?: string) {
    }

    function send(message: any, sendHandle: any, options: any, callback: Function): boolean {
      return true;
    }
  }

  function getScriptText(command: string) {
    var text = statics.fs.readFileSync(command);
    if (typeof text !== 'undefined' && text !== null) {

      text = text + '';
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

    }

    return text;
  }
}
