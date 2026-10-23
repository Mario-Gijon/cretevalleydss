import { describe, expect, it, vi } from "vitest";

import { buildExpertCollectiveConnectors, findHoveredConnector, pointToSegmentDistance } from "../../../../src/features/finishedIssueDialog/graphs/logic/buildExpertCollectiveConnectors.js";
import { expertCollectiveConnectorPlugin } from "../../../../src/features/finishedIssueDialog/graphs/logic/expertCollectiveConnectorPlugin.js";

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

  it("does not treat distinct small distances as tied because of three-decimal presentation", () => {
    const connectors = buildExpertCollectiveConnectors({
      expertPoints: [
        { identity: "closer", x: 0.0004, y: 0 },
        { identity: "farther", x: 0.00045, y: 0 },
      ],
      collectivePoint,
    });

    expect(connectors.map((entry) => entry.projectedDistance)).toEqual([0.0004, 0.00045]);
    expect(connectors.map((entry) => entry.isClosest)).toEqual([true, false]);
  });

  it("finds hover targets with point-to-segment distance", () => {
    const connector = buildExpertCollectiveConnectors({ expertPoints: [{ label: "Expert", x: 10, y: 0 }], collectivePoint })[0];
    expect(pointToSegmentDistance({ x: 5, y: 3 }, connector.from, connector.to)).toBe(3);
    expect(findHoveredConnector({ point: { x: 5, y: 4 }, connectors: [connector], tolerance: 5 })).toBe(connector);
  });

  it("keeps the grouped marker at its shared pixel without drawing an overlap count", () => {
    const drawCalls = [];
    const fillRect = vi.fn();
    const fillText = vi.fn();
    const ctx = {
      save() {},
      restore() {},
      fillRect,
      fillText,
    };
    const expertElement = {
      x: 25.2,
      y: 40.3,
      skip: false,
      draw() { drawCalls.push([this.x, this.y]); },
    };
    const chart = {
      ctx,
      chartArea: { right: 100, top: 0 },
      data: { datasets: [
        { expertCollectiveRole: "experts", data: [{ expertCount: 2 }] },
        { expertCollectiveRole: "collective", data: [{}] },
      ] },
      isDatasetVisible: () => true,
      getDatasetMeta: (index) => ({
        data: [index === 0 ? expertElement : { x: 25.4, y: 40.2, skip: false }],
      }),
    };

    expertCollectiveConnectorPlugin.afterDatasetsDraw(chart);

    expect(drawCalls).toEqual([[25.2, 40.3]]);
    expect(fillRect).not.toHaveBeenCalled();
    expect(fillText).not.toHaveBeenCalled();
    expect(expertElement.x).toBe(25.2);
    expect(expertElement.y).toBe(40.3);
  });
});
