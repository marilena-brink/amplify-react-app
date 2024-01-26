import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./onlyFishLogo.jpg";
import * as dashjs from "dashjs";
import axios from "axios";

export default function VideoPlayer3() {
  var AWS = require("aws-sdk/dist/aws-sdk-react-native");

  // Erstelle einen Kinesis Video Client
  const kinesisVideo = new AWS.KinesisVideo({
    apiVersion: "latest",
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
    region: "eu-west-1",
  });

  // Erstelle einen Kinesis Video Archived Media Client
  let kinesisVideoArchivedMedia;

  // Definiere den Stream Namen
  const streamName = "OnlyFish"; // Ersetze mit deinem Stream Namen
  const [src, setSrc] = useState(null);

  // Definiere eine asynchrone Funktion, die das Endpoint und die URL holt
  async function getDashUrl() {
    try {
      // Hole das Endpoint mit GetDataEndpoint
      const dataEndpointResponse = await kinesisVideo
        .getDataEndpoint({
          APIName: "GET_DASH_STREAMING_SESSION_URL",
          StreamName: streamName,
        })
        .promise(); // Konvertiere die Callback-basierte Funktion in ein Promise
      const dataEndpoint = dataEndpointResponse.DataEndpoint;

      // Setze das Endpoint für den Kinesis Video Archived Media Client
      kinesisVideoArchivedMedia = new AWS.KinesisVideoArchivedMedia({
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
        region: "eu-west-1",
        endpoint: dataEndpoint,
      });

      // Hole die MPEG-DASH URL mit GetDASHStreamingSessionURL
      const dashUrlResponse = await kinesisVideoArchivedMedia
        .getDASHStreamingSessionURL({
          StreamName: streamName,
          DisplayFragmentTimestamp: "ALWAYS",
        })
        .promise(); // Konvertiere die Callback-basierte Funktion in ein Promise
      const dashUrl = dashUrlResponse.DASHStreamingSessionURL;

      // Gib die URL zurück
      return dashUrl;
    } catch (error) {
      // Fange Fehler ab und gib sie aus
      console.error(error);
    }
  }

  // Rufe die asynchrone Funktion auf und verwende die URL
  // Verschiebe diese Logik in eine useEffect-Hook, die nur einmal ausgeführt wird
  useEffect(() => {
    getDashUrl()
      .then((url) => {
        // Öffne die URL in einem Media Player deiner Wahl
        // Zum Beispiel kannst du die URL mit axios anfordern und die Antwort ausgeben
        axios
          .get(url)
          .then((response) => {
            // Aktualisiere die Zusatndsvariable für die URL
            setSrc(url);
          })
          .catch((error) => {
            console.error(error);
          });
      })
      .catch((error) => {
        console.error(error);
      });
  }, []); // Leeres Array bedeutet, dass diese Hook nur einmal ausgeführt wird

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

  return (
    <div className="dash-video-player ">
      <div>
        <img src={logo} alt="Only Fish Logo" width="100" height="100"></img>
      </div>
      <div>
        <h1>Fishies Live</h1>
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
        <button onClick={reloadPage}>Reload Stream</button>
      </div>
      <div className="errorDiv">
        <p>
          Hey der Stream ist abgelaufen weil wir Daten und Geld sparen wollen
        </p>
        <p>Bitte lade den Stream mit dem obigen Button neu</p>
      </div>
    </div>
  );
}
