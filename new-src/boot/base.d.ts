declare function getText(element: Element): string;
declare function getText(fn: Function): string;

declare function setText(element: Element, text: string): void;

declare function elem(tag: string): HTMLElement;
declare function elem(tag: string, style: {}, parent?: Element): HTMLElement;
declare function elem(tag: string, parent: Element): HTMLElement;
declare function elem(elem: HTMLElement, style: {}, parent?: Element): HTMLElement;

declare module elem {

  export function on(obj: Node, eventName: string, handler: (evt: Event) => void);
  export function on(obj: Window, eventName: string, handler: (evt: Event) => void);
  export function on(obj: Node, eventName: string, handler: (evt: Event) => void);
  export function off(obj: Window, eventName: string, handler: (evt: Event) => void);

}

declare function createFrame(style?: {}):
  { global: Window; document: Document; iframe: HTMLIFrameElement; };

declare function loadMod(
  options: {

    /** module script */
    eval: string;

    /** module path to emulate */
    path?: string;

    /** style or class name for the injected iframe (not needed for headless) */
    style?: {} | string;

    /** scope to inject, or a function to create such scope using the existing global of the injected iframe */
    scope?: {} | ((global: any) => {});

    /** whether to show the iframe (false to delete iframe immediately) */
    ui?: boolean;

  }): { global: any; document: Document; iframe: HTMLIFrameElement; exports: any; };

declare module loadMod {
  export interface LoadedResult {
    global: any;
    document: Document;
    iframe: HTMLIFrameElement
  }
}