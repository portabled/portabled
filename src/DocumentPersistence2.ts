module teapo {

  export interface PersistentDocumentStorage {
    documents(): PersistentDocumentState[];
    addDocument(fullPath: string): PersistentDocumentState;

    getActiveDocument(): string;
    setActiveDocument(fullPath: string): void;
  }

  export interface PersistentDocumentState {
    fullPath: string;

    getContent(): string;
    getHistory(): any;
    getCursorOffset(): { line: number; ch: number; };
    getSelectionStart(): { line: number; ch: number; };
    getSelectionEnd(): { line: number; ch: number; };
    getScrollTop(): number;

    setContent(content: string): void;
    setHistory(history: string): void;
    setCursorOffset(cursorPos: { line: number; ch: number; }): void;
    setSelectionStart(startPos: { line: number; ch: number; }): void;
    setSelectionEnd(startPos: { line: number; ch: number; }): void;
    setScrollTop(lineNumber: number): void;

    remove(): void;
  }
}