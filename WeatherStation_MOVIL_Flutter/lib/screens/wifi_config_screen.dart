// lib/screens/wifi_config_screen.dart
import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:permission_handler/permission_handler.dart';

const bleServiceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const bleSSIDUUID    = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const blePassUUID    = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
const bleStatusUUID  = "beb5483e-36e1-4688-b7f5-ea07361b26aa";
const bleCmdUUID     = "beb5483e-36e1-4688-b7f5-ea07361b26ab";

class WifiConfigScreen extends StatefulWidget {
  /// ID de la estación seleccionada (ej: "estacion1").
  /// El nombre BLE buscado será "Meteo-{estacionId}", igual que en el ESP32.
  /// Si es null se muestra un selector manual.
  final String? estacionId;

  const WifiConfigScreen({super.key, this.estacionId});

  @override
  State<WifiConfigScreen> createState() => _WifiConfigScreenState();
}

class _WifiConfigScreenState extends State<WifiConfigScreen> {
  final _ssidCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _idCtrl   = TextEditingController();

  BluetoothDevice?         _device;
  BluetoothCharacteristic? _ssidChar;
  BluetoothCharacteristic? _passChar;
  BluetoothCharacteristic? _statusChar;
  BluetoothCharacteristic? _cmdChar;

  StreamSubscription<List<ScanResult>>? _scanSub;
  StreamSubscription<List<int>>?         _statusSub;
  StreamSubscription<BluetoothConnectionState>? _connSub;

  String _estado     = '';
  bool   _escaneando = false;
  bool   _conectado  = false;   // conectado por BLE al ESP32
  bool   _enviando   = false;
  bool   _wifiOK     = false;   // el ESP32 reportó WIFI_OK por BLE
  String _ipReportada = '';

  String get _bleNombre {
    final id = widget.estacionId?.isNotEmpty == true
        ? widget.estacionId!
        : _idCtrl.text.trim();
    return 'Meteo-$id';
  }

  @override
  void initState() {
    super.initState();
    if (widget.estacionId?.isNotEmpty == true) {
      _estado = 'Buscando $_bleNombre…';
      _iniciar();
    } else {
      _estado = 'Ingresa el ID de la estación para buscarla.';
    }
  }

  // ──────────────────────────────────────────
  //  PERMISOS Y ARRANQUE
  // ──────────────────────────────────────────

  /// Lista de permisos que debemos pedir según la versión del SO.
  ///
  /// Android 12+ (SDK 31+):
  ///   BLUETOOTH_SCAN + BLUETOOTH_CONNECT (con `neverForLocation`, no hace
  ///   falta ubicación).
  /// Android 11 y menor:
  ///   Sólo ubicación (Permission.locationWhenInUse) — los permisos legacy
  ///   BLUETOOTH/BLUETOOTH_ADMIN no requieren runtime grant.
  /// iOS:
  ///   Bluetooth se gestiona vía Info.plist; no se pide aquí.
  List<Permission> _permisosRequeridos() {
    if (!Platform.isAndroid) return const [];
    // permission_handler ya mapea las constantes "scan/connect" al permiso
    // correcto en cada versión; en SDK < 31 retornan denied silenciosamente
    // si no están en el manifest, así que añadimos locationWhenInUse como
    // fallback (sólo se evaluará si el manifest la declara).
    return [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ];
  }

