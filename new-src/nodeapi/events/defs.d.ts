interface noevents_EventEmitter {
  //static listenerCount(emitter: EventEmitter, event: string): number;

  addListener(event: string, listener: Function): noevents_EventEmitter;

  on(event: string, listener: Function): noevents_EventEmitter;

  once(event: string, listener: Function): noevents_EventEmitter;

  removeListener(event: string, listener: Function): noevents_EventEmitter;

  removeAllListeners(event?: string): noevents_EventEmitter;

  setMaxListeners(n: number): void;

  listeners(event: string): Function[];

  emit(event: string, ...args: any[]): boolean;

}