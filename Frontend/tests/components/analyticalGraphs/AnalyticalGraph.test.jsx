import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const scatterState = vi.hoisted(() => ({ data: null, options: null }));

vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  ArcElement: {}, BarElement: {}, CategoryScale: {}, Filler: {}, Legend: {}, LineElement: {}, LinearScale: {}, PointElement: {}, RadialLinearScale: {}, ScatterController: {}, Tooltip: {},
}));
vi.mock("react-chartjs-2", () => ({
  Bar: ({ data, options }) => <div data-testid="bar-chart" data-index-axis={options.indexAxis} data-series={data.datasets.length} data-stack={data.datasets[0].stack} data-x-axis={options.scales.x.title.text} data-y-axis={options.scales.y.title.text} />,
  Line: ({ data, options }) => <div data-testid="line-chart" data-series={data.datasets.length} data-point-radius={data.datasets[0].pointRadius} data-point-hover-radius={data.datasets[0].pointHoverRadius} data-x-axis={options.scales.x.title.text} data-y-axis={options.scales.y.title.text} />,
  Scatter: ({ data, options }) => {
    scatterState.data = data;
    scatterState.options = options;
    return <div data-testid="scatter-chart" data-series={data.datasets.length} data-point-radius={typeof data.datasets[0].pointRadius === "function" ? "scriptable" : data.datasets[0].pointRadius} data-x-axis={options.scales.x.title.text} data-y-axis={options.scales.y.title.text} data-x-tick={options.scales.x.ticks.callback?.(1) || ""} data-y-tick={options.scales.y.ticks.callback?.(1) || ""}>{options.plugins.tooltip.callbacks.label({ raw: data.datasets[0].data[0] })}</div>;
  },
  Pie: ({ data }) => <div data-testid="pie-chart" data-kind="pie" data-items={data.datasets[0].data.length} />,
  Doughnut: ({ data }) => <div data-testid="pie-chart" data-kind="doughnut" data-items={data.datasets[0].data.length} />,
  Radar: ({ data }) => <div data-testid="radar-chart" data-metrics={data.labels.join(",")} data-series={data.datasets.length} />,
}));

import { AnalyticalGraph, analyticalGraphRegistry } from "../../../src/components/analyticalGraphs/index.js";
import { preferenceDistributionMatrixPlugin } from "../../../src/components/analyticalGraphs/logic/preferenceDistributionMatrixPlugin.js";

const descriptors = {
  bar: { key: "bar", type: "bar", title: "Bar", data: { categories: ["Alt 1", "Alt 2"], series: [{ key: "c1", label: "C1", values: [0.2, 0.5] }] } },
  line: { key: "line", type: "line", title: "Line", data: { x: [0, 1], series: [{ key: "alt", label: "Alt", values: [0.2, 0.5] }] }, xAxis: { label: "Weight" }, yAxis: { label: "Score" } },
  scatter: { key: "scatter", type: "scatter", title: "Scatter", data: { series: [{ key: "alts", label: "Alternatives", points: [{ id: "a", label: "Alt 1", x: 0.9, y: 0.575, details: { Rank: 2 } }] }] } },
  pie: { key: "pie", type: "pie", title: "Pie", donut: true, data: { items: [{ key: "exact", label: "Exact", value: 6 }] } },
  radar: { key: "radar", type: "radar", title: "Radar", data: { axes: [{ key: "c1", label: "C1" }, { key: "c2", label: "C2" }], series: [{ key: "alt", label: "Alt", values: [0.4, 0.8] }] } },
  heatmap: { key: "heatmap", type: "heatmap", title: "Heatmap", data: { rows: [{ key: "alt1", label: "Alt 1" }], columns: [{ key: "c1", label: "C1" }], values: [[0.5]] } },
  image: { key: "image", type: "image", title: "Image", data: { format: "svg", content: "<svg xmlns='http://www.w3.org/2000/svg'><text>Safe</text></svg>" } },
};

const expertSeries = (key, label) => ({
  key,
  label,
  points: [{ id: `${key}:criterion`, label: `${label} · Cost`, x: 1, y: 1, details: { expert: label, criterion: "Cost", rank: 1, utility: 0.5 } }],
});

