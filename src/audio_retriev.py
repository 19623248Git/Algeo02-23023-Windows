import multiprocessing.pool
from mido import MidiFile
import mido
import json
import pandas as pd
import numpy as np
import sys
import os
import concurrent.futures
import time
from basic_pitch.inference import predict, Model
from basic_pitch import ICASSP_2022_MODEL_PATH
import soundfile as sf
import multiprocessing

uploaded = True

def is_drum_channel(track):
    track_name = track.name.strip().lower() if track.name else ""
    if track_name!='drum' or track_name != 'bass':
        for msg in track:
            if msg.type == 'program_change' and hasattr(msg, 'channel') and msg.channel == 9:
                return True
    return False

def choose_melody_track(file_path):
    try:
        midi_file = mido.MidiFile(file_path)
    except Exception as e:
        print(f"Error reading MIDI file: {e}")
        return

    voice_track = None
    track_event_counts = []
    tracks_with_channel_zero = []

    for i, track in enumerate(midi_file.tracks):
        track_event_count = 0
        has_channel_zero = False
        for msg in track:
            if msg.type in ('note_on', 'note_off'):
                if msg.channel == 0:
                    has_channel_zero = True
                track_event_count += 1

        # Memeriksa apakah track memiliki nama "voice"
        track_name = track.name.strip().lower() if track.name else ""
        if track_name == "voice":
            voice_track = i
        elif not is_drum_channel(track) and has_channel_zero:
            tracks_with_channel_zero.append((i, track_event_count))

        track_event_counts.append((i, track_event_count))

    # Jika track "voice" ditemukan, gunakan track tersebut
    if voice_track is not None:
        return voice_track

    # Jika tidak ada track "voice", pilih track dengan channel 0 terbanyak
    if tracks_with_channel_zero:
        # Mengurutkan track berdasarkan jumlah event terbanyak
        tracks_with_channel_zero.sort(key=lambda x: x[1], reverse=True)
        best_track = tracks_with_channel_zero[0][0]
        return best_track

    # Jika tidak ada track yang memenuhi kriteria, pilih track dengan jumlah event terbanyak
    if track_event_counts:
        # Mengurutkan track berdasarkan jumlah event terbanyak
        track_event_counts.sort(key=lambda x: x[1], reverse=True)
        best_track = track_event_counts[0][0]
        return best_track
    else:
        print("Tidak ada track yang memenuhi kriteria.")
        return None


def fix_overlap_and_extract_melody(file_path, track_idx):

    mid = mido.MidiFile(file_path)
    main_track = mid.tracks[track_idx]
    abs_time = 0
    temp = []
    melody = []  # format (pitch, time, bool, velocity, abs_time)

    for massage in main_track:
        abs_time = abs_time+massage.time # Always update abs_time with message time
        if massage.type == 'note_on':
            if len(temp) == 0:
                pitch = massage.note
                time = massage.time
                velocity = massage.velocity
                temp.append(pitch)
                melody.append((pitch, time, True, abs_time, velocity))
            elif len(temp) != 0 and massage.time == 0:
                if temp[0] < massage.note:
                    temp[0] = massage.note
                    melody[-1] = (temp[0], *melody[-1][1:])
            elif len(temp) != 0 and massage.time != 0: 
                if abs(temp[0]- massage.note)< 11:
                    pitch = massage.note
                    time = massage.time
                    velocity = massage.velocity
                    melody.append((temp[0], time, False, abs_time, 64))
                    melody.append((pitch, 0, True, abs_time, velocity))
                    temp[0] = pitch

        elif massage.type == 'note_off':
            if massage.note in temp and abs(massage.note - melody[-1][0]) < 11:
                pitch = massage.note
                velocity = massage.velocity
                time = massage.time
                # Hitung waktu relatif terhadap sebelumnya
                time_relative_to_predessecor = abs_time - melody[-1][3]
                melody.append((pitch, time_relative_to_predessecor, False, abs_time, velocity))
                temp.pop()
            

    return melody
    
def calculate_interval_between_windows(window):
    try:
        RTB = []
        FTB = []

        for i in range(1,len(window)):
            FTB.append(window[0][0]-window[i][0])
            RTB.append(window[i-1][0]-window[i][0])

        return RTB, FTB
    except Exception as e:
        print(f"Error in calculate_interval_between_groups: {e}")
        return [], []

def calculate_cosine_similarity(vector1, vector2):
    try:
        vector1 = np.nan_to_num(vector1)
        vector2 = np.nan_to_num(vector2)
        norm1 = np.linalg.norm(vector1)
        norm2 = np.linalg.norm(vector2)
        if norm1 == 0 or norm2 == 0:
            return 0
        dot_product = np.dot(vector1, vector2)
        return dot_product / (norm1 * norm2)
    except Exception as e:
        print(f"Error in calculate_cosine_similarity: {e}")
        return 0

def windowing_midi(interval_time, stride, melody):
    try:

        pointer = 0
        result = []
        window_start_time = melody[pointer][3]
        start_temp = 0
        panjangnya = len(melody)

        while pointer < panjangnya:
            temp = []
            while pointer < panjangnya and melody[pointer][3] < window_start_time + interval_time:
                temp.append((melody[pointer][0], melody[pointer][1], melody[pointer][2], melody[pointer][3]))
                pointer += 1

 
            result.append(temp)

            if pointer >= panjangnya:
                break

            window_start_time += stride
            while melody[start_temp][3] < window_start_time:
                start_temp += 1
            pointer = start_temp


        return result
    except Exception as e:
        print(f"Error in windowing_midi: {e}")
        return []

