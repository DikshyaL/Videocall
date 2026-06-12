import { useEffect } from "react";
import { initializeWebRTC } from "./webrtc";

function App() {
  useEffect(() => {
    initializeWebRTC();
  }, []);

  return (
    <>
      <video id="webcamVideo" autoPlay playsInline />
      <video id="remoteVideo" autoPlay playsInline />

      <input id="callInput" />

      <button id="webcamButton">Webcam</button>
      <button id="callButton">Call</button>
      <button id="answerButton">Answer</button>
      <button id="hangupButton">Hang Up</button>
    </>
  );
}

export default App;