describe("AnalyticalGraph", () => {
  it("registers and resolves every supported graph type", () => {
    expect(Object.keys(analyticalGraphRegistry).sort()).toEqual(["bar", "heatmap", "image", "line", "pie", "radar", "scatter"]);
    Object.values(descriptors).forEach((visualization) => {
      const { unmount } = render(<AnalyticalGraph visualization={visualization} />);
      expect(screen.getByTestId(`analytical-graph-${visualization.type}`)).toBeInTheDocument();
      unmount();
    });
  });

  it("renders the title before its semantic reading guide and the graph, without showing insight", () => {
    render(<AnalyticalGraph visualization={{
      ...descriptors.heatmap,
      key: "mcc-adjustment-map",
      title: "MCC adjustment map",
      description: "Signed change Δ = adjusted weight − original weight.",
      insight: "Carla Mendes required the largest adjustment.",
    }} />);
    const title = screen.getByRole("heading", { name: "MCC adjustment map" });
    const readingGuide = screen.getByTestId("visualization-reading-guide");
    const graph = screen.getByTestId("heatmap-analytical-graph");
    expect(readingGuide).toHaveTextContent("positive means raised");
    expect(title.compareDocumentPosition(readingGuide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(readingGuide.compareDocumentPosition(graph) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("Signed change Δ = adjusted weight − original weight.")).not.toBeInTheDocument();
    expect(screen.queryByText("Carla Mendes required the largest adjustment.")).not.toBeInTheDocument();
  });

  it("passes bar categories, stacked, and horizontal options to the renderer", () => {
    render(<AnalyticalGraph visualization={{ ...descriptors.bar, orientation: "horizontal", stacked: true, xAxis: { label: "Score" }, yAxis: { label: "Alternative" } }} />);
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-index-axis", "y");
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-series", "1");
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-stack", "total");
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-x-axis", "Score");
  });

  it("passes line axes and multiple series", () => {
    render(<AnalyticalGraph visualization={{ ...descriptors.line, data: { ...descriptors.line.data, series: [...descriptors.line.data.series, { key: "alt2", label: "Alt 2", values: [0.3, 0.7] }] } }} />);
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-x-axis", "Weight");
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-series", "2");
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-point-radius", "0");
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-point-hover-radius", "5");
  });

  it("passes scatter series with points and semantic axes", () => {
    render(<AnalyticalGraph visualization={{ ...descriptors.scatter, xAxis: { label: "D+" }, yAxis: { label: "D-" } }} />);
    expect(screen.getByTestId("scatter-chart")).toHaveAttribute("data-series", "1");
    expect(screen.getByTestId("scatter-chart")).toHaveAttribute("data-point-radius", "5");
    expect(screen.getByTestId("scatter-chart")).toHaveAttribute("data-x-axis", "D+");
    expect(screen.getByText(/Rank: 2/)).toBeInTheDocument();
  });

  it("maps valid scatter category metadata to semantic numeric-axis ticks and ignores malformed entries", () => {
    const { rerender } = render(<AnalyticalGraph visualization={{ ...descriptors.scatter, yAxis: { label: "Criterion", categories: [{ value: 1, label: "Cost" }, { value: "bad", label: "Ignored" }] } }} />);
    expect(screen.getByTestId("scatter-chart")).toHaveAttribute("data-y-tick", "Cost");
    expect(screen.getByTestId("scatter-chart")).toHaveAttribute("data-x-tick", "");
    rerender(<AnalyticalGraph visualization={{ ...descriptors.scatter, yAxis: { label: "Criterion", categories: [{}] } }} />);
    expect(screen.getByTestId("scatter-chart")).toHaveAttribute("data-y-tick", "");
  });

  it("clusters preference-ranking collisions horizontally while retaining exact ranks and individual tooltips", () => {
    const visualization = {
      key: "individual-preference-distribution",
      type: "scatter",
      xAxis: { label: "Preference rank", min: 1, max: 7 },
      yAxis: { label: "Criterion", min: 0.5, max: 2.5, categories: [{ value: 1, label: "Local Socio-Economic Benefits" }, { value: 2, label: "Cost" }] },
      data: { series: [
        { key: "expert-bruno", label: "Bruno Costa", points: [{ id: "bruno:criterion", label: "Bruno Costa · Local Socio-Economic Benefits", x: 2, y: 1, details: { expert: "Bruno Costa", criterion: "Local Socio-Economic Benefits", rank: 2, utility: 0.214286 } }] },
        { key: "expert-carla", label: "Carla Mendes", points: [{ id: "carla:criterion", label: "Carla Mendes · Local Socio-Economic Benefits", x: 2, y: 1, details: { expert: "Carla Mendes", criterion: "Local Socio-Economic Benefits", rank: 2, utility: 0.214286 } }] },
      ] },
    };
    render(<AnalyticalGraph visualization={visualization} />);

    const [bruno, carla] = scatterState.data.datasets;
    expect(bruno.data[0].x).toBe(2);
    expect(carla.data[0].x).toBe(2);
    expect(bruno.data[0].y).toBe(carla.data[0].y);
    expect(bruno.pointRadius({ chart: {}, dataset: bruno })).toBe(5.5);
    expect(bruno.pointHoverRadius).toBe(6.5);
    expect(bruno.pointHitRadius).toBe(2);
    expect(bruno.pointStyle).toBe("circle");
    expect(bruno.pointBorderWidth).toBe(1.5);
    expect(scatterState.options.interaction.intersect).toBe(true);
    const elements = scatterState.data.datasets.map((dataset) => dataset.data.map((point) => ({ x: 0, y: point.y })));
    const chart = {
      data: scatterState.data,
      scales: { x: { getPixelForValue: (rank) => 100 + rank * 40 } },
      getDatasetMeta: (datasetIndex) => ({ data: elements[datasetIndex] }),
    };
    preferenceDistributionMatrixPlugin.afterDatasetsUpdate(chart, {}, { enabled: true });
    expect(elements[0][0].x).toBe(176.5);
    expect(elements[1][0].x).toBe(183.5);
    expect(elements[0][0].y).toBe(elements[1][0].y);
    expect(bruno.data[0]).toMatchObject({ x: 2, y: 1 });
    expect(scatterState.options.plugins.tooltip.callbacks.title([{ raw: bruno.data[0] }])).toBe("Bruno Costa");
    expect(scatterState.options.plugins.tooltip.callbacks.label({ raw: bruno.data[0] })).toEqual([
      "Criterion: Local Socio-Economic Benefits",
      "Preference rank: 2 of 7",
      "Utility: 0.214286",
    ]);
  });

  it("highlights legend hover targets and toggles expert datasets without removing their points", () => {
    const visualization = {
      ...descriptors.scatter,
      key: "individual-preference-distribution",
      xAxis: { min: 1, max: 2 },
      data: { series: [expertSeries("expert-a", "A"), expertSeries("expert-b", "B")] },
    };
    render(<AnalyticalGraph visualization={visualization} />);
    const legend = scatterState.options.plugins.legend;
    const visibility = [true, true];
    const chart = {
      data: scatterState.data,
      isDatasetVisible: (index) => visibility[index],
      setDatasetVisibility: (index, visible) => { visibility[index] = visible; },
      update: vi.fn(),
    };
    const legendContext = { chart };

    legend.onHover({}, { datasetIndex: 0 }, legendContext);
    expect(chart.$hoveredExpertKey).toBe("expert-a");
    expect(scatterState.data.datasets[0].backgroundColor({ chart, dataset: scatterState.data.datasets[0] })).toBe(`${"#53c6d6"}e6`);
    expect(scatterState.data.datasets[1].backgroundColor({ chart, dataset: scatterState.data.datasets[1] })).toBe(`${"#8f7cff"}38`);
    legend.onLeave({}, { datasetIndex: 0 }, legendContext);
    expect(chart.$hoveredExpertKey).toBeNull();

    legend.onClick({}, { datasetIndex: 0 }, legendContext);
    expect(visibility).toEqual([false, true]);
    legend.onClick({}, { datasetIndex: 0 }, legendContext);
    expect(visibility).toEqual([true, true]);
    legend.onClick({}, { datasetIndex: 0 }, legendContext);
    legend.onClick({}, { datasetIndex: 1 }, legendContext);
    expect(visibility).toEqual([false, false]);
    expect(scatterState.data.datasets.map((dataset) => dataset.data.length)).toEqual([1, 1]);
    expect(scatterState.options.scales.x.min).toBe(0.5);
  });

  it("keeps generic scatter charts on the existing rendering and tooltip path", () => {
    render(<AnalyticalGraph visualization={descriptors.scatter} />);

    expect(scatterState.data.datasets[0].pointRadius).toBe(5);
    expect(scatterState.data.datasets[0].expertKey).toBeUndefined();
    expect(scatterState.options.interaction.intersect).toBe(false);
    expect(scatterState.options.plugins.legend.onHover).toBeUndefined();
  });

  it("passes pie donut and radar metrics", () => {
    const { rerender } = render(<AnalyticalGraph visualization={descriptors.pie} />);
    expect(screen.getByTestId("pie-chart")).toHaveAttribute("data-kind", "doughnut");
    rerender(<AnalyticalGraph visualization={descriptors.radar} />);
    expect(screen.getByTestId("radar-chart")).toHaveAttribute("data-metrics", "C1,C2");
  });

  it("renders heatmap labels and values and a safe SVG image", () => {
    const { rerender } = render(<AnalyticalGraph visualization={descriptors.heatmap} />);
    expect(screen.getByText("Alt 1")).toBeInTheDocument();
    expect(screen.getByText("C1")).toBeInTheDocument();
    expect(screen.getByText("0.5")).toBeInTheDocument();
    expect(screen.getByLabelText("Alt 1, C1: 0.5")).toBeInTheDocument();
    rerender(<AnalyticalGraph visualization={descriptors.image} />);
    const image = screen.getByTestId("image-analytical-graph");
    expect(image).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml,"));
    expect(image).toHaveAttribute("alt", "Image");
  });

  it("keeps sequential heatmaps and supports safe diverging colors with optional cell details", () => {
    const { rerender } = render(<AnalyticalGraph visualization={{ ...descriptors.heatmap, data: { ...descriptors.heatmap.data, values: [[0.5]], details: [[{ originalWeight: 0.4, adjustedWeight: 0.5, nested: { ignored: true } }]] } }} />);
    const sequential = screen.getByLabelText(/Alt 1, C1: 0.5/);
    expect(sequential).toHaveAttribute("data-color-scale", "sequential");
    expect(sequential).toHaveAttribute("aria-label", expect.stringContaining("Original Weight: 0.4"));
    expect(sequential).toHaveAttribute("aria-label", expect.stringContaining("Adjusted Weight: 0.5"));
    rerender(<AnalyticalGraph visualization={{ ...descriptors.heatmap, scale: { kind: "diverging", center: 0 }, data: { ...descriptors.heatmap.data, columns: [{ key: "negative", label: "Negative" }, { key: "center", label: "Center" }, { key: "positive", label: "Positive" }], values: [[-1, 0, 1]] } }} />);
    const cells = screen.getAllByTestId("heatmap-analytical-graph")[0].querySelectorAll("[data-color-scale]");
    expect([...cells].map((cell) => cell.dataset.cellColor)).toEqual(["rgba(232, 137, 181, 0.85)", "rgba(255, 255, 255, 0.12)", "rgba(83, 198, 214, 0.85)"]);
    rerender(<AnalyticalGraph visualization={{ ...descriptors.heatmap, scale: { kind: "diverging" }, data: { ...descriptors.heatmap.data, values: [[0]] } }} />);
    expect(screen.getByLabelText(/Alt 1, C1: 0/)).toHaveAttribute("data-cell-color", "rgba(255, 255, 255, 0.12)");
  });

  it("supports fixed sequential ranges, concise values, and distinct missing-cell explanations", () => {
    const longName = "An alternative with a long name that should remain available in full";
    render(<AnalyticalGraph visualization={{
      type: "heatmap",
      title: "Alternative relationships",
      description: "Relative score separation.",
      truncateLabels: true,
      scale: { kind: "sequential", min: 0, max: 1, valuePrecision: 3 },
      data: {
        rows: [{ key: "a", label: longName }],
        columns: [
          { key: "zero", label: "Zero" },
          { key: "middle", label: "Middle" },
          { key: "maximum", label: "Maximum" },
          { key: "missing", label: "Missing" },
        ],
        values: [[0, 0.23456, 1, null]],
        details: [[
          { valuePrecision: 3 },
          { valuePrecision: 3 },
          { valuePrecision: 3 },
          { note: "No valid comparable score pair is available." },
        ]],
      },
    }} />);

    expect(screen.getByTitle(longName)).toBeInTheDocument();
    expect(screen.getByText("0.235")).toBeInTheDocument();
    expect(screen.getByLabelText("An alternative with a long name that should remain available in full, Zero: 0"))
      .toHaveAttribute("data-cell-color", "rgba(83, 198, 214, 0.15)");
    expect(screen.getByLabelText("An alternative with a long name that should remain available in full, Maximum: 1"))
      .toHaveAttribute("data-cell-color", "rgba(83, 198, 214, 0.85)");
    expect(screen.getByLabelText("An alternative with a long name that should remain available in full, Missing: No valid comparable score pair is available."))
      .toHaveTextContent("—");
  });

  it("handles unsupported and malformed descriptors without crashing", () => {
    const { rerender } = render(<AnalyticalGraph visualization={{ key: "unknown", type: "surface", title: "Unknown", data: {} }} />);
    expect(screen.getByText("This visualization type is not supported.")).toBeInTheDocument();
    rerender(<AnalyticalGraph visualization={{ key: "broken", type: "bar", title: "Broken", data: {} }} />);
    expect(screen.getByText("Broken")).toBeInTheDocument();
    expect(screen.getByTestId("visualization-reading-guide")).toHaveTextContent("Use the chart labels, legend, and tooltips");
    expect(screen.getByText("This graph is unavailable.")).toBeInTheDocument();
    rerender(<AnalyticalGraph visualization={{ ...descriptors.heatmap, key: "mcc-adjustment-map", title: {}, description: { malformed: true }, insight: { malformed: true } }} />);
    expect(screen.getByRole("heading", { name: "Weight changes by expert and criterion" })).toBeInTheDocument();
    expect(screen.getByTestId("visualization-reading-guide")).toHaveTextContent("Rows are experts");
    rerender(<AnalyticalGraph visualization={null} />);
    expect(screen.getByText("This visualization is unavailable.")).toBeInTheDocument();
  });
});
