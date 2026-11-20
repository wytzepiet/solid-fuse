// Thin TS wrapper over the generated table_calendar.TableCalendar.
// What it does: JS Date in, JS Date out; multi-arg callbacks unpacked. 1 native node, no extra nodes.
// Per render: 3 required + up to 4 optional Date props remapped (each a getter that allocates one small object
// when its source Date changes); 4 callbacks wrapped once (stable closures, not re-created per update).
import { omit } from "solid-js";
import { TableCalendar, type TableCalendarProps, type DateTime, type DateTimeOut } from "~/_generated/table_calendar";

const toDart = (d: Date): DateTime => ({ $: "fromMillisecondsSinceEpoch", millisecondsSinceEpoch: d.getTime(), isUtc: true });
const toJs = (d: DateTimeOut) => new Date(Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute, d.second, d.millisecond));

type Raw = TableCalendarProps;
export interface CalendarProps
  extends Omit<Raw, "focusedDay" | "firstDay" | "lastDay" | "currentDay" | "rangeStartDay" | "rangeEndDay" | "onDaySelected" | "onRangeSelected" | "onPageChanged" | "onDayLongPressed"> {
  focusedDay: Date;
  firstDay: Date;
  lastDay: Date;
  currentDay?: Date;
  rangeStart?: Date;
  rangeEnd?: Date;
  onDaySelected?: (selected: Date, focused: Date) => void;
  onRangeSelected?: (start: Date | null, end: Date | null, focused: Date) => void;
  onPageChanged?: (focused: Date) => void;
}

export function Calendar(props: CalendarProps) {
  const rest = omit(props, "focusedDay", "firstDay", "lastDay", "currentDay", "rangeStart", "rangeEnd", "onDaySelected", "onRangeSelected", "onPageChanged");
  return (
    <TableCalendar
      {...rest}
      focusedDay={toDart(props.focusedDay)}
      firstDay={toDart(props.firstDay)}
      lastDay={toDart(props.lastDay)}
      currentDay={props.currentDay && toDart(props.currentDay)}
      rangeStartDay={props.rangeStart && toDart(props.rangeStart)}
      rangeEndDay={props.rangeEnd && toDart(props.rangeEnd)}
      onDaySelected={([s, f]) => props.onDaySelected?.(toJs(s), toJs(f))}
      onRangeSelected={([s, e, f]) => props.onRangeSelected?.(s && toJs(s), e && toJs(e), toJs(f))}
      onPageChanged={(d) => props.onPageChanged?.(toJs(d))}
    />
  );
}
