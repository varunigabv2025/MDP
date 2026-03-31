const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const axios = require("axios");

// 🔴 CHANGE COM PORT
const serial = new SerialPort({
  path: "COM9",
  baudRate: 9600
});

const parser = serial.pipe(new ReadlineParser({ delimiter: "\r\n" }));

let dataStore = {
  P1: 0,
  P2: 0,
  P3: 0,
  voltage: 0,
  power: 0
};

let currentPerson = 1;

parser.on("data", async (data) => {

  console.log(data);

  if (data.startsWith("DATA:")) {

    let values = data.replace("DATA:", "").split(",");

    let voltage = parseFloat(values[0]);
    let power = parseFloat(values[1]);
    let energy = parseFloat(values[2]);

    let personKey = "P" + currentPerson;

    dataStore[personKey] += energy;
    dataStore.voltage = voltage;
    dataStore.power = power;

    // rotate person
    currentPerson++;
    if (currentPerson > 3) currentPerson = 1;

    try {
      await axios.post(
        "https://mdpfinal.onrender.com/update",
        dataStore
      );
    } catch (err) {
      console.log("Error sending data");
    }
  }
});
