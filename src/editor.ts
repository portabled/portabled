/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />

module teapo {

  export interface EditorType {
    canEdit(fullPath: string): boolean;
    editDocument(docState: DocumentState): Editor;
  }

  export interface Editor {
    open(onchange: () => void): HTMLElement;
    save();
    close();
  }

  export module EditorType {

    export function getType(fullPath: string): EditorType {

      // must iterate in reverse, so more generic types get used last
      var reverse = Object.keys(EditorType);
      for (var i = reverse.length-1; i>=0; i--  ) {
        var t = <EditorType>this[reverse[i]];
        if (t.canEdit && t.canEdit(fullPath)) return t;
      }

      return null;
    }
  }
}