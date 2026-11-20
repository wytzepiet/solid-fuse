// Type-check only: generated props for pub.dev packages (fl_chart, percent_indicator).
import { LineChart, type LineChartData } from "./generated/fl_chart";
import { CircularPercentIndicator } from "./generated/percent_indicator";

const data: LineChartData = {
  minY: 0,
  maxY: 10,
  gridData: { show: true, drawVerticalLine: false },
  borderData: { show: true, border: { $: "all", color: "#ffffff", width: 1 } },
  titlesData: { topTitles: { sideTitles: { showTitles: false } } },
  lineBarsData: [
    {
      spots: [{ x: 0, y: 1 }, { x: 1, y: 4.5 }, "nullSpot"],
      isCurved: true,
      color: "Colors.amber",
      belowBarData: { show: true, gradient: { $: "LinearGradient", colors: ["#f00", "#00f"] } },
    },
  ],
};

export const chart = <LineChart data={data} duration={250} curve="Curves.easeOut" />;
export const ring = <CircularPercentIndicator radius={40} percent={0.7} circularStrokeCap="round" progressColor="#0a0" />;

// @ts-expect-error `data` is required
export const bad1 = <LineChart />;
// @ts-expect-error y is required on a spot
const bad2: LineChartData = { lineBarsData: [{ spots: [{ x: 1 }] }] };
// @ts-expect-error not a CircularStrokeCap
export const bad3 = <CircularPercentIndicator radius={1} circularStrokeCap="pointy" />;
export const _n = bad2;
