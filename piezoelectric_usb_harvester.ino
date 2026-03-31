/*
 * Piezoelectric Energy Harvesting System with USB Serial Communication
 * 
 * This sketch uses the Arduino's USB connection to send real-time data
 * directly to the web dashboard running on the connected computer.
 * 
 * Hardware Configuration:
 * - Arduino Uno/Mega/Nano (any Arduino with USB)
 * - Multiple piezoelectric sensors in series
 * - Full-wave bridge rectifier (4x 1N4007 diodes)
 * - Storage capacitor (1000µF, 16V)
 * - Voltage divider for analog input (R1=10kΩ, R2=10kΩ)
 * - LED indicator on pin 13
 * - Analog input on pin A0
 * - USB cable connected to computer
 * 
 * Features:
 * - Direct USB communication (no network required)
 * - JSON data format over serial
 * - Real-time data transmission
 * - Compatible with web dashboard via serial port
 * - Low power consumption
 * - Simple setup and reliable connection
 */

// Pin definitions
const int PIEZO_PIN = A0;      // Analog input for piezoelectric voltage
const int LED_PIN = 13;        // LED indicator for vibration detection

// System parameters
const float VOLTAGE_DIVIDER_RATIO = 2.0;  // Voltage divider ratio (R1+R2)/R2
const float SUPPLY_VOLTAGE = 5.0;        // Arduino supply voltage
const int ADC_RESOLUTION = 1024;         // Arduino ADC resolution
const float CAPACITANCE = 0.001;         // Storage capacitance in Farads (1000µF)
const float LOAD_RESISTANCE = 10000.0;   // Load resistance in Ohms (10kΩ)

// Thresholds and timing
const float VOLTAGE_THRESHOLD = 0.1;     // Minimum voltage to consider as valid signal
const unsigned long SAMPLING_INTERVAL = 100;  // Sampling interval in milliseconds
const unsigned long TRANSMIT_INTERVAL = 1000;  // Data transmission interval in milliseconds
const unsigned long DISPLAY_INTERVAL = 2000;  // Display update interval in milliseconds

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

// Device identification
String deviceId;
String deviceName;
unsigned long startTime;

// Communication modes
enum CommMode {
  MODE_JSON,      // Send JSON data for web dashboard
  MODE_CSV,       // Send CSV data for logging
  MODE_HUMAN      // Human-readable format
};
CommMode currentMode = MODE_JSON;

void setup() {
  // Initialize serial communication at high baud rate for better performance
  Serial.begin(115200);
  while (!Serial) {
    ; // Wait for serial port to connect (needed for native USB)
  }
  
  delay(2000); // Allow time for serial connection to establish
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(PIEZO_PIN, INPUT);
  
  // Generate unique device ID
  deviceId = "USB_" + String(analogRead(A1), HEX) + String(analogRead(A2), HEX);
  deviceId.toUpperCase();
  deviceName = "EnergyHarvester_" + deviceId.substring(4, 10);
  startTime = millis();
  
  // Initialize voltage samples array
  for (int i = 0; i < NUM_SAMPLES; i++) {
    voltageSamples[i] = 0.0;
  }
  
  // Send initialization message
  sendSystemInfo();
  
  // Display initial message
  Serial.println("\n=== Piezoelectric Energy Harvester (USB) ===");
  Serial.println("Device ID: " + deviceId);
  Serial.println("Device Name: " + deviceName);
  Serial.println("Communication Mode: JSON");
  Serial.println("System initialized. Starting energy harvesting...");
  Serial.println();
  
  // Display header for serial monitor
  Serial.println("Time(s)\tVoltage(V)\tPower(W)\tEnergy(J)\tSteps");
  Serial.println("------\t---------\t-------\t--------\t-----");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check for serial commands
  handleSerialCommands();
  
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
      
      // Send immediate step notification
      sendStepNotification();
    }
  } else if (currentVoltage <= VOLTAGE_THRESHOLD) {
    stepDetected = false;
  }
}

