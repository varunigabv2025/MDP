# USB Connection Setup Guide

This guide explains how to set up the piezoelectric energy harvesting system using USB serial communication between Arduino and the web dashboard.

## 🎯 Overview

The USB connection version provides the most reliable and straightforward way to connect your Arduino to the web dashboard without requiring network configuration.

## 📋 Requirements

### Hardware
- Arduino Uno, Mega, Nano, or compatible board
- USB cable (Type-A to Type-B or Type-C depending on Arduino)
- Piezoelectric sensors and circuit components (see main README)

### Software
- Arduino IDE
- Node.js (version 14 or higher)
- Web browser (Chrome, Firefox, Safari, or Edge)

## 🚀 Setup Instructions

### Step 1: Install Node.js Dependencies

1. Open a terminal or command prompt
2. Navigate to the project directory
3. Install the required packages:

```bash
cd path/to/piezoelectric-energy-harvesting
npm install
```

This will install:
- `serialport` - For USB communication
- `ws` - For WebSocket server
- `express` - For web server

### Step 2: Upload Arduino Sketch

1. Open the Arduino IDE
2. Load `piezoelectric_usb_harvester.ino`
3. Connect your Arduino via USB
4. Select the correct board and port:
   - Tools → Board → (your Arduino model)
   - Tools → Port → (your Arduino's COM port)
5. Upload the sketch to the Arduino

### Step 3: Start the Serial Server

1. Keep the Arduino connected via USB
2. In your terminal, start the Node.js server:

```bash
node serial_server.js
```

You should see output similar to:
```
Starting Piezoelectric Energy Harvesting Serial Server...
WebSocket server will run on port 8080
HTTP server will run on port 3000
HTTP server running at http://localhost:3000
Open this URL in your browser to access the dashboard
Scanning for serial ports...
Available ports: [ { path: 'COM3', ... } ]
Found potential Arduino at: COM3
Connecting to Arduino at COM3...
Connected to Arduino successfully!
```

### Step 4: Open the Web Dashboard

1. Open your web browser
2. Navigate to: `http://localhost:3000`
3. The dashboard will automatically connect to the Arduino via USB

## 🔧 Troubleshooting

### Common Issues

#### 1. "No serial ports found"
**Problem**: The server cannot detect the Arduino
**Solutions**:
- Ensure Arduino is connected via USB
- Check if the Arduino is powered (LED should be on)
- Try a different USB cable
- Check Device Manager (Windows) or `ls /dev/tty*` (Linux/Mac) for the port

#### 2. "Access denied" or "Permission denied"
**Problem**: Insufficient permissions to access serial port
**Solutions**:
- **Windows**: Run the terminal as Administrator
- **Linux/Mac**: Add user to dialout group:
  ```bash
  sudo usermod -a -G dialout $USER
  # Then log out and log back in
  ```

#### 3. "Port already in use"
**Problem**: Another program is using the serial port
**Solutions**:
- Close Arduino IDE's Serial Monitor
- Close any other serial terminal programs
- Restart the Node.js server

#### 4. WebSocket connection fails
**Problem**: Dashboard cannot connect to the server
**Solutions**:
- Ensure the Node.js server is running
- Check that port 8080 is not blocked by firewall
- Try refreshing the browser page

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=* node serial_server.js
```

This will show detailed communication logs.

## 📊 Data Flow

```
Arduino (USB) → Serial Port → Node.js Server → WebSocket → Web Dashboard
     ↓              ↓              ↓              ↓              ↓
  Sensors        USB Cable      Serial Server   Real-time      Visualization
  Data           Communication  Processing     Communication  & Analytics
```

## 🎮 Arduino Commands

The dashboard can send commands to the Arduino:

- **CALIBRATE**: Run system calibration
- **RESET**: Reset energy counter
- **TEST**: Run system diagnostics
- **INFO**: Request device information
- **STATUS**: Request current status

### Manual Commands

You can also send commands directly via Arduino Serial Monitor:

1. Open Arduino IDE
2. Tools → Serial Monitor
3. Set baud rate to 115200
4. Type commands and press Enter

## 📈 Data Formats

### JSON Format (Default)
```json
{
  "deviceId": "USB_ABC123",
  "voltage": 0.234,
  "power": 0.000005,
  "energy": 12.345,
  "steps": 156,
  "timestamp": 1234567890
}
```

### CSV Format
```
1234567890,0.234,0.005,12.345,156,1024
timestamp,voltage(V),power(mW),energy(mJ),steps,freeRAM
```

## 🔌 Connection Indicators

### Arduino LED Status
- **Solid ON**: Connected to USB, no energy generation
- **Blinking**: Energy being generated (voltage above threshold)
- **Fast Blink**: Network connection issues

### Dashboard Status
- **Connected**: Green indicator, real-time data flowing
- **Simulation**: Yellow indicator, using simulated data
- **Disconnected**: Red indicator, no Arduino connection

## 🛠️ Advanced Configuration

### Custom Baud Rate
Edit `piezoelectric_usb_harvester.ino`:
```cpp
Serial.begin(9600); // Change from 115200 to desired rate
```

Edit `serial_server.js`:
```javascript
const BAUD_RATE = 9600; // Match Arduino baud rate
```

### Multiple Devices
For multiple Arduino devices, modify `serial_server.js` to handle multiple connections:

```javascript
// Example for connecting to specific port
const arduinoPath = 'COM3'; // or '/dev/ttyUSB0' on Linux
```

## 📱 Mobile Access

Access the dashboard from mobile devices on the same network:

1. Find your computer's IP address:
   - Windows: `ipconfig` in Command Prompt
   - Mac/Linux: `ifconfig` in Terminal

2. On mobile device, navigate to: `http://YOUR_COMPUTER_IP:3000`

## 🔒 Security Considerations

- The USB connection is local and secure
- WebSocket server only accepts connections from localhost
- No data is transmitted over the internet
- Arduino commands are validated before execution

## 📞 Getting Help

If you encounter issues:

1. Check the Arduino Serial Monitor for error messages
2. Review the Node.js server console output
3. Verify all connections in the circuit
4. Consult the main README.md for additional troubleshooting

## 🎯 Next Steps

Once the USB connection is working:

1. Test the energy harvesting with mechanical input
2. Add users to track individual contributions
3. Experiment with different sensor configurations
4. Explore the WiFi or Ethernet versions for remote monitoring
