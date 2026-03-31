/*
 * Enhanced Piezoelectric Energy Harvesting System
 * Based on user's original code with advanced energy calculations
 * 
 * This sketch combines the user's piezoelectric sensor setup with:
 * - Enhanced energy calculations (Joules)
 * - Step detection and counting
 * - Data smoothing for accurate readings
 * - USB serial communication for web dashboard
 * - Professional data formatting
 */

// Pin definitions (keeping user's original pins)
int piezoPin = A0;   // Piezo sensor connected to analog pin A0
int ledPin = 13;     // LED pin

// Enhanced system parameters (building on user's code)
int threshold = 100;  // Sensitivity threshold (user's original value)
float voltage = 0;   // Voltage calculation (user's original variable)
float power = 0;     // Power calculation (user's original variable)
float R = 1000.0;    // Load resistor (user's original 1k ohm)

// Advanced energy harvesting parameters
const float SUPPLY_VOLTAGE = 5.0;        // Arduino supply voltage
const int ADC_RESOLUTION = 1023;         // Arduino ADC resolution (user's original)
const float CAPACITANCE = 0.001;         // Storage capacitance in Farads (1000µF)
const unsigned long SAMPLING_INTERVAL = 200;  // User's original delay time
const unsigned long DISPLAY_INTERVAL = 1000;  // Display update interval

// Enhanced variables for energy tracking
float totalEnergy = 0.0;           // Total energy harvested in Joules
float instantaneousPower = 0.0;    // Instantaneous power in Watts
float currentVoltage = 0.0;        // Current voltage reading in Volts
int stepCount = 0;                 // Number of steps detected
bool stepDetected = false;         // Flag for step detection

// Timing variables
unsigned long lastSampleTime = 0;
unsigned long lastDisplayTime = 0;
unsigned long lastStepTime = 0;
const unsigned long STEP_DEBOUNCE_TIME = 500;  // Debounce time for step detection

// Data smoothing for accurate measurements
const int NUM_SAMPLES = 5;
float voltageSamples[NUM_SAMPLES];
int sampleIndex = 0;

// Device identification
String deviceId = "PIEZO_" + String(analogRead(A1), HEX);
unsigned long startTime;

// Communication mode
bool usbMode = true;  // Set to true for USB communication

void setup() {
  // Initialize serial communication (user's original baud rate)
  Serial.begin(9600);
  Serial.println("Enhanced Piezoelectric Energy Harvesting System");
  Serial.println("Based on your original sensor code with advanced features");
  Serial.println("====================================================");
  
  // Initialize pins (user's original setup)
  pinMode(ledPin, OUTPUT);
  
  // Initialize device identification
  startTime = millis();
  
  // Initialize voltage samples array for smoothing
  for (int i = 0; i < NUM_SAMPLES; i++) {
    voltageSamples[i] = 0.0;
  }
  
  // Display system information
  Serial.println("System initialized successfully!");
  Serial.print("Device ID: ");
  Serial.println(deviceId);
  Serial.print("Threshold: ");
  Serial.println(threshold);
  Serial.print("Load Resistance: ");
  Serial.print(R);
  Serial.println(" ohms");
  Serial.println();
  
  // Display header for enhanced data output
  Serial.println("Time(s)\tSensor\tVoltage(V)\tPower(W)\tEnergy(J)\tSteps\tStatus");
  Serial.println("------\t------\t---------\t-------\t--------\t-----\t------");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Sample voltage at regular intervals (enhanced version of user's loop)
  if (currentTime - lastSampleTime >= SAMPLING_INTERVAL) {
    samplePiezoSensor();
    calculateEnhancedPower();
    detectStep();
    lastSampleTime = currentTime;
  }
  
  // Update display at regular intervals
  if (currentTime - lastDisplayTime >= DISPLAY_INTERVAL) {
    updateEnhancedDisplay();
    lastDisplayTime = currentTime;
  }
  
  // Update LED indicator (user's original vibration detection)
  updateLEDIndicator();
  
  // Handle USB communication if enabled
  if (usbMode) {
    handleUSBCommunication();
  }
}

// Enhanced version of user's sensor reading
void samplePiezoSensor() {
  // Read piezo value (user's original code)
  int sensorValue = analogRead(piezoPin);
  
  // Convert analog value to voltage (user's original calculation)
  voltage = sensorValue * (SUPPLY_VOLTAGE / ADC_RESOLUTION);
  
  // Apply moving average filter for smoother readings
  voltageSamples[sampleIndex] = voltage;
  sampleIndex = (sampleIndex + 1) % NUM_SAMPLES;
  
  // Calculate average voltage
  float sum = 0.0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sum += voltageSamples[i];
  }
  currentVoltage = sum / NUM_SAMPLES;
  
  // Store original sensor value for status display
  lastSensorValue = sensorValue;
}

