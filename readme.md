New mini portable shell development
=========================



## Boot process

The boot process begins with first bytes of the page received, during the loading of the content,
then would continue for a little after the page is loaded.

The main post-content-load is completing the data fetch from the local storage. It may well finish earlier,
but may take some time.

During the boot process, and at the end of it the code is supposed to show sensible UI
and implement neat handover animations (unless the whole boot finishes very fast).

### Early boot

The mission of this stage is to create the temporary boot UI (very quickly!) and hand over to the shell loader.
The boot UI is something like a splash screen, boot animation, washed-out live-like image or whatever.

 * Error handler is installed at the first opportunity
 * Base.js library with primitives for basic DOM manipulation is loaded
 * BootUI iframe is created
 * BootUI function is invoked to draw the boot animation

### Shell loader

Shell loader's task is to initialise the persistence (virtual filesystem backed by DOM and local storage).

During that persistence loading the shell loader passes progress events to the boot UI. Upon completion
it starts the actual shell and finally animates from boot UI to the shell.

 * Persistence loading is started
 * Persistence keeps polling the DOM state, fishing for pieces of 'virtual filesystem'
 * Progress is supposed to be reported to the BootUI
 * Persistence also need to load the locally-stored state, reconciling it with the DOM (by timestamps)
 * Eventualy persistence report completion
 * Shell iframe is created with opacity=0
 * Shell start code is loaded (normally from the filesystem) and kicked off
 * Animating BootUI.opacity -> 0; Shell.opacity->1

 ### Shell

When shell begins to load, the persistence is fully functional, so it's up to the shell what to do with it.

The interactive node-like shell emulates node.js to a great extent: by laying node.js API on top of the persistence and various browser features.

At the moment the shell also has file-manager-like panels, so virtual filesystem can be navigated
and necessary tasks (copying/editing/moving of files or directories) performed interactively.

Other shells may host more specialised apps. These are planned examples:

 * PC.js virtual machine hosting early PC images (DOS, early Windows, OS/2 and such)
 * Markdown viewer/editor
 * SVG editor
 * Slide editor
 * Spreadsheet editor

## Involved libaries and sub-modules

First of all, the sequence above explicitly mentiones three mini-libraries:

 * Base.js
 * BootUI
 * Persistence

Those indeed can be considered separately, with a degree of isolation from the rest of the boot process.

### Base.js

A very tight set of functions for DOM manipulation. It is used by both booting stage, as well as actually employed by the current shell.

These are broad features of the mini-library:

 * Setting/getting text of a DOM element (older IE handling, special workarounds for some elements)
 * Creating elements and setting properties/CSS attributes in JSON-like syntax
 * Subscribing to events
 * Creating IFRAME and retrieving its key objects (inner window, inner document)

### BootUI

The boot-time UI is largely free in what it renders. It is hosted in a separate IFRAME
with limited communication to the rest of the code.

It is expected that various shells provide each their fine-tuned boot UI 'library'.

A good option would be to render the state of the application as the user left,
with a tasteful overlay reflecting the boot progress.

### Persistence

The task of emulating an embedded virtual filesystem of files/directories is implemented in the persistence mini-library.

The persistence API is described in terms of a Drive object (with read/write methods) and its construction stages.

Several sources of storage are implemented towards the same API:

 * DOM
 * IndexedDB
 * WebSQL
 * LocalStorage

DOM storage is expected to exist at a very minimum (we are running in the context of a page already!),
then one of the local storage options is added upon a brief detection process.

From the external caller the persistence mini-library expects a single call to *mountDrive* function,
passing in a few inputs and a callback.