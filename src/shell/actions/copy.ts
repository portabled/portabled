module shell.actions {

  export function copy(env: ActionContext) {
    return copyOrMove(false /*move*/, env);
  }

}