// Enhanced power calculation based on user's formula
void calculateEnhancedPower() {
  // Calculate power using P = V^2 / R (user's original formula)
  instantaneousPower = (currentVoltage * currentVoltage) / R;
  
  // Calculate energy contribution for this time interval
  // E = P × t (where t is in seconds)
  float timeInterval = SAMPLING_INTERVAL / 1000.0;  // Convert ms to seconds
  float energyIncrement = instantaneousPower * timeInterval;
  
  // Only accumulate energy when voltage is significant
  if (currentVoltage > (threshold * SUPPLY_VOLTAGE / ADC_RESOLUTION)) {
    totalEnergy += energyIncrement;
  }
  
  // Update user's original variables for compatibility
  voltage = currentVoltage;
  power = instantaneousPower;
}

// Enhanced step detection based on user's threshold
void detectStep() {
  unsigned long currentTime = millis();
  
  // Detect step based on threshold and debouncing
  if (lastSensorValue > threshold && !stepDetected) {
    if (currentTime - lastStepTime >= STEP_DEBOUNCE_TIME) {
      stepCount++;
      stepDetected = true;
      lastStepTime = currentTime;
      
      Serial.print("Step detected! Total steps: ");
      Serial.println(stepCount);
    }
  } else if (lastSensorValue <= threshold) {
    stepDetected = false;
  }
}

// Enhanced display combining user's output with advanced metrics
void updateEnhancedDisplay() {
  // Calculate elapsed time
  unsigned long elapsedTime = (millis() - startTime) / 1000;
  
  // Display formatted data (enhanced version of user's original output)
  Serial.print(elapsedTime);
  Serial.print("\t");
  Serial.print(lastSensorValue);
  Serial.print("\t");
  Serial.print(currentVoltage, 3);
  Serial.print("\t");
  Serial.print(instantaneousPower, 6);
  Serial.print("\t");
  Serial.print(totalEnergy, 6);
  Serial.print("\t");
  Serial.print(stepCount);
  Serial.print("\t");
  Serial.println(stepDetected ? "ACTIVE" : "IDLE");
  
  // Also display user's original format for compatibility
  Serial.println("----------------------");
  Serial.print("Piezo Value: ");
  Serial.println(lastSensorValue);
  Serial.print("Voltage Generated: ");
  Serial.print(currentVoltage);
  Serial.println(" V");
  Serial.print("Power Generated: ");
  Serial.print(instantaneousPower);
  Serial.println(" W");
  Serial.print("Total Energy: ");
  Serial.print(totalEnergy * 1000, 3);
  Serial.println(" mJ");
  Serial.print("Steps Detected: ");
  Serial.println(stepCount);
  Serial.println("----------------------");
}

// Enhanced LED control based on user's vibration detection
void updateLEDIndicator() {
  // User's original vibration detection logic
  if (lastSensorValue > threshold) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }
}

// USB communication for web dashboard integration
void handleUSBCommunication() {
  // Send JSON data for web dashboard (if USB mode is enabled)
  static unsigned long lastTransmitTime = 0;
  if (millis() - lastTransmitTime > 1000) {  // Transmit every second
    sendJSONData();
    lastTransmitTime = millis();
  }
}

// Send data in JSON format for web dashboard
void sendJSONData() {
  String json = "{";
  json += "\"deviceId\":\"" + deviceId + "\",";
  json += "\"timestamp\":" + String(millis()) + ",";
  json += "\"sensorValue\":" + String(lastSensorValue) + ",";
  json += "\"voltage\":" + String(currentVoltage, 4) + ",";
  json += "\"power\":" + String(instantaneousPower, 6) + ",";
  json += "\"energy\":" + String(totalEnergy, 6) + ",";
  json += "\"steps\":" + String(stepCount) + ",";
  json += "\"threshold\":" + String(threshold) + ",";
  json += "\"connectionType\":\"USB\"";
  json += "}";
  
  Serial.println(json);
}

// Global variable to store last sensor value
int lastSensorValue = 0;
