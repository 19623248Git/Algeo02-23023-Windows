import ImageProcessing as ip
import os
import argparse
from CBIR import CBIR
import audio_retriev as ar
import json
import numpy as np
import pandas as pd
import time

def main():
    isImage = False
    isAudio = False

    #set the timer at start of the program
    start_time = time.time()

    parser = argparse.ArgumentParser(description='Process query image to dataset')

    parser.add_argument('--session', type=str, required=True)

    args = parser.parse_args()

    dir_path = args.session

    dir_path = "public/temp_uploads/" + dir_path

    #define the path to the dataset
    images_dir_path = dir_path + "/images"

    #define the path to the features
    image_features_path = dir_path + "/features.npy"
    audio_features_path = dir_path + "/audio_features.npy"

    #transform the query image
    query_image_path = dir_path + "/query/image/input.png"
    query_audio_path = dir_path + "/query/audio/input.mid"

    #define the path to the mapper
    mapper_path = dir_path + "/mapper.json"

    # Load the mapper.json
    with open(mapper_path, 'r') as mapper_file:
        mapper = json.load(mapper_file)

    if os.path.isfile(query_image_path):
        isImage = True
    else:
        json_image_data = json.dumps([], indent=4)

    if os.path.isfile(query_audio_path):
        isAudio = True
    else:
        json_audio_data = json.dumps([], indent=4)

    sorted_filenames = []
    distance_between_query = []

    if (isImage):
        image_dataset, image_filenames = ip.load_preprocessed_images(image_features_path)

        img_size = (120, 120)
        sorted_filenames, distance_between_query = CBIR(image_features_path, query_image_path, img_size)

        image_data_array = []

        for filename, distance in zip(sorted_filenames[:10], distance_between_query[:10]):
            # Find all audio files that correspond to the image
            corresponding_audios = [
                entry['audio_file'] for entry in mapper if entry['pic_name'] == filename
            ]

            # Create a separate entry for each corresponding audio file
            for audio_file in corresponding_audios:
                image_data_array.append({
                    "filename": filename,
                    "distance": distance,
                    "corresponding_audios": audio_file
                })

        json_image_data = json.dumps(image_data_array, indent=4)
        print(json_image_data)

    else:
        json_image_data = json.dumps([], indent=4)


    if (isAudio):
        
        loaded_data = np.load(audio_features_path, allow_pickle=True).item()

        hummed_feature = ar.process_file(query_audio_path)

        ranking = ar.rank_best_match(hummed_feature, loaded_data)
        
        df = pd.DataFrame(list(ranking.items()), columns=['filename', 'similarity'])
        
        json_audio_data = df.to_json(orient='records', indent=4)

    else:
        json_audio_data = json.dumps([], indent=4)

    # Create a dictionary from the mapper for fast lookup
    audio_to_image_map = {entry['audio_file']: entry['pic_name'] for entry in mapper}

    # Combine results with priority for audio
    combined_results = []
    added_images = set()  # To avoid duplicates

    # Process audio results if any
    if (isAudio and not isImage):
        audio_data = json.loads(json_audio_data)  # Convert JSON string to Python list
        for entry in audio_data:
            audio_file = entry['filename']
            similarity = entry['similarity']
            if audio_file in audio_to_image_map:
                image_name = audio_to_image_map[audio_file]
                combined_results.append({
                    'audio_file': audio_file,
                    'pic_name': image_name,
                    'audio_similarity': similarity,
                    'image_distance': None  # No associated image
                })
                added_images.add(image_name)

    # Process image results if any
    if (not isAudio and isImage):
        image_data = json.loads(json_image_data)  # Convert JSON string to Python list
        for entry in image_data:
            audio_file = entry['corresponding_audios']
            image_name = entry['filename']
            distance = entry['distance']
            combined_results.append({
                'audio_file': audio_file,
                'pic_name': image_name,
                'audio_similarity': None ,
                'image_distance': distance
            })

    if isAudio and isImage:
        audio_data = json.loads(json_audio_data)  # Convert JSON string to Python list
        image_data = json.loads(json_image_data)  # Convert JSON string to Python list

        # Extract top image filenames and their distances for filtering
        top_images = {entry['filename']: entry['distance'] for entry in image_data[:10]}

        # Filter audio results based on top-ranked images
        for audio_entry in audio_data:
            audio_file = audio_entry['filename']
            similarity = audio_entry['similarity']
            if audio_file in audio_to_image_map:
                image_name = audio_to_image_map[audio_file]
                if image_name in top_images:
                    combined_results.append({
                        'audio_file': audio_file,
                        'pic_name': image_name,
                        'audio_similarity': similarity,
                        'image_distance': top_images[image_name]  # Include the image distance
                    })
                    added_images.add(image_name)

    # Convert the combined results to JSON for output or further use
    json_combined_results = json.dumps(combined_results, indent=4)

    print(json_combined_results)

    # Write the combined results back to the mapper.json file
    with open(mapper_path, 'w') as mapper_file:
        mapper_file.write(json_combined_results)

    #stop the timer
    end_time = time.time()

    print("Total estimated time: ", end_time - start_time)

    total_time = end_time - start_time

    # Format total_time to two decimal places
    total_time = round(total_time, 2)

    time_path = dir_path + "/time.txt"

    # Write the total time to the file
    with open(time_path, 'w') as file:
        file.write(f"Total estimated time: {total_time}\n")

if __name__ == "__main__":
    main()
