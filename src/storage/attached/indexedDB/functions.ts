module teapo.storage.attached.indexedDB {

  export function wrapErrorEvent(errorEvent: ErrorEvent, details: string): Error {
    if (!errorEvent) return null;

    return new Error(details + ' ' + errorEvent.message + ' ' + errorEvent.lineno);
  }
  
}