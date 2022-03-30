function createVNode(node, props, key) {
  if (typeof node === 'string') {
    return { type: 'TAG', tag: node, props, key };
  } else {
    return { type: 'FC', fc: node, props, key };
  }
}

function Fragment(props) {
  return props.children;
}

exports.jsx = createVNode;
exports.jsxs = createVNode;
exports.jsxDEV = createVNode;
exports.Fragment = Fragment;
