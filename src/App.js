import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./onlyFishLogoTransparent.png";
import * as dashjs from "dashjs";
import axios from "axios";

export default function VideoPlayer3() {
  class ResourceNotFoundException extends Error {
    constructor(message) {
      super(message);
      this.name = "ResourceNotFoundException";
    }
  }
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
      console.log("------");
      console.log(error);
      console.log("-------");
      //TODO: if ResourceNotFoundEception show {Livestream not online}
      if (error.name === ResourceNotFoundException) {
        console.log("ReferenceError detect");
      } else if (error instanceof TypeError) {
        console.log("typeerror");
      } else {
        console.log("help thats not it");
      }
    }
  }

  // Call async function to fetch DASH url
  // TODO?: Verschiebe diese Logik in eine useEffect-Hook, die nur einmal ausgeführt wird
  useEffect(() => {
    getDashUrl()
      .then((url) => {
        // Open dash url in a video player. We chose axios
        axios
          .get(url)
          .then((response) => {
            // Aktualisiere die Zusatndsvariable für die URL
            console.log("Axios GET response:");
            console.log(response);
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

  function checkFor403(url) {
    setInterval(function () {
      // Rufe die axios.get-Funktion auf, um eine HTTP-Anfrage an die URL zu senden
      axios
        .get(url)
        .then(function (response) {
          // Wenn die Anfrage erfolgreich ist, speichere den Statuscode in einer Variablen
          let statusCode = response.status;
          // Überprüfe, ob der Statuscode 403 ist
          if (statusCode == 403) {
            // Wenn ja, gib eine Nachricht aus, die den Fehler anzeigt
            console.log("403 Error: Zugriff verweigert :(");
          } else {
            // Wenn nicht, gib eine Nachricht aus, die den Statuscode anzeigt
            console.log("Statuscode: " + statusCode);
          }
        })
        .catch(function (error) {
          // Wenn die Anfrage fehlschlägt, gib eine Nachricht aus, die den Fehler anzeigt
          console.log("Anfrage fehlgeschlagen: " + error);
        });
    }, 5000); // 5000 Millisekunden entsprechen 5 Sekunden
  }

  const videoRef = useRef(null);
  const playerRef = useRef(null);

  // Füge die src-Variable als Abhängigkeit für diese useEffect-Hook hinzu
  useEffect(() => {
    if (src && videoRef.current) {
      const video = videoRef.current;

      playerRef.current = dashjs.MediaPlayer().create();

      /* restart playback in muted mode when auto playback was not allowed by the browser */
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
  }, [src]); // src bedeutet, dass diese Hook nur ausgeführt wird, wenn src sich ändert

  function reloadPage() {
    window.location.reload();
  }

  function detect() {
    //TODO: detect fishies
  }

  return (
    <div className="dash-video-player ">
      <div>
        <img src={logo} alt="Only Fish Logo" width="100" height="100"></img>
      </div>
      <div>
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
        <p class="infoText reloadText">
          Hey der Stream ist abgelaufen weil wir Daten und Geld sparen wollen{" "}
          <br />
          Bitte lade den Stream mit dem obigen Button neu
        </p>
      </div>
    </div>
  );
}
