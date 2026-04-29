HardwareSerial mySerial(2);

void setup() {
  Serial.begin(115200);
  mySerial.begin(9600, SERIAL_8N1, 16, 17);

  Serial.println("ESP32 Ready");
}

void loop() {

  if (mySerial.available()) {

    String data = mySerial.readStringUntil('\n');

    Serial.println("Raw: " + data);

    int rain, soil, ldr;
    float temp, hum;

    sscanf(data.c_str(),
           "R:%d,S:%d,L:%d,T:%f,H:%f",
           &rain, &soil, &ldr, &temp, &hum);

    Serial.println("------ Parsed ------");
    Serial.print("Rain: "); Serial.println(rain);
    Serial.print("Soil: "); Serial.println(soil);
    Serial.print("LDR: "); Serial.println(ldr);
    Serial.print("Temp: "); Serial.println(temp);
    Serial.print("Hum: "); Serial.println(hum);
  }
}