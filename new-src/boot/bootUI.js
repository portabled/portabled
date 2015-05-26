function bootUI(document, window, elem) {

  elem(document.body, {
    background: 'rgb(3,11,61)',
    color: 'cyan',
    border: 'none',
    overflow: 'hidden'
  });

  var header = elem('h2', {
    text: 'Loading...',
    fontWeight: 'light'
  }, document.body);

  var darkBottom = elem('div', {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '3em',
    background: 'black'
  }, document.body);

  return {
    loaded: function() {
      setText(header, 'Loaded.');
    }
  };
}