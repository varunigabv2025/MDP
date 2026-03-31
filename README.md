# Piezoelectric Energy Harvesting System with Web Integration

A comprehensive embedded systems project that converts mechanical energy from footsteps and vibrations into electrical energy, with real-time web-based monitoring and user tracking capabilities.

## 🎯 Project Overview

This system demonstrates practical energy harvesting at scale for smart infrastructure applications, combining hardware energy harvesting with sophisticated data visualization and user management.

### Key Features
- **Multiple Piezoelectric Sensors** in series configuration for maximum energy capture
- **Accurate Energy Measurements** (Voltage, Power, Energy in Joules, Step Detection)
- **Real-time Web Dashboard** with user contribution tracking
- **Multiple Connectivity Options**: WiFi (ESP8266), Wired Ethernet, or Standalone
- **Professional Data Visualization** with charts and analytics
- **User Management System** with individual contribution tracking

## 📁 Project Structure

```
├── piezoelectric_energy_harvester.ino      # Basic Arduino version
├── piezoelectric_wifi_harvester.ino        # ESP8266 WiFi version
├── piezoelectric_ethernet_harvester.ino     # Wired Ethernet version
├── index.html                              # Web dashboard
├── styles.css                              # Modern CSS styling
├── script.js                               # Dashboard JavaScript
└── README.md                               # This documentation
```

## 🔧 Hardware Requirements

### Basic Components
- **Arduino Board** (Uno/Mega) or **ESP8266** (NodeMCU/Wemos D1 Mini)
- **Piezoelectric Sensors** (multiple, 20-50mm diameter recommended)
- **Bridge Rectifier** (4x 1N4007 diodes)
- **Storage Capacitor** (1000µF, 16V electrolytic)
- **Resistors** (2x 10kΩ for voltage divider)
- **LED** (for status indication)
- **Breadboard and Jumper Wires**

### Optional Components (for advanced features)
- **Ethernet Shield** (for wired connection)
- **ESP8266 Module** (for WiFi connectivity)
- **OLED Display** (for local monitoring)
- **Battery** (for portable operation)

## ⚡ Circuit Design

### Sensor Configuration
```
Piezo1 ──┐
         ├───┬───┬───┬───┐
Piezo2 ──┤   │   │   │   ├─── Rectifier ──── Storage ──── Load
         └───┴───┴───┴───┘          (Bridge)    Capacitor   Resistor
```

### Voltage Divider (for Arduino input)
```
Sensor Output ──── R1 (10kΩ) ──── Arduino A0
                      │
                      ├─── R2 (10kΩ) ──── GND
```

## 🚀 Getting Started

### 1. Hardware Assembly
1. Connect piezoelectric sensors in series
2. Build the bridge rectifier circuit
3. Connect storage capacitor and load resistor
4. Set up voltage divider for Arduino input
5. Connect LED indicator to pin 13

### 2. Software Setup
1. Choose your Arduino sketch based on connectivity:
   - `piezoelectric_energy_harvester.ino` for basic standalone operation
   - `piezoelectric_wifi_harvester.ino` for WiFi connectivity
   - `piezoelectric_ethernet_harvester.ino` for wired Ethernet

2. Upload the sketch to your Arduino board

### 3. Web Dashboard Setup
1. Open `index.html` in a web browser
2. The dashboard will start in simulation mode
3. Click "Add User" to create user profiles
4. Toggle "Simulation Mode" to generate sample data

### 4. Real-time Integration (WiFi/Ethernet versions only)
1. Configure your server endpoint in the Arduino sketch
2. Set up a simple HTTP server to receive data
3. Modify `script.js` to connect to your Arduino device

## 📊 Web Dashboard Features

### Main Dashboard
- **Real-time Energy Monitoring**: Total energy, current power, step count
- **Interactive Charts**: Energy generation over time, power output trends
- **User Management**: Add/remove users, track individual contributions
- **System Status**: Sensor connectivity, storage levels, efficiency metrics

### User Contribution Tracking
- Individual user energy generation (in Joules)
- Step detection and counting per user
- Contribution percentage calculations
- Activity status monitoring

### Data Visualization
- **Energy Generation Chart**: Time-series visualization of energy accumulation
- **Power Output Chart**: Real-time power monitoring
- **User Contribution Bars**: Visual comparison of user contributions
- **System Metrics**: Efficiency, uptime, storage levels

## 🔌 Connectivity Options

### Option 1: Standalone (Basic)
- No network connectivity required
- Data displayed on Serial Monitor
- Simple setup, ideal for demonstrations

### Option 2: WiFi (ESP8266)
- Wireless data transmission
- Configurable via WiFiManager
- Automatic reconnection
- JSON data format

