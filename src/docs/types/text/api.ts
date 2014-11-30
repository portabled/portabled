module portabled.docs.types.text {
  
  export interface TextHandlerModule {

    loadText(path: string, storage: DocState): CodeMirrorTextDoc;
    
    expectsFile: RegExp;
    acceptsFile?: RegExp;

    createCodeMirrorEditor?: (host: HTMLElement) => CodeMirror;
    createCodeMirrorDoc?: (text: string) => CodeMirror.Doc;
    
    saveDelay?: number;

  }
  
  export function loadText(path: string, storage: DocState): CodeMirrorTextDoc {
    return {
      path: null,
      editor: null,
      doc: null,
      text: null,
      scroller: null,
      status: null,
      state: null,
      open: null,
      close: null,
      remove: null
    };
  }

  export interface CodeMirrorTextDoc {

    path: string;
    editor: CodeMirror;
    doc: CodeMirror.Doc;
    text: () => string;
    scroller: HTMLElement;
    status: HTMLElement;
    removed?: boolean;

    state: any;

    load?: (text: string) => void;

    open();
    close();
    remove();

    onCursorMoved?: (cursorPos: CodeMirror.Pos) => void;
    onScroll?: (scrollInfo: CodeMirror.ScrollInfo) => void;

    onChanges?: (
      docChanges: CodeMirror.EditorChange[],
      summary: ChangeSummary) => void;

    onSave?: () => void;

    keyMap?: any;
  }

  export interface ChangeSummary {
    lead: number;
    mid: number;
    newmid: number;
    trail: number;
  }

  export function createCodeMirrorEditor(host: HTMLElement): CodeMirror {
    return new CodeMirror(host, {
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        matchTags: true,
        showTrailingSpace: true,
        autoCloseTags: true,
        //highlightSelectionMatches: {showToken: /\w/},
        styleActiveLine: true,
        tabSize: 2
      });
  }
  
  export function createCodeMirrorDoc(text: string): CodeMirror.Doc {
    return new CodeMirror.Doc(text || '');
  }

}