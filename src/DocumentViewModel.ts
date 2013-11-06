/// <reference path='typings/knockout.d.ts' />
/// <reference path='typings/codemirror.d.ts' />

module teapo {
  export class DocumentViewModel {
    constructor(public fullPath: string, public doc: CodeMirror.Doc) {
    }
  }
}