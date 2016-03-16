declare var persistence;
declare var unescape;

namespace shell {

  var version = '0.82m';

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
  	private _dialogHost = new DialogHost();

    constructor(private _topWindow: Window, private _host: HTMLElement, private _originalDrive: persistence.Drive, private _getBootState: () => any, complete: () => string) {

      var wrappedDrive = trackChanges(this._originalDrive);
      this._drive = wrappedDrive.drive;
      wrappedDrive.onchanges = changedFiles => this._onDriveChange(changedFiles);

      this._repl = new noapi.HostedProcess(
        '/node_modules/repl.js',
        this._drive,
        window);
      this._repl.cwd = '/';
      this._repl.console.log =  (...args: any[]) => {
        console.log.apply(console, args);
        // this._terminal.log(args);
      };
      this._enhanceNoprocess(this._repl);
      this._replAlive = this._repl.keepAlive();

      elem(this._host, {
        background: 'black',
        color: 'silver'
      });

      this._metrics = new layout.MetricsCollector(window);

      this._terminal = new terminal.Terminal(this._host, this._repl, () => <any>this._editor || this._dialogHost.active(), version, this._getBootState);
      var panelDirService =
          // panels.driveDirectoryService(this._drive);
      		panels.fsDirectoryService(this._repl.coreModules.fs);

      this._twoPanels = new panels.TwoPanels(
        this._host,
        '/',
        this._repl.coreModules.fs.existsSync('/src') && this._repl.coreModules.fs.statSync('/src').isDirectory() ? '/src' : '/',
        panelDirService);
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
        { text: 'Import', action: () => this._command(actions.importAction) },
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

      var dragIgnore = (e) => {
        if (!e) e = (<any>window).event;
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      };

      on(this._host, 'dragenter', dragIgnore);
      on(this._host, 'dragover', dragIgnore);

    	on(this._host, 'drop', (e) => {
        if (!e) e = (<any>window).event;
        var dt = (<any>e).dataTransfer;
        var files = dt ? dt.items || dt.files : null;
        if (!files || !files.length) return;

        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();

      	this._command(actions.importAction, files);

    	});


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
      var parent = window.parent;
      if (parent !== window.parent)
        applyConsole(parent);

      setTimeout(() => {
        var reslt = complete();
        if (reslt)
        	this._terminal.writeDirect(reslt);

        this.measure();
        this.arrange();

        this._terminal.focus();
      }, 1);

      this._terminal.onexecute = code=> this._terminalExecute(code);
      this._terminal.onkeydown = e => this._keydown(e);
      this._terminal.onenterdetected = () => {
        var cmd = this._terminal.getInput();
         this._terminal.writeAsCommand(cmd);
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
      this._twoPanels.measure(this._metrics.metrics);
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
        e.cancelBubble = true;
        e.returnValue = false;
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
        if (dispatchKeyEvent(e, this._twoPanels)) return true;
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
      return this._openEditor(cursorPath, false);
    }

    AltF4(e) {
      var cursorPath = this._twoPanels.cursorPath();
      return this._openEditor(cursorPath, true);
    }

    ShiftF4(e) {
      var cursorPath = this._twoPanels.cursorPath();
      return this._openEditor(cursorPath, true);
    }

    MetaE(e) {
      var cursorPath = this._twoPanels.cursorPath();
      return this._openEditor(cursorPath, false);
    }

    private _keydownCore(e: KeyboardEvent) {

      enrichKeyEvent(e);

      if (this._dialogHost.active()) return;

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

      if (this._twoPanels.isVisible() && (e.keyCode !== 13 || this._terminal.isInputEmpty())) {
        if (dispatchKeyEvent(e, this._twoPanels)) return true;
      }

      var disp = dispatchKeyEvent(e, this);
      if (disp) return disp;

      var cursorPath = this._twoPanels.cursorPath();

      var refocusInput = true;
      if (e.ctrlKey) refocusInput = false;
      if (e.shellPressed['Ctrl-V']) refocusInput = true;

      if (refocusInput)
      	this._terminal.focus();

      if (this._terminal.keydown(e, cursorPath)) return true;

      //if (e.keyCode < 32 || e.keyCode > 126) {
      //	this._terminal.log('CommanderShell::keydown ' + e.yCode);
      //}

      if (this._keybar.handleKeydown(e)) return true;
    }

    private _command(action: (env?: actions.ActionContext) => boolean, extraArgs?: string|FileList) {

      var cursorPath = this._twoPanels.cursorPath();
      var currentOppositePath = this._twoPanels.currentOppositePath();
    	var files: FileList = null;

    	if (typeof extraArgs === 'string') {
      	if (extraArgs.indexOf(' ')) {
          var spacePos = extraArgs.indexOf(' ');
          cursorPath = extraArgs.slice(0, spacePos);
          currentOppositePath = extraArgs.slice(spacePos+1);
				}
    		else {
    			cursorPath = extraArgs;
				}
			}
			else if (extraArgs && extraArgs.length) {
        files = extraArgs;
      }

      var runResult = action({
    		drive: this._drive,
  			cursorPath: cursorPath,
  			currentPanelPath: this._twoPanels.currentPath(),
  			targetPanelPath: currentOppositePath,
  			dialogHost: this._dialogHost,
  			repl: this._repl,
        selectFile: (file: string) => {
          this._twoPanels.selectFile(this._repl.coreModules.path.resolve(file));
        },
        files: files
			});

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

        try {
          var stat = this._repl.coreModules.fs.statSync(cursorPath);
          if (!stat.isFile() || stat.isDirectory())
            withPrompt = true;
        }
        catch (err) {
          withPrompt = true;
        }
      }

      var edit = () => {
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
            this._terminal.writeSmall('@edit ' + cursorPath);

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
      };

      var showPrompt = () => {
        var dlgBody = document.createElement('div');
        dlgBody.style.cssText =
          'position: absolute; left: 30%; top: 40%; height: auto; width: auto; min-width: 40%;'+
          'background: gray; color: black; border: solid 1px white;'+
          'padding: 1em;';

        dlgBody.innerHTML =
          '<pre style="margin: 0px;">'+
          '<div style="font-size: 160%; font-weight: light;">Edit (F4)</div>'+
          '<input id=edit-name style="width: 95%; background: black; color: silver; border: none; font: inherit; font-size: 120%; padding: 3px; padding-left: 0.6em;">'+
          '<div style="text-align: right; margin-top: 0.5em; margin-right: 5%;"><button id=edit-button style="font: inherit; font-size: 120%;"> Create </button></div>'+
          '</pre>';

        var edit_name = dlgBody.getElementsByTagName('input')[0];
        var edit_button = dlgBody.getElementsByTagName('button')[0];

        var dlg = this._dialogHost.show(dlgBody);

        dlgBody.onkeydown = (e) => {
          if (!e) e = (<any>window).event;
          enrichKeyEvent(e);
          if (e.shellPressed.Escape) {
            if ('cancelBubble' in e) e.cancelBubble = true;
            if (e.preventDefault) e.preventDefault();
            dlg.close();
          }
          else if (e.shellPressed.Enter) {
            if ('cancelBubble' in e) e.cancelBubble = true;
            if (e.preventDefault) e.preventDefault();
            cursorPath = edit_name.value;
            dlg.close();
            if (cursorPath)
            	edit();
          }
        };

        edit_name.value = cursorPath;

        edit_button.onclick = () => {
            dlg.close();
            cursorPath = edit_name.value;
            if (cursorPath)
            	edit();
        };

        setTimeout(function() {
          edit_name.focus();
        }, 1);
      };

      if (withPrompt) {
        showPrompt();
        return true;
      }

      if (!cursorPath)
        return false;

      return edit();
    }

