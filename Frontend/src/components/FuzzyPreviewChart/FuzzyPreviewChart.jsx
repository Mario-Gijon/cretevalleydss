import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
  getLinguisticMembershipDefinitionOrDefault,
} from "../../utils/linguisticMembershipFunctions";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const buildChartData = ({
  labels,
  membershipFunction = DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
}) => {
  const xValues = Array.from({ length: 101 }, (_, i) => i / 100);
  const membershipDefinition = getLinguisticMembershipDefinitionOrDefault(
    membershipFunction
  );
  const yProfile = membershipDefinition.yProfile;
  const expectedValueCount = membershipDefinition.valueCount;

  const datasets = labels.map((lbl, i) => {
    const values = Array.isArray(lbl?.values) ? lbl.values.map(Number) : [];

    if (values.length !== expectedValueCount || values.some((value) => !Number.isFinite(value))) {
      return {
        label: lbl?.label || `Label ${i + 1}`,
        data: xValues.map(() => null),
        borderColor: `hsl(${(i * 360) / Math.max(labels.length, 1)}, 70%, 50%)`,
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0,
        pointRadius: 0,
      };
    }

    const yValues = xValues.map((x) => {
      if (x < values[0] || x > values[values.length - 1]) {
        return 0;
      }

      for (let index = 1; index < values.length; index += 1) {
        const xLeft = values[index - 1];
        const xRight = values[index];
        const yLeft = yProfile[index - 1];
        const yRight = yProfile[index];

        if (x < xLeft || x > xRight) {
          continue;
        }

        if (xRight === xLeft) {
          return Math.max(yLeft, yRight);
        }

        const ratio = (x - xLeft) / (xRight - xLeft);
        return yLeft + ratio * (yRight - yLeft);
      }

      return 0;
    });

    return {
      label: lbl.label,
      data: yValues,
      borderColor: `hsl(${(i * 360) / Math.max(labels.length, 1)}, 70%, 50%)`,
      backgroundColor: "transparent",
      borderWidth: 2,
      tension: 0,
      pointRadius: 0,
    };
  });

  return { labels: xValues, datasets };
};

export const FuzzyPreviewChart = ({
  labels = [],
  membershipFunction = DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
}) => {
  return (
    <Line
      data={buildChartData({ labels, membershipFunction })}
      options={{
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
        scales: {
          x: {
            title: { display: true, text: "Domain [0,1]" },
            min: 0,
            max: 1,
          },
          y: {
            title: { display: true, text: "Degree of belonging" },
            min: 0,
            max: 1,
          },
        },
        elements: {
          line: {
            fill: false,
          },
        },
      }}
    />
  );
};
