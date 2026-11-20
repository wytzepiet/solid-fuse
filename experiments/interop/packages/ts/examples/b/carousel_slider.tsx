// README: CarouselSlider(options: CarouselOptions(height: 400.0), items: [1,2,3,4,5].map((i) => Builder(builder: (context) =>
//           Container(width: MediaQuery.of(context).size.width, margin: EdgeInsets.symmetric(horizontal: 5.0),
//             decoration: BoxDecoration(color: Colors.amber), child: Text('text $i', style: TextStyle(fontSize: 16.0))))).toList())
import { For } from "solid-js";
import { Text, View } from "solid-fuse";
import { CarouselSlider } from "~/_generated/carousel_slider";
import { Carousel } from "../../wrappers/carousel";

const Slide = (p: { i: number }) => (
  <View margin={{ horizontal: 5 }} decoration={{ color: "#ffc107" }}><Text fontSize={16}>{`text ${p.i}`}</Text></View>
);

// BEFORE: works as generated, but the slides are a prop and the settings are one level down.
export const Raw = () => (
  <CarouselSlider
    options={{ height: 400, autoPlay: true, autoPlayInterval: 3000, enlargeCenterPage: true }}
    items={[1, 2, 3, 4, 5].map((i) => <Slide i={i} />)}
  />
);

// AFTER
export const Nice = () => (
  <Carousel height={400} autoPlay autoPlayInterval={3000} enlargeCenterPage>
    <For each={[1, 2, 3, 4, 5]}>{(i) => <Slide i={i} />}</For>
  </Carousel>
);
// CarouselOptions.onPageChanged(index, reason) is a callback nested in a data object: omitted by this generator copy (bridge 05, problem A).
// @ts-expect-error not bridged yet
export const Missing = () => <Carousel onPageChanged={() => {}} />;
