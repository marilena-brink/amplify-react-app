import React, { useEffect, useRef } from "react";
import "./App.css";
import logo from "./onlyFishLogo.jpg";
import * as dashjs from "dashjs";

export default function VideoPlayer3() {
  var AWS = require("aws-sdk/dist/aws-sdk-react-native");

  const axios = require("axios");

  console.log(process.env.REACT_APP_AWS_ACCESS_KEY)

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

  // Hole das Endpoint mit GetDataEndpoint
  kinesisVideo.getDataEndpoint(
    {
      APIName: "GET_DASH_STREAMING_SESSION_URL",
      StreamName: streamName,
    },
    (err, response) => {
      if (err) {
        console.error(err);
        return;
      }
      // Setze das Endpoint für den Kinesis Video Archived Media Client
      kinesisVideoArchivedMedia = new AWS.KinesisVideoArchivedMedia({
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
        region: "eu-west-1",
        endpoint: response.DataEndpoint,
      });

      // Hole die MPEG-DASH URL mit GetDASHStreamingSessionURL
      kinesisVideoArchivedMedia.getDASHStreamingSessionURL(
        {
          StreamName: streamName,
          DisplayFragmentTimestamp: "ALWAYS",
        },
        (err, response) => {
          if (err) {
            console.error(err);
            return;
          }
          // Speichere die MPEG-DASH URL
          const dashUrl = response.DASHStreamingSessionURL;

          console.log("URL: " + dashUrl);

          // Öffne die URL in einem Media Player deiner Wahl
          // Zum Beispiel kannst du die URL mit axios anfordern und die Antwort ausgeben
          axios
            .get(dashUrl)
            .then((response) => {
              console.log(response.data);
            })
            .catch((error) => {
              console.error(error);
            });
        }
      );
    }
  );

  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const src = dashUrl;

  useEffect(() => {
    if (videoRef.current) {
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
  }, []);

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
    </div>
  );
}
