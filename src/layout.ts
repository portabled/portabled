/// <reference path='Split3.ts' />

function createLayout(output: LayoutElements): HTMLElement[] {
    var toolbar = document.createElement('div');
    var left = document.createElement('div');
    var content = document.createElement('div');
    var right = document.createElement('div');
    var statusBar = document.createElement('div');
    
    var navigator = document.createElement('div');
    var detailsPanel = document.createElement('div');
    
    setAllStyles(
        toolbar.style, left.style, content.style, right.style, statusBar.style,
        navigator.style, detailsPanel.style);

    left.appendChild(navigator);
    right.appendChild(detailsPanel);
    
    output.navigator = navigator;
    output.content = content;
    output.detailsPanel = detailsPanel;
    
    return [ toolbar, left, content, right, statusBar ];
}

interface LayoutElements {
    navigator: HTMLDivElement;
    content: HTMLDivElement;
    detailsPanel: HTMLDivElement;
}

function setAllStyles(
    tbs, ls, cs, rs, ss,
    ns, ds) {

    var toolbarSize = 3;
    var statusBarSize = 2;
    var leftSize = 200;
    var rightSize = 4;
    
    applyBox(tbs);
    applyStyle(tbs, {
        position: 'absolute',
        left: '0px',
        top: '0px',
        height: toolbarSize + 'px',
        width: '100%',
        "z-index": '3',
        overflow: 'hidden'
    });

    
    applyBox(ls);
    applyStyle(ls, {
        position: 'absolute',
        left: '0px', top: '0px',
        width: leftSize+'px',
        height: '100%',
        "border-top": 'solid '+toolbarSize+' white',
        "border-bottom": 'solid '+statusBarSize+' white',
        "z-index": '2'
    });
    
    applyBox(cs);
    applyStyle(cs, {
        position: 'absolute',
        left: "0px", top: '0px',
        width: '100%',
        height: '100%',
        "border-top": 'solid '+toolbarSize+'px white',
        "border-left": 'solid '+leftSize+'px white',
        "border-right": 'solid '+rightSize+'px white',
        "border-bottom": 'solid '+statusBarSize+'px white',
        "z-index": '1',
        "overflow": 'none'
    });

    
    applyBox(rs);
    applyStyle(rs, {
        position: 'absolute',
        right: '0px', top: '0px',
        width: rightSize+'px',
        height: '100%',
        "border-top": 'solid '+toolbarSize+' white',
        "border-bottom": 'solid '+statusBarSize+' white',
        "z-index": '2'
    });


    applyBox(ss);
    applyStyle(ss, {
        position: 'absolute',
        left: '0px', bottom: '0px',
        height: statusBarSize+'px',
        width: '100%',
        "z-index": '3'
    });

    applyBox(ns);
    applyStyle(ns, {
        width: '100%',
        height: '100%',
        overflow: 'auto'
    });
    
    applyBox(ds);
    applyStyle(ds, {
        width: '100%',
        height: '100%',
        overflow: 'auto'
    });
}

function applyBox(s) {
    var bbx = 'border-box';
    applyStyle(s, {
        "-mozBoxSizing": bbx,
        "-khtml-box-sizing": bbx,
        "-webkit-box-sizing": bbx,
        "box-sizing": bbx
    });
}

function applyStyle(s, styles) {
    for (var k in styles) if (styles.hasOwnProperty(k)) {
        s.setProperty(k, styles[k]);
    }
}