  Future<bool> _solicitarPermisos() async {
    final requeridos = _permisosRequeridos();

    // 1) Comprobar estado actual; si ya están concedidos, no hace falta pedir.
    final estados = <Permission, PermissionStatus>{};
    for (final p in requeridos) {
      estados[p] = await p.status;
    }
    final faltantes = estados.entries
        .where((e) => !(e.value.isGranted || e.value.isLimited))
        .map((e) => e.key)
        .toList();

    // 2) Si todos están OK, seguimos.
    if (faltantes.isEmpty) {
      return _verificarBluetoothEncendido();
    }

    // 3) Si alguno está "permanentlyDenied" mostramos atajo a ajustes.
    final permanente = faltantes.any(
      (p) => estados[p] == PermissionStatus.permanentlyDenied,
    );
    if (permanente) {
      setState(() => _estado =
          'Permisos bloqueados. Ábrelos manualmente en Ajustes → App.');
      _mostrarDialogoAjustes();
      return false;
    }

    // 4) Pedir los faltantes.
    final resultado = await faltantes.request();
    final todosOk = resultado.values.every(
      (s) => s.isGranted || s.isLimited,
    );
    if (!todosOk) {
      setState(() => _estado =
          'Necesito permiso de Bluetooth para conectarme al ESP32.');
      return false;
    }

    return _verificarBluetoothEncendido();
  }

  Future<bool> _verificarBluetoothEncendido() async {
    if (await FlutterBluePlus.isSupported == false) {
      setState(() => _estado = 'Este dispositivo no soporta Bluetooth LE.');
      return false;
    }
    final adapterState = await FlutterBluePlus.adapterState.first;
    if (adapterState != BluetoothAdapterState.on) {
      setState(() => _estado = 'Activa el Bluetooth del celular.');
      return false;
    }
    return true;
  }