    private _enhanceNoprocess(nopro: noapi.HostedProcess) {
      nopro.coreModules['nodrive'] = this._drive;
      nopro.coreModules['nowindow'] = window;
      nopro.coreModules['noshell'] = this;
      // nopro.coreModules['bootState'] = this._getBootState();  LET'S NOT EXPOSE TOO MUCH
      nopro.coreModules['nodialog'] = this._dialogHost;
    }

    private _terminalExecute(code: string) {
      if (!code) return void 0;
      var firstWord = (code.match(/^\s*(\S+)[\s$]/) || [])[1];
      var moreArgs = (code.match(/^\s*\S+\s+(\S[\S\s]*)$/) || [])[1];
      if (!firstWord) firstWord = code;
      switch (firstWord) {
        case 'cd':
        case '@cd':
          return this._cd(moreArgs ? this._repl.coreModules.path.resolve(moreArgs) : null);
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
        case 'window':
        case '@window':
          return this._window(moreArgs);
        case 'F4':
        case 'edit':
        case '@edit':
          return this._openEditor(moreArgs||this._twoPanels.cursorPath());

        case 'F5':
        case 'copy':
        case '@copy':
          return this._command(actions.copy, moreArgs);

        case 'F3':
        case 'import':
        case '@import':
          return this._command(actions.importAction, moreArgs);

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

          try { var fileExists = this._repl.coreModules.fs.existsSync(code); }
          catch (error) { }

          if (fileExists) {
            this._execute(code, null);
            return true;
          }

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
        this._terminal.writeAsCommand('node ' + args);
        var ani = this._twoPanels.temporarilyHidePanels();

        setTimeout(() => {
          try {
            var proc = new noapi.HostedProcess(argList[0], this._drive, window);
            proc.console.log = (...args: any[]) => { console.log.apply(console, args); };

            proc.cwd = this._twoPanels.currentPath();
            for (var i = 1; i < argList.length; i++) {
            	proc.argv.push(argList[i]);
            }
            this._enhanceNoprocess(proc);
            var evalStart = +new Date();
            if (evalStart-commandStart>100)
              this._terminal.writeSmall('...'+(((evalStart-commandStart)/100)|0)/10+'s to initialize process...');
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
        this._terminal.writeAsCommand('@tsc' + (args ? ' ' + args : ''));
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
            this._terminal.writeSmall('@tsc ' + (Math.round((+new Date()-start)/100) / 10) + ' sec.');

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

		private _tryExtract(file: string, htmlContent: string) {
      var importedFiles: { path: string; content: string; }[] = [];
      var pos = 0;
      while (true) {
        pos = htmlContent.indexOf('<!'+'--', pos);
        if (pos<0) break;
        var end = htmlContent.indexOf('--'+'>', pos+4);
        if (end<0) break;

        var cmnt = new persistence.dom.CommentHeader(<any>{ nodeValue: htmlContent.slice(pos+4, end) });
        var domFile = persistence.dom.DOMFile.tryParse(cmnt);
        if (domFile) {
          importedFiles.push({ path: domFile.path, content: domFile.read() });
        }

        pos = end+3;
      }

      if (importedFiles.length) {
      	this._command(env => {
          var envExt: actions.copyMoveImport.ExtendedActionContext = <any>env;
          envExt.cursorPath = file.replace(/.html$/, '')+'/';
          envExt.dirSource = true;
          envExt.title = 'Extract';
          envExt.buttonText = 'Extract';
          envExt.from = file;
          envExt.sourceFiles = [];
          envExt.virtualSource = true;

          var removed = true; // do not remove existing HTML container for now, it's not intuitively expected with this dialog popping up

          var createEntry = (i: number) => {
            return {
              path: importedFiles[i].path,
              getContent: () => importedFiles[i].content,
              remove: () => {
              	if (removed) return;
              	removed = true;
              	var expandedFile = this._repl.coreModules.path.resolve(file);
              	this._drive.write(expandedFile, null);
            	}
            };
          }

          for (var i = 0; i < importedFiles.length; i++) {
            envExt.sourceFiles.push(createEntry(i));
          }

          actions.copyMoveImport(<any>envExt);

          return true;
        });
        return true;
      }
    }

    private _execute(cursorPath: string, callback: Function) {

      if (/\.js$/.test(cursorPath)) {
        return this._node(cursorPath);
      }
      else if (/\.ts$/.test(cursorPath)) {
        return this._tsc(cursorPath+' --pretty');
      }
      else if (/.html$/.test(cursorPath)) {
        var htmlContent = this._repl.coreModules.fs.readFileSync(cursorPath)+'';
        if (/\<\!\-\-\s*total /.test(htmlContent)) {
          var extractOK = this._tryExtract(cursorPath, htmlContent);
          if (extractOK) return true;
        }

        return this._window(cursorPath);
      }
      else {
        var ani = this._twoPanels.temporarilyHidePanels();
        this._terminal.writeAsCommand('@type ' + cursorPath);
        this._terminal.writeDirect(this._drive.read(cursorPath));
        this._terminal.storeAsHistory('@type ' + cursorPath);
        ani();
        return true;
      }
    }

    private _window(cursorPath: string) {

      this._terminal.writeAsCommand('@window ' + cursorPath);
      var ani = this._twoPanels.temporarilyHidePanels();
      setTimeout(() => {

        var uiDoc: any = this._host;
        while (true) {
          var uiDocParent = uiDoc.parentElement || uiDoc.parentNode;
          if (!uiDocParent) break;
          uiDoc = uiDocParent;
        }

        var html = this._drive.read(cursorPath);
        var blankWindow = require('nowindow').open('about:blank');

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

      }, 1);

      this._terminal.storeAsHistory('@window ' + cursorPath);
      return true;
    }

    private _onDriveChange(changedFiles: string[]) {
      this.arrange();
      this._repl.filesChanged(changedFiles);
    }

  	private _updateWindowTitle(newPath: string) {
      try {
        if (this._topWindow && this._topWindow.document)
          this._topWindow.document.title = newPath==='/' ? ' '+version : newPath;
      }
      catch (error) {
      }
    }

  }

  export module CommanderShell {

    export interface Metrics {
      hostWidth: number;
      hostHeight: number;
      emWidth: number;
      emHeight: number;
      scrollbarWidth: number;
      scrollbarHeight: number;
    }

  }
}
