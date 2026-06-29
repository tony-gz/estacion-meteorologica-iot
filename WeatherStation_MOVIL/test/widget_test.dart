import 'package:flutter_test/flutter_test.dart';

import 'package:weather_station/main.dart';

void main() {
  testWidgets('App renders correctly', (WidgetTester tester) async {
    await tester.pumpWidget(const WeatherApp());
    expect(find.text('Estación Meteorológica'), findsOneWidget);
  });
}
