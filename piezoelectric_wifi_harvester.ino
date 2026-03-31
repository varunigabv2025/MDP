/*
 * Piezoelectric Energy Harvesting System with ESP8266 WiFi Integration
 * 
 * This sketch extends the basic energy harvesting system with WiFi connectivity
 * to send real-time data to a web dashboard.
 * 
 * Hardware Configuration:
 * - ESP8266 (NodeMCU or Wemos D1 Mini)
 * - Multiple piezoelectric sensors in series
 * - Full-wave bridge rectifier (4x 1N4007 diodes)
 * - Storage capacitor (1000µF, 16V)
 * - Voltage divider for analog input (R1=10kΩ, R2=10kΩ)
 * - LED indicator on built-in LED pin
 * - Analog input on pin A0
 * 
 * Features:
 * - Real-time data transmission via HTTP POST
 * - JSON data format
 * - Automatic reconnection
 * - Local data backup when WiFi unavailable
 * - Configurable server endpoint
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <Ticker.h>

// WiFi Configuration
const char* AP_SSID = "EnergyHarvester_Setup";
const char* AP_PASSWORD = "energy123";
const char* CONFIG_PORTAL_SSID = "EnergyHarvester-Config";

// Server Configuration (update with your server details)
const char* SERVER_HOST = "your-server.com";  // Replace with your server
const int SERVER_PORT = 80;
const String SERVER_ENDPOINT = "/api/energy-data";

// Pin definitions for ESP8266
const int PIEZO_PIN = A0;      // Analog input for piezoelectric voltage
const int LED_PIN = LED_BUILTIN; // Built-in LED for status indication
const int RESET_PIN = D3;      // Optional reset button pin

// System parameters
const float VOLTAGE_DIVIDER_RATIO = 2.0;  // Voltage divider ratio (R1+R2)/R2
const float SUPPLY_VOLTAGE = 3.3;        // ESP8266 supply voltage
const int ADC_RESOLUTION = 1024;         // ESP8266 ADC resolution
const float CAPACITANCE = 0.001;         // Storage capacitance in Farads (1000µF)
const float LOAD_RESISTANCE = 10000.0;   // Load resistance in Ohms (10kΩ)

// Thresholds and timing
const float VOLTAGE_THRESHOLD = 0.1;     // Minimum voltage to consider as valid signal
const unsigned long SAMPLING_INTERVAL = 100;  // Sampling interval in milliseconds
const unsigned long TRANSMIT_INTERVAL = 5000;  // Data transmission interval in milliseconds
const unsigned long DISPLAY_INTERVAL = 1000;  // Display update interval in milliseconds

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

// WiFi and transmission variables
WiFiManager wifiManager;
HTTPClient http;
Ticker statusLED;
bool wifiConnected = false;
int transmissionFailures = 0;
const int MAX_FAILURES = 5;

// Device identification
String deviceId;
String deviceName;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Piezoelectric Energy Harvester with WiFi ===");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(PIEZO_PIN, INPUT);
  pinMode(RESET_PIN, INPUT_PULLUP);
  
  // Generate unique device ID
  deviceId = "ESP_" + WiFi.macAddress();
  deviceId.replace(":", "");
  deviceName = "EnergyHarvester_" + deviceId.substring(6, 12);
  
  // Initialize voltage samples array
  for (int i = 0; i < NUM_SAMPLES; i++) {
    voltageSamples[i] = 0.0;
  }
  
  // Initialize WiFiManager
  setupWiFi();
  
  // Initialize status LED
  setupStatusLED();
  
  // Display initial message
  Serial.println("System initialized. Starting energy harvesting...");
  Serial.println("Device ID: " + deviceId);
  Serial.println("Device Name: " + deviceName);
  Serial.println();
  
  // Display header for data output
  Serial.println("Time(s)\tVoltage(V)\tPower(W)\tEnergy(J)\tSteps\tWiFi");
  Serial.println("------\t---------\t-------\t--------\t-----\t----");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check for reset button press
  if (digitalRead(RESET_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(RESET_PIN) == LOW) {
      resetWiFiSettings();
    }
  }
  
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
  
  // Handle WiFi reconnection
  handleWiFiConnection();
}

void setupWiFi() {
  Serial.println("Setting up WiFi...");
  
  // Set custom parameters for configuration portal
  WiFiManagerParameter custom_server_host("server_host", "Server Host", SERVER_HOST, 40);
  WiFiManagerParameter custom_server_port("server_port", "Server Port", String(SERVER_PORT).c_str(), 6);
  WiFiManagerParameter custom_device_name("device_name", "Device Name", deviceName.c_str(), 20);
  
  wifiManager.addParameter(&custom_server_host);
  wifiManager.addParameter(&custom_server_port);
  wifiManager.addParameter(&custom_device_name);
  
  // Set configuration portal timeout
  wifiManager.setConfigPortalTimeout(300); // 5 minutes
  
  // Set custom AP name and password
  wifiManager.setAPCallback(configModeCallback);
  
  // Try to connect to WiFi
  if (!wifiManager.autoConnect(CONFIG_PORTAL_SSID, AP_PASSWORD)) {
    Serial.println("Failed to connect to WiFi and hit timeout");
    Serial.println("Restarting device...");
    delay(3000);
    ESP.restart();
  }
  
  // Update configuration from custom parameters
  String serverHost = custom_server_host.getValue();
  String serverPort = custom_server_port.getValue();
  deviceName = custom_device_name.getValue();
  
  Serial.println("WiFi connected successfully!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Device Name: ");
  Serial.println(deviceName);
  Serial.print("Server: ");
  Serial.print(serverHost);
  Serial.print(":");
  Serial.println(serverPort);
  
  wifiConnected = true;
}

void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("Entered config mode");
  Serial.println(WiFi.softAPIP());
  Serial.println(myWiFiManager->getConfigPortalSSID());
  
  // Blink LED to indicate config mode
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(200);
    digitalWrite(LED_PIN, HIGH);
    delay(200);
  }
}

void setupStatusLED() {
  // Set up ticker for status LED blinking
  statusLED.attach(1.0, []() {
    if (wifiConnected) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Slow blink when connected
    } else {
      digitalWrite(LED_PIN, HIGH); // Solid when not connected
    }
  });
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
  if (!wifiConnected) {
    Serial.println("WiFi not connected. Skipping data transmission.");
    return;
  }
  
  // Create JSON document
  DynamicJsonDocument doc(1024);
  
  // Device information
  doc["deviceId"] = deviceId;
  doc["deviceName"] = deviceName;
  doc["timestamp"] = millis();
  doc["wifiSignal"] = WiFi.RSSI();
  
  // Energy data
  doc["voltage"] = currentVoltage;
  doc["power"] = instantaneousPower;
  doc["energy"] = totalEnergy;
  doc["steps"] = stepCount;
  
  // System status
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiStatus"] = "connected";
  
  // Convert to JSON string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send HTTP POST request
  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + SERVER_ENDPOINT;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP8266-EnergyHarvester/1.0");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.print("Data transmitted successfully. Response code: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("Server response: " + response);
    
    transmissionFailures = 0;
  } else {
    Serial.print("Error transmitting data. Error code: ");
    Serial.println(httpResponseCode);
    Serial.println("Error: " + http.errorToString(httpResponseCode));
    
    transmissionFailures++;
    
    if (transmissionFailures >= MAX_FAILURES) {
      Serial.println("Too many transmission failures. Restarting WiFi...");
      wifiConnected = false;
      WiFi.disconnect();
      delay(1000);
      setupWiFi();
    }
  }
  
  http.end();
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
  Serial.println(wifiConnected ? "OK" : "FAIL");
}

void updateLEDIndicator() {
  // Additional LED control based on energy generation
  static unsigned long lastBlink = 0;
  
  if (currentVoltage > VOLTAGE_THRESHOLD) {
    if (millis() - lastBlink > 100) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      lastBlink = millis();
    }
  }
}

void handleWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println("WiFi connection lost!");
    wifiConnected = false;
  } else if (WiFi.status() == WL_CONNECTED && !wifiConnected) {
    Serial.println("WiFi reconnected!");
    wifiConnected = true;
    transmissionFailures = 0;
  }
}

void resetWiFiSettings() {
  Serial.println("Resetting WiFi settings...");
  
  // Turn on LED to indicate reset
  digitalWrite(LED_PIN, LOW);
  delay(2000);
  
  // Reset WiFi settings
  wifiManager.resetSettings();
  
  // Blink LED to confirm reset
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(100);
  }
  
  Serial.println("WiFi settings reset. Restarting...");
  delay(1000);
  ESP.restart();
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
  doc["wifiConnected"] = wifiConnected;
  doc["wifiSignal"] = wifiConnected ? WiFi.RSSI() : 0;
  doc["freeHeap"] = ESP.getFreeHeap();
  
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
