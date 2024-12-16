import ImageProcessing as ip
import audio_retriev as ar
import os
import argparse

def main():
    parser = argparse.ArgumentParser(description='path to the dataset')

    parser.add_argument('--session', type=str, required=True)

    args = parser.parse_args()

    dir_path = args.session

    dir_path = "public/temp_uploads/" + dir_path

    images_dir_path = dir_path + "/images"
    audios_dir_path = dir_path + "/audio"

    output_features_path = dir_path + "/features.npy"
    audio_features_path = dir_path + "/audio_features.npy"

    if not os.path.exists(dir_path):
        print(dir_path)
        cwd = os.getcwd()
        print(cwd)
        print("Directory does not exist")
        exit()

    if os.path.exists(output_features_path):
        image_dataset, image_filenames = [], []
    else:
        image_dataset, image_filenames = ip.preprocess_image_from_folder(images_dir_path, output_features_path, img_size=(120, 120))

    extracted_audio_features = ar.process_database(audios_dir_path)
    ar.save_to_npy(extracted_audio_features, audio_features_path)

    # print(image_dataset)

    # print(image_filenames)

if __name__ == "__main__":
    main()