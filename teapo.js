var Layout = (function () {
    function Layout(_host, _document) {
        this._host = _host;
        this._document = _document;
        this._fileListDiv = this._document.createElement('div');
        this._host.appendChild(this._fileListDiv);
    }
    return Layout;
})();
//# sourceMappingURL=teapo.js.map
