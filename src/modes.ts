/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />

module teapo {
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

  export class TypeScriptDocumentMode {
    constructor(private _typescript: TypeScript.Services.ILanguageService) {
      
    }

    activateEditor(editor: CodeMirror.Editor, fullPath: string): { dispose(): void; } {
      return null;
    }
  }
}