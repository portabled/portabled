declare var persistence;
declare var unescape;

namespace shell {

  var version = '0.80j';

  export class CommanderShell {

    private _drive: persistence.Drive;

    private _metrics: layout.MetricsCollector;
    private _twoPanels: panels.TwoPanels;
    private _terminal: terminal.Terminal;

    private _repl: noapi.HostedProcess;
    private _replAlive: Function;

    private _editor: handlers.Handler.Editor = null;
    private _savedPosns: any = {};

    private _keybar: keybar.Keybar;

    constructor(private _topWindow: Window, private _host: HTMLElement, private _originalDrive: persistence.Drive, complete: () => string) {

      var wrappedDrive = persistence.trackChanges(this._originalDrive);
      this._drive = wrappedDrive.drive;
      wrappedDrive.onchanges = changedFiles => this._onDriveChange(changedFiles);

      this._repl = new noapi.HostedProcess(
        '/node_modules/repl.js',
        this._drive,
        window);
      this._repl.cwd = '/';
      this._repl.console.log =  (...args: any[]) => {
        this._terminal.log(args);
      };
      this._enhanceNoprocess(this._repl);
      this._replAlive = this._repl.keepAlive();

      elem(this._host, {
        background: 'black',
        color: 'silver'
      });

      this._metrics = new layout.MetricsCollector(window);

      this._terminal = new terminal.Terminal(this._host, this._repl, version);
      this._twoPanels = new panels.TwoPanels(this._host, '/', '/src', this._drive);
      this._twoPanels.ondoubleclick = () => this._twoPanels_doubleclick();

      var _lastCwd: string;
      this._twoPanels.onpathchanged = () => {
        var newPath = this._twoPanels.currentPath();
        if (newPath !== _lastCwd) {
          _lastCwd = newPath;
          this._terminal.setPath(newPath);
          this._updateWindowTitle(newPath);
          this._repl.cwd = newPath;
        }
      };

      this._keybar = new keybar.Keybar(this._host, [
        { text: 'Help' },
        { text: '<None>' },
        { text: 'View' },
        { text: 'Edit', action: () => this._openEditor(this._twoPanels.cursorPath()) || true },
        { text: 'Copy', action: () => this._command(actions.copy) },
        { text: 'Move/Rename', action: () => this._command(actions.move) },
        { text: 'MkDir', action: () => this._command(actions.mkDir) },
        { text: 'Delete', action: () => this._command(actions.remove) },
        { text: 'Options' },
        { text: 'Save', action: () => actions.save() || true }
      ]);

      var resizeMod = require('resize');
      resizeMod.on(winMetrics => {
        this._metrics.resize(winMetrics);
        this.measure();
        this.arrange();
      });

      this.measure();
      this.arrange();

      on(this._host, 'keydown', e => this._keydown(<any>e));

      var _glob = (function() { return this; })();
      var applyConsole = (glob) => {
        if (glob.console) {
          var _oldLog: Function = glob.console.log;
          var term = this._terminal;
          console.log = function() {
            var args = [];
            for (var i = 0; i < arguments.length; i++) {
              args.push(arguments[i]);
            }
            term.log(args);
            if (typeof _oldLog === 'function')
              _oldLog.apply(glob.console, args);
          };
          (<any>console.log)._oldLog = _oldLog;
        }
        else {
          var term = this._terminal;
          glob.console = {
            log: function() {
              var args = [];
              for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
              }
              term.log(args);
            }
          };
        }
      };

      if (_glob.console && window.console && _glob.console.log && _glob.console.log!==window.console.log)
        applyConsole(_glob);
      applyConsole(window);

      setTimeout(() => {
        this._terminal.writeDirect(complete());
        this.measure();
        this.arrange();
      }, 1);

      this._terminal.onexecute = code=> this._terminalExecute(code);
      this._terminal.onkeydown = e => this._keydown(e);
      this._terminal.onenterdetected = () => {
        var cmd = this._terminal.getInput();
         this._terminal.writeDirect(cmd);
         if (!this._terminalExecute(cmd))
           this._execute(cmd, null);
      };

      this._updateWindowTitle('/');

