// flutter_typeahead README:
//   TypeAheadField<City>(suggestionsCallback: (search) => CityService.of(context).find(search),
//     builder: (context, controller, focusNode) => TextField(controller: controller, focusNode: focusNode, ...),
//     itemBuilder: (context, city) => ListTile(title: Text(city.name), subtitle: Text(city.country)),
//     onSelected: (city) => ...)
// Generated from the package: nothing (TypeAheadField is skipped). Against host/lib/fuse/type_ahead.dart (86 lines of Dart):
import { createSignal } from "solid-js";
import { TypeAhead } from "~/_generated/app";

declare function findCities(search: string): Promise<{ name: string; country: string }[]>;

export function CityField(props: { onCity: (c: { name: string; country: string }) => void }) {
  const [query, setQuery] = createSignal("");
  const [cities, setCities] = createSignal<{ name: string; country: string }[]>([]);
  return (
    <TypeAhead
      labelText="City"
      autofocus
      query={query()}
      suggestions={cities().map((c) => `${c.name}, ${c.country}`)}
      onSearch={async (s) => { const r = await findCities(s); setCities(r); setQuery(s); }}
      onSelected={(i) => props.onCity(cities()[i])}
    />
  );
}