def extract_features(window):
    try:
        
            atb_range = np.arange(1, 128)
            atb_histogram, _ = np.histogram(window, bins=np.append(atb_range, atb_range[-1] + 1))
            histogram_list = atb_histogram.tolist()
            atb_total = atb_histogram.sum()
            atb_histogram_normalized = atb_histogram / atb_total if atb_total else atb_histogram

            data_rtb, data_ftb = calculate_interval_between_windows(window)
            rtb_range = np.arange(1, 256)
            rtb_histogram, _ = np.histogram(data_rtb, bins=np.append(rtb_range, rtb_range[-1] + 1))
            rtb_total = rtb_histogram.sum()
            rtb_histogram_normalized = rtb_histogram / rtb_total if rtb_total else rtb_histogram
            rtb_histogram_normalized= np.nan_to_num(rtb_histogram_normalized)

            ftb_range = np.arange(1, 256)
            ftb_histogram, _ = np.histogram(data_ftb, bins=np.append(ftb_range, ftb_range[-1] + 1))
            ftb_total = ftb_histogram.sum()
            ftb_histogram_normalized = ftb_histogram / ftb_total if ftb_total else ftb_histogram
            
            return atb_histogram_normalized, rtb_histogram_normalized, ftb_histogram_normalized
    except Exception as e:
        print(f"Error in extract_features: {e}")
        return [], [], []
    

def process_file(file_path):
    track_idx= choose_melody_track(file_path)
    melody = fix_overlap_and_extract_melody(file_path, track_idx)
    
    mid = MidiFile(file_path)
    tpb = mid.ticks_per_beat

    bpm = None
    for i, track in enumerate(mid.tracks):
        for msg in track:
            # Mencari event tempo
            if msg.type == 'set_tempo':
                tempo = msg.tempo
                bpm = 60000000 / tempo
                break
        if bpm is not None:
            break 

    interval_time = tpb * 40
    stride = tpb * 4

    windows = windowing_midi(interval_time, stride, melody)  # Contoh interval dan stride
    features = [extract_features(window) for window in windows if (len(window)>0)]


    return features


# Function to convert WAV to MIDI
def convert_wav_to_midi(wav_path, output_folder):
    # Ensure the output folder exists
    os.makedirs(output_folder, exist_ok=True)

    # Define output MIDI file path
    midi_file_name = os.path.splitext(os.path.basename(wav_path))[0] + ".mid"
    midi_path = os.path.join(output_folder, midi_file_name)

    # Run Basic Pitch to convert WAV to MIDI
    model_output, midi_data, note_events = predict(wav_path)

    # Save the MIDI data to the output path
    midi_data.write(midi_path)

    return midi_path

# Function to process several files in parallel
def process_database(folder_path):
    file_paths = [os.path.join(folder_path, filename) for filename in os.listdir(folder_path) if filename.endswith('.mid')] 
    wav_paths = [os.path.join(folder_path, filename) for filename in os.listdir(folder_path) if filename.endswith('.wav')] 
    
    # print(wav_paths)

    midi_output_folder = folder_path

    # Convert WAV files to MIDI
    with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
        midi_paths = pool.starmap(convert_wav_to_midi, [(wav_path, midi_output_folder) for wav_path in wav_paths]) 

    with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
        results = pool.map(process_file, file_paths)
    

    file_features = {}
    for file_path, features in zip(file_paths, results):
        file_name = os.path.basename(file_path)
        file_features[file_name] = features
    
    return file_features


from joblib import Parallel, delayed

def rank_best_match(hummed_feature, feature_in_dir, n_jobs=-1):
    results = {}

    def compute_similarity_for_key(key, feature_files):
        print("Current key: ", key)
        max_simm = float('-inf')
        for feature_file in feature_files:
            simm = 0
            for feature in hummed_feature:
                simm += 0.45 * calculate_cosine_similarity(feature[1], feature_file[1])
                simm += 0.45 * calculate_cosine_similarity(feature[2], feature_file[2])
                simm += 0.1 * calculate_cosine_similarity(feature[0], feature_file[0])
            max_simm = max(max_simm, simm)
        return key, max_simm

    results = Parallel(n_jobs=n_jobs)(
        
        delayed(compute_similarity_for_key)(key, feature_files)
        for key, feature_files in feature_in_dir.items()
    )

    sorted_results = {k: v for k, v in sorted(results, key=lambda item: item[1], reverse=True)}
    return sorted_results



# Fungsi untuk menyimpan hasil ke file JSON
def save_to_npy(data, output_file):
    np.save(output_file, data)


# def main(midi_file_path, dataset_dir, npy_file_path="coba.npy"):
#     global uploaded
    
#     if not uploaded:
#         extracted_features = process_database(dataset_dir)
#         save_to_npy(extracted_features, npy_file_path)

#     loaded_data = np.load(npy_file_path, allow_pickle=True).item()

#     hummed_feature = process_file(midi_file_path)

#     ranking = rank_best_match(hummed_feature, loaded_data)
    
#     df = pd.DataFrame(list(ranking.items()), columns=['Filename', 'Similarity'])
#     json_data = df.to_json(orient='records', indent=4)

    
#     return json_data

# if __name__ == "__main__":
#     current_dir = os.getcwd()
#     full_path = os.path.join(current_dir, "test", "midi_dataset") 
#     main("D:\\TUBES ALGEO\Algeo02-23023\\sisx(5).mid", full_path, "coba.npy")