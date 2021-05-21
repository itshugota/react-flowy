import { Rectangle, Box, Edge, Elements, Node, Transform } from '../types';
import { isEdge } from './edge';

export const isNode = (element: Node | Edge): element is Node =>
  'id' in element && !('source' in element) && !('target' in element);

export const getNodeElementById = (id: string) => {
  return document.querySelector(`.react-flowy__node[data-id="${id}"`);
}

export const getNodeById = (elements: Elements) => (id: string) => {
  return elements.find(element => element.id === id && isNode(element)) as Node | undefined;
}

export const getRectangleByNodeId = (elements: Elements) => (nodeId: string): Rectangle => {
  const node = getNodeById(elements)(nodeId);

  if (!node) {
    throw new Error(`There is no node with id = ${nodeId}`);
  }

  const nodeElement = getNodeElementById(nodeId) as HTMLElement;

  return {
    x: node.__rf?.position.x || node.position.x,
    y: node.__rf?.position.y || node.position.y,
    width: nodeElement.offsetWidth,
    height: nodeElement.offsetHeight
  }
}

const getBoundsOfBoxes = (box1: Box, box2: Box): Box => ({
  x: Math.min(box1.x, box2.x),
  y: Math.min(box1.y, box2.y),
  x2: Math.max(box1.x2, box2.x2),
  y2: Math.max(box1.y2, box2.y2),
});

export const rectToBox = ({ x, y, width, height }: Rectangle): Box => ({
  x,
  y,
  x2: x + width,
  y2: y + height,
});

export const boxToRect = ({ x, y, x2, y2 }: Box): Rectangle => ({
  x,
  y,
  width: x2 - x,
  height: y2 - y,
});

export const getBoundsOfRects = (rect1: Rectangle, rect2: Rectangle): Rectangle =>
  boxToRect(getBoundsOfBoxes(rectToBox(rect1), rectToBox(rect2)));

export const getRectOfNodes = (nodes: Node[]): Rectangle => {
  const box = nodes.reduce(
    (currBox, { __rf: { position, width, height } = {} }) =>
      getBoundsOfBoxes(currBox, rectToBox({ ...position, width, height })),
    { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity }
  );

  return boxToRect(box);
};

export const getNodesInside = (
  nodes: Node[],
  rect: Rectangle,
  [tx, ty, tScale]: Transform = [0, 0, 1],
  partially: boolean = false
): Node[] => {
  const rBox = rectToBox({
    x: (rect.x - tx) / tScale,
    y: (rect.y - ty) / tScale,
    width: rect.width / tScale,
    height: rect.height / tScale,
  });

  return nodes.filter(({ __rf: { position, width, height, isDragging } }) => {
    const nBox = rectToBox({ ...position, width, height });
    const xOverlap = Math.max(0, Math.min(rBox.x2, nBox.x2) - Math.max(rBox.x, nBox.x));
    const yOverlap = Math.max(0, Math.min(rBox.y2, nBox.y2) - Math.max(rBox.y, nBox.y));
    const overlappingArea = Math.ceil(xOverlap * yOverlap);

    if (width === null || height === null || isDragging) {
      // nodes are initialized with width and height = null
      return true;
    }

    if (partially) {
      return overlappingArea > 0;
    }

    const area = width * height;

    return overlappingArea >= area;
  });
};

export const getOutgoers = (node: Node, elements: Elements): Node[] => {
  if (!isNode(node)) {
    return [];
  }

  const outgoerIds = elements.filter(e => isEdge(e) && e.source === node.id).map((e) => (e as Edge).target);

  return elements.filter(e => outgoerIds.includes(e.id)) as Node[];
};

export const getIncomers = (node: Node, elements: Elements): Node[] => {
  if (!isNode(node)) {
    return [];
  }

  const incomersIds = elements.filter(e => isEdge(e) && e.target === node.id).map((e) => (e as Edge).source);

  return elements.filter((e) => incomersIds.includes(e.id)) as Node[];
};