var keepDomNodesUntilBootComplete: { node: Node; recognizedKind: string; recognizedEntity: any; }[] = [];
function handle_dom_node(node: Node, recognizedKind: string, recognizedEntity: any) {
  keepDomNodesUntilBootComplete.push({node,recognizedKind, recognizedEntity});
  for (var i = 0; i < domNodeCallbacks.length; i++) {
    var callback = domNodeCallbacks[i];
    callback(node, recognizedKind, recognizedEntity);
  }

}