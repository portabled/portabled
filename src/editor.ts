/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />

module teapo {

  // this is in fact of DocumentTypeRegistry
  export var DocumentEditorType: {

    // [name: string]: DocumentEditorType;

    getType(fullPath: string): DocumentEditorType;
  };

  export interface DocumentEditorType {
    canEdit(fullPath: string): boolean;
    editDocument(docState: DocumentState): Editor;
  }

  export interface Editor {
    open(onchange: () => void): HTMLElement;
    save();
    close();
  }

  class DocumentEditorTypeRegistry {

    getType(fullPath: string): DocumentEditorType {
      var reverse = Object.keys(DocumentEditorType);
      for (var i = reverse.length-1; i>=0; i--  ) {
        var t = <DocumentEditorType>DocumentEditorType[reverse[i]];
        if (t.canEdit && t.canEdit(fullPath)) return t;
      }

      return null;
    }
  }
  
  DocumentEditorType = new DocumentEditorTypeRegistry();
}