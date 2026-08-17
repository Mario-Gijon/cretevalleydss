import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  ArcElement: {}, BarElement: {}, CategoryScale: {}, Filler: {}, Legend: {}, LineElement: {}, LinearScale: {}, PointElement: {}, RadialLinearScale: {}, ScatterController: {}, Tooltip: {},
}));
vi.mock("react-chartjs-2", () => ({
  Bar: ({ data, options }) => <div data-testid="bar-chart" data-index-axis={options.indexAxis} data-series={data.datasets.length} data-stack={data.datasets[0].stack} data-x-axis={options.scales.x.title.text} data-y-axis={options.scales.y.title.text} />,
  Line: ({ data, options }) => <div data-testid="line-chart" data-series={data.datasets.length} data-point-radius={data.datasets[0].pointRadius} data-point-hover-radius={data.datasets[0].pointHoverRadius} data-x-axis={options.scales.x.title.text} data-y-axis={options.scales.y.title.text} />,
  Scatter: ({ data, options }) => <div data-testid="scatter-chart" data-series={data.datasets.length} data-point-radius={data.datasets[0].pointRadius} data-x-axis={options.scales.x.title.text} data-y-axis={options.scales.y.title.text}>{options.plugins.tooltip.callbacks.label({ raw: data.datasets[0].data[0] })}</div>,
  Pie: ({ data }) => <div data-testid="pie-chart" data-kind="pie" data-items={data.datasets[0].data.length} />,
  Doughnut: ({ data }) => <div data-testid="pie-chart" data-kind="doughnut" data-items={data.datasets[0].data.length} />,
  Radar: ({ data }) => <div data-testid="radar-chart" data-metrics={data.labels.join(",")} data-series={data.datasets.length} />,
}));

import { AnalyticalGraph, analyticalGraphRegistry } from "../../../src/components/analyticalGraphs/index.js";

const descriptors = {
  bar: { key: "bar", type: "bar", title: "Bar", data: { categories: ["Alt 1", "Alt 2"], series: [{ key: "c1", label: "C1", values: [0.2, 0.5] }] } },
  line: { key: "line", type: "line", title: "Line", data: { x: [0, 1], series: [{ key: "alt", label: "Alt", values: [0.2, 0.5] }] }, xAxis: { label: "Weight" }, yAxis: { label: "Score" } },
  scatter: { key: "scatter", type: "scatter", title: "Scatter", data: { series: [{ key: "alts", label: "Alternatives", points: [{ id: "a", label: "Alt 1", x: 0.9, y: 0.575, details: { Rank: 2 } }] }] } },
  pie: { key: "pie", type: "pie", title: "Pie", donut: true, data: { items: [{ key: "exact", label: "Exact", value: 6 }] } },
  radar: { key: "radar", type: "radar", title: "Radar", data: { axes: [{ key: "c1", label: "C1" }, { key: "c2", label: "C2" }], series: [{ key: "alt", label: "Alt", values: [0.4, 0.8] }] } },
  heatmap: { key: "heatmap", type: "heatmap", title: "Heatmap", data: { rows: [{ key: "alt1", label: "Alt 1" }], columns: [{ key: "c1", label: "C1" }], values: [[0.5]] } },
  image: { key: "image", type: "image", title: "Image", data: { format: "svg", content: "<svg xmlns='http://www.w3.org/2000/svg'><text>Safe</text></svg>" } },
};

describe("AnalyticalGraph", () => {
  it("registers and resolves every supported graph type", () => {
    expect(Object.keys(analyticalGraphRegistry).sort()).toEqual(["bar", "heatmap", "image", "line", "pie", "radar", "scatter"]);
    Object.values(descriptors).forEach((visualization) => {
      const { unmount } = render(<AnalyticalGraph visualization={visualization} />);
      expect(screen.getByTestId(`analytical-graph-${visualization.type}`)).toBeInTheDocument();
      unmount();
    });
  });

  it("renders common title, description, and insight", () => {
    render(<AnalyticalGraph visualization={{ ...descriptors.bar, title: "Decision scores", description: "By alternative", insight: "Alt 2 leads" }} />);
    expect(screen.getByText("Decision scores")).toBeInTheDocument();
    expect(screen.getByText("By alternative")).toBeInTheDocument();
    expect(screen.getByText("Alt 2 leads")).toBeInTheDocument();
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
    rerender(<AnalyticalGraph visualization={descriptors.image} />);
    const image = screen.getByTestId("image-analytical-graph");
    expect(image).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml,"));
    expect(image).toHaveAttribute("alt", "Image");
  });

  it("handles unsupported and malformed descriptors without crashing", () => {
    const { rerender } = render(<AnalyticalGraph visualization={{ key: "unknown", type: "surface", title: "Unknown", data: {} }} />);
    expect(screen.getByText("This visualization type is not supported.")).toBeInTheDocument();
    rerender(<AnalyticalGraph visualization={{ key: "broken", type: "bar", title: "Broken", data: {} }} />);
    expect(screen.getByText("Broken")).toBeInTheDocument();
    expect(screen.getByText("This graph is unavailable.")).toBeInTheDocument();
    rerender(<AnalyticalGraph visualization={null} />);
    expect(screen.getByText("This visualization is unavailable.")).toBeInTheDocument();
  });
});
