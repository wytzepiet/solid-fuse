// README: Shimmer.fromColors(baseColor: Colors.red, highlightColor: Colors.yellow,
//           child: Text('Shimmer', textAlign: TextAlign.center, style: TextStyle(fontSize: 40.0, fontWeight: FontWeight.bold)))
import { Text } from "solid-fuse";
import { ShimmerFromColors } from "~/_generated/shimmer";

export const Loading = () => (
  <ShimmerFromColors baseColor="Colors.red" highlightColor="Colors.yellow">
    <Text textAlign="center" fontSize={40} fontWeight="bold">Shimmer</Text>
  </ShimmerFromColors>
);
