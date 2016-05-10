namespace actions {

  export function move(env: ActionContext) {
    return copyOrMove(true /*move*/, env);
  }

}