void transmitData() {
  switch (currentMode) {
    case MODE_JSON:
      sendJSONData();
      break;
    case MODE_CSV:
      sendCSVData();
      break;
    case MODE_HUMAN:
      sendHumanReadableData();
      break;
  }
}

void sendJSONData() {
  // Create JSON string manually (to avoid library dependencies)
  String json = "{";
  json += "\"deviceId\":\"" + deviceId + "\",";
  json += "\"deviceName\":\"" + deviceName + "\",";
  json += "\"timestamp\":" + String(millis()) + ",";
  json += "\"uptime\":" + String((millis() - startTime) / 1000) + ",";
  json += "\"voltage\":" + String(currentVoltage, 4) + ",";
  json += "\"power\":" + String(instantaneousPower, 6) + ",";
  json += "\"energy\":" + String(totalEnergy, 4) + ",";
  json += "\"steps\":" + String(stepCount) + ",";
  json += "\"connectionType\":\"USB\",";
  json += "\"freeRAM\":" + String(getFreeRAM()) + "";
  json += "}";
  
  Serial.println(json);
}

void sendCSVData() {
  // CSV format for data logging
  String csv = String(millis()) + ",";
  csv += String(currentVoltage, 4) + ",";
  csv += String(instantaneousPower, 6) + ",";
  csv += String(totalEnergy, 4) + ",";
  csv += String(stepCount) + ",";
  csv += String(getFreeRAM());
  
  Serial.println(csv);
}

void sendHumanReadableData() {
  // Human-readable format
  Serial.println("=== Energy Harvesting Status ===");
  Serial.print("Time: ");
  Serial.println((millis() - startTime) / 1000);
  Serial.print("Voltage: ");
  Serial.print(currentVoltage, 3);
  Serial.println(" V");
  Serial.print("Power: ");
  Serial.print(instantaneousPower * 1000, 3);
  Serial.println(" mW");
  Serial.print("Total Energy: ");
  Serial.print(totalEnergy * 1000, 3);
  Serial.println(" mJ");
  Serial.print("Steps: ");
  Serial.println(stepCount);
  Serial.print("Free RAM: ");
  Serial.print(getFreeRAM());
  Serial.println(" bytes");
  Serial.println("===============================");
}

void sendSystemInfo() {
  String info = "{";
  info += "\"type\":\"systemInfo\",";
  info += "\"deviceId\":\"" + deviceId + "\",";
  info += "\"deviceName\":\"" + deviceName + "\",";
  info += "\"version\":\"1.0\",";
  info += "\"connectionType\":\"USB\",";
  info += "\"samplingRate\":" + String(1000 / SAMPLING_INTERVAL) + ",";
  info += "\"voltageDivider\":" + String(VOLTAGE_DIVIDER_RATIO) + ",";
  info += "\"loadResistance\":" + String(LOAD_RESISTANCE) + ",";
  info += "\"capacitance\":" + String(CAPACITANCE) + "";
  info += "}";
  
  Serial.println(info);
}

void sendStepNotification() {
  String notification = "{";
  notification += "\"type\":\"stepEvent\",";
  notification += "\"deviceId\":\"" + deviceId + "\",";
  notification += "\"timestamp\":" + String(millis()) + ",";
  notification += "\"totalSteps\":" + String(stepCount) + "";
  notification += "}";
  
  Serial.println(notification);
}

void updateDisplay() {
  // Calculate elapsed time
  unsigned long elapsedTime = (millis() - startTime) / 1000;
  
  // Display formatted data on serial monitor
  Serial.print(elapsedTime);
  Serial.print("\t");
  Serial.print(currentVoltage, 3);
  Serial.print("\t");
  Serial.print(instantaneousPower * 1000, 3);  // Convert to mW
  Serial.print("\t");
  Serial.print(totalEnergy * 1000, 3);         // Convert to mJ
  Serial.print("\t");
  Serial.println(stepCount);
}