      var hashCmd = this._topWindow.location.hash;
      if (hashCmd && hashCmd.charAt(0)==='#') hashCmd = hashCmd.slice(1);
      if (hashCmd) {
        hashCmd =
          typeof decodeURI === 'function' ? decodeURI(hashCmd) :
          typeof unescape === 'function' ? unescape(hashCmd) :
        	hashCmd.replace(/\+/g,' ').
        	replace(/\%([0-9a-fA-F][0-9a-fA-F])/g, (match, dd) => {
          	return String.fromCharCode(parseInt('0x'+dd));
        	});
        setTimeout(() => {
          this._twoPanels.toggleVisibility();
          this._terminal.writeDirect('startup: ' + hashCmd);
          setTimeout(() => this._terminalExecute(hashCmd), 1);
        }, 1);
      }
    }

    measure() {
      this._metrics.measure();
      this._twoPanels.measure();
      this._terminal.measure();
      if (this._editor && this._editor.measure) this._editor.measure();
    }

    arrange() {
      if (!this._metrics || !this._metrics.metrics) return;
      this._host.style.width = this._metrics.metrics.hostWidth + 'px';
      this._host.style.height = this._metrics.metrics.hostHeight + 'px';
      this._twoPanels.arrange(this._metrics.metrics);
      this._terminal.arrange(this._metrics.metrics);
      if (this._editor && this._editor.arrange) this._editor.arrange(this._metrics.metrics);

      this._keybar.arrange(this._metrics.metrics);
    }

    private _twoPanels_doubleclick(): boolean {
      var cursorPath = this._twoPanels.cursorPath();
      return this._execute(cursorPath, null);
    }

    private _keydown(e: KeyboardEvent) {
      var res = this._keydownCore(e);
      if (res) {
        if (e.preventDefault)
          e.preventDefault();
      }
      return res;
    }

  	Escape(e) {
    	if (!this._terminal.isInputEmpty())
          return this._terminal.keydown(e, this._twoPanels.cursorPath());

      this._twoPanels.toggleVisibility();
      return true;
    }

    Enter(e) {
      if (this._terminal.isInputEmpty()) {
        if (this._twoPanels.keydown(e)) return true;
        var cursorPath = this._twoPanels.cursorPath();
        return this._execute(cursorPath, null);
      }
      else {
        var input = this._terminal.getInput().replace(/^\s*/, '').replace(/\s*$/, '');
        if (input !== 'Enter' && typeof this[input]==='function') {
          var direct = this[input](e);
          if (direct) {
            this._terminal.clearInput();
            return direct;
          }
        }

      	return this._terminal.keydown(e, cursorPath);
      }
    }

    AltS() {
      actions.save();
      return true;
    }

    AltE(e) {
      var cursorPath = this._twoPanels.cursorPath();
      return this._openEditor(cursorPath, e.shiftKey);
    }

    MetaE(e) {
      var cursorPath = this._twoPanels.cursorPath();
      return this._openEditor(cursorPath, e.shiftKey);
    }

    private _keydownCore(e: KeyboardEvent) {

      var knames = keyNameList(e);

      if (this._editor) {
        if (this._editor.handleKeydown) {
          if (this._editor.handleKeydown(e)) return true;
        }

        if (e.keyCode === 27) {
          this._closeEditor();
          return true;
        }
        return;
      }

      this._terminal.echoKey(e);

      var pressed: any = {};

      for (var i = 0; i < knames.length; i++) {
        pressed[knames[i]]=1;
        var kn = knames[i].replace(/\-/g, '');
      	if (typeof this[kn]==='function') {
          var proc = this[kn](e);
          if (proc) return proc;
        }
      }

      if (this._twoPanels.isVisible() && (e.keyCode !== 13 || this._terminal.isInputEmpty())) {
        if (this._twoPanels.keydown(e)) return true;
      }

      var cursorPath = this._twoPanels.cursorPath();

      var refocusInput = true;
      if (e.ctrlKey) refocusInput = false;
      if (pressed['Ctrl-V']) refocusInput = true;

      if (refocusInput)
      	this._terminal.focus();

      if (this._terminal.keydown(e, cursorPath)) return true;

      //if (e.keyCode < 32 || e.keyCode > 126) {
      //	this._terminal.log('CommanderShell::keydown ' + e.yCode);
      //}

      if (this._keybar.handleKeydown(e)) return true;
    }

