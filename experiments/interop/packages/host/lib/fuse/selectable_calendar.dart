// Hand-written escape hatch for table_calendar (class C by the bridge, shown here as the Dart alternative).
// `selectedDayPredicate` and `eventLoader` are called synchronously for each of the 42 visible days.
// Instead of 84 synchronous calls into JS per build, the answers are passed as data.
import 'package:flutter/widgets.dart';
import 'package:table_calendar/table_calendar.dart';

class SelectableCalendar extends StatelessWidget {
  const SelectableCalendar({
    super.key,
    required this.firstDayMs,
    required this.lastDayMs,
    required this.focusedDayMs,
    this.selectedDayMs,
    this.eventDaysMs = const [],
    this.calendarFormat = CalendarFormat.month,
    this.onDaySelected,
    this.onPageChanged,
    this.onFormatChanged,
  });

  /// Milliseconds since epoch, UTC (what `Date.getTime()` returns).
  final int firstDayMs;
  final int lastDayMs;
  final int focusedDayMs;
  final int? selectedDayMs;

  /// Days that show an event marker.
  final List<int> eventDaysMs;
  final CalendarFormat calendarFormat;
  final ValueChanged<int>? onDaySelected;
  final ValueChanged<int>? onPageChanged;
  final ValueChanged<CalendarFormat>? onFormatChanged;

  static DateTime _d(int ms) => DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);

  @override
  Widget build(BuildContext context) {
    final selected = selectedDayMs == null ? null : _d(selectedDayMs!);
    final events = [for (final ms in eventDaysMs) _d(ms)];
    return TableCalendar<int>(
      firstDay: _d(firstDayMs),
      lastDay: _d(lastDayMs),
      focusedDay: _d(focusedDayMs),
      calendarFormat: calendarFormat,
      selectedDayPredicate: (day) => isSameDay(selected, day),
      eventLoader: (day) => [for (final e in events) if (isSameDay(e, day)) 1],
      onDaySelected: (day, focused) => onDaySelected?.call(day.millisecondsSinceEpoch),
      onPageChanged: (focused) => onPageChanged?.call(focused.millisecondsSinceEpoch),
      onFormatChanged: onFormatChanged,
    );
  }
}
