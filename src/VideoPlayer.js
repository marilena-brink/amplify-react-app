import React from "react";
import * as dashjs from 'dashjs';
export default class VideoPlayer extends React.Component {
  state = {};
  componentDidUpdate() {
      const url = "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";
      const video = this.player;
      const dashjs = dashjs.MediaPlayer().create();
      dashjs.initialize(video, url, true);
  }
  render() {
    return (
          <video 
            ref={player => (this.player = player)}
            autoPlay={true} 
          />
    );
  }
}