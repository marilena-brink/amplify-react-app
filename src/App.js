import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./onlyFishLogoTransparent.png";
import * as dashjs from "dashjs";
import axios from "axios";
import { SlInfo } from "react-icons/sl";

export default function VideoPlayer3() {
  // Import AWS SDK
  var AWS = require("aws-sdk/dist/aws-sdk-react-native");

  // Create Kinesis Video Client instance with IAM user authentication
  const kinesisVideo = new AWS.KinesisVideo({
    apiVersion: "latest",
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY, // We used Amplify environment variables to store the IAM access credentials
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
    region: "eu-west-1",
  });

  // Define Kinesis Archived Media Client variable
  let kinesisVideoArchivedMedia;

  // Set stream name, set initial states of src url null
  const streamName = "OnlyFish";
  const [src, setSrc] = useState(null);

  // Async function to fetch the endpoint of the kinesis stream (Dash URL)
  async function getDashUrl() {
    try {
      const dataEndpointResponse = await kinesisVideo
        .getDataEndpoint({
          APIName: "GET_DASH_STREAMING_SESSION_URL",
          StreamName: streamName,
        })
        .promise(); // Convert Callback-based function to a promise
      const dataEndpoint = dataEndpointResponse.DataEndpoint;

      // Set endpoint for Kinesis Video Archived Media Client
      kinesisVideoArchivedMedia = new AWS.KinesisVideoArchivedMedia({
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
        region: "eu-west-1",
        endpoint: dataEndpoint,
      });

      // Get MPEG-DASH URL of the kinesis stream with GetDASHStreamingSessionURL
      const dashUrlResponse = await kinesisVideoArchivedMedia
        .getDASHStreamingSessionURL({
          StreamName: streamName,
          DisplayFragmentTimestamp: "ALWAYS",
        })
        .promise(); // Convert callback to promise
      const dashUrl = dashUrlResponse.DASHStreamingSessionURL;

      // Return the DASH URL (Valid for 5 minutes)
      return dashUrl;
    } catch (error) {
      // If errors occur, print them in the console
      console.log("An error occured when getting dash url", error);
      var div = document.getElementById("notRunning");
      div.style.display = "block";
    }
  }

  // Call async function to fetch DASH url
  useEffect(() => {
    getDashUrl()
      .then((url) => {
        // Open dash url in a video player. We chose axios
        axios
          .get(url)
          .then((response) => {
            // Update the src url variable and start the function to check for 403 errors.
            setSrc(url);
            checkFor403(url);
          })
          .catch((error) => {
            console.error(error);
          });
      })
      .catch((error) => {
        console.error(error);
      });
  }, []); // Leeres Array bedeutet, dass diese Hook nur einmal ausgeführt wird

  // This function checks every 5 seconds, if the dash url is still valid (Dash URL last 5 mins until the authentication is expired)
  function checkFor403(url) {
    setInterval(function () {
      axios
        .get(url)
        .then(function (response) {
          // Dont do anything if request returns response
        })
        .catch(function (error) {
          // If the request fails, show info banner informing user that the stream was stopped
          console.log("Anfrage fehlgeschlagen: " + error);
          console.log("Error status: ", error.response.status);
          if (error.response.status == 403) {
            var div = document.getElementById("reload");
            div.style.display = "block";
          }
        });
    }, 5000); // 5 Seconds interval
  }

  const videoRef = useRef(null);
  const playerRef = useRef(null);

  // Add the src-Variable as a dependency for the useEffect-Hook to start the video player
  useEffect(() => {
    if (src && videoRef.current) {
      const video = videoRef.current;

      playerRef.current = dashjs.MediaPlayer().create();

      // Restart playback in muted mode when auto playback was not allowed by the browser
      playerRef.current.on(
        dashjs.MediaPlayer.events.PLAYBACK_NOT_ALLOWED,
        function (data) {
          console.log(
            "Playback did not start due to auto play restrictions. Muting audio and reloading"
          );
          video.muted = true;
          playerRef.current.initialize(video, src, true);
        }
      );

      playerRef.current.initialize(video, src, true);
      playerRef.current.attachView(video);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [src]); // Defining src here tells the hook to only run if the src variable changes (Only reload player if url changes)

  //Function to reload the page if necessary
  function reloadPage() {
    window.location.reload();
  }

  //TODO: Trying to setup confirmation
  /*
  // Definiere die ARN der Subscription
  const subscriptionArn =
    "arn:aws:sns:eu-west-1:559768431112:OnlyFishNotification:444bbf2b-5820-44f7-a712-f81db14cade5";

  // Erstelle eine Funktion, um die SubscribeURL abzurufen
  async function getSubscribeURL(subscriptionArn) {
    // Rufe die SNS-ListSubscriptionsByTopic-API auf, um die Details der Subscription zu erhalten
    const response = await axios.get(
      `https://sns.eu-west-1.amazonaws.com/?Action=ListSubscriptionsByTopic&TopicArn=${subscriptionArn}&Version=2010-03-31`
    );
    // Extrahiere die SubscribeURL aus der XML-Antwort
    const subscribeURL = response.data.match(
      /<SubscribeURL>(.+?)<\/SubscribeURL>/
    )[1];
    // Gib die SubscribeURL zurück
    console.log("Hier hat er glaub ich das confirmed:");
    console.log(response);
    console.log("----");
    console.log("SubscribeURL");
    console.log(subscribeURL);
    return subscribeURL;
  }

  // Erstelle eine Funktion, um die Subscription zu bestätigen
  async function confirmSubscription(subscriptionArn) {
    console.log("confirming subscription...");
    // Rufe die getSubscribeURL-Funktion auf, um die SubscribeURL zu erhalten
    const subscribeURL = await getSubscribeURL(subscriptionArn);
    // Besuche die SubscribeURL mit einem HTTP-GET-Request
    await axios.get(subscribeURL);
    // Gib eine Erfolgsmeldung aus
    console.log("Subscription confirmed");
  }

  // Rufe die confirmSubscription-Funktion auf, um die Subscription zu bestätigen
  confirmSubscription(subscriptionArn);
  */
  AWS.config.update({
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY, // We used Amplify environment variables to store the IAM access credentials
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
    region: "eu-west-1",
  });
  var sns = new AWS.SNS();

  // subscribe
  sns.subscribe(
    {
      Protocol: "https",
      TopicArn: "arn:aws:sns:eu-west-1:559768431112:OnlyFishNotification",
    },
    function (err, data) {
      if (err) {
        console.log(err); // an error occurred
      } else {
        console.log(data); // successful response - the body should be in the data
      }
    }
  );

  //Function to manage fish detection by buttonClick
  function detect() {
    //TODO: detect fishies
    const { execSync } = require("child_process");

    const output = execSync(
      'python -c "from aws_session import run_rekognition; print(run_rekognition())"'
    ).toString();
    console.log(output);
  }

  return (
    <div className="dash-video-player ">
      <div>
        <img src={logo} alt="Only Fish Logo" width="100" height="100"></img>
      </div>

      <div hidden>
        <h1 id="header_title">Fishies Live</h1>
      </div>

      <div className="videoContainer" id="videoContainer">
        <video
          slot="media"
          controls={false}
          ref={videoRef}
          style={{ width: "100%" }}
          preload="auto"
          autoPlay={true}
        />
      </div>

      <div>
        <button className="button detect" onClick={detect}>
          Detect fishies
        </button>
        <button className="button reload" onClick={reloadPage}>
          Reload Stream
        </button>
      </div>

      <div className="textDiv">
        <p id="reload" class="infoText reloadText">
          <SlInfo className="infoLogo" />
          Hey, the stream was stopped to conserve data &#128531;. <br />
          Please click the reload button above to continue watching fishies
          live.
        </p>
        <p id="notRunning" class="infoText notRunningText">
          <SlInfo className="infoLogo" />
          Hey, the stream is currently offline, the fishies are probably
          sleeping &#128564;.
        </p>
      </div>
    </div>
  );
}
