// rive README (0.14): RiveWidgetBuilder(fileLoader: FileLoader.fromAsset('assets/vehicles.riv', riveFactory: Factory.rive),
//   builder: (context, state) => switch (state) { RiveLoading() => ..., RiveFailed() => ..., RiveLoaded() => RiveWidget(controller: state.controller, fit: Fit.cover) })
// modal_bottom_sheet README: showMaterialModalBottomSheet(context: context, builder: (context) => Container())
// table_calendar README: selectedDayPredicate: (day) => isSameDay(_selectedDay, day)
import { createSignal } from "solid-js";
import { GestureDetector, Text, View } from "solid-fuse";
import { ModalSheet, RiveAsset, SelectableCalendar } from "~/_generated/app";

export const Vehicles = () => (
  <RiveAsset src="assets/vehicles.riv" fit="cover" stateMachine="bumpy" placeholder={<Text>Loading...</Text>} onFailed={(e) => console.log(e)} />
);

export function Sheet() {
  const [open, setOpen] = createSignal(false);
  return (
    <ModalSheet open={open()} onClosed={() => setOpen(false)} sheet={<View height={300}><Text>Sheet content</Text></View>}>
      <GestureDetector onTap={() => setOpen(true)}><Text>Open</Text></GestureDetector>
    </ModalSheet>
  );
}

export function Cal() {
  const [focused, setFocused] = createSignal(Date.now());
  const [selected, setSelected] = createSignal<number>();
  return (
    <SelectableCalendar
      firstDayMs={Date.UTC(2010, 9, 16)}
      lastDayMs={Date.UTC(2030, 2, 14)}
      focusedDayMs={focused()}
      selectedDayMs={selected()}
      eventDaysMs={[Date.UTC(2026, 10, 24)]}
      onDaySelected={(d) => { setSelected(d); setFocused(d); }}
      onPageChanged={setFocused}
    />
  );
}
