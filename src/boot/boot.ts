module teapo.boot {

  var controller: BootController = null;

  export function start() {

    controller = new BootController();
    controller.startBooting();
  }

}