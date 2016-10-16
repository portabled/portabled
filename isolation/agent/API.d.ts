interface ConnectionToParent {

  drive: persistence.Drive;

  invokeAsync(msg: any, callback?: (error: Error, result: any) => void);
  invokeSync?(msg: any): any;

  onPushMessage(registerCallback: (msg: any) => void) : ()=>void;

  //serializeError(err: Error): any;
  //serialize(obj): any;
}