namespace handlers.text {

  export var preferredFiles = /\.txt$|.text$/;

  //export var entryClass = ...

  //export function exec(file: string, callback: Function) {
  //}

  export function edit(file: string, drive: persistence.Drive, editorHost: HTMLElement): Handler.Editor {
    var text = drive.read(file);
    var editorInstance = typeof CodeMirror === 'function' ? new editor.CMEditor(editorHost, file, text) : new editor.Editor(editorHost, file, text);
    editorInstance.onchanged = () => {
      drive.write(file, editorInstance.getText());
    };
    setTimeout(() => {
      editorInstance.focus();
    }, 10);
    var res = {
      update: () => {
        text = drive.read(file);
        editorInstance.setText(text);
      },
      close: () => {
        editorInstance.close();
      },
      arrange: (metrics: CommanderShell.Metrics) => (<any>editorInstance).arrange ? (<any>editorInstance).arrange(metrics) : null,
      requestClose: null,
      getPosition: () => editorInstance.getPosition(),
      setPosition: (pos) => editorInstance.setPosition(pos)
    };
    (<any>editorInstance).requestClose = () => {
      if (res.requestClose) res.requestClose();
    };
    return res;
  }

}