module teapo.docs.types {

  export interface DocState {

    iconClass(): string;

    open(): HTMLElement;
    close(): void;

  }

}