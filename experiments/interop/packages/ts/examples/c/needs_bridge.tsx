// Class C: what works today from the generated API, and (as @ts-expect-error) the part of the README example
// that needs a capability the generator copy does not implement. Each expect-error names the capability.
import { For } from "solid-js";
import { Text } from "solid-fuse";
import { CachedNetworkImage } from "~/_generated/cached_network_image";
import { LineChart } from "~/_generated/fl_chart";
import { ActionPane, ScrollMotion, Slidable, SlidableAction } from "~/_generated/flutter_slidable";
import { GoogleMap } from "~/_generated/google_maps_flutter";
import { FlutterMap, TileLayer } from "~/_generated/flutter_map";
import { DropdownButton2 } from "~/_generated/dropdown_button2";
import { QrImageView } from "~/_generated/qr_flutter";

// cached_network_image README:
//   CachedNetworkImage(imageUrl: "http://via.placeholder.com/350x150",
//     placeholder: (context, url) => CircularProgressIndicator(), errorWidget: (context, url, error) => Icon(Icons.error))
export const Img = () => <CachedNetworkImage imageUrl="http://via.placeholder.com/350x150" fit="cover" />;
// @ts-expect-error builder (context, url): needs "builder as slot" (static) or the synchronous builder of report 05
export const ImgFull = () => <CachedNetworkImage imageUrl="x" placeholder={<Text>...</Text>} />;

// fl_chart: LineChart(LineChartData(lineBarsData: [LineChartBarData(spots: [...], isCurved: true)]), duration: 150ms)
export const Chart = (p: { ys: number[] }) => (
  <LineChart
    duration={150}
    data={{
      lineBarsData: [{ spots: p.ys.map((y, x) => ({ x, y })), isCurved: true, color: "#3366ff", barWidth: 3 }],
      titlesData: { topTitles: { sideTitles: { showTitles: false } } },
      // @ts-expect-error nested void callback (bridge 05, problem A)
      lineTouchData: { touchCallback: () => {} },
    }}
  />
);
export const ChartTitles = () => (
  <LineChart
    data={{
      // @ts-expect-error getTitlesWidget(value, meta) => Widget: nested builder with encodable args (05: nested refs + sync builder)
      titlesData: { bottomTitles: { sideTitles: { showTitles: true, getTitlesWidget: (v: number) => <Text>{`${v}`}</Text> } } },
    }}
  />
);

// flutter_slidable README:
//   Slidable(startActionPane: ActionPane(motion: const ScrollMotion(), children: [SlidableAction(onPressed: doNothing,
//     backgroundColor: Color(0xFFFE4A49), foregroundColor: Colors.white, icon: Icons.delete, label: 'Delete')]), child: ListTile(...))
const Pane = () => (
  <ActionPane motion={<ScrollMotion />}>
    <SlidableAction onPressed={() => {}} backgroundColor="#FE4A49" foregroundColor="Colors.white" icon={{ codePoint: 0xe1b9, fontFamily: "MaterialIcons" }} label="Delete" />
  </ActionPane>
);
export const Row = () => <Slidable><Text>Slide me</Text></Slidable>; // compiles, but there is nothing to slide to
// @ts-expect-error startActionPane is typed `ActionPane?`: a slot that needs the concrete widget, not a wrapped node (generator rule "typed widget slot")
export const RowFull = () => <Slidable startActionPane={<Pane />}><Text>Slide me</Text></Slidable>;

// google_maps_flutter README: GoogleMap(mapType: MapType.hybrid, initialCameraPosition: _kGooglePlex,
//   onMapCreated: (GoogleMapController controller) { _controller.complete(controller); })  ...  controller.animateCamera(CameraUpdate.newCameraPosition(_kLake))
export const Map = () => (
  <GoogleMap
    mapType="hybrid"
    initialCameraPosition={{ target: { latitude: 37.42796133580664, longitude: -122.085749655962 }, zoom: 14.4746 }}
    markers={[{ markerId: { value: "plex" }, position: { latitude: 37.4279, longitude: -122.0857 } }]}
    onMapCreated={(controller) => {
      // `controller` arrives as a record of getters, not as a handle: there is nothing to call animateCamera on.
      // @ts-expect-error object passed from Dart to JS in a callback (report 07: "not built")
      controller.animateCamera({});
    }}
  />
);

// flutter_map README: FlutterMap(options: MapOptions(initialCenter: LatLng(51.509364, -0.128928), initialZoom: 9.2),
//   children: [TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.example.app')])
export const Osm = () => (
  <FlutterMap
    options={{
      initialZoom: 9.2,
      // @ts-expect-error LatLng comes from package:latlong2, which flutter_map does not export: the field is dropped
      initialCenter: { latitude: 51.509364, longitude: -0.128928 },
    }}
  >
    <TileLayer urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" userAgentPackageName="com.example.app" />
  </FlutterMap>
);

// dropdown_button2 README: DropdownButton2<String>(hint: Text('Select Item'), items: items.map((item) =>
//   DropdownItem<String>(value: item, child: Text(item))).toList(), valueListenable: valueListenable, onChanged: (value) {...})
export const Select = (p: { items: string[] }) => (
  // @ts-expect-error items is List<DropdownItem<T>>: typed widget slot again; without it the dropdown is empty
  <DropdownButton2 hint={<Text>Select Item</Text>} onChanged={(v) => console.log(v)} items={<For each={p.items}>{(i) => <Text>{i}</Text>}</For>} />
);

// qr_flutter is class A, but its error path is not: errorStateBuilder: (cxt, err) => Center(child: Text('Uh oh!'))
// @ts-expect-error builder with encodable args
export const QrErr = () => <QrImageView data="x" errorStateBuilder={() => <Text>Uh oh!</Text>} />;
