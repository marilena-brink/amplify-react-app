// listener.js
const AWS = require("aws-sdk");
const express = require("express");
const bodyParser = require("body-parser");

const sns = new AWS.SNS();
const app = express();

app.use(bodyParser.json());

app.post("/sns", (req, res) => {
  const type = req.get("x-amz-sns-message-type");
  if (type === "SubscriptionConfirmation") {
    sns
      .confirmSubscription({
        TopicArn: req.body.TopicArn,
        Token: req.body.Token,
      })
      .promise()
      .then((data) => {
        console.log("Subscription confirmed");
        res.end("ok");
      })
      .catch((err) => {
        console.error(err);
        res.status(500).end("error");
      });
  } else if (type === "Notification") {
    sns
      .verifyMessageSignature(req.body)
      .then((valid) => {
        if (valid) {
          console.log("Message verified");
          // Hier können Sie die Nachricht verarbeiten, z.B. mit axios
          res.end("ok");
        } else {
          console.error("Invalid message");
          res.status(403).end("error");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).end("error");
      });
  } else {
    res.status(400).end("invalid type");
  }
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
