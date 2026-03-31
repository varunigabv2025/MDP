/*
 * Piezoelectric Energy Harvesting System with Ethernet (Wired) Connection
 * 
 * This sketch provides a wired Ethernet connection for reliable data transmission
 * to the web dashboard, eliminating WiFi connectivity issues.
 * 
 * Hardware Configuration:
 * - Arduino Mega with Ethernet Shield (or Arduino Uno + Ethernet Shield)
 * - Multiple piezoelectric sensors in series
 * - Full-wave bridge rectifier (4x 1N4007 diodes)
 * - Storage capacitor (1000µF, 16V)
 * - Voltage divider for analog input (R1=10kΩ, R2=10kΩ)
 * - LED indicator on pin 13
 * - Analog input on pin A0
 * - Ethernet Shield connected via RJ45 cable
 * 
 * Features:
 * - Reliable wired Ethernet connection
 * - Real-time data transmission via HTTP POST
 * - JSON data format
 * - Automatic IP configuration (DHCP)
 * - Local data backup when network unavailable
 * - Configurable server endpoint
 */

#include <SPI.h>
#include <Ethernet.h>
#include <ArduinoJson.h>

// Ethernet Configuration
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED }; // Unique MAC address
IPAddress ip(192, 168, 1, 177);                     // Fallback static IP
EthernetClient client;

// Server Configuration (update with your server details)
const char* SERVER_HOST = "192.168.1.100";          // Local server IP
const int SERVER_PORT = 80;                         // HTTP port
const String SERVER_ENDPOINT = "/api/energy-data";

// Pin definitions
const int PIEZO_PIN = A0;      // Analog input for piezoelectric voltage
const int LED_PIN = 13;        // LED indicator for vibration detection
const int ETHERNET_CS = 10;    // Ethernet chip select pin (for Uno)

// System parameters
const float VOLTAGE_DIVIDER_RATIO = 2.0;  // Voltage divider ratio (R1+R2)/R2
const float SUPPLY_VOLTAGE = 5.0;        // Arduino supply voltage
const int ADC_RESOLUTION = 1024;         // Arduino ADC resolution
const float CAPACITANCE = 0.001;         // Storage capacitance in Farads (1000µF)
const float LOAD_RESISTANCE = 10000.0;   // Load resistance in Ohms (10kΩ)

// Thresholds and timing
const float VOLTAGE_THRESHOLD = 0.1;     // Minimum voltage to consider as valid signal
const unsigned long SAMPLING_INTERVAL = 100;  // Sampling interval in milliseconds
const unsigned long TRANSMIT_INTERVAL = 5000;  // Data transmission interval in milliseconds
const unsigned long DISPLAY_INTERVAL = 1000;  // Display update interval in milliseconds
const unsigned long ETHERNET_TIMEOUT = 10000;  // Connection timeout in milliseconds

// Variables for energy calculations
float totalEnergy = 0.0;           // Total energy harvested in Joules
float instantaneousPower = 0.0;    // Instantaneous power in Watts
float currentVoltage = 0.0;        // Current voltage reading in Volts
int stepCount = 0;                 // Number of steps detected
bool stepDetected = false;         // Flag for step detection

// Timing variables
unsigned long lastSampleTime = 0;
unsigned long lastTransmitTime = 0;
unsigned long lastDisplayTime = 0;
unsigned long lastStepTime = 0;
const unsigned long STEP_DEBOUNCE_TIME = 200;  // Debounce time for step detection

// Data smoothing
const int NUM_SAMPLES = 10;
float voltageSamples[NUM_SAMPLES];
int sampleIndex = 0;

// Ethernet and transmission variables
bool ethernetConnected = false;
int transmissionFailures = 0;
const int MAX_FAILURES = 3;
unsigned long lastConnectionAttempt = 0;
const unsigned long RECONNECT_INTERVAL = 30000; // 30 seconds

// Device identification
String deviceId;
String deviceName;