### Option 3: Wired Ethernet
- Most reliable connection
- DHCP or static IP configuration
- Real-time HTTP POST data transmission
- Network diagnostics included

## 📈 Data Flow Architecture

```
Piezoelectric Sensors → Rectifier → Storage → Arduino → Network → Web Dashboard
       │                    │           │          │         │
   Mechanical Energy     AC to DC    Energy     Data     Visualization
   (Footsteps/Vibrations) Conversion   Storage  Processing   & Analytics
```

## 🎓 Viva Presentation Points

### Technical Innovation
1. **Energy Harvesting Principle**: Demonstrates piezoelectric effect for sustainable energy generation
2. **Signal Processing**: Accurate voltage measurement with noise filtering
3. **Power Calculations**: Real-time power and energy computations
4. **Data Integration**: Seamless hardware-to-web data flow

### Engineering Applications
1. **Smart Infrastructure**: Energy harvesting from foot traffic in buildings
2. **IoT Integration**: Real-time monitoring and data analytics
3. **Scalability**: Multi-sensor configuration for increased energy capture
4. **User Engagement**: Gamification through contribution tracking

### Web Integration Benefits
1. **Real-time Monitoring**: Live data visualization for system performance
2. **User Analytics**: Individual contribution tracking and comparison
3. **Remote Management**: Web-based system control and configuration
4. **Data Persistence**: Local storage for historical data analysis

### Project Extensions
1. **Machine Learning**: Predictive analytics for energy generation patterns
2. **Mobile App**: Native mobile application for user engagement
3. **Cloud Integration**: AWS/Azure integration for large-scale deployment
4. **Advanced Sensors**: Multi-modal sensing (vibration, pressure, temperature)

## 🔧 Calibration and Testing

### System Calibration
1. Run the built-in calibration routine
2. Verify baseline voltage readings
3. Test with known mechanical inputs
4. Validate energy calculations

### Performance Testing
1. **Step Detection Test**: Verify accurate step counting
2. **Energy Measurement Test**: Compare with theoretical calculations
3. **Network Connectivity Test**: Verify data transmission
4. **Dashboard Integration Test**: Confirm real-time updates

## 🐛 Troubleshooting

### Common Issues
1. **Low Voltage Readings**: Check sensor connections and voltage divider
2. **No Step Detection**: Adjust voltage threshold in code
3. **WiFi Connection Issues**: Use WiFiManager for reconfiguration
4. **Ethernet Problems**: Verify cable connection and IP configuration

### Debug Mode
Enable Serial Monitor output (9600 baud) for real-time debugging information:
```
Time(s)  Voltage(V)  Power(W)  Energy(J)  Steps  Status
------   ---------   -------   --------  -----  ------
123      0.234       0.005     12.345     156    OK
```

## 📚 Technical Specifications

### Electrical Specifications
- **Input Voltage Range**: 0-5V (Arduino), 0-3.3V (ESP8266)
- **ADC Resolution**: 10-bit (1024 levels)
- **Sampling Rate**: 10 Hz (configurable)
- **Power Consumption**: ~50mA (Arduino), ~80mA (ESP8266 with WiFi)

### Energy Calculations
- **Voltage**: V = (ADC_value × V_supply) / ADC_resolution × Voltage_divider_ratio
- **Power**: P = V² / R_load
- **Energy**: E = P × Δt
- **Step Detection**: Threshold-based with debouncing

### Network Specifications
- **WiFi**: 802.11 b/g/n, 2.4GHz
- **Ethernet**: 10/100 Mbps, RJ45
- **Data Protocol**: HTTP POST with JSON payload
- **Update Rate**: 5 seconds (configurable)

## 🌟 Advanced Features

### Data Analytics
- **Energy Generation Trends**: Historical analysis and pattern recognition
- **User Performance Metrics**: Step frequency, energy per step
- **System Efficiency**: Conversion efficiency calculations
- **Predictive Analytics**: ML-based energy generation forecasting

### Security Features
- **Device Authentication**: Unique device ID and MAC address
- **Data Encryption**: Optional TLS/SSL for secure transmission
- **Access Control**: User authentication for dashboard access
- **Data Privacy**: Local storage option for sensitive applications

## 📞 Support and Development

### Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description

### Issues and Bug Reports
- Use GitHub Issues for bug reports
- Include hardware configuration and error details
- Provide Serial Monitor output when applicable

### Future Development
- Mobile app development
- Cloud integration services
- Advanced sensor fusion
- Machine learning integration

---

**Project developed for embedded systems engineering demonstration and smart infrastructure research.**
