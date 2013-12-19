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

  // types are registered by adding variables/properties to this module
  export module EditorType {

    /**
     * Resolve to a type that accepts this file.
     */
    export function getType(fullPath: string): EditorType {

      // must iterate in reverse, so more generic types get used last
      var keys = Object.keys(EditorType);
      for (var i = 0; i<keys.length; i++ ) {
        var t = <EditorType>this[keys[i]];
        if (t.canEdit && t.canEdit(fullPath)) return t;
      }

      return null;
    }
  }

}