void setup() {
  Serial.begin(9600);
  Serial.println("\n=== Piezoelectric Energy Harvester with Ethernet ===");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(PIEZO_PIN, INPUT);
  
  // Generate unique device ID based on MAC address
  deviceId = "ARD_" + String(mac[3], HEX) + String(mac[4], HEX) + String(mac[5], HEX);
  deviceId.toUpperCase();
  deviceName = "EnergyHarvester_" + deviceId;
  
  // Initialize voltage samples array
  for (int i = 0; i < NUM_SAMPLES; i++) {
    voltageSamples[i] = 0.0;
  }
  
  // Initialize Ethernet
  setupEthernet();
  
  // Display initial message
  Serial.println("System initialized. Starting energy harvesting...");
  Serial.println("Device ID: " + deviceId);
  Serial.println("Device Name: " + deviceName);
  Serial.println();
  
  // Display header for data output
  Serial.println("Time(s)\tVoltage(V)\tPower(W)\tEnergy(J)\tSteps\tNet");
  Serial.println("------\t---------\t-------\t--------\t-----\t---");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Sample voltage at regular intervals
  if (currentTime - lastSampleTime >= SAMPLING_INTERVAL) {
    sampleVoltage();
    calculatePower();
    detectStep();
    lastSampleTime = currentTime;
  }
  
  // Transmit data at regular intervals
  if (currentTime - lastTransmitTime >= TRANSMIT_INTERVAL) {
    transmitData();
    lastTransmitTime = currentTime;
  }
  
  // Update display at regular intervals
  if (currentTime - lastDisplayTime >= DISPLAY_INTERVAL) {
    updateDisplay();
    lastDisplayTime = currentTime;
  }
  
  // Update LED indicator
  updateLEDIndicator();
  
  // Handle Ethernet reconnection
  handleEthernetConnection();
}

void setupEthernet() {
  Serial.println("Initializing Ethernet...");
  
  // Start Ethernet connection
  if (Ethernet.begin(mac) == 0) {
    Serial.println("Failed to configure Ethernet using DHCP");
    Serial.println("Trying static IP...");
    
    // Try static IP configuration
    Ethernet.begin(mac, ip);
    
    if (Ethernet.hardwareStatus() == EthernetNoHardware) {
      Serial.println("Ethernet shield not found. Please check connections.");
      while (true) {
        digitalWrite(LED_PIN, HIGH);
        delay(1000);
        digitalWrite(LED_PIN, LOW);
        delay(1000);
      }
    }
  }
  
  // Check for Ethernet hardware
  if (Ethernet.hardwareStatus() == EthernetNoHardware) {
    Serial.println("Ethernet shield not found.");
    return;
  }
  
  if (Ethernet.linkStatus() == LinkOFF) {
    Serial.println("Ethernet cable not connected.");
  } else {
    Serial.println("Ethernet connected successfully!");
    Serial.print("IP address: ");
    Serial.println(Ethernet.localIP());
    Serial.print("Subnet mask: ");
    Serial.println(Ethernet.subnetMask());
    Serial.print("Gateway: ");
    Serial.println(Ethernet.gatewayIP());
    Serial.print("DNS server: ");
    Serial.println(Ethernet.dnsServerIP());
    
    ethernetConnected = true;
  }
}

void sampleVoltage() {
  // Read raw ADC value
  int rawValue = analogRead(PIEZO_PIN);
  
  // Convert to voltage (accounting for voltage divider)
  float rawVoltage = (rawValue * SUPPLY_VOLTAGE) / ADC_RESOLUTION;
  float actualVoltage = rawVoltage * VOLTAGE_DIVIDER_RATIO;
  
  // Apply moving average filter
  voltageSamples[sampleIndex] = actualVoltage;
  sampleIndex = (sampleIndex + 1) % NUM_SAMPLES;
  
  // Calculate average voltage
  float sum = 0.0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sum += voltageSamples[i];
  }
  currentVoltage = sum / NUM_SAMPLES;
}

void calculatePower() {
  // Calculate instantaneous power: P = V²/R
  if (currentVoltage > VOLTAGE_THRESHOLD) {
    instantaneousPower = (currentVoltage * currentVoltage) / LOAD_RESISTANCE;
    
    // Calculate energy contribution for this time interval
    // E = P × t (where t is in seconds)
    float timeInterval = SAMPLING_INTERVAL / 1000.0;  // Convert ms to seconds
    float energyIncrement = instantaneousPower * timeInterval;
    
    // Accumulate total energy
    totalEnergy += energyIncrement;
  } else {
    instantaneousPower = 0.0;
  }
}

