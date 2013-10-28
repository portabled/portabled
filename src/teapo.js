var Layout = (function () {
    function Layout(_host, _document) {
        if (typeof _document === "undefined") { _document = document; }
        this._host = _host;
        this._document = _document;
        this._editorHost = this._document.createElement('div');
        this._fileListHost = this._document.createElement('div');
        this._fileListHost.textContent = 'OK';
        this._editorHost.textContent = ' [edit] ';

        Layout.clearContent(this._host);

        this._host.appendChild(this._fileListHost);
        this._host.appendChild(this._editorHost);
    }
    Layout.clearContent = function (element) {
        if ('innerHTML' in element)
            element.innerHTML = '';
        else if ('textContent' in element)
            element.textContent = '';
        else {
            // TODO: think of something else...
        }
    };
    return Layout;
})();
/// <reference path='typings/codemirror.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
/// <reference path='layout.ts' />
window.onload = function () {
    var layout = new Layout(document.body);
};
//# sourceMappingURL=teapo.js.map
