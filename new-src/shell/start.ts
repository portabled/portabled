declare var require;

setTimeout(() => showCommander(require('drive')), 10);

function showCommander(drive: persistence.Drive) {
  document.body.style.overflow = 'hidden';
  document.body.parentElement.style.overflow = 'hidden';

  var styleText = drive.read('/shell/style.css');
  elem('style', { text: styleText }, document.body);
  var commander = new CommanderShell(document.body, drive);
}