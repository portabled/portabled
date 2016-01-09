namespace shell {

  export class DialogHost {

    constructor(private _host: HTMLElement) {
    }

    active(): DialogInfo {
      throw new Error('Not implemented.');
    }

    show(elem: HTMLElement): DialogInfo {
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