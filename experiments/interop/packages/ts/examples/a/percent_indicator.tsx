// README: CircularPercentIndicator(radius: 60.0, lineWidth: 5.0, percent: 1.0,
//           center: new Text("100%"), progressColor: Colors.green)
//         LinearPercentIndicator(width: 140.0, lineHeight: 14.0, percent: 0.5,
//           backgroundColor: Colors.grey, progressColor: Colors.blue)
import { Text } from "solid-fuse";
import { CircularPercentIndicator, LinearPercentIndicator } from "~/_generated/percent_indicator";

export const Circular = () => (
  <CircularPercentIndicator radius={60} lineWidth={5} percent={1} center={<Text>100%</Text>} progressColor="Colors.green" />
);
export const Linear = () => (
  <LinearPercentIndicator width={140} lineHeight={14} percent={0.5} backgroundColor="Colors.grey" progressColor="Colors.blue" />
);