  Future<void> _mostrarDialogoAjustes() async {
    if (!mounted) return;
    final abrir = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Permisos necesarios'),
        content: const Text(
          'Para encontrar la estación por Bluetooth necesito que actives los '
          'permisos manualmente en los ajustes del sistema.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Abrir Ajustes'),
          ),
        ],
      ),
    );
    if (abrir == true) {
      await openAppSettings();
    }
  }

  Future<void> _iniciar() async {
    if (!await _solicitarPermisos()) return;
    await _escanear();
  }

  // ──────────────────────────────────────────
  //  ESCANEO BLE
  // ──────────────────────────────────────────
  Future<void> _escanear() async {
    final nombre = _bleNombre;
    if (nombre == 'Meteo-') {
      setState(() => _estado = 'Escribe el ID de la estación primero.');
      return;
    }

    // Si ya estamos conectados a un dispositivo, desconectar antes
    await _desconectarSiHace();

    setState(() {
      _escaneando = true;
      _estado     = 'Buscando $nombre…';
      _conectado  = false;
      _wifiOK     = false;
      _ipReportada = '';
      _ssidChar   = null;
      _passChar   = null;
      _statusChar = null;
      _cmdChar    = null;
    });

    // ── IMPORTANTE: registrar el listener ANTES de iniciar el scan ──
    await _scanSub?.cancel();
    bool encontrado = false;
    _scanSub = FlutterBluePlus.scanResults.listen((results) async {
      if (encontrado) return;
      for (final r in results) {
        // Comparar por platformName (anuncio) o advName (scan response)
        final n = r.device.platformName.isNotEmpty
            ? r.device.platformName
            : r.advertisementData.advName;
        if (n == nombre) {
          encontrado = true;
          await FlutterBluePlus.stopScan();
          await _conectar(r.device);
          break;
        }
      }
    });

    try {
      await FlutterBluePlus.startScan(
        timeout: const Duration(seconds: 12),
        withServices: [Guid(bleServiceUUID)],
      );
    } catch (e) {
      setState(() {
        _escaneando = false;
        _estado     = 'No se pudo iniciar el escaneo: $e';
      });
      return;
    }

    // Esperar a que termine el timeout del scan; si no encontramos, avisar
    await Future.delayed(const Duration(seconds: 12));
    await FlutterBluePlus.stopScan();
    if (!_conectado && mounted) {
      setState(() {
        _escaneando = false;
        _estado     = '$nombre no encontrado. ¿Está encendido y cerca?';
      });
    }
  }

  // ──────────────────────────────────────────
  //  CONEXIÓN BLE
  // ──────────────────────────────────────────
  Future<void> _conectar(BluetoothDevice device) async {
    setState(() => _estado = 'Conectando a $_bleNombre…');
    try {
      // Observar cambios de estado de conexión
      await _connSub?.cancel();
      _connSub = device.connectionState.listen((s) {
        if (s == BluetoothConnectionState.disconnected && mounted) {
          setState(() {
            _conectado = false;
            // Si ya teníamos confirmación de WiFi, la desconexión BLE es
            // esperada: el ESP32 apaga Bluetooth tras conectarse a la red
            // para liberar memoria para Firebase.
            if (_wifiOK) {
              _estado = '✓ Configuración terminada. El ESP32 ya está '
                        'enviando datos a la red. Puedes cerrar esta pantalla.';
            } else {
              _estado = 'Conexión BLE perdida. Toca "Buscar de nuevo".';
            }
          });
        }
      });

      // IMPORTANTE: mtu: null desactiva la petición automática de MTU 512
      // que hace FlutterBluePlus dentro de connect(). Sobre Arduino-ESP32
      // un MTU 512 puede causar error 133 y/o reiniciar el ESP32.
      await device.connect(
        timeout: const Duration(seconds: 15),
        autoConnect: false,
        mtu: null,
      );
      _device = device;

      // Pausa: en Android tocar el GATT muy rápido tras connect causa error 133.
      await Future.delayed(const Duration(milliseconds: 700));

      // Descubrir servicios PRIMERO.
      final services = await device.discoverServices();

      // MTU es opcional. Con MTU 23 (≈20 bytes) la BLE igual permite
      // escribir valores más largos vía "long writes" (prepare/execute).
      // Lo intentamos con un valor modesto; si falla, seguimos sin más.
      if (Platform.isAndroid) {
        try {
          await Future.delayed(const Duration(milliseconds: 300));
          final mtu = await device.requestMtu(150);
          debugPrint('[BLE] MTU negociado: $mtu');
        } catch (e) {
          debugPrint('[BLE] requestMtu falló (continuamos con MTU bajo): $e');
        }
      }

      for (final s in services) {
        if (s.uuid.toString().toLowerCase() == bleServiceUUID) {
          for (final c in s.characteristics) {
            final uuid = c.uuid.toString().toLowerCase();
            if (uuid == bleSSIDUUID)   _ssidChar   = c;
            if (uuid == blePassUUID)   _passChar   = c;
            if (uuid == bleStatusUUID) _statusChar = c;
            if (uuid == bleCmdUUID)    _cmdChar    = c;
          }
        }
      }

      if (_ssidChar == null || _passChar == null) {
        throw Exception('El ESP32 no expone las características esperadas.');
      }

      if (_statusChar != null) {
        await _statusChar!.setNotifyValue(true);
        await _statusSub?.cancel();
        _statusSub = _statusChar!.lastValueStream.listen(_onStatus);
      }

      setState(() {
        _conectado  = true;
        _escaneando = false;
        _estado     = 'Conectado por Bluetooth. Ingresa los datos WiFi.';
      });
    } catch (e) {
      String msg = _formatoErrorBLE(e);
      setState(() {
        _estado     = msg;
        _escaneando = false;
        _conectado  = false;
      });
      try { await device.disconnect(); } catch (_) {}
    }
  }

  /// Interpreta los estados que notifica el ESP32 por la característica STATUS.
  void _onStatus(List<int> val) {
    if (val.isEmpty) return;
    final s = utf8.decode(val, allowMalformed: true);
    if (!mounted) return;
    setState(() {
      if (s.startsWith('WIFI_OK')) {
        _wifiOK = true;
        _ipReportada = s.contains(':') ? s.split(':').sublist(1).join(':') : '';
        _estado = '✓ WiFi conectado. IP: $_ipReportada';
        _enviando = false;
      } else if (s.startsWith('CONNECTING')) {
        _wifiOK = false;
        _estado = 'ESP32 conectando a la red…';
      } else if (s == 'BAD_PASSWORD') {
        _wifiOK = false;
        _enviando = false;
        _estado = '✗ Contraseña incorrecta. Revísala y reenvía.';
      } else if (s == 'NO_AP') {
        _wifiOK = false;
        _enviando = false;
        _estado = '✗ La red no fue encontrada. Verifica el nombre (SSID).';
      } else if (s == 'WIFI_FAIL') {
        _wifiOK = false;
        _enviando = false;
        _estado = '✗ No se pudo conectar. Intenta de nuevo.';
      } else if (s == 'FORGOTTEN') {
        _wifiOK = false;
        _ipReportada = '';
        _estado = 'Red guardada eliminada. Ingresa una nueva.';
      } else if (s == 'IDLE') {
        _wifiOK = false;
        _estado = 'ESP32 esperando credenciales.';
      } else if (s == 'SSID_OK' || s == 'PASS_OK') {
        // confirmación de recepción, no cambiar texto principal
      } else if (s.startsWith('ERR')) {
        _enviando = false;
        _estado = s;
      } else {
        _estado = s;
      }
    });
  }

  // ──────────────────────────────────────────
  //  ENVIAR CREDENCIALES
  // ──────────────────────────────────────────
  Future<void> _enviarCredenciales() async {
    if (_ssidChar == null || _passChar == null) return;
    if (_ssidCtrl.text.trim().isEmpty) {
      setState(() => _estado = 'Ingresa el nombre de la red.');
      return;
    }

    setState(() {
      _enviando = true;
      _wifiOK   = false;
      _estado   = 'Enviando credenciales…';
    });

    try {
      // utf8.encode → bytes reales (codeUnits es UTF-16, mal para BLE)
      await _ssidChar!.write(
        utf8.encode(_ssidCtrl.text.trim()),
        withoutResponse: false,
      );
      await Future.delayed(const Duration(milliseconds: 200));

      await _passChar!.write(
        utf8.encode(_passCtrl.text),
        withoutResponse: false,
      );
      await Future.delayed(const Duration(milliseconds: 200));

      // Dispara el intento de conexión en el ESP32
      if (_cmdChar != null) {
        await _cmdChar!.write(utf8.encode('APPLY'), withoutResponse: false);
      }

      setState(() => _estado = 'Credenciales enviadas. Esperando respuesta…');
      // _enviando se desactiva cuando llega WIFI_OK / BAD_PASSWORD / etc.
    } catch (e) {
      setState(() {
        _estado   = 'Error al enviar: ${_formatoErrorBLE(e)}';
        _enviando = false;
      });
    }
  }

  // ──────────────────────────────────────────
  //  UTILIDADES
  // ──────────────────────────────────────────
  String _formatoErrorBLE(Object e) {
    final s = e.toString();
    if (s.contains('timeout')) {
      return 'Tiempo agotado. ¿La estación está encendida y a menos de 5 m?';
    }
    if (s.contains('already')) {
      return 'El dispositivo ya estaba conectado. Reintenta.';
    }
    if (s.contains('disconnected') || s.contains('cancelled')) {
      return 'El ESP32 se desconectó. Reintenta.';
    }
    return s.length > 120 ? '${s.substring(0, 120)}…' : s;
  }

  Future<void> _desconectarSiHace() async {
    try { await _device?.disconnect(); } catch (_) {}
    _device = null;
  }

  @override
  void dispose() {
    _scanSub?.cancel();
    _statusSub?.cancel();
    _connSub?.cancel();
    FlutterBluePlus.stopScan();
    _desconectarSiHace();
    _ssidCtrl.dispose();
    _passCtrl.dispose();
    _idCtrl.dispose();
    super.dispose();
  }

  // ──────────────────────────────────────────
  //  UI
  // ──────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.estacionId != null
              ? 'WiFi · $_bleNombre'
              : 'Configurar WiFi',
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.estacionId == null || widget.estacionId!.isEmpty) ...[
                Text('ID DE ESTACIÓN',
                    style: GoogleFonts.spaceMono(
                        fontSize: 10,
                        letterSpacing: 0.12,
                        color: const Color(0xFF64748B))),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _idCtrl,
                        decoration: _inputDecoration('ej: estacion1'),
                        onSubmitted: (_) => _iniciar(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _escaneando ? null : _iniciar,
                      style: _btnPrincipal(),
                      child: const Icon(Icons.search),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
              ],

              _EstadoBanner(
                estado: _estado,
                conectado: _conectado,
                escaneando: _escaneando,
                wifiOK: _wifiOK,
              ),
              const SizedBox(height: 20),

              // ── Indicador de estado WiFi actual de la estación ──
              if (_conectado && _wifiOK) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF34D399).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: const Color(0xFF34D399).withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.wifi,
                          color: Color(0xFF34D399), size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _ipReportada.isNotEmpty
                              ? 'WiFi actual: $_ipReportada'
                              : 'WiFi conectada',
                          style: GoogleFonts.dmSans(
                              fontSize: 13, color: const Color(0xFF34D399)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Puedes enviar una red distinta cuando quieras.',
                  style: GoogleFonts.dmSans(
                      fontSize: 12, color: const Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
              ],

              if (_conectado) ...[
                Text('NUEVA RED WIFI',
                    style: GoogleFonts.spaceMono(
                        fontSize: 10,
                        letterSpacing: 0.12,
                        color: const Color(0xFF64748B))),
                const SizedBox(height: 8),
                TextField(
                  controller: _ssidCtrl,
                  decoration: _inputDecoration('Nombre de la red (SSID)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passCtrl,
                  obscureText: true,
                  decoration: _inputDecoration('Contraseña'),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _enviando ? null : _enviarCredenciales,
                    style: _btnPrincipal(),
                    child: _enviando
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Color(0xFF0A0E1A)),
                          )
                        : Text('Enviar al ESP32',
                            style: GoogleFonts.spaceMono(
                                fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(height: 10),
                // Aviso al usuario: el flujo ahora requiere reinicio para
                // cambiar la red, ya que el ESP32 apaga BLE tras conectar.
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B).withOpacity(0.4),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Para cambiar la red más tarde, reinicia el ESP32 '
                    '(botón EN o desconéctalo y conéctalo) — el Bluetooth '
                    'se apagará en cuanto la estación conecte a internet.',
                    style: GoogleFonts.dmSans(
                        fontSize: 11, color: const Color(0xFF94A3B8)),
                  ),
                ),
              ] else if (!_escaneando) ...[
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _iniciar,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF38BDF8),
                      side: const BorderSide(color: Color(0xFF38BDF8)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text('Buscar de nuevo',
                        style: GoogleFonts.spaceMono(fontSize: 13)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
        filled: true,
        fillColor: const Color(0xFF111827),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF1E293B))),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF1E293B))),
      );

  ButtonStyle _btnPrincipal() => ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF38BDF8),
        foregroundColor: const Color(0xFF0A0E1A),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      );
}

// ──────────────────────────────────────────
//  Widget de estado BLE
// ──────────────────────────────────────────

class _EstadoBanner extends StatelessWidget {
  final String estado;
  final bool conectado;
  final bool escaneando;
  final bool wifiOK;

  const _EstadoBanner({
    required this.estado,
    required this.conectado,
    required this.escaneando,
    required this.wifiOK,
  });

  @override
  Widget build(BuildContext context) {
    final color = wifiOK
        ? const Color(0xFF34D399)
        : conectado
            ? const Color(0xFF38BDF8)
            : const Color(0xFF64748B);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          if (escaneando)
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Icon(
              wifiOK
                  ? Icons.wifi
                  : conectado
                      ? Icons.bluetooth_connected
                      : Icons.bluetooth_searching,
              size: 16,
              color: color,
            ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              estado,
              style: GoogleFonts.dmSans(fontSize: 13, color: color),
            ),
          ),
        ],
      ),
    );
  }
}
