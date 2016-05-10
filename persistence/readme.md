EQ80 persistence abstraction for browser environment
=========================

This module provide filesystem-shaped abstraction over HTML persistence features:
 * IndexedDB
 * WebSQL
 * localStorage
 * HTML DOM-embedded content

'Drive' features
------------

The API (see src/API.d.ts) main access to the storage is the `Drive` interface:

```typescript
  export interface Drive {

    timestamp: number;

    files(): string[];

    read(file: string): string;

    write(file: string, content: string);

    storedSize?(file: string): number;

  }
```

What is HTML DOM-embedded content?
----------------------------

Please be careful, the architecture has a surprise!

During page/application actual running, the data is stored inside HTML rather than in JavaScript structures. That addresses two concerns:
 * leaving large rarely accessed data off JavaScript virtual machine-managed memory, relieving the pressures on JS VM;
 * allowing easy preservation/transmission of preserved data by saving the whole page.

Phrase 'stored inside HTML' here means each virtual file is injected into `document.body` as a fully-formed HTML comment. Writing to a file
means updating that HTML comment, reading means extracting data from inside it.

Being HTML comment the content requires certain string manipulation to avoid malformed syntax. In addition to that,
old browsers have wild irregularities around newline handling. Also at times it might be desirable to ensure non-ASCII characters are wrapped
into old-style 7-bit replacement like you might do in plain JavaScript.

These concerns lead to the files being held inside HTML comment with 'encoding' as part of the syntax.

```HTML
< -- /directory/bla/bla/file [CRLF]
content goes here
--- >
```

The comment starts with the path (always slash-lead), then encoding in brackets. Default encoding [LF] can be skipped.
Lastly, the file content. At the moment supported encodings are:

 * [LF] default
 * [CR]
 * [CRLF]
 * [json] where the content would go like "abcde\nfgewe\n  rou"
 * [eval] where the content is arbitrary JavaScript to evaluate

Future encodings that might become valid are [base64] and [gzip] or other compressed.


Initalizing of persistence
--------------------

There's a considerable complexity in the startup of the persistence. A valid persistence handler is detected, with an orderly fallback sequence.
The timestamp preserved in offline browser storage is compared to the timestamp stored in DOM storage, and the updates are performed accordingly.

This initialization process exposes several progress/diagnostic properties and callbacks, see `BootState` interface.


Building
--------

`node build.js`

The build is TypeScript compilation plus some wrapping. For compilation the standard `typescript` npm module is a dependency, nothing more.
In fact it's enough to have tsc.js and lib.d.ts from the original module.

Build creates `persistence.js` (non-minified) file in `lib` subdirectory. Minification might be added later.