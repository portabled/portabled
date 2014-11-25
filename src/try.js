var __resizeTimer = 0;
if (false)
window.onresize = function() {
  if (!__resizeTimer)
    clearTimeout(__resizeTimer);
  __resizeTimer = setTimeout(function(){
    alert('Resize!')
  }, 700);
}

var doss = document.createElement('pre');
doss.textContent = '<pre>abcdef    1\n2      2\n\n </pre>';
alert(doss.innerHTML)
alert(doss.textContent)