#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Serial to ESP32
SoftwareSerial espSerial(10, 11); // RX, TX

// Pins
#define RAIN_PIN A0
#define SOIL_PIN A1
#define LDR_PIN  A2
#define BUZZER   5

void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);

  dht.begin();
  lcd.init();
  lcd.backlight();

  pinMode(BUZZER, OUTPUT);

  lcd.print("System Starting");
  delay(2000);
  lcd.clear();
}

void loop() {

  int rain = analogRead(RAIN_PIN);
  int soil = analogRead(SOIL_PIN);
  int ldr  = analogRead(LDR_PIN);

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  // Send to ESP32 (IMPORTANT)
  espSerial.print("R:"); espSerial.print(rain);
  espSerial.print(",S:"); espSerial.print(soil);
  espSerial.print(",L:"); espSerial.print(ldr);
  espSerial.print(",T:"); espSerial.print(temp);
  espSerial.print(",H:"); espSerial.println(hum);

  // LCD
  lcd.setCursor(0, 0);
  lcd.print("T:"); lcd.print(temp);
  lcd.print(" H:"); lcd.print(hum);

  lcd.setCursor(0, 1);
  lcd.print("R:"); lcd.print(rain);
  lcd.print(" S:"); lcd.print(soil);

  delay(2000);
}