/// <reference path='editor.ts' />
/// <reference path='files.ts' />

module teapo {

  /**
   * Encapsulating all necessary for storing documents, metadata and properties.
   */
  export class DocumentStorage {
   constructor(
      private _typeResolver: (fullPath: string) => DocumentType,
      private _entryResolver: (fullPath: string) => FileEntry,
      private _document = document,
      private _localStorage = localStorage) {
      // TODO: apart from localStorage support better local access API
    }

    /**
     * Full paths of all files.
     */
    documentNames(): string[] {
      return null;
    }

    /**
     * Given a path retrieves an object for reading and writing document state,
     * also exposes runtime features like editor and entry in the file list.
     */
    getDocument(fullPath: string): DocumentState {
      return null;
    }
  }

  /**
   * Allows reading, writing properties of the document,
   * and also exposes runtime features like editor and entry in the file list.
   */  
  export interface DocumentState {

    fullPath(): string;
    name(): string;

    /**
     * Retrieves object encapsulating document type (such as plain text, JavaScript, HTML).
     * Note that type is metadata, so the instance is shared across all of the documents
     * of the same type.
     */
    type(): DocumentType;

    /**
     * Retrieves object encapsulating editor behaviour for the document.
     */
    editor(): Editor;

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

    /**
     * Retrieves transient property value from whatever persistence mechanism is implemented.
     * Transient properties live within a local browser setup and are not persisted in HTML DOM.
     */
    getTransientProperty(name: string): string;

    /**
     * Persists property value.
     * Transient properties live within a local browser setup and are not persisted in HTML DOM.
     */
    setTransientProperty(name: string, value: string): void;
  }

  module internal {

    /**
     * Standard implementation of DocumentState.
     * This class is not exposed outside of this module.
     */
    export class DocumentState implements teapo.DocumentState {
      private _type: DocumentType = null;
      private _editor: Editor = null;
      private _fileEntry: FileEntry = null;

      constructor(
        private _fullPath: string,
        private _name: string,
        private _storage: DocumentStorage,
        private _typeResolver: (fullPath: string) => DocumentType,
        private _entryResolver: (fullPath: string) => FileEntry) {
      }

      fullPath(): string { return this._fullPath; }
      name(): string { return this._name; }
  
      type(): DocumentType {
        if (!this._type)
          this._type = this._typeResolver(this._fullPath);
        return this._type;
      }

      editor(): Editor {
        if (!this._editor)
          this._editor = this.type().editDocument(this);
        return this._editor;
      }

      fileEntry(): FileEntry {
        if (this._fileEntry)
          this._fileEntry = this._entryResolver(this._fullPath);
        return this._fileEntry;
      }

      getProperty(name: string): string {
        return null;
      }

      setProperty(name: string, value: string): void {
        // 
      }

      getTransientProperty(name: string): string {
        return null;
      }

      setTransientProperty(name: string, value: string): void {
        // 
      }
    }
  }
}