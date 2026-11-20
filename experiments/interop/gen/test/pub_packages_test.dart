// Part 3: adapters generated, unassisted, for two pub.dev packages.
// ignore_for_file: deprecated_member_use
import 'dart:convert';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fuse_gen_spike/generated/fl_chart.g.dart';
import 'package:fuse_gen_spike/generated/percent_indicator.g.dart';
import 'package:percent_indicator/percent_indicator.dart';
import 'package:solid_fuse/solid_fuse.dart';

FuseNode makeNode(String type, Map<String, dynamic> props) {
  final registry = FuseNodeRegistry(callFunction: (id, name, [value]) {});
  return registry.create(1, type, Map<String, dynamic>.from(jsonDecode(jsonEncode(props)) as Map));
}

void main() {
  testWidgets('fl_chart LineChart from a JSON LineChartData', (tester) async {
    final node = makeNode('fl_chart_LineChart', {
      'duration': 0,
      'data': {
        'minY': 0,
        'maxY': 10,
        'backgroundColor': '#101010',
        'gridData': {'show': true, 'drawVerticalLine': false, 'horizontalInterval': 2},
        'borderData': {'show': true, 'border': {r'$': 'all', 'color': '#ffffff', 'width': 1}},
        'titlesData': {
          'show': true,
          'topTitles': {'sideTitles': {'showTitles': false}},
          'leftTitles': {'axisNameSize': 20, 'sideTitles': {'showTitles': true, 'reservedSize': 32, 'interval': 2}},
        },
        'lineTouchData': {'enabled': false},
        'lineBarsData': [
          {
            'spots': [
              {'x': 0, 'y': 1},
              {'x': 1, 'y': 4.5},
              {'x': 2, 'y': 3},
              'nullSpot',
            ],
            'isCurved': true,
            'barWidth': 3,
            'color': 'Colors.amber',
            'gradient': {r'$': 'LinearGradient', 'colors': ['#ff0000', '#0000ff']},
            'dashArray': [4, 2],
            'dotData': {'show': false},
            'belowBarData': {'show': true, 'color': '#33ff0000', 'cutOffY': 2, 'applyCutOffY': true},
          },
        ],
      },
    });
    await tester.pumpWidget(MaterialApp(
      home: Center(child: SizedBox(width: 300, height: 200, child: FuseGenLineChart(node))),
    ));
    final chart = tester.widget<LineChart>(find.byType(LineChart));
    final d = chart.data;
    expect((d.minY, d.maxY), (0.0, 10.0));
    expect(d.backgroundColor, const Color(0xFF101010));
    expect((d.gridData.drawVerticalLine, d.gridData.horizontalInterval), (false, 2.0));
    expect(d.borderData.border, Border.all(color: const Color(0xFFFFFFFF), width: 1));
    expect(d.titlesData.topTitles.sideTitles.showTitles, false);
    expect(d.titlesData.leftTitles.sideTitles.reservedSize, 32);
    expect(d.lineTouchData.enabled, false);
    final bar = d.lineBarsData.single;
    expect(bar.spots, [const FlSpot(0, 1), const FlSpot(1, 4.5), const FlSpot(2, 3), FlSpot.nullSpot]);
    expect((bar.isCurved, bar.barWidth, bar.color), (true, 3.0, Colors.amber));
    expect(bar.dashArray, [4, 2]);
    expect((bar.gradient! as LinearGradient).colors, const [Color(0xFFFF0000), Color(0xFF0000FF)]);
    expect(bar.dotData.show, false);
    expect((bar.belowBarData.show, bar.belowBarData.cutOffY), (true, 2.0));
    expect(chart.duration, Duration.zero);
    expect(tester.takeException(), isNull); // it actually paints
  });

  testWidgets('fl_chart PieChart / BarChart', (tester) async {
    final pie = makeNode('fl_chart_PieChart', {
      'duration': 0,
      'data': {
        'centerSpaceRadius': 30,
        'sectionsSpace': 2,
        'sections': [
          {'value': 40, 'color': '#ff0000', 'title': 'A', 'radius': 50},
          {'value': 60, 'color': '#00ff00', 'title': 'B', 'titleStyle': {'fontSize': 12, 'fontWeight': 'bold'}},
        ],
      },
    });
    final bar = makeNode('fl_chart_BarChart', {
      'duration': 0,
      'data': {
        'alignment': 'spaceAround',
        'maxY': 20,
        'barGroups': [
          {'x': 0, 'barRods': [{'toY': 8, 'color': '#00f', 'width': 12, 'borderRadius': 4}]},
          {'x': 1, 'barRods': [{'toY': 14, 'fromY': 2}], 'showingTooltipIndicators': [0]},
        ],
      },
    });
    await tester.pumpWidget(MaterialApp(
      home: Column(children: [
        SizedBox(width: 300, height: 200, child: FuseGenPieChart(pie)),
        SizedBox(width: 300, height: 200, child: FuseGenBarChart(bar)),
      ]),
    ));
    final p = tester.widget<PieChart>(find.byType(PieChart)).data;
    expect(p.sections.map((s) => (s.value, s.title)).toList(), [(40.0, 'A'), (60.0, 'B')]);
    expect(p.sections[1].titleStyle!.fontWeight, FontWeight.bold);
    final b = tester.widget<BarChart>(find.byType(BarChart)).data;
    expect(b.alignment, BarChartAlignment.spaceAround);
    expect(b.barGroups[0].barRods.single.borderRadius, BorderRadius.circular(4));
    expect((b.barGroups[1].barRods.single.fromY, b.barGroups[1].barRods.single.toY), (2.0, 14.0));
    expect(tester.takeException(), isNull);
  });

  testWidgets('percent_indicator', (tester) async {
    final node = makeNode('percent_indicator_CircularPercentIndicator', {
      'radius': 40,
      'lineWidth': 6,
      'percent': 0.7,
      'progressColor': '#00aa00',
      'backgroundColor': 'Colors.black12',
      'circularStrokeCap': 'round',
      'animation': false,
      'startAngle': 90,
    });
    await tester.pumpWidget(MaterialApp(home: Center(child: FuseGenCircularPercentIndicator(node))));
    final w = tester.widget<CircularPercentIndicator>(find.byType(CircularPercentIndicator));
    expect((w.radius, w.lineWidth, w.percent, w.startAngle), (40.0, 6.0, 0.7, 90.0));
    expect(w.progressColor, const Color(0xFF00AA00));
    expect(w.backgroundColor, Colors.black12);
    expect(w.circularStrokeCap, CircularStrokeCap.round);
    expect(tester.takeException(), isNull);
  });
}
