import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

/// Servicio para gestionar notificaciones push mediante Firebase Cloud Messaging.
///
/// Maneja la inicialización del servicio, solicitud de permisos y
/// suscripción a temas de alertas meteorológicas.
class NotificationService {
  static final _fcm = FirebaseMessaging.instance;

  /// Inicializa Firebase Cloud Messaging.
  ///
  /// Solicita permisos de notificación y configura el handler
  /// para mensajes recibidos en primer plano.
  static Future<void> init() async {
    await _fcm.requestPermission(alert: true, badge: true, sound: true);

    final token = await _fcm.getToken();
    debugPrint('FCM Token: $token');

    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('Mensaje recibido: ${message.notification?.title}');
    });
  }

  /// Suscribe el dispositivo al tema de alertas de la estación meteorológica.
  static Future<void> suscribirAlertas() async {
    await _fcm.subscribeToTopic('alertas_estacion');
  }
}