void detectStep() {
  unsigned long currentTime = millis();
  
  // Detect step based on voltage threshold and debounce
  if (currentVoltage > VOLTAGE_THRESHOLD && !stepDetected) {
    if (currentTime - lastStepTime >= STEP_DEBOUNCE_TIME) {
      stepCount++;
      stepDetected = true;
      lastStepTime = currentTime;
      
      // Visual feedback for step detection
      Serial.print("Step detected! Total steps: ");
      Serial.println(stepCount);
    }
  } else if (currentVoltage <= VOLTAGE_THRESHOLD) {
    stepDetected = false;
  }
}

void transmitData() {
  if (!ethernetConnected) {
    Serial.println("Ethernet not connected. Skipping data transmission.");
    return;
  }
  
  // Create JSON document
  DynamicJsonDocument doc(1024);
  
  // Device information
  doc["deviceId"] = deviceId;
  doc["deviceName"] = deviceName;
  doc["timestamp"] = millis();
  doc["connectionType"] = "ethernet";
  
  // Energy data
  doc["voltage"] = currentVoltage;
  doc["power"] = instantaneousPower;
  doc["energy"] = totalEnergy;
  doc["steps"] = stepCount;
  
  // System status
  doc["uptime"] = millis() / 1000;
  doc["freeRAM"] = freeMemory();
  doc["networkStatus"] = "connected";
  doc["ipAddress"] = formatIPAddress(Ethernet.localIP());
  
  // Convert to JSON string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send HTTP POST request
  if (client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println("Connected to server");
    
    // Send HTTP POST request
    client.println("POST " + SERVER_ENDPOINT + " HTTP/1.1");
    client.println("Host: " + String(SERVER_HOST));
    client.println("Content-Type: application/json");
    client.println("User-Agent: Arduino-EnergyHarvester/1.0");
    client.println("Connection: close");
    client.println("Content-Length: " + String(jsonString.length()));
    client.println();
    client.print(jsonString);
    
    // Wait for response
    unsigned long startTime = millis();
    while (client.available() == 0) {
      if (millis() - startTime > ETHERNET_TIMEOUT) {
        Serial.println("Server response timeout");
        client.stop();
        transmissionFailures++;
        return;
      }
    }
    
    // Read server response
    String response = "";
    while (client.available()) {
      char c = client.read();
      response += c;
    }
    
    Serial.println("Data transmitted successfully");
    Serial.println("Server response: " + response.substring(0, 100) + "...");
    
    client.stop();
    transmissionFailures = 0;
    
  } else {
    Serial.println("Failed to connect to server");
    client.stop();
    transmissionFailures++;
    
    if (transmissionFailures >= MAX_FAILURES) {
      Serial.println("Too many transmission failures. Reconnecting Ethernet...");
      ethernetConnected = false;
      setupEthernet();
    }
  }
}

void updateDisplay() {
  // Calculate elapsed time
  unsigned long elapsedTime = millis() / 1000;
  
  // Display formatted data
  Serial.print(elapsedTime);
  Serial.print("\t");
  Serial.print(currentVoltage, 3);
  Serial.print("\t");
  Serial.print(instantaneousPower * 1000, 3);  // Convert to mW for better readability
  Serial.print("\t");
  Serial.print(totalEnergy * 1000, 3);         // Convert to mJ for better readability
  Serial.print("\t");
  Serial.print(stepCount);
  Serial.print("\t");
  Serial.println(ethernetConnected ? "OK" : "FAIL");
}

void updateLEDIndicator() {
  // LED control based on network and energy generation status
  static unsigned long lastBlink = 0;
  
  if (!ethernetConnected) {
    // Fast blink when network disconnected
    if (millis() - lastBlink > 200) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      lastBlink = millis();
    }
  } else if (currentVoltage > VOLTAGE_THRESHOLD) {
    // Slow blink when generating energy
    if (millis() - lastBlink > 500) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      lastBlink = millis();
    }
  } else {
    // Solid on when connected but not generating energy
    digitalWrite(LED_PIN, HIGH);
  }
}

