/// <reference path='persistence.ts' />

module teapo {
  export interface DocumentType {
    editDocument(doc: DocumentState): Editor;
  }

  export interface Editor {
    open(): HTMLElement;
    close();
  }
}