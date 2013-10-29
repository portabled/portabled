/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

/// <reference path='TypeScriptService.ts' />
/// <reference path='DocumentState.ts' />

class ApplicationState {
  private _tsService: TypeScriptService;
  private _editor: CodeMirror.Editor;

  constructor(
    private _layout: {
      toolbar: HTMLDivElement;
      statusBar: HTMLDivElement;
      leftPanel: HTMLDivElement;
      mainContentPanel: HTMLDivElement;
      rightPanel: HTMLDivElement;
    },
    private _window = window) {

    var lib = this._loadStaticContent('lib.d.ts');
    this._tsService = new TypeScriptService({
      '#lib.d.ts': lib
    });

    this._editor = CodeMirror(this._layout.mainContentPanel, {
      lineNumbers: true,
      mode: 'text/typescript',
      matchBrackets: true,
      autoCloseBrackets: true,
      showTrailingSpace: true,
      styleActiveLine: true,
      continueComments: true
    });
  }

  private _loadStaticContent(id: string): string {
    var div = this._window.document.getElementById(id);
    if (div===null)
      return null;
    else
      return div.innerHTML;
  }
}