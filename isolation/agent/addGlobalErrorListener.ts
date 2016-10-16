function addGlobalErrorListener() {

  _addEventListener('error', (e: any) => {
    var err_ser = cmpSer.serialize(e.error || e);
    postMessageToHost({globalError: { err_ser }});
  });

}