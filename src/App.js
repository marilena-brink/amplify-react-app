// Imports
import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./onlyFishLogoTransparent.png";
import * as dashjs from "dashjs";
import axios from "axios";
import { SlInfo } from "react-icons/sl";

export default function VideoPlayer3() {
  // Import AWS SDK
  var AWS = require("aws-sdk/dist/aws-sdk-react-native");

  // Create AWS instance
  // We used React environment variables to store the IAM access credentials
  // The actual credentials are deposited in AWS Amplify environment variables
  AWS.config.update({
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
    region: "eu-west-1",
  });

  // Create Kinesis Video Client instance with IAM user authentication
  const kinesisVideo = new AWS.KinesisVideo({
    apiVersion: "latest",
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
    region: "eu-west-1",
  });

  // Define Kinesis Archived Media Client variable
  let kinesisVideoArchivedMedia;

  // Set stream name
  const streamName = "OnlyFish";
  // Set initial states of src url null
  const [src, setSrc] = useState(null);

  // Async function to fetch the endpoint of the kinesis stream (Dash URL)
  async function getDashUrl() {
    try {
      const dataEndpointResponse = await kinesisVideo
        .getDataEndpoint({
          APIName: "GET_DASH_STREAMING_SESSION_URL",
          StreamName: streamName,
        })
        .promise(); // Convert Callback-based function to a promise, so that it has to wait for the url
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
  }, []);

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
            var fishiDiv = document.getElementById("fishDetected");
            var nofishiDiv = document.getElementById("noFishDetected");
            fishiDiv.style.display = "none";
            nofishiDiv.style.display = "none";
            var reloadDiv = document.getElementById("reload");
            reloadDiv.style.display = "block";
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

  //Function to reload the page by button click
  function reloadPage() {
    window.location.reload();
  }

  //Function to toggle lights with IoT components
  function toggleLights() {
    const password = document.getElementById("passcode").value;
    const body = JSON.stringify({ passcode: password });

    fetch(
      "https://evkvgfgk6nqwoyqwfrbg6q77du0dglhv.lambda-url.eu-central-1.on.aws",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: body,
      }
    )
      .then((response) => response.json())
      .then(() => console.log("Toggle lights finished"));
  }

  // Set a s3 bucket variable to connect to S3 Bucket
  const s3 = new AWS.S3();

  // Set params for connecting to s3 bucket and getting all current directories
  var params_old_folders = {
    Bucket: "rekognitionoutputbucket2",
    Prefix: "data/RekognitionStreamProcessor/",
  };
  var currentBucketContent = [];
  async function loadCurrentFolders() {
    try {
      //Hide unnecessary stuff on the website
      var div_nofish = document.getElementById("noFishDetected");
      div_nofish.style.display = "none";
      var div_fish = document.getElementById("fishDetected");
      div_fish.style.display = "none";
      let images = document.getElementsByClassName("detectedImage");
      let length = images.length;
      if (length != 0) {
        for (let i = length - 1; i >= 0; i--) {
          let image = images[i];
          image.parentNode.removeChild(image);
        }
      }

      // Send list request to s3 bucket
      const directories = await s3.listObjectsV2(params_old_folders).promise();
      var contents = directories.Contents; // results are all current images stored in the bucket

      // Look at response of s3 bucket and make the elements available with url-prefix
      for (var i in contents) {
        var element = contents[i]["Key"];
        element =
          "https://rekognitionoutputbucket2.s3.amazonaws.com/" + element;
        currentBucketContent.push(element);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Ordner:", error);
    }
  }

  // Function to set timeout, because of fish detection with duration of 30 seconds
  async function timeout() {
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }

  // Calling lambda function to detect
  async function lamdaDetectFunction() {
    try {
      // Change button appearance to prevent user of pressing it multiple times
      let button = document.getElementById("detectBtn");
      button.innerHTML = "Detecting ...";
      button.style.pointerEvents = "none";
      button.style.backgroundColor = "gray";

      // Calling the lambda function and activating Rekognition
      const response = await fetch(
        "https://l3kgveuvnod5v6yxtf7ztn3rca0wfvhi.lambda-url.eu-central-1.on.aws"
      );
      // Save response from lambda function
      const data = await response.json();
      await timeout();
    } catch (error) {
      console.log(
        "Error occured while loading the lamdaDetectFunction: ",
        error
      );
    }
  }

  // AWS is making a new directory if it detected a fish/pet
  // Get all current directorys from S3 bucket and compare with previous list
  var params_folders = {
    Bucket: "rekognitionoutputbucket2", // Ersetze dies mit dem Namen deines Buckets
    Prefix: "data/RekognitionStreamProcessor/",
  };
  var newBucketContent = [];
  async function loadNewFolders() {
    try {
      const directories = await s3.listObjectsV2(params_folders).promise();
      var contents = directories.Contents;

      for (var i in contents) {
        var element = contents[i]["Key"];
        element =
          "https://rekognitionoutputbucket2.s3.amazonaws.com/" + element;
        newBucketContent.push(element);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Ordner:", error);
    }
  }

  //compare currentBucketContent and newBucketContent
  //if new directories -> show images as "Fish detected"
  //else -> show that there were no fishies detected
  async function compareFolders() {
    try {
      var difference = newBucketContent.filter(
        (x) => !currentBucketContent.includes(x)
      );
      if (difference.length == 0) {
        // if there were no fishes detected
        var div = document.getElementById("noFishDetected");
        div.style.display = "block"; // display the user an info message
      } else {
        // if there were fishes detected
        var div = document.getElementById("fishDetected");
        div.style.display = "block"; // display the user an info message

        // Extract the image and show as image tag
        for (var elem in difference) {
          var imgSrc = difference[elem];
          var image = new Image();
          image.src = imgSrc;
          image.className = "detectedImage";
          var div = document.getElementById("imagesDetected");
          div.appendChild(image);
        }
      }
      // activate detect button again
      let button = document.getElementById("detectBtn");
      button.innerHTML = "Detect fishies";
      button.style.pointerEvents = "auto"; //normally "auto"
      button.style.backgroundColor = "#8e1b38"; //normally "#8e1b38"
    } catch (error) {
      console.log("There was an error with compareFolders: ", error);
    }
  }

  //Function to manage fish detection by buttonClick
  function detect() {
    console.log("detect button pushed...");
    loadCurrentFolders()
      .then(lamdaDetectFunction)
      .then(loadNewFolders)
      .then(compareFolders)
      .catch(console.error);
  }

  return (
    <div className="dash-video-player ">
      <div>
        <img
          id="title_img"
          src={logo}
          alt="Only Fish Logo"
          width="100"
          height="100"
        ></img>
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

      <div id="buttons_div">
        <button id="detectBtn" className="button detect" onClick={detect}>
          Detect fishies
        </button>
        <button id="reloadBtn" className="button reload" onClick={reloadPage}>
          Reload Stream
        </button>

        <div id="lights_div">
          <button className="button light" onClick={toggleLights}>
            Toggle Lights
          </button>
          <br />
          <input
            className="passcode"
            id="passcode"
            placeholder="Enter passcode"
            type="password"
          />
        </div>
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
        <p id="noFishDetected" class="infoText notDetected">
          <SlInfo className="infoLogo" />
          There was no fish detected, maybe next time &#128031;
        </p>
        <p id="fishDetected" class="infoText detected">
          <SlInfo className="infoLogo" />
          Nice we detected some fishies! &#128031;
        </p>
      </div>

      <div id="imagesDetected" className="imagesDetected"></div>
    </div>
  );
}
