module teapo {

  /**
   * Handles opening/closing/saving of the editor,
   * and produces the HTML element actually representing the presentation.
   */
  export interface Editor {

    /**
     * Opens the editor for editing, returning HTML element for editing.
     * @onchange callback to notify that saving is needed now.
     */
    open(onchange: () => void, statusText?: ko.Observable<string>): HTMLElement;

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

}