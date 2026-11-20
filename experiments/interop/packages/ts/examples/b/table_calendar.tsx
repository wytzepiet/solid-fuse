// README "Basic setup":
//   TableCalendar(firstDay: DateTime.utc(2010, 10, 16), lastDay: DateTime.utc(2030, 3, 14), focusedDay: DateTime.now())
// README "Adding interactivity":
//   selectedDayPredicate: (day) => isSameDay(_selectedDay, day),          <- NOT BRIDGED (sync-return callback)
//   onDaySelected: (selectedDay, focusedDay) { setState(() { _selectedDay = selectedDay; _focusedDay = focusedDay; }); },
//   calendarFormat: _calendarFormat, onFormatChanged: (format) { setState(() => _calendarFormat = format); },
//   onPageChanged: (focusedDay) { _focusedDay = focusedDay; }
import { createSignal } from "solid-js";
import { TableCalendar, type CalendarFormat, type DateTimeOut } from "~/_generated/table_calendar";
import { Calendar } from "../../wrappers/calendar";

// BEFORE: raw generated API. `DateTime.utc(2010, 10, 16)` cannot be written: the generated DateTime type lost the
// optional positional parameters (month, day, ...), so only the epoch constructor is usable. Callback payloads are
// field records and multi-arg callbacks arrive as one tuple.
export function Raw() {
  const ms = (y: number, m: number, d: number) => ({ $: "fromMillisecondsSinceEpoch" as const, millisecondsSinceEpoch: Date.UTC(y, m - 1, d), isUtc: true });
  const out = (d: DateTimeOut) => ms(d.year, d.month, d.day);
  const [focused, setFocused] = createSignal(ms(2026, 11, 20));
  const [format, setFormat] = createSignal<CalendarFormat>("month");
  return (
    <TableCalendar
      firstDay={ms(2010, 10, 16)}
      lastDay={ms(2030, 3, 14)}
      focusedDay={focused()}
      calendarFormat={format()}
      onFormatChanged={setFormat}
      onDaySelected={([, focusedDay]) => setFocused(out(focusedDay))}
      onPageChanged={(d) => setFocused(out(d))}
    />
  );
}

// AFTER: with wrappers/calendar.tsx.
export function Nice() {
  const [focused, setFocused] = createSignal(new Date());
  const [, setSelected] = createSignal<Date>();
  const [format, setFormat] = createSignal<CalendarFormat>("month");
  return (
    <Calendar
      firstDay={new Date(Date.UTC(2010, 9, 16))}
      lastDay={new Date(Date.UTC(2030, 2, 14))}
      focusedDay={focused()}
      calendarFormat={format()}
      onFormatChanged={setFormat}
      onDaySelected={(selected, f) => { setSelected(selected); setFocused(f); }}
      onPageChanged={setFocused}
    />
  );
}
// Neither version can highlight the selected day: selectedDayPredicate / eventLoader are synchronous callbacks.
// @ts-expect-error not bridged
export const Missing = () => <Calendar firstDay={new Date()} lastDay={new Date()} focusedDay={new Date()} selectedDayPredicate={() => true} />;
