/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

module teapo {

  export var completionDelayMsec = 200;
  export var maxCompletions = 24;

  export function detectDocumentMode(fullPath: string): string {
    switch (getFileExtensionLowerCase(fullPath)) {
        case '.ts': return 'text/typescript';
        case '.html': case '.htm': return 'text/html';
        case '.css': return 'text/css';
        case '.xml': return 'text/xml';
        case '.js': return 'text/javascript';
        default: return null;
    }
  }

  function getFileExtensionLowerCase(fullPath: string) {
    if (!fullPath)
      return '';
    var dotPos = fullPath.lastIndexOf('.');
    if (dotPos<0)
      return '';
    var ext = fullPath.slice(dotPos);
    return ext.toLowerCase();
  }

  export interface DocumentMode {
    mode: string;
    activateEditor(editor: CodeMirror.Editor, fullPath: string): { dispose(): void; };
  }

  export class TypeScriptDocumentMode implements DocumentMode {

    private _cookie: number = 0;
    private _completionTimeout = 0;
    private _completionActive = false;
    private _keymap = null;
    private _activeFullPath: string = null;

    constructor(private _typescript: TypeScript.Services.ILanguageService) {
      this._keymap = {
        'Ctrl-Space': (cm: CodeMirror.Editor) => this._ctrlSpace(cm),
        'Cmd-Space': (cm: CodeMirror.Editor) => this._ctrlSpace(cm)
      };
    }

    mode = 'text/typescript';

    activateEditor(editor: CodeMirror.Editor, fullPath: string): { dispose(): void; } {
      this._activeFullPath = fullPath;
      this._completionActive = false;
      var onchange = (instance, change) => this._triggerCompletion(editor, fullPath, false);
      editor.on('change', onchange);
      editor.addKeyMap(this._keymap);
      return {
        dispose: () => {
          editor.off('change', onchange);
          this._completionActive = false;
          this._activeFullPath = null;
          editor.removeKeyMap(this._keymap);
        }
      }
    }

    private _ctrlSpace(editor: CodeMirror.Editor) {
      this._triggerCompletion(editor, this._activeFullPath, true);
    }

    private _triggerCompletion(editor: CodeMirror.Editor, fullPath: string, force: boolean) {

      if (this._completionActive)
          return;

      var delay = force ? 1 : completionDelayMsec;

      this._cookie++;
      var triggerCookie = this._cookie;
      if (this._completionTimeout)
        clearTimeout(this._completionTimeout);

      this._completionTimeout = setTimeout(() => {
        clearTimeout(this._completionTimeout);
        if (this._completionActive || triggerCookie !== this._cookie) return;
        this._startCompletion(editor, fullPath, force);
      }, delay);
    }

    private _startCompletion(editor: CodeMirror.Editor, fullPath: string, force: boolean) {
      if (!force) {
        var nh = this._getNeighborhood(editor);
        if (nh.leadLength===0 && nh.tailLength===0
          && nh.prefixChar!=='.')
          return;
      }

      (<any>CodeMirror).showHint(
        editor,
        () => this._continueCompletion(editor, fullPath, force),
        { completeSingle: false });
    }

    private _continueCompletion(editor: CodeMirror.Editor, fullPath: string, force: boolean): { list: any[]; from: CodeMirror.Position; to: CodeMirror.Position; } {
      
      var nh = this._getNeighborhood(editor);

      var completions = this._typescript.getCompletionsAtPosition(fullPath, nh.offset, false);

      var from = {
        line: nh.pos.line,
        ch: nh.pos.ch - nh.leadLength
      };
      var to = {
        line: nh.pos.line,
        ch: nh.pos.ch + nh.tailLength
      };
      var lead = nh.line.slice(from.ch, nh.pos.ch);
      var tail = nh.line.slice(nh.pos.ch, to.ch);
      var leadLower = lead.toLowerCase();
      var leadFirstChar = leadLower[0];
      var filteredList = (completions ? completions.entries : []).filter((e) => {
        if (leadLower.length===0) return true;
        if (!e.name) return false;
        if (e.name.length<leadLower.length) return false;
        if (e.name[0].toLowerCase() !== leadFirstChar) return false;
        if (e.name.slice(0,leadLower.length).toLowerCase()!==leadLower) return false;
        return true;      
      });
      if (filteredList.length>maxCompletions)
        filteredList.length = maxCompletions;
      var list = filteredList.map((e, index) => new CompletionItem(e, index, lead, tail));
      if (list.length) {
        if (!this._completionActive) {
          // only set active when we have a completion
          var onendcompletion = () => {
            CodeMirror.off(editor,'endCompletion', onendcompletion);
            setTimeout(() => this._completionActive = false, 1);
          };
          CodeMirror.on(editor,'endCompletion', onendcompletion);
          this._completionActive = true;
        }
      }

      return {
        list: list,
        from: from,
        to: to
      };
    }

    private _isWordChar(ch: string): boolean {
      if (ch.toLowerCase()!==ch.toUpperCase())
        return true;
      else if (ch==='_' || ch==='$')
        return true;
      else if (ch>='0' && ch<='9')
        return true;
      else
        return false;
    }

    private _getNeighborhood(editor: CodeMirror.Editor) {
      var doc = editor.getDoc();
      var pos = doc.getCursor();
      var offset = doc.indexFromPos(pos);
      var line = doc.getLine(pos.line);

      var leadLength = 0;
      var prefixChar = '';
      var whitespace = false;
      for (var i = pos.ch-1; i >=0; i--) {
        var ch = line[i];
        if (!whitespace && this._isWordChar(ch)) {
          leadLength++;
          continue;
        }

        whitespace = /\s/.test(ch);
        if (!whitespace) {
          prefixChar = ch;
          break;
        }
      }

      var tailLength = 0;
      var suffixChar = '';
      whitespace = false;
      for (var i = pos.ch; i <line.length; i++) {
        var ch = line[i];
        if (!whitespace && this._isWordChar(ch)) {
          leadLength++;
          continue;
        }

        whitespace = /\s/.test(ch);
        if (!whitespace) {
          suffixChar = ch;
          break;
        }
      }

      return {
        pos: pos,
        offset: offset,
        line: line,
        leadLength: leadLength,
        prefixChar: prefixChar,
        tailLength: tailLength,
        suffixChar: suffixChar
      };
    }
    
  }

	export class JavaScriptDocumentMode implements DocumentMode {
      mode = 'text/html';
      activateEditor(editor: CodeMirror.Editor, fullPath: string): { dispose(): void; } { return null; }
	}

	export class XmlDocumentMode implements DocumentMode {
      mode = 'text/html';
      activateEditor(editor: CodeMirror.Editor, fullPath: string): { dispose(): void; } { return null; }
	}

	export class HtmlDocumentMode implements DocumentMode {
      mode = 'text/html';
      activateEditor(editor: CodeMirror.Editor, fullPath: string): { dispose(): void; } { return null; }
	}

	export class CssDocumentMode implements DocumentMode {
      mode = 'text/html';
      activateEditor(editor: CodeMirror.Editor, fullPath: string): { dispose(): void; } { return null; }
	}
}

class CompletionItem {
  text: string;

  constructor(
    private _completionEntry: TypeScript.Services.CompletionEntry,
    private _index: number,
    private _lead: string, private _tail: string) {
    this.text = this._completionEntry.name;
  }

  render_dummy(element: HTMLElement, self, data) {
    
  }
}