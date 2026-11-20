# Survey

- widgets (public, concrete, Widget subclasses): 10  (by lib: fl_chart 8, percent_indicator 2)
- deprecated widget classes: 0, generic widget classes: 0, without public ctor: 0
- public non-deprecated constructors: 10 (generative 10 with params, factory 0 with params)
- constructor parameters: 114 (generative only: 114; primary ctor only: 114)
- required: 10, must-supply (required non-null): 10, positional: 7, with default: 52, deprecated params: 10
- distinct parameter types: 28

## Parameters by family (all public ctors)

| class | params | % | covered by general rules |
|---|---:|---:|---:|
| data | 55 | 48.2% | 100.0% |
| primitive | 27 | 23.7% | 100.0% |
| key | 15 | 13.2% | 100.0% |
| widget | 9 | 7.9% | 100.0% |
| enum | 4 | 3.5% | 100.0% |
| callback | 4 | 3.5% | 50.0% |

## Parameters by family/sub-class (all public ctors)

| class | params | % | covered by general rules |
|---|---:|---:|---:|
| data/ctor | 32 | 28.1% | 100.0% |
| data/union | 23 | 20.2% | 100.0% |
| key/key | 15 | 13.2% | 100.0% |
| primitive/bool | 15 | 13.2% | 100.0% |
| primitive/double | 10 | 8.8% | 100.0% |
| widget/slot | 8 | 7.0% | 100.0% |
| enum/enum | 4 | 3.5% | 100.0% |
| primitive/int | 2 | 1.8% | 100.0% |
| callback/void() | 2 | 1.8% | 100.0% |
| callback/sync-return | 2 | 1.8% | 0.0% |
| widget/child | 1 | 0.9% | 100.0% |

## Parameters by family (primary ctor only)

| class | params | % | covered by general rules |
|---|---:|---:|---:|
| data | 55 | 48.2% | 100.0% |
| primitive | 27 | 23.7% | 100.0% |
| key | 15 | 13.2% | 100.0% |
| widget | 9 | 7.9% | 100.0% |
| enum | 4 | 3.5% | 100.0% |
| callback | 4 | 3.5% | 50.0% |

## Data-class params: full vs partial

| class | params | % | covered by general rules |
|---|---:|---:|---:|
| data (all ctor params bridgeable) | 50 | 90.9% | 100.0% |
| data (some optional ctor params dropped) | 5 | 9.1% | 100.0% |

## Cumulative coverage by rule family

| rule families implemented | params covered (all ctors) | params covered (primary ctors) | widgets fully covered (primary ctor) | widgets usable (all must-supply params covered) |
|---|---:|---:|---:|---:|
| primitives + enums (+ key ignored) | 46 (40.4%) | 46 (40.4%) | 0 (0.0%) | 2 (20.0%) |
| + widget slots (child/children/named slots) | 55 (48.2%) | 55 (48.2%) | 0 (0.0%) | 2 (20.0%) |
| + void callbacks with encodable args | 57 (50.0%) | 57 (50.0%) | 0 (0.0%) | 2 (20.0%) |
| + data classes (recursive ctor rule, unions) + static-const enum-likes | 112 (98.2%) | 112 (98.2%) | 8 (80.0%) | 10 (100.0%) |
| + handles (Listenable/controllers/FocusNode via node.handle) | 112 (98.2%) | 112 (98.2%) | 8 (80.0%) | 10 (100.0%) |
| + generics / Object as raw JSON | 112 (98.2%) | 112 (98.2%) | 8 (80.0%) | 10 (100.0%) |
| + nested widgets/callbacks/handles inside data classes (wire extension) | 112 (98.2%) | 112 (98.2%) | 8 (80.0%) | 10 (100.0%) |

## What keeps widgets from being fully covered (primary ctor, after all rule families)

| class of blocking param | widgets with >=1 such param | widgets where it is must-supply |
|---|---:|---:|
| callback/sync-return | 2 | 0 |

## Top 50 parameter types

