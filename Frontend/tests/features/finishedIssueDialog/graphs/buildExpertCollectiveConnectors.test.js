import { describe, expect, it } from "vitest";

import { buildExpertCollectiveConnectors, findHoveredConnector, pointToSegmentDistance } from "../../../../src/features/finishedIssueDialog/graphs/logic/buildExpertCollectiveConnectors.js";

describe("buildExpertCollectiveConnectors", () => {
  const collectivePoint = { x: 0, y: 0 };
  const expertPoints = [{ identity: "a", label: "Expert A", x: 3, y: 4 }, { identity: "b", label: "Expert B", x: 0, y: 2 }];

  it("creates one displayed-projection connector per expert and marks the closest", () => {
    const connectors = buildExpertCollectiveConnectors({ expertPoints, collectivePoint, executionLabel: "Base" });
    expect(connectors).toHaveLength(2);
    expect(connectors.map((entry) => entry.projectedDistance)).toEqual([5, 2]);
    expect(connectors.map((entry) => entry.isClosest)).toEqual([false, true]);
    expect(connectors[0]).toMatchObject({ expertIdentity: "a", expertLabel: "Expert A", executionLabel: "Base" });
  });

  it("marks tied closest experts without unstable tie-breaking", () => {
    expect(buildExpertCollectiveConnectors({ expertPoints: [{ x: 1, y: 0 }, { x: -1, y: 0 }], collectivePoint }).every((entry) => entry.isClosest)).toBe(true);
  });

  it("finds hover targets with point-to-segment distance", () => {
    const connector = buildExpertCollectiveConnectors({ expertPoints: [{ label: "Expert", x: 10, y: 0 }], collectivePoint })[0];
    expect(pointToSegmentDistance({ x: 5, y: 3 }, connector.from, connector.to)).toBe(3);
    expect(findHoveredConnector({ point: { x: 5, y: 4 }, connectors: [connector], tolerance: 5 })).toBe(connector);
  });
});
