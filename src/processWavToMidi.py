import audio_retriev as ar
import argparse

def main():
    parser = argparse.ArgumentParser(description='path to wav input audio')

    parser.add_argument('--path', type=str, required=True)
    parser.add_argument('--folder', type=str, required=True)

    args = parser.parse_args()

    input_path = args.path
    output_folder = args.folder

    generated_path = ar.convert_wav_to_midi(input_path, output_folder)

    print(generated_path)

if __name__ == "__main__":
    main()