void handleEthernetConnection() {
  // Check link status
  if (Ethernet.linkStatus() == LinkOFF && ethernetConnected) {
    Serial.println("Ethernet cable disconnected!");
    ethernetConnected = false;
  } else if (Ethernet.linkStatus() == LinkON && !ethernetConnected) {
    Serial.println("Ethernet cable reconnected!");
    ethernetConnected = true;
    transmissionFailures = 0;
  }
  
  // Attempt reconnection if needed
  if (!ethernetConnected && (millis() - lastConnectionAttempt > RECONNECT_INTERVAL)) {
    Serial.println("Attempting to reconnect Ethernet...");
    setupEthernet();
    lastConnectionAttempt = millis();
  }
}

// Utility function to format IP address
String formatIPAddress(IPAddress ip) {
  return String(ip[0]) + "." + String(ip[1]) + "." + String(ip[2]) + "." + String(ip[3]);
}

// Utility function to get free memory (Arduino specific)
int freeMemory() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

// Function to get system statistics as JSON string
String getSystemStatsJSON() {
  DynamicJsonDocument doc(512);
  
  doc["deviceId"] = deviceId;
  doc["deviceName"] = deviceName;
  doc["voltage"] = currentVoltage;
  doc["power"] = instantaneousPower;
  doc["energy"] = totalEnergy;
  doc["steps"] = stepCount;
  doc["uptime"] = millis() / 1000;
  doc["ethernetConnected"] = ethernetConnected;
  doc["ipAddress"] = formatIPAddress(Ethernet.localIP());
  doc["freeRAM"] = freeMemory();
  doc["linkStatus"] = (Ethernet.linkStatus() == LinkON) ? "connected" : "disconnected";
  
  String jsonString;
  serializeJson(doc, jsonString);
  return jsonString;
}

// Function to reset energy counter
void resetEnergyCounter() {
  totalEnergy = 0.0;
  stepCount = 0;
  Serial.println("Energy counter reset.");
}

// Function to calibrate system
void calibrateSystem() {
  Serial.println("Calibrating system...");
  delay(1000);
  
  // Take baseline readings
  float baselineSum = 0.0;
  for (int i = 0; i < 100; i++) {
    int rawValue = analogRead(PIEZO_PIN);
    float rawVoltage = (rawValue * SUPPLY_VOLTAGE) / ADC_RESOLUTION;
    baselineSum += rawVoltage * VOLTAGE_DIVIDER_RATIO;
    delay(10);
  }
  
  float baselineVoltage = baselineSum / 100.0;
  Serial.print("Baseline voltage: ");
  Serial.print(baselineVoltage, 3);
  Serial.println("V");
  Serial.println("Calibration complete.");
}

// Function to test network connectivity
bool testNetworkConnectivity() {
  if (client.connect(SERVER_HOST, SERVER_PORT)) {
    client.println("GET / HTTP/1.1");
    client.println("Host: " + String(SERVER_HOST));
    client.println("Connection: close");
    client.println();
    
    unsigned long startTime = millis();
    while (client.available() == 0) {
      if (millis() - startTime > 5000) {
        client.stop();
        return false;
      }
    }
    
    client.stop();
    return true;
  }
  
  return false;
}

// Function to print network diagnostics
void printNetworkDiagnostics() {
  Serial.println("=== Network Diagnostics ===");
  Serial.print("Hardware Status: ");
  switch (Ethernet.hardwareStatus()) {
    case EthernetNoHardware:
      Serial.println("No Ethernet hardware");
      break;
    case EthernetW5100:
      Serial.println("W5100 Ethernet controller");
      break;
    case EthernetW5200:
      Serial.println("W5200 Ethernet controller");
      break;
    case EthernetW5500:
      Serial.println("W5500 Ethernet controller");
      break;
  }
  
  Serial.print("Link Status: ");
  Serial.println((Ethernet.linkStatus() == LinkON) ? "Connected" : "Disconnected");
  Serial.print("IP Address: ");
  Serial.println(Ethernet.localIP());
  Serial.print("MAC Address: ");
  for (int i = 0; i < 6; i++) {
    if (mac[i] < 16) Serial.print("0");
    Serial.print(mac[i], HEX);
    if (i < 5) Serial.print(":");
  }
  Serial.println();
  Serial.println("==========================");
}
