import React, { useEffect, useRef } from 'react';

import { Connection, ApproxIntersection, Axis, EdgeProps, Edge } from '../../../types';
import { useStore } from '../../../store/state';
import { getCanvas } from '../../../utils/graph';
import { isPrimaryButton } from '../../../utils/mouse';
import { getRectangleByNodeId } from '../../../utils/node';
import { getApproxIntersection } from '../../../utils/intersection';
import { eventPointToCanvasCoordinates } from '../../../utils/coordinates';
import { Context, activateBendpointMove, handleMouseMoveEndWithContext, calculateNewConnectionOnDragging } from '../../../features/bendpoints/connectionSegmentMove';
import { edgesSelector, nodesSelector, transformSelector } from '../../../store/selectors';

export interface EdgeWaypoint {
  x: number;
  y: number;
}

const getEdgeSegmentsFromWaypoints = (waypoints: EdgeWaypoint[]) => {
  const pair = [];

  for (let index = 0; index < waypoints.length - 1; index++) {
    pair.push({
      sourceX: waypoints[index].x,
      sourceY: waypoints[index].y,
      targetX: waypoints[index + 1].x,
      targetY: waypoints[index + 1].y
    });
  }

  return pair;
}

let eventDelta = { x: 0, y: 0 };

export default React.memo(
  ({
    id,
    source,
    target,
    waypoints,
  }: EdgeProps) => {
    const transform = useStore(transformSelector);
    const nodes = useStore(nodesSelector);
    const edges = useStore(edgesSelector);
    const upsertEdge = useStore(state => state.upsertEdge);
    const setSelectedElementById = useStore(state => state.setSelectedElementById);
    const segments = getEdgeSegmentsFromWaypoints(waypoints as EdgeWaypoint[]);
    const context = useRef<Context>();
    const isBendpointMoveActive = useRef<boolean>(false);

    useEffect(() => {
      document.addEventListener('mouseup', handleDragStop);

      return () => {
        document.removeEventListener('mouseup', handleDragStop);
      }
    }, []);

    useEffect(() => {
      document.addEventListener('mousemove', handleDrag);

      return () => {
        document.removeEventListener('mousemove', handleDrag);
      }
    }, []);

    const handleDragStart = (e: React.MouseEvent) => {
      if (!isPrimaryButton(e.nativeEvent)) return;

      const canvas = getCanvas(transform);
      const connection: Connection = {
        waypoints,
        source: getRectangleByNodeId(nodes)(source),
        target: getRectangleByNodeId(nodes)(target),
      };
      const intersection = getApproxIntersection(waypoints, eventPointToCanvasCoordinates(e.nativeEvent)(canvas)) as ApproxIntersection;
      const newContext = activateBendpointMove(connection, intersection);

      eventDelta = { x: 0, y: 0 };

      context.current = newContext;
      isBendpointMoveActive.current = true;
    };

    const updateEdgeAndContext = (newConnection: Connection, newContext: Context) => {
      upsertEdge(
        { ...edges.find(edge => edge.id === id) as Edge, waypoints: newConnection.waypoints }
      );

      context.current = newContext;
    }

    const handleDragStop = () => {
      if (!isBendpointMoveActive.current) return;

      isBendpointMoveActive.current = false;

      const { newConnection, newContext } = handleMouseMoveEndWithContext(context.current!);

      updateEdgeAndContext(newConnection, newContext);
    };

    const handleDrag = (event: MouseEvent) => {
      if (!context.current || !isBendpointMoveActive.current) return;

      let movementX: number = event.movementX;
      let movementY: number = event.movementY;

      if (context.current!.axis === Axis.X) {
        eventDelta.x += Math.round(movementX / transform[2]);
      } else if (context.current!.axis === Axis.Y) {
        eventDelta.y += Math.round(movementY / transform[2]);
      }

      movementX = eventDelta.x;
      movementY = eventDelta.y;

      const { newConnection, newContext } = calculateNewConnectionOnDragging(movementX, movementY)(context.current as Context);

      updateEdgeAndContext(newConnection, newContext);
    };

    const handleSelect = (e: React.MouseEvent) => {
      e.stopPropagation();

      setSelectedElementById(id); 
    }

    return (
      <>
        {segments.map(segment => (
          <React.Fragment
            key={JSON.stringify(segment)}
          >
            <polyline
              style={{ fill: 'none', strokeOpacity: 0, stroke: 'white', strokeWidth: 15, cursor: segment.sourceX === segment.targetX ? 'ew-resize' : 'ns-resize' }}
              points={`${segment.sourceX} ${segment.sourceY}, ${segment.targetX} ${segment.targetY}`}
              onMouseDown={handleDragStart}
              onClick={handleSelect}
            />
          </React.Fragment>
        ))}
      </>
    );
  }
);