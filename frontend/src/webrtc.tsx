import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBK_OuhFj2oKr9WiCs74moGaMfUMkMcPUA",
  authDomain: "videocall-6c3ff.firebaseapp.com",
  projectId: "videocall-6c3ff",
  storageBucket: "videocall-6c3ff.firebasestorage.app",
  messagingSenderId: "646898608432",
  appId: "1:646898608432:web:acced31be92f7e40dfc0f5",
  measurementId: "G-YRN7ZCKH66"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function initializeWebRTC() {
  const pc = new RTCPeerConnection(servers);

  let localStream: MediaStream | null = null;
  let remoteStream: MediaStream | null = null;

  const webcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
  const callButton = document.getElementById('callButton') as HTMLButtonElement;
  const answerButton = document.getElementById('answerButton') as HTMLButtonElement;
  const hangupButton = document.getElementById('hangupButton') as HTMLButtonElement;

  const webcamVideo = document.getElementById('webcamVideo') as HTMLVideoElement;
  const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;

  const callInput = document.getElementById('callInput') as HTMLInputElement;

  webcamButton.onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    remoteStream = new MediaStream();

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream!);
    });

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream!.addTrack(track);
      });
    };

    webcamVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
  };

  callButton.onclick = async () => {
    const callDoc = firestore.collection('calls').doc(); // Generate a new document
    callInput.value = callDoc.id; // Show the generated ID in the input
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        offerCandidates.add(event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    await callDoc.set({
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      },
    });

    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();

      if (!pc.currentRemoteDescription && data?.answer) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    });
  };

  answerButton.onclick = async () => {
    const callId = callInput.value;
    const callDoc = firestore.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        answerCandidates.add(event.candidate.toJSON());
      }
    };

    const callData = (await callDoc.get()).data();

    if (!callData?.offer) return;

    await pc.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    await callDoc.update({
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      },
    });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    });
  };

  hangupButton.onclick = () => {
    pc.close();

    localStream?.getTracks().forEach((track) => track.stop());
    remoteStream?.getTracks().forEach((track) => track.stop());

    webcamVideo.srcObject = null;
    remoteVideo.srcObject = null;
  };
}