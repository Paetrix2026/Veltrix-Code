#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Pins
#define RAIN_PIN A0
#define SOIL_PIN A1
#define LDR_PIN  A2
#define BUZZER   5
#define VOICE_PIN 8   // NEW

bool voicePlayed = false;  // prevents repeat

void setup() {
  Serial.begin(9600);

  dht.begin();
  lcd.init();
  lcd.backlight();

  pinMode(BUZZER, OUTPUT);
  pinMode(VOICE_PIN, OUTPUT);

  digitalWrite(VOICE_PIN, LOW);

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

  Serial.print("Rain: "); Serial.print(rain);
  Serial.print(" Soil: "); Serial.print(soil);
  Serial.print(" LDR: "); Serial.print(ldr);
  Serial.print(" Temp: "); Serial.print(temp);
  Serial.print(" Hum: "); Serial.println(hum);

  // LCD Display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(temp);
  lcd.print(" H:");
  lcd.print(hum);

  lcd.setCursor(0, 1);
  lcd.print("R:");
  lcd.print(rain);
  lcd.print(" S:");
  lcd.print(soil);

  delay(1000);

  bool alert = false;

  // ⚠️ Adjust thresholds based on your testing
  if (rain < 700) {
    Serial.println("Rain Detected!");
    alert = true;
  }

  if (soil < 700) {
    Serial.println("Soil Wet!");
    alert = true;
  }

  if (ldr < 20) {
    Serial.println("Dark!");
    alert = true;
  }

  if (!isnan(temp) && temp > 40) {
    Serial.println("High Temp!");
    alert = true;
  }

  // 🔊 ALERT SYSTEM
  if (alert) {
    digitalWrite(BUZZER, HIGH);

    // Play voice only once
    if (!voicePlayed) {
      digitalWrite(VOICE_PIN, HIGH);
      delay(1500);   // trigger pulse
      digitalWrite(VOICE_PIN, LOW);

      voicePlayed = true;
    }

  } else {
    digitalWrite(BUZZER, LOW);
    voicePlayed = false;  // reset
  }

  delay(1000);
}