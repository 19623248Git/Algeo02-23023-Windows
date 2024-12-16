'use client';
import Image from 'next/image';
import React, { useRef, useState, useEffect} from 'react';
import PaginationControls from './PaginationControls';
import { FC } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import Microphone from './MicrophoneParse';

interface DatasetItem {
  song: string;
  cover: string;
}

interface HomepageProps {
  data: DatasetItem[];  
  searchParams: { [key: string]: string | string[] | undefined };
  searchTerm: string;
}

const Homepage: FC<HomepageProps> = ({ data, searchParams, searchTerm }) => {

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [queried, setQueried] = useState(false);

  const fetchSessionId = async () => {
    const response = await fetch("/api/generate-session");
    const data = await response.json();
    setSessionId(data.sessionId);
    console.log('Session ID:', sessionId); 
  }

  useEffect(() => {
    if (sessionId == null){
      fetchSessionId();
    }
  }, []);

  const page = searchParams["page"] ?? "1";
  const per_page = searchParams["per_page"] ?? "10";

  const start = (Number(page) - 1) * Number(per_page);
  const end = start + Number(per_page);

  useEffect(() => {
    const filtered = searchTerm
      ? data.filter(entry =>
          entry.song.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : data;
    setFilteredData(filtered);
  }, [data, searchTerm]);

  const entries = filteredData.slice(start, end);


  const [playingTracks, setPlayingTracks] = useState<{ [key: string]: boolean }>({});
  const parts = useRef<{ [key: string]: Tone.Part | null }>({}); 

  // Function to play MIDI audio
  const playMidi = async (midiFile: string) => {
    try {
      if (playingTracks[midiFile]) {
        parts.current[midiFile]?.stop(); // Hentikan part spesifik
        parts.current[midiFile]?.dispose(); // Hapus part
        parts.current[midiFile] = null; // Reset Part
  
        Tone.Transport.stop(); // Pastikan Transport dihentikan
        setPlayingTracks((prev) => ({ ...prev, [midiFile]: false }));
        return;
      }
  
      // Hentikan semua pemutaran lain
      Object.keys(parts.current).forEach((key) => {
        if (parts.current[key]) {
          parts.current[key]?.stop();
          parts.current[key]?.dispose();
          parts.current[key] = null;
        }
      });
      Tone.Transport.stop(); 
      setPlayingTracks({}); // Reset status semua track
  
      // Mulai pemutaran baru
      const response = await fetch(`/temp_uploads/${sessionId}/audio/${midiFile}`);
      const arrayBuffer = await response.arrayBuffer();
      const midi = new Midi(arrayBuffer);
  
      const synth = new Tone.Synth().toDestination();
  
      // Buat part baru untuk memainkan MIDI
      const timeBuffer = 0.001; 
      let lastStartTime = -timeBuffer; 

      const part = new Tone.Part((time, note) => {
        const startTime = Math.max(time, lastStartTime + timeBuffer);
        lastStartTime = startTime; // 
        synth.triggerAttackRelease(note.name, note.duration, startTime);
      }, midi.tracks.flatMap((track) =>
        track.notes.map((note) => ({
          time: note.time,
          name: note.name,
          duration: note.duration,
        }))
      ));

      part.start(0);
      Tone.Transport.start();

      parts.current[midiFile] = part;
  
      setPlayingTracks((prev) => ({ ...prev, [midiFile]: true }));
    } catch (error) {
      console.error("Error loading MIDI file:", error);
    }
  };

  const [activeTab, setActiveTab] = useState<'album' | 'music'>('album')
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadFailMessage, setUploadFailMessage] = useState<string | null>(null);

  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [coverDatasetFile, setCoverDatasetFile] = useState<File | null>(null);
  const [musicDatasetFile, setMusicDatasetFile] = useState<File | null>(null);
  const [mapperFile, setMapperFile] = useState<File | null>(null);

  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const coverDatasetInputRef = React.useRef<HTMLInputElement | null>(null);
  const musicDatasetInputRef = React.useRef<HTMLInputElement | null>(null);
  const mapperInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };
  const handleAudioClick = () => {
    audioInputRef.current?.click();
  };
  const handleCoverDatasetClick = () => {
    coverDatasetInputRef.current?.click();
  };
  
  const handleMusicDatasetClick = () => {
    musicDatasetInputRef.current?.click();
  };
  const handleMapperClick = () => {
    mapperInputRef.current?.click();
  };

  const handleTabChange = (tab: 'album' | 'music') => {
    setActiveTab(tab);
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
  
    if (!file) {
      console.log("No file selected for image upload");
      return;
    }

    setAudioFile(null);
    setImageFile(file);
    console.log("Image file selected:", file);
  
    // If backend is not ready, skip the fetch request
    if (!file) return;
  
    const formData = new FormData();
    formData.append("image", file);
  
    try {
      const response = await fetch("/api/upload-image", {  
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        console.error("Error uploading imagetes1:", errorMessage);
        return;
      }
  
      const data = await response.json();
      if (data.success) {
        console.log("Image uploaded successfully");
      } else {
        console.error("Error uploading imagetes2", data.message);
      }
    } catch (error) {
      console.error("Error uploading imagetolol", error);
    }  
      
  };
  
  useEffect(() => {
    // Revoke the previous audio URL if it exists
    if (audioUrl) {
      return () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [audioUrl]);

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement> | Blob) => {
    let file: File | null = null;

  if (event instanceof Blob) {
    // Jika input adalah Blob
    file = new File([event], "audiomic.wav", { type: "audio/wav" });
  } else if (event.target.files) {
    // Jika input adalah event dari file input
    file = event.target.files[0];
  }
  
    if (!file) {
      console.error("No file selected for audio upload");
      return;
    }

    // Set file to state to show it in the UI
    setImageFile(null);
    setAudioFile(file);

    const newAudioUrl = URL.createObjectURL(file);
    setAudioUrl(newAudioUrl); 
    
    console.log("Audio file selected:", file);
    console.log("audioFile:", file);

  
    // If backend is not ready, skip the fetch request
    if (!file) return;
  
    const formData = new FormData();
    formData.append("audio", file);
  
    try {
      const response = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        console.error("Error uploading audiotes1:", errorMessage);
        return;
      }
  
      const data = await response.json();
      if (data.success) {
        console.log("Audio uploaded successfully");
      } else {
        console.error("Error uploading audiotes2", data.message);
      }
    } catch (error) {
      console.error("Error uploading audiotes3", error);
    } 
  };

  const handleDatasetsFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: "cover" | "music") => {
    const file = event.target.files ? event.target.files[0] : null;
  
    if (!file) {
      setUploadFailMessage("Belum ada file yang dipilih untuk dataset.")
      setTimeout(() => setUploadFailMessage(null), 6000);
      console.log(`No file selected for ${type} dataset upload`);
      return;
    }
  
    if (type === "cover") {
      setCoverDatasetFile(file);
      console.log("Cover dataset file selected:", file);
    } else if (type === "music") {
      setMusicDatasetFile(file);
      console.log("Music dataset file selected:", file);
    }

  };
  
  const handleDatasetsUpload = async () => {
    if (!coverDatasetFile || !musicDatasetFile) {
      setUploadFailMessage("Upload kedua dataset belum lengkap.")
      setTimeout(() => setUploadFailMessage(null), 6000);
      console.log("Please upload both datasets before submitting.");
      return;
    }
  
    const formData = new FormData();
    formData.append("cover", coverDatasetFile);
    formData.append("music", musicDatasetFile);
  
    console.log("Uploading datasets to backend...");
    try {
      const response = await fetch("/api/upload-dataset", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        console.log("Error uploading datasets:", errorMessage);

        setUploadFailMessage("Error uploading datasets.")
        setTimeout(() => setUploadFailMessage(null), 6000);
        if (coverDatasetInputRef.current) {
          coverDatasetInputRef.current.value = "";
        }
        
        if (musicDatasetInputRef.current) {
          musicDatasetInputRef.current.value = "";
        } 

        setCoverDatasetFile(null);
        setMusicDatasetFile(null);

        throw new Error(errorMessage); 
      }
  
      const data = await response.json();
      if (data.success) {
        console.log("Cover and Music datasets uploaded successfully");

        setCoverDatasetFile(null);
        setMusicDatasetFile(null);

        if (coverDatasetInputRef.current) {
          coverDatasetInputRef.current.value = ""; // Reset input file
        }
        if (musicDatasetInputRef.current) {
          musicDatasetInputRef.current.value = ""; // Reset input file
        }

      } else {
        setUploadFailMessage("Error uploading datasets.")
        setTimeout(() => setUploadFailMessage(null), 6000);
        throw new Error(data.message); // Lempar error jika response tidak berhasil
      }
    } catch (error) {
      setUploadFailMessage("Error uploading datasets.")
      setTimeout(() => setUploadFailMessage(null), 6000);
      console.log("Error uploading datasets:", error);
      throw error;  
    }
  };
  
  const handleMapperUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const mapperFile = event.target.files ? event.target.files[0] : null;
    
    if (!mapperFile) {
      setUploadFailMessage("Error uploading mapper.")
      setTimeout(() => setUploadFailMessage(null), 6000);
      console.log("No mapper file selected");
      return;
    }
    
    setMapperFile(mapperFile);
    console.log("Mapper file selelcted:", mapperFile);

    if (mapperInputRef.current) {
      mapperInputRef.current.value = ''; 
    }
    
    // Pastikan bahwa kedua file dataset (cover dan music) sudah diupload sebelum mengirim mapper
    if (!coverDatasetFile || !musicDatasetFile) {
      console.log("Please upload both datasets before submitting mapper.");
      return;
    }
  
    // Jika dataset sudah ada, kirimkan dataset terlebih dahulu
    try {
      await handleDatasetsUpload();
    } catch (error) {
      console.log("Entering catch block in handleMapperUpload");
      if (error instanceof Error) {
        console.log("Error uploading datasets, stopping mapper upload:", error.message);
      } else {
        console.log("An unknown error occurred during datasets upload");
      }
      setMapperFile(null); // Reset mapperFile hanya jika terjadi error
      return; // Jangan lanjutkan ke upload mapper jika terjadi error
    }
  
    // Setelah dataset diupload, kirimkan file mapper
    const formData = new FormData();
    formData.append("mapper", mapperFile);
  
    console.log("Uploading mapper to backend...");
    try {
      const response = await fetch("/api/upload-mapper", {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
      if (data.success) {
        console.log("Mapper uploaded successfully");
  
        // Reset mapperFile setelah berhasil diupload
        setMapperFile(null); // Reset mapperFile
  
        // Set pesan sukses
        setUploadSuccessMessage("Mapper uploaded successfully!");
  
        // Hapus pesan setelah 6 detik
        setTimeout(() => setUploadSuccessMessage(null), 6000);
  
      } else {
        setUploadFailMessage("Error uploading mapper.")
        setTimeout(() => setUploadFailMessage(null), 6000);
        console.log("Error uploading mapper:", data.message);
      }
    } catch (error) {
      setUploadFailMessage("Error uploading mapper.")
      setTimeout(() => setUploadFailMessage(null), 6000);
      console.log("Error uploading mapper:", error);
    }
  };

  const HandleQuery = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/query", { method: "GET" });
      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(data.message);
        console.log("Query API is working");
      } else {
        setMessage(data.message || "An error occurred.");
        console.error("Query failed:", data);
      }
    } catch (error) {
      setMessage("Failed to connect to the server.");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setQueried(true);
    }
  }

  const HandleDeleteQuery = async () => {
    try {
      const response = await fetch("/api/del-query", { method: "GET" });
      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(data.message);
        console.log("Delete Query API is working");
      } else {
        setMessage(data.message || "An error occurred.");
        console.error("Delete Query failed:", data);
      }
    } catch (error) {
      setMessage("Failed to connect to the server.");
      console.error("Fetch error:", error);
    } finally {
      setQueried(false);
    }
  }

  return (
    <section className="flex items-start min-h-screen gap-4">
      {/* Sidebar */}
      <div className="flex flex-col gap-2 bg-[#2d2e37] rounded-r-2xl p-4 w-[265px] min-h-screen items-center shadow flex-shrink-0">
        <div className="flex flex-col items-center w-full gap-3 mb-2">
          <div className="flex flex-col items-center mt-4">
            {activeTab === 'album' && imageFile ? (
              <>
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Uploaded"
                  className="object-cover h-32 rounded shadow w-35"
                />
                <p className="mt-1 text-white">{imageFile.name}</p>
              </>
            ) : activeTab === 'album' ? (
              // Placeholder ketika imageFile belum diupload
              <div className="flex items-center justify-center h-32 bg-gray-200 rounded shadow w-35">
                <span className="text-[#3a5050eb] text-center px-2 font-medium">Please upload image</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-center mt-1 ">
            {activeTab === 'music' && audioFile && audioUrl? (
              <>
               <audio
                key={audioUrl}  // Set a new key every time audioUrl changes
                controls
                className="w-full max-w-xs min-w-[225px]"
              >
                <source src={audioUrl} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
                <p className="py-2 text-white">{audioFile.name}</p>
                
              </>
            ) : activeTab === 'music' ? (
              <div className="flex items-center justify-center w-full px-2 py-3 mb-4 bg-gray-200 rounded shadow">
                <span className="font-medium text-[#3a5050eb]">Please upload audio</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* File upload buttons */}
        <button
          className="bg-[#512fed] hover:bg-[#7258e3] transform hover:scale-110 active:scale-100 text-white w-5/8 px-3 py-2 rounded-2xl mb-3 font-semibold"
          onClick={activeTab === 'album' ? handleImageClick : handleAudioClick}
        >
          {activeTab === 'album' ? 'Upload Image' : 'Upload Audio'}
        </button>
        <input
          type="file"
          accept={activeTab === 'album' ? 'image/*' : '.wav, .midi, .mid'}
          onChange={activeTab === 'album' ? handleImageUpload : handleAudioUpload}
          ref={activeTab === 'album' ? imageInputRef : audioInputRef}
          style={{ display: "none" }}
        />

        {activeTab === 'music' && <Microphone handleAudioUpload={handleAudioUpload} />}

        {/*query*/}
        <div className="relative flex items-center justify-center w-full mr-12 transform col hover:scale-105 active:scale-100 ">
          {queried 
          ? 
          <button
            className="flex items-center group bg-red-500 hover:bg-red-600  text-black font-semibold w-[75%] px-4 py-2 rounded-full shadow-md ml-8"
            onClick={HandleDeleteQuery}
            disabled={loading}
          >
            <span className="flex-grow pl-4 text-left">
              Delete Query
            </span>
            <div
              className="absolute flex items-center justify-center w-12 h-12 transform -translate-y-1/2 bg-white rounded-full shadow-lg top-1/2 right-1 group-hover:bg-slate-200"
            >
              <img 
                src="/trash-svgrepo-com.svg" 
                alt="Search Icon" 
                className="w-6 h-6"
              />
            </div>
          </button>
          :
          <button
            className="flex items-center group bg-yellow-300 hover:bg-yellow-400  text-black font-semibold w-[75%] px-4 py-2 rounded-full shadow-md ml-8"
            onClick={HandleQuery}
            disabled={loading}
          >
            <span className="flex-grow pl-4 text-left">
              {loading ? "Processing..." : "Start Query"}
            </span>
            <div
              className="absolute flex items-center justify-center w-12 h-12 transform -translate-y-1/2 bg-white rounded-full shadow-lg top-1/2 right-1 group-hover:bg-slate-200"
            >
              <img 
                src="/search-logo.svg" 
                alt="Search Icon" 
                className="w-6 h-6"
              />
            </div>
          </button> 
          }
          
        </div>
        {message && (
            <p className="mt-4 text-center text-green-600">
              {message === "Query is still empty" ? (
                <span className="text-red-600">The query is still empty. Please upload files.</span>
              ) : !queried ? "Query has been deleted" : (
                message
              )}
            </p>
          )}
          
        
        
        <div className="flex flex-col gap-2 w-[265px] items-center">
          <h2 className="py-2 text-xl font-semibold text-gray-200 ">Dataset</h2>
          <button
            className="bg-[#2b4845] hover:bg-[#365a57] transform hover:scale-105 active:scale-100 border border-white text-white w-1/2 px-3 py-2 rounded mb-3 font-semibold"
            onClick={handleCoverDatasetClick}
          >
            Cover
          </button>
          <input
            type="file"
            accept=".zip"
            onChange={(event) => handleDatasetsFileChange(event, "cover")}
            ref={coverDatasetInputRef}
            style={{ display: "none" }}
          />

          <button
            className="bg-[#2b4845] hover:bg-[#365a57] transform hover:scale-105 active:scale-100 border border-white text-white w-1/2 px-3 py-2 rounded mb-3 font-semibold"
            onClick={handleMusicDatasetClick}
          >
            Music
          </button>
          <input
            type="file"
            accept=".zip"
            onChange={(event) => handleDatasetsFileChange(event, "music")}
            ref={musicDatasetInputRef}
            style={{ display: "none" }}
          />

          <button
            className="bg-[#2b4845] hover:bg-[#365a57] transform hover:scale-105 active:scale-100 border border-white text-white w-1/2 px-3 py-2 rounded mb-3 font-semibold"
            onClick={handleMapperClick}
          >
            Mapper
          </button>
          <input
            type="file"
            accept=".json"
            onChange={handleMapperUpload}
            ref={mapperInputRef}
            style={{ display: "none" }}
          />
          <div className="items-start">
            {coverDatasetFile && <p className="text-white">cover: {coverDatasetFile.name}</p>}
            {musicDatasetFile && <p className="text-white">music: {musicDatasetFile.name}</p>}
            {mapperFile && <p className="text-white">mapper: {mapperFile.name}</p>}
            {uploadSuccessMessage && <p className="text-white">Upload Berhasil</p>}
            {uploadFailMessage && <p className="text-white">{uploadFailMessage}</p>}
          </div>
        </div>
        
        <div className="">
          <PaginationControls
            hasNextPage={end < data.length}
            hasPrevPage={start > 0}
            totalEntries={data.length}
          />
        </div>
  
        
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-grow gap-3 mt-3">
        <div className="flex justify-center gap-4">
          <button 
            className={` px-10 py-2 rounded-3xl font-semibold ${activeTab === 'album' ? 'bg-white text-black' : 'bg-zinc-600 text-white'}`}
            onClick={() => handleTabChange('album')}>
            Album
          </button>
          <button 
            className={` px-10 py-2 rounded-3xl font-semibold ${activeTab === 'music' ? 'bg-white text-black' : 'bg-zinc-600 text-white'}`}
            onClick={() => handleTabChange('music')}>
            Music
          </button>
        </div>
        <h3 className="text-2xl font-bold text-white ">Available Songs</h3>
        <div className="grid grid-cols-5 gap-2 ">
          {entries.length === 0 ? (
              <h2 className="col-span-5 mt-5 text-xl font-bold text-center text-white">No songs have been uploaded yet</h2>
            ) : (
              entries.map((entry, index) => (
            <div
              key={index}
              className="flex flex-col h-auto p-2 overflow-hidden text-center text-white shadow rounded-xl max-h-72"
            >
              <img
                src={`/temp_uploads/${sessionId}/images/${entry.cover}`}
                alt={`${entry.song}`}
                className="object-cover w-full h-auto mb-1 border border-gray-300 max-h-40 rounded-xl"
              />
              <div className="relative group">
                <p className="pl-2 mb-2 overflow-hidden font-medium whitespace-normal text-start text-ellipsis hover:underline line-clamp-2">
                  {entry.song}
                </p>
                <div className="absolute z-20 invisible px-1 py-1 text-xs text-white transition-opacity transform translate-x-4 bg-gray-700 opacity-0 group-hover:visible group-hover:opacity-100 text-start line-clamp-6 top-8">
                  {entry.song}
                </div>
              </div>


              {(entry.song.endsWith('.mid') || entry.song.endsWith('.midi')) ? (
                <button
                  className="bg-[#798989e2] hover:bg-gray-400 transform hover:scale-105 active:scale-100 text-white w-full py-2 rounded mt-auto"
                  onClick={() => playMidi(entry.song.replace(/\s+/g, "%20"))}
                >
                  {playingTracks[entry.song.replace(/\s+/g, "%20")]
                    ? "Stop MIDI"
                    : "Play MIDI"}
                </button>
              ) : entry.song.endsWith('.wav') ? (
                <audio
                  controls
                  className="z-0 w-full mt-auto"
                >
                  <source
                    src={`/temp_uploads/${sessionId}/audio/${entry.song.replace(/\s+/g, "%20")}`}
                    type="audio/wav"
                  />
                </audio>
              ) : (
                <p className="text-red-500">Unsupported file type</p>
              )}
            </div>
          )))}
        </div>

      </div>
    </section>



  );
};


export default Homepage;