    private _command(action: (drive: persistence.Drive, selectedPath: string, targetPanelPath: string) => boolean, extraArgs?: string) {

      var cursorPath = this._twoPanels.cursorPath();
      var currentOppositePath = this._twoPanels.currentOppositePath();

    	if (extraArgs) {
      	if (extraArgs.indexOf(' ')) {
          var spacePos = extraArgs.indexOf(' ');
          cursorPath = extraArgs.slice(0, spacePos);
          currentOppositePath = extraArgs.slice(spacePos+1);
				}
    		else {
    			cursorPath = extraArgs;
				}
			}

      var cursorPath = this._twoPanels.cursorPath();
      var currentOppositePath = this._twoPanels.currentOppositePath();

      var runResult = action(this._drive, cursorPath, currentOppositePath);

      if (!runResult) return false;

      this.measure();
      this.arrange();

      return true;
    }

    private _closeEditor() {
      var pos = this._editor.getPosition ? this._editor.getPosition() : null;
      if (pos)
      	this._savedPosns[this._twoPanels.cursorPath()] = pos;

      this._editor.close();
      this._editor = null;
      this.measure();
      this.arrange();
    }

    private _openEditor(cursorPath: string, withPrompt?: boolean) {

      if (!cursorPath) withPrompt = true;
      if (!withPrompt) {
        var files = this._drive.files();
        for (var i = 0; i < files.length; i++) {
          var fname = files[i];
          if (fname.length<=cursorPath.length) continue;
          if (fname.charAt(cursorPath.length)!=='/') continue;
          if (fname.slice(0, cursorPath.length)===cursorPath) {
            withPrompt = true;
            break;
          }
        }
      }

      if (withPrompt) {
        cursorPath = prompt('Edit file', cursorPath);
      }

      if (!cursorPath)
        return false;

      cursorPath = this._repl.coreModules.path.resolve(cursorPath);

      var posn = this._savedPosns[cursorPath];

      var handlerList: shell.handlers.Handler[] = [];
      for (var k in shell.handlers) if (shell.handlers.hasOwnProperty(k)) {
        var ha: shell.handlers.Handler = shell.handlers[k];
        if (typeof ha === 'object'
          && ((ha.preferredFiles && typeof ha.preferredFiles.test === 'function')
            || (ha.handlesFiles && typeof ha.handlesFiles.test === 'function'))) {
          handlerList.push(ha);
        }
      }

      var loadEditor = (ha: handlers.Handler) => {
        if (typeof ha.edit !== 'function') return false;
        this._editor = ha.edit(cursorPath, this._drive, this._host);
        if (this._editor) {
          if (posn && this._editor.setPosition)
            this._editor.setPosition(posn);

          // force relayout just in case
          this.measure();
          this.arrange();
          this._editor.requestClose = () => this._closeEditor();
          this._terminal.writeDirect('@edit ' + cursorPath);

          if (posn && this._editor.setPosition)
            this._editor.setPosition(posn);

          return true;
        }
        return false;
      };

      for (var i = 0; i < handlerList.length; i++) { // find preferred handlers
        var ha = handlerList[i];
        if (ha.entryClass && ha.preferredFiles && ha.preferredFiles.test(cursorPath)) {
          if (loadEditor(ha)) return true;
        }
      }

      for (var i = 0; i < handlerList.length; i++) { // find fallback handlers
        var ha = handlerList[i];
        if (ha.entryClass && ha.handlesFiles && ha.handlesFiles.test(cursorPath)) {
          if (loadEditor(ha)) return true;
        }
      }

      ha = <any>handlers.text; // default
      if (ha) {
        if (loadEditor(ha)) return true;
      }

      return false;
    }

    private _enhanceNoprocess(nopro: noapi.HostedProcess) {
      nopro.coreModules['nodrive'] = this._drive;
      nopro.coreModules['nowindow'] = window;
    }

