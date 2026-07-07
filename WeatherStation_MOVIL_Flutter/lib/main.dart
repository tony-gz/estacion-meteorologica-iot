import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'firebase_options.dart';
import 'providers/weather_provider.dart';
import 'services/notification_service.dart';
import 'theme/app_theme.dart';
import 'screens/home_screen.dart';

/// Punto de entrada de la aplicación de Estación Meteorológica.
///
/// Inicializa Firebase, las notificaciones push y la configuración
/// regional en español antes de iniciar la interfaz.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await initializeDateFormatting('es_MX', null);
  await NotificationService.init();
  await NotificationService.suscribirAlertas();
  runApp(const WeatherApp());
}

/// Widget raíz de la aplicación.
///
/// Configura el tema claro/oscuro basado en preferencias del usuario
/// y proporciona acceso al [WeatherProvider] para toda la app.
class WeatherApp extends StatelessWidget {
  const WeatherApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => WeatherProvider(),
      child: Consumer<WeatherProvider>(
        builder: (context, wp, _) {
          return MaterialApp(
            title: 'Estación Meteorológica',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            themeMode: wp.modoOscuro ? ThemeMode.dark : ThemeMode.light,
            home: const HomeScreen(),
          );
        },
      ),
    );
  }
}
