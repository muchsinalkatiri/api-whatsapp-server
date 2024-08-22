const axios = require("axios");

const send = function (message) {
  chat_id = "";
  bot_id = "";
  axios
    .post(`https://api.telegram.org/bot${bot_id}/sendmessage`, {
      chat_id: chat_id,
      text: message,
    })
    .then((res) => {
      console.log(`statusCode: ${res.status}`);
      // process.exit();
    })
    .catch((error) => {
      console.error(error);
    });
};

module.exports = {
  send,
};