void updateLEDIndicator() {
  // LED control based on energy generation
  if (currentVoltage > VOLTAGE_THRESHOLD) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
}

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "INFO") {
      sendSystemInfo();
    } else if (command == "RESET") {
      resetEnergyCounter();
    } else if (command == "CALIBRATE") {
      calibrateSystem();
    } else if (command == "MODE_JSON") {
      currentMode = MODE_JSON;
      Serial.println("Mode changed to JSON");
    } else if (command == "MODE_CSV") {
      currentMode = MODE_CSV;
      Serial.println("Mode changed to CSV");
    } else if (command == "MODE_HUMAN") {
      currentMode = MODE_HUMAN;
      Serial.println("Mode changed to Human Readable");
    } else if (command == "STATUS") {
      sendSystemStatus();
    } else if (command == "TEST") {
      runSystemTest();
    } else if (command == "HELP") {
      showHelp();
    } else {
      Serial.println("Unknown command: " + command);
      Serial.println("Type 'HELP' for available commands");
    }
  }
}

void sendSystemStatus() {
  String status = "{";
  status += "\"type\":\"status\",";
  status += "\"deviceId\":\"" + deviceId + "\",";
  status += "\"uptime\":" + String((millis() - startTime) / 1000) + ",";
  status += "\"voltage\":" + String(currentVoltage, 4) + ",";
  status += "\"power\":" + String(instantaneousPower, 6) + ",";
  status += "\"energy\":" + String(totalEnergy, 4) + ",";
  status += "\"steps\":" + String(stepCount) + ",";
  status += "\"freeRAM\":" + String(getFreeRAM()) + ",";
  status += "\"mode\":\"" + String(currentMode == MODE_JSON ? "JSON" : currentMode == MODE_CSV ? "CSV" : "HUMAN") + "\"";
  status += "}";
  
  Serial.println(status);
}

void runSystemTest() {
  Serial.println("=== System Test Started ===");
  
  // Test ADC
  int testValue = analogRead(PIEZO_PIN);
  Serial.print("ADC Test: Raw value = ");
  Serial.println(testValue);
  
  // Test LED
  Serial.println("LED Test: Blinking 3 times...");
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
  
  // Test voltage calculation
  float testVoltage = (testValue * SUPPLY_VOLTAGE) / ADC_RESOLUTION * VOLTAGE_DIVIDER_RATIO;
  Serial.print("Voltage Test: ");
  Serial.print(testVoltage, 3);
  Serial.println("V");
  
  // Test memory
  Serial.print("Memory Test: Free RAM = ");
  Serial.print(getFreeRAM());
  Serial.println(" bytes");
  
  Serial.println("=== System Test Complete ===");
}

void showHelp() {
  Serial.println("=== Available Commands ===");
  Serial.println("INFO     - Show system information");
  Serial.println("STATUS   - Show current status");
  Serial.println("RESET    - Reset energy counter");
  Serial.println("CALIBRATE- Calibrate system");
  Serial.println("TEST     - Run system test");
  Serial.println("MODE_JSON- Switch to JSON output mode");
  Serial.println("MODE_CSV - Switch to CSV output mode");
  Serial.println("MODE_HUMAN- Switch to human readable mode");
  Serial.println("HELP     - Show this help message");
  Serial.println("=========================");
}

// Utility function to get free RAM
int getFreeRAM() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

// Function to reset energy counter
void resetEnergyCounter() {
  totalEnergy = 0.0;
  stepCount = 0;
  Serial.println("Energy counter reset.");
  
  // Send reset notification
  String notification = "{";
  notification += "\"type\":\"resetEvent\",";
  notification += "\"deviceId\":\"" + deviceId + "\",";
  notification += "\"timestamp\":" + String(millis()) + "";
  notification += "}";
  
  Serial.println(notification);
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
  
  // Send calibration results
  String calibration = "{";
  calibration += "\"type\":\"calibration\",";
  calibration += "\"deviceId\":\"" + deviceId + "\",";
  calibration += "\"baselineVoltage\":" + String(baselineVoltage, 4) + ",";
  calibration += "\"timestamp\":" + String(millis()) + "";
  calibration += "}";
  
  Serial.println(calibration);
}
