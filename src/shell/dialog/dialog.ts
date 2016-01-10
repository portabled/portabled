namespace shell {

  export class DialogHost {

    private _popupStack: DialogInstance[] = [];

    constructor(private _host: HTMLElement) {
    }

    active(): DialogInfo {
      throw new Error('Not implemented.');
    }

    show(elem: HTMLElement): DialogInfo {
      throw new Error('Not implemented.');
    }

  }

	class DialogInstance implements DialogInfo {

    constructor DialogInstance(public dialogBody: HTMLElement) {
    }

    oncancelling: () => boolean = null;
    onclose: (cancelled?: boolean) => void = null;

    close(cancelCheck: boolean) {
      throw new Error('Not implemented.');
    }

  }

	export interface DialogInfo {

    dialogBody: HTMLElement;

    close(cancelCheck?: boolean);

    oncancelling: () => boolean;
    onclose: (cancelled?: boolean) => void;

  }

}