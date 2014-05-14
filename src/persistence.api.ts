module teapo {

  /**
   * Encapsulating all necessary for storing documents, metadata and properties.
   */
  export interface DocumentStorage {

    editedUTC: number;

    /**
     * Full paths of all files.
     */
    documentNames(): string[];

    /**
     * Given a path retrieves an object for reading and writing document state,
     * also exposes runtime features like editor and entry in the file list.
     */
    getDocument(fullPath: string): DocumentState;

    /**
     * Creates a persisted state for a document, and returns it as a result.
     */
    createDocument(fullPath: string): DocumentState;

    /**
     * Removes the document and all its state.
     */
    removeDocument(fullPath: string): DocumentState;

    getProperty(name: string): string;
    setProperty(name: string, value: string): void;

    savingFiles: ko.ObservableArray<string>;
  }

  /**
   * Allows reading, writing properties of the document,
   * and also exposes runtime features like editor and entry in the file list.
   */
  export interface DocumentState {

    fullPath(): string;

    /**
     * Retrieves object encapsulating document type (such as plain text, JavaScript, HTML).
     * Note that type is metadata, so the instance is shared across all of the documents
     * of the same type.
     */
    type(): EditorType;

    /**
     * Retrieves object encapsulating editor behaviour for the document.
     */
    editor(): Editor;

    /**
     * Same as editor, but returns null if the editor has never been instantiated yet.
     */
    currentEditor(): Editor;

    /**
     * Retrieves object representing a node in the file list or tree view.
     */
    fileEntry(): FileEntry;

    /**
     * Retrieves property value from whatever persistence mechanism is implemented.
     */
    getProperty(name: string): string;

    /**
     * Persists property value.
     */
    setProperty(name: string, value: string): void;
  }

  /**
   * Details necessary to request DocumentStorage creation,
   * as well as the callback logic.
   */
  export interface DocumentStorageHandler {

    /**
     * Callback invoked when the document storage creation is completed.
     */
    documentStorageCreated(error: Error, storage: DocumentStorage);

    setStatus(text: string);

    /**
     * Returns EditorType object handling editor behavior for a given file.
     */
    getType(fullPath: string): EditorType;

    /**
     * Returns FileEntry object representing the file in list/tree.
     */
    getFileEntry(fullPath: string): FileEntry;

    /**
     * Overrides unique key used to differentiate multiple documents
     * sharing the same domain/scheme in WebSQL storage.
     */
    uniqueKey?: string;

    /** Overrides access to the global document object. */
    document?: typeof document;

    /** Overrides WebSQL API */
    openDatabase?: typeof openDatabase;
  }
    
}