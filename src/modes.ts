/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

module teapo {

  export var completionDelayMsec = 200;

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

    constructor(private _typescript: TypeScript.Services.ILanguageService) {
    }

    mode = 'text/typescript';

    activateEditor(editor: CodeMirror.Editor, fullPath: string): { dispose(): void; } {
      var onchange = (instance, change) => this._triggerCompletion(editor, fullPath, false);
      editor.on('change', onchange);
      return {
        dispose: () => editor.off('change', onchange)
      }
    }

    private _triggerCompletion(editor: CodeMirror.Editor, fullPath: string, force: boolean) {
      var delay = force ? 1 : completionDelayMsec;

      this._cookie++;
      var triggerCookie = this._cookie;
      setTimeout(() => {
        if (triggerCookie !== this._cookie) return;
        this._executeCompletion(editor, fullPath, force);
      }, delay);
    }

    private _executeCompletion(editor: CodeMirror.Editor, fullPath: string, force: boolean) {
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