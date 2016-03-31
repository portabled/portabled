module noapi {

  export function createChildProcess(
    drive: persistence.Drive,
    window: Window) {

    var pidCounter = 827;

    return {
      spawn
    };

    function spawn(command: string, args?: string, options?: {
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
                    }) {
      var proc = new HostedProcess(
        '/usr/bin/nodejs',
        drive, window);

    	var evt = new EventEmitter();
      // close, disconnect, error, exit, message

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
  }
}