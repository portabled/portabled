function createChildProcess(
  connection_to_parent: ConnectionToParent,
  statics: any | { fs; path; process; require; }) {

  var pidCounter = 827;

  return {
    spawn
  };

    function spawn(options: any) {

      var sanitizedOptions = {};

      connection_to_parent.invokeAsync(
        { spawnChildProcess: sanitizedOptions },
      	(error, result) => {
      		// TODO: invokeAsync-based implementation

        });
    }

}