    private _terminalExecute(code: string) {
      if (!code) return void 0;
      var firstWord = (code.match(/^\s*(\S+)[\s$]/) || [])[1];
      var moreArgs = (code.match(/^\s*\S+\s+(\S[\S\s]*)$/) || [])[1];
      if (!firstWord) firstWord = code;
      switch (firstWord) {
        case 'cd':
        case '@cd':
          return this._cd(this._repl.coreModules.path.resolve(moreArgs));
        case 'ls':
        case '@ls':
          return this._ls(moreArgs);
        case 'type':
        case '@type':
          return this._type(moreArgs);
        case 'node':
        case '@node':
          return this._node(moreArgs);
        case 'tsc':
        case '@tsc':
          return this._tsc(moreArgs);
        case 'build':
        case '@build':
          return this._build(moreArgs);
        case 'F4':
        case 'edit':
        case '@edit':
          return this._openEditor(moreArgs||this._twoPanels.cursorPath());

        case 'F5':
        case 'copy':
        case '@copy':
          return this._command(actions.copy, moreArgs);

        case 'F6':
        case 'move':
        case '@move':
        case 'rename':
        case '@rename':
          return this._command(actions.move, moreArgs);

        case 'F7':
        case 'mkdir':
        case '@mkdir':
        case 'md':
        case '@md':
					return this._command(actions.mkDir, moreArgs);

        case 'F8':
        case 'remove':
        case '@remove':
        case 'rm':
        case '@rm':
        case 'delete':
        case '@delete':
        case 'del':
        case '@del':
					return this._command(actions.remove, moreArgs);

        default:
          var result = this._repl.eval(code, true /*use 'with' statement*/);
          if (result !== void 0) {
            this._terminal.log([result]);
          }
          return true;
      }
    }

    private _cd(args: string) {
      if (!args) {
        this._terminal.writeDirect(this._twoPanels.currentPath());
        return true;
      }

      if (this._twoPanels.setPath(args)) {
        return true;
      }
      else {
        this._terminal.writeDirect('Directory ' + args + ' not found.');
        return true;
      }
    }

    private _ls(args) {
      var dir = args || this._twoPanels.currentPath();
      var lead = dir;
      if (lead.slice(-1) !== '/') lead += '/';
      var allFiles = this._drive.files();
      var filtered: string[] = [];
      for (var i = 0; i < allFiles.length; i++) {
        if (allFiles[i].length > lead && allFiles[i].slice(lead.length) === lead)
          filtered.push(allFiles[i]);
      }
      if (!filtered.length) {
        this._terminal.writeDirect('No files found at "' + args + '"');
        return true; // command is handled, even if unsuccessfully
      }
      else {
        this._terminal.writeDirect(filtered.join(' '));
      }
      this._terminal.writeDirect('ls command is not implemented yet');
    }

    private _type(args) {
      if (!args) {
        this._terminal.writeDirect('type command requires file name');
        return true;
      }
      var content = this._drive.read(args);
      if (content === null) {
        this._terminal.writeDirect('File ' + args + ' not found');
        return true;
      }
      this._terminal.writeDirect(content);
    }

    private _node(args: string) {
      var commandStart =+new Date();
      var argList = (args || '').split(/\s+/);
      if (!argList[0]) {
        this._terminal.writeDirect('Node emulation, v0.EARLY');
        return true;
      }

      var text = this._drive.read(argList[0]);
      if (typeof text !== 'undefined' && text !== null) {
        this._terminal.writeDirect('node ' + args);
        var ani = this._twoPanels.temporarilyHidePanels();

        setTimeout(() => {
          try {
            var proc = new noapi.HostedProcess(argList[0], this._drive, window);
            proc.console.log = (...args: any[]) => this._terminal.log(args);
            proc.cwd = this._twoPanels.currentPath();
            for (var i = 1; i < argList.length; i++) {
            	proc.argv.push(argList[i]);
            }
            this._enhanceNoprocess(proc);
            var evalStart = +new Date();
            if (evalStart-commandStart>100)
              this._terminal.writeDirect('...'+(((evalStart-commandStart)/100)|0)/10+'s to initialize process...');
            var result = proc.eval(text);
            if (typeof proc.exitCode == 'number')
              result = proc.exitCode;
            else
              result = proc.mainModule.exports;
          }
          catch (error) {
            result = error;
          }
          ani();
          this._terminal.log([result]);
        }, 1);

        return true;
      }
    }

