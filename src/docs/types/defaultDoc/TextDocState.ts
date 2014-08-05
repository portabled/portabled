module teapo.docs.types.defaultDoc {

  export class TextDocState {

    constructor(
      private _type: DocType) {
    }

    iconClass(): string {
      return null;
    }

    open(): HTMLElement {
      return null;
    }

    close(): void {
    }

  }

}