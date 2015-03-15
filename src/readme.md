# portabled v0.6w

Self-editing filesystem embedded in a single HTML file.

The idea, all of the painstaking implementation and the vision by [Oleg Mihailik](mailto:mihailik@gmail.com).
See the credits section for the used libraries and respective licences.

### Outstanding tasks:
 * Unifying of all import/export into 'moreDialog'.
 * Download/upload for GitHub, GDrive, Dropbox etc.
 * Extra power in Chrome app, node-webkit, HTMLA-ie7: I/O to the actual filesystem.
 * Delete folder.
 * Rename file/folder.
 * Saving current position in documents.
 * TypeScript extra features: navigate to, search integration, tooltips.
 * Sub-domains for TypeScript/JavaScript completion/build contexts.
 * Doc handlers in plugins, plugin API and isolation (using iframes with their own 'global' and 'require').
 * node.js emulation for plugins and dependencies, allowing non-doc plugins.
 * Highlight of **changes** in files.
 * Styles and colours (planning for pale seaside 'Whitstable' blue, maybe black theme too).
 * Scrollbar to use syntax-highlighted document lines.
 * Toast popup/fadeout messages for key events: opening, building, import-export completion.
 * Add whole raw TypeScript repository sample.