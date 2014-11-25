interface CodeMirror {

  showHint(options: CodeMirror.showHint.Options);

}

declare module CodeMirror {

  module showHint {
    
    interface Options {
      
      /**
       * A hinting function. It is possible to set the async property on a hinting function to true,
       * in which case it will be called with arguments (cm, callback, ?options),
       * and the completion interface will only be popped up when the hinting function calls the callback,
       * passing it the object holding the completions.
       */
      hint: Function;

      /**
       * Determines whether, when only a single completion is available, it is completed without showing the dialog.
       * Defaults to true.
       */
      completeSingle?: boolean;

      /**
       * Whether the pop - up should be horizontally aligned with the start of the word (true, default),
       * or with the cursor (false).
       */
      alignWithWord?: boolean;

      /**
       * When enabled (which is the default), the pop - up will close when the editor is unfocused.
       */
      closeOnUnfocus?: boolean;

      /**
       * Allows you to provide a custom key map of keys to be active when the pop - up is active.
       * The handlers will be called with an extra argument, a handle to the completion menu,
       * which has moveFocus(n), setFocus(n), pick(), and close() methods (see the source for details),
       * that can be used to change the focused element, pick the current element or close the menu.
       * Additionnaly menuSize() can give you access to the size of the current dropdown menu,
       * length give you the number of availlable completions,
       * and data give you full access to the completion returned by the hinting function.
       */
      customKeys?: any;

      /**
       * Like customKeys above, but the bindings will be added to the set of default bindings,
       * instead of replacing them.
       */
      extraKeys?: any;

    }
      
    interface CompletionResult {
      list: Completion[];
      from: CodeMirror.Pos;
      to: CodeMirror.Pos;
    }

    interface Completion {
      
      /** The completion text. This is the only required property. */
      text: string;

      /** The text that should be displayed in the menu. */
      displayText?: string;

      /** A CSS class name to apply to the completion's line in the menu. */
      className?: string;

      /** A method used to create the DOM structure for showing the completion
       * by appending it to its first argument. */
      render?: (element: HTMLElement, self, data) => void;

      /** A method used to actually apply the completion, instead of the default behavior. */
      hint?: (cm: CodeMirror, self, data) => void;

      /** Optional from position that will be used by pick()
       * instead of the global one passed with the full list of completions. */
      from?: CodeMirror.Pos;

      /** Optional to position that will be used by pick() instead of the global one
       * passed with the full list of completions. */
      to?: CodeMirror.Pos;

    }
    
  }

  interface CodeMirrorStatic {
    
    /** Fired when the pop-up is shown. */
    on(completion: showHint.Options, eventName: 'shown', handler: (instance: showHint.CompletionResult) => void);
    off(completion: showHint.Options, eventName: 'shown', handler: (instance: showHint.CompletionResult) => void);

    /**
     * Fired when a completion is selected.
     * Passed the completion value (string or object) and the DOM node that represents it in the menu.
     */
    on(completion: showHint.Options, eventName: 'select', handler: (instance: showHint.CompletionResult, completion: showHint.Completion, element: HTMLElement) => void);
    off(completion: showHint.Options, eventName: 'select', handler: (instance: showHint.CompletionResult, completion: showHint.Completion, element: HTMLElement) => void);

    /**
     * Fired when a completion is picked. Passed the completion value (string or object).
     */
    on(completion: showHint.Options, eventName: 'pick', handler: (instance: showHint.CompletionResult, completion: showHint.Completion) => void);
    off(completion: showHint.Options, eventName: 'pick', handler: (instance: showHint.CompletionResult, completion: showHint.Completion) => void);

    /** Fired when the completion is finished. */
    on(completion: showHint.Options, eventName: 'close', handler: (instance: showHint.CompletionResult) => void);
    off(completion: showHint.Options, eventName: 'close', handler: (instance: showHint.CompletionResult) => void);

  }

}