| # | type | params | cum % | class |
|---:|---|---:|---:|---|
| 1 | `Key` | 15 | 13.2% | key/key |
| 2 | `bool` | 15 | 26.3% | primitive/bool |
| 3 | `Curve` | 14 | 38.6% | data/union |
| 4 | `Duration` | 12 | 49.1% | data/ctor |
| 5 | `double` | 10 | 57.9% | primitive/double |
| 6 | `Widget` | 9 | 65.8% | widget/slot (child, children or named slot) |
| 7 | `Color` | 9 | 73.7% | data/union |
| 8 | `FlTransformationConfig` | 4 | 77.2% | data/ctor |
| 9 | `LinearGradient` | 3 | 79.8% | data/ctor |
| 10 | `int` | 2 | 81.6% | primitive/int |
| 11 | `MaskFilter` | 2 | 83.3% | data/ctor |
| 12 | `void Function()` | 2 | 85.1% | callback/void() |
| 13 | `dynamic Function(double)` | 2 | 86.8% | callback/sync-return |
| 14 | `BarChartData` | 1 | 87.7% | data/ctor |
| 15 | `TitleMeta` | 1 | 88.6% | data/ctor |
| 16 | `SideTitleFitInsideData` | 1 | 89.5% | data/ctor |
| 17 | `CandlestickChartData` | 1 | 90.4% | data/ctor |
| 18 | `GaugeChartData` | 1 | 91.2% | data/ctor |
| 19 | `LineChartData` | 1 | 92.1% | data/ctor |
| 20 | `PieChartData` | 1 | 93.0% | data/ctor |
| 21 | `RadarChartData` | 1 | 93.9% | data/ctor |
| 22 | `ScatterChartData` | 1 | 94.7% | data/ctor |
| 23 | `CircularStrokeCap` | 1 | 95.6% | enum/enum |
| 24 | `ArcType` | 1 | 96.5% | enum/enum |
| 25 | `LinearStrokeCap` | 1 | 97.4% | enum/enum |
| 26 | `Radius` | 1 | 98.2% | data/ctor |
| 27 | `EdgeInsets` | 1 | 99.1% | data/ctor |
| 28 | `MainAxisAlignment` | 1 | 100.0% | enum/enum |

Long tail: 28 distinct types; top 50 cover 100.0%; -22 types beyond the top 50 cover 0.0%; 15 types occur once, 20 occur <= 3 times.

Distinct types per family: data=17, key=1, widget=1, primitive=3, enum=4, callback=2

## Data-class types directly used as widget params (17 distinct)

| type | params | shape | ctor variants | concrete classes in union | static consts | dropped optional params | rejected ctors |
|---|---:|---|---:|---:|---:|---:|---:|
| `Curve` | 14 | union | 12 | 11 | 52 | 0 | 0 |
| `Duration` | 12 | ctor | 1 | 1 | 17 | 0 | 0 |
| `Color` | 9 | union | 9 | 4 | 100 | 0 | 2 |
| `FlTransformationConfig` | 4 | ctor | 1 | 1 | 0 | 1 | 0 |
| `LinearGradient` | 3 | ctor | 1 | 1 | 0 | 0 | 0 |
| `MaskFilter` | 2 | ctor | 1 | 1 | 0 | 0 | 0 |
| `BarChartData` | 1 | ctor | 1 | 1 | 0 | 0 | 0 |
| `TitleMeta` | 1 | ctor | 1 | 1 | 0 | 0 | 0 |
| `SideTitleFitInsideData` | 1 | ctor | 3 | 1 | 0 | 0 | 0 |
| `CandlestickChartData` | 1 | ctor | 1 | 1 | 0 | 0 | 0 |
| `GaugeChartData` | 1 | ctor | 2 | 1 | 0 | 0 | 0 |
| `LineChartData` | 1 | ctor | 1 | 1 | 0 | 0 | 0 |
| `PieChartData` | 1 | ctor | 1 | 1 | 0 | 0 | 0 |
| `RadarChartData` | 1 | ctor | 1 | 1 | 0 | 1 | 0 |
| `ScatterChartData` | 1 | ctor | 1 | 1 | 0 | 0 | 0 |
| `Radius` | 1 | ctor | 2 | 1 | 1 | 0 | 0 |
| `EdgeInsets` | 1 | ctor | 5 | 1 | 1 | 0 | 0 |

## Unbridgeable remainder (0 params, 0 distinct types)


## Callbacks that are not plain void+encodable (2 params, 1 distinct types)

- 2 x `dynamic Function(double)` (callback/sync-return)

## Builders (0 params, 0 distinct types)


## Widget-subtype slots (0 params, 0 distinct types)


## Handles (0 params, 0 distinct types)


## Generic / dynamic (0 params, 0 distinct types)


## Keys (15 params, 1 distinct types)

- 15 x `Key` (key/key)