    private _tsc(args: string) {
      var tscPath = '/src/imports/ts/tsc.js';
      var text = this._drive.read(tscPath);
      if (typeof text !== 'undefined' && text !== null) {
        var argList = args ? args.split(/\s+/) : [];
        this._terminal.writeDirect('@tsc' + (args ? ' ' + args : ''));
        var ani = this._twoPanels.temporarilyHidePanels();
        setTimeout(() => {
          try {
            var proc = new noapi.HostedProcess(
              tscPath,
              this._drive,
              window);

            proc.cwd = this._twoPanels.currentPath();
            for (var i = 0; i < argList.length; i++) proc.argv.push(argList[i]);

            proc.console.log = (...args: any[]) => this._terminal.log(args);

            this._enhanceNoprocess(proc);

            setTimeout(() => {
              if (!finishedOK) {
                var compileTime = +new Date() - start;
                this._terminal.writeDirect('Compilation seems to have failed after ' + (Math.round(compileTime / 100) / 10) + ' sec.');
                ani();
              }
            }, 100);

            var start = +new Date();
            var result = proc.eval(text);
            this._terminal.writeDirect('@tsc ' + (Math.round((+new Date()-start)/100) / 10) + ' sec.');

            if (typeof proc.exitCode == 'number')
              result = proc.exitCode;
            else
              result = proc.mainModule.exports;
            if (result)
            	this._terminal.log(result);
          }
          catch (error) {
            this._terminal.log([error]);
          }
          var finishedOK = true;
          ani();
        }, 1);
        return true;
      }
    }

    private _execute(cursorPath: string, callback: Function) {

      if (/\.js$/.test(cursorPath)) {
        return this._node(cursorPath);
      }
      else if (/\.ts$/.test(cursorPath)) {
        return this._tsc(cursorPath);
      }
      else if (/.html$/.test(cursorPath)) {
        return this._build(cursorPath);
      }
      else {
        var ani = this._twoPanels.temporarilyHidePanels();
        this._terminal.writeDirect('@type ' + cursorPath);
        this._terminal.writeDirect(this._drive.read(cursorPath));
        this._terminal.storeAsHistory('@type ' + cursorPath);
        ani();
        return true;
      }
    }

    private _build(cursorPath: string) {

      this._terminal.writeDirect('@build ' + cursorPath);
      var ani = this._twoPanels.temporarilyHidePanels();
      setTimeout(() => {

        var buildStart = (+new Date());

        var uiDoc: any = this._host;
        while (true) {
          var uiDocParent = uiDoc.parentElement || uiDoc.parentNode;
          if (!uiDocParent) break;
          uiDoc = uiDocParent;
        }

        var ctx = build.spawnWindowContext(uiDoc, cursorPath, 'Building '+cursorPath, this._drive, (...args) => console.log.apply(args));
        var blankWindow = ctx.blankWindow;
        var proc = ctx.noprocess;
        this._enhanceNoprocess(proc);

        build.buildInContext(
          cursorPath,
          this._drive,
          moduleName => proc.requireModule(moduleName, proc.cwd, null),
          code => proc.eval(code, true /* use 'with' statement */),
          (...args: any[]) => {
            this._terminal.log(args);
            try { (<any>blankWindow).log(args.join(' ')); }
            catch (err) { this._terminal.log(['cannot log messages to build window ', err.message]); }
          },
          (error: Error, html: string) => {
            if (error) {
              this._terminal.log([error]);
              ani();
              return;
            }

            var buildTimeTotal = (+new Date()) - buildStart;
            this._terminal.log(['Built '+html.length+'-character text in '+Math.round(buildTimeTotal/100)/10+' sec.']);

            if (typeof Blob==='function'
                && typeof URL!=='undefined'
               	&& typeof URL.createObjectURL==='function') {
              try {
                showUsingBlob();
              }
              catch (blobError) {
                showUsingDocumentWrite();
              }
            }
            else {
              showUsingDocumentWrite();
            }

            ani();

            function showUsingBlob() {
              var blob = new Blob([html], { type: 'text/html' });
              var url = URL.createObjectURL(blob);
              blankWindow.location.replace(url);
            }

            function showUsingDocumentWrite() {
              blankWindow.document.open();
              blankWindow.document.write(html);
              blankWindow.document.close();
            }
          });

      }, 1);

      this._terminal.storeAsHistory('@build ' + cursorPath);
      return true;
    }

    private _onDriveChange(changedFiles: string[]) {
      this.arrange();
      this._repl.filesChanged(changedFiles);
    }

  	private _updateWindowTitle(newPath: string) {
      if (this._topWindow && this._topWindow.document)
        this._topWindow.document.title = newPath==='/' ? ' '+version : newPath;
    }

  }

  export module CommanderShell {

    export interface Metrics {
      hostWidth: number;
      hostHeight: number;
      emWidth: number;
      emHeight: number;
    }

  }
}