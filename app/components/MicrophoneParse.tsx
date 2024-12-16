import React, { useState, useRef, useEffect } from 'react';
import * as WavEncoder from 'wav-encoder'; // Import WavEncoder
import './mic.css';

interface MicrophoneParseProps {
  handleAudioUpload: (file: Blob) => Promise<void>;
}

const MicrophoneParse: React.FC<MicrophoneParseProps> = ({ handleAudioUpload }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isDisabled, setIsDisabled] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mengakses mikrofon dan setup media recorder
  useEffect(() => {
    if (!mediaRecorderRef.current) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event: BlobEvent) => {
            console.log("Data tersedia:", event.data);
            audioChunksRef.current.push(event.data);
          };

          mediaRecorder.onstop = async () => {
            // Membuat Blob audio
            console.log("onstop in");
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            // Decode audio menggunakan AudioContext
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioContext = new (window.AudioContext)();

            const audioBuffer = await audioContext.decodeAudioData(await fetch(audioUrl).then(res => res.arrayBuffer()));
            
            // Pastikan tipe audioBuffer sesuai dengan WavEncoder
            const audioData: WavEncoder.AudioData = {
              sampleRate: audioBuffer.sampleRate,
              channelData: Array.from({ length: audioBuffer.numberOfChannels }, (_, i) => audioBuffer.getChannelData(i)),
            };
            
            // Encode menjadi WAV
            const wavData = await WavEncoder.encode(audioData);
            const wavBlob = new Blob([wavData], { type: 'audio/wav' });

            console.log("masuk");
            // Kirim file WAV ke backend menggunakan POST request
            await handleAudioUpload(wavBlob);

            audioChunksRef.current = [];
            setIsRecording(false);
          };

          setIsDisabled(false);
        })
        .catch((error) => {
          console.error('Tidak bisa mengakses mikrofon: ', error);
        });
    }
  }, [handleAudioUpload]);

  // Fungsi untuk mulai atau berhenti merekam
  const toggleRecording = () => {
    console.log("mana", isDisabled);
    console.log("disini", isRecording);

    if (isRecording) {
      console.log("stop");
      if (mediaRecorderRef.current) {
        console.log("State sebelum stop:", mediaRecorderRef.current.state); 
        mediaRecorderRef.current.stop();
        console.log("State setelah stop:", mediaRecorderRef.current.state);
        if (timeoutRef.current) {
          console.log("stop woilah");
          clearTimeout(timeoutRef.current);
        }
      }
    } else {
      if (mediaRecorderRef.current && streamRef.current) {
        mediaRecorderRef.current.start(1000);
        console.log("State start:", mediaRecorderRef.current.state);
        setIsRecording(true);

        timeoutRef.current = setTimeout(() => {
          if (mediaRecorderRef.current) {
            console.log("hehe");
            mediaRecorderRef.current.stop();
          }
        }, 20000);
      }
    }
  };

  return (
    <div className='mic-container'>
      <button
        className={`mic-button ${isRecording ? 'recording' : ''}`}
        onClick={toggleRecording}
        disabled={isDisabled}
      >
        <img
          src="/mic.png"
          alt="Microphone Icon"
          className="mic-image"
        />
      </button>
      {isRecording && <p>Recording in progress...</p>}
    </div>
  );
};

export default MicrophoneParse;
