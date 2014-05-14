module teapo.docs {

  export interface Document {

    iconClass(): string;
    
    open(): HTMLElement;
    close(): void;
    
  }

}