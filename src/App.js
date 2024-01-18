import React, { useEffect, useRef } from "react";
import "./App.css";
import logo from "./onlyFishLogo.jpg";
import * as dashjs from "dashjs";

export default function VideoPlayer3() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const src =
    "https://b-d00b5c86.kinesisvideo.eu-west-1.amazonaws.com/dash/v1/getDASHManifest.mpd?SessionToken=CiBa3Gw7w35UYsTxou1Dw321Zy_1UVUGUS7vHNxwZIPdsxIQXNXpcpMnob0Wgrghbp49CBoZ-eoXsd6TdAYsPFU09rmTnbaF80_ngkPg2yIgLuPVcjrsxC_BcibgfoyVo9Q75WhHnV426yuCQrKFIQE~";
  //"https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      playerRef.current = dashjs.MediaPlayer().create();

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
