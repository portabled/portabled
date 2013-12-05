/// <reference path='typings/codemirror.d.ts' />

/// <reference path='persistence.ts' />

module teapo {

  /**
   * Detects a file this editor type matches, and creates the actual editor when needed.
   */
  export interface EditorType {

    /** Detects whether a file matches this editor type. */
    canEdit(fullPath: string): boolean;

    /** Create and editor. */
    editDocument(docState: DocumentState): Editor;
  }

  /**
   * Handles opening/closing/saving of the editor,
   * and produces the HTML element actually representing the presentation.
   */
  export interface Editor {

    /**
     * Opens the editor for editing, returning HTML element for editing.
     * @onchange callback to notify that saving is needed now.
     */
    open(onchange: () => void): HTMLElement;

    /**
     * Invoked when it's finally a good time to save the changes.
     * The storage for saving is passed into EditorType.editDocument earlier.
     */
    save();

    /**
     * Invoked when editor is closed.
     */
    close();

    /**
     * Invoked when the underlying file is being removed, the editor is supposed to clear any internal bookmarking links.
     */
    remove();
  }


  // types are registered by adding variables/properties to this module
  export module EditorType {

    /**
     * Resolve to a type that accepts this file.
     */
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