const { Client, LocalAuth } = require("whatsapp-web.js");
const express = require("express");
const { body, validationResult } = require("express-validator");
const socketIO = require("socket.io");
const http = require("http");
var qrcode = require("qrcode");
const fs = require("fs");
const { phoneNumberFormatter } = require("./helpers/formater");
const { send } = require("./helpers/telegram");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

//start whatsapp-web
const client = new Client({
  puppeteer: { headless: true },
  authStrategy: new LocalAuth(),
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-extensions",
    "--disable-gpu",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--no-zygote",
    "--disable-dev-shm-usage",
    "--single-process",
  ],
});

client.on("message", (msg) => {
  // console.log(msg); //untuk melihat id chat
  if (
    !msg._data.from ||
    !msg._data.author ||
    msg._data.from === msg._data.author
  ) {
    if (!msg.from.endsWith("@c.us") || msg.body !== "undefined") {
      send(
        `Whatsapp Message \n#${msg.from.replace("@c.us", "")} \nNama : ${
          msg._data.notifyName
        } \nPesan: ${msg.body} `
      );
    }
  }
  if (msg.body == "!ping") {
    msg.reply("pong");
  } else if (msg.body == "check id group") {
    send(msg.from);
  }
});
client.initialize();
//end whatsapp-web

//start socket IO
io.on("connection", function (socket) {
  socket.emit("message", "Connecting....");

  client.on("qr", (qr) => {
    console.log("QR Received: ", qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit("qr", url);
      socket.emit("message", "QR Code Received, scan Please");
    });
  });

  client.on("loading_screen", (percent, message) => {
    socket.emit("message", "Loading Screen " + percent + "% " + message);
    console.log("LOADING SCREEN", percent, message);
  });

  client.on("ready", () => {
    console.log("Client is ready!");
    socket.emit("message", "Whatsapp is ready!");
    socket.emit("ready", "Whatsapp is ready!");
  });

  client.on("authenticated", (session) => {
    console.log("AUTHENTICATED");
    socket.emit("message", "AUTHENTICATED");
    socket.emit("authenticated", "whatsapp is authenticated!");
  });

  client.on("auth_failure", (msg) => {
    socket.emit("message", "AUTHENTICATION FAILURE");
    console.error("AUTHENTICATION FAILURE", msg);
  });
});
//end socket IO

//send message
app.post(
  "/send-message",
  [body("number").notEmpty(), body("message").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
      return msg;
    });

    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped(),
      });
    }

    const checkRegisteredNumber = async function (number) {
      const isRegistered = await client.isRegisteredUser(number);
      return isRegistered;
    };

    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
      return res.status(422).json({
        status: false,
        message: "The number is not registered",
      });
    }

    client
      .sendMessage(number, message)
      .then((response) => {
        res.status(200).json({
          status: true,
          response: response,
        });
      })
      .catch((err) => {
        res.status(500).json({
          status: false,
          response: err,
        });
      });
  }
);

app.post(
  "/send-message-group",
  [body("id_group").notEmpty(), body("message").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
      return msg;
    });

    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped(),
      });
    }

    // 120363162144085489@g.us grup test
    // 120363028246385491@g.us  thursina family
    // 6285755768532-1500437564@g.us thursina female
    // 6281233898687-1520902143@g.us thursina male
    const id_group = req.body.id_group;
    const message = req.body.message;

    client
      .sendMessage(id_group, message)
      .then((response) => {
        res.status(200).json({
          status: true,
          response: response,
        });
      })
      .catch((err) => {
        res.status(500).json({
          status: false,
          response: err,
        });
      });
  }
);

port = 8000;
server.listen(port, function () {
  console.log("app running in port " + port);
});
