import librosa


# this file contains configuration for generator
paths = {
    "D": "./sounds/skeleton/doum.wav",
    "OTA": "./sounds/skeleton/open_tak.wav",
    "OTI": "./sounds/skeleton/open_tik.wav",
    "PA2": "./sounds/skeleton/pa2.wav",
    # "RA": "./sounds/ra.wav",
    # "T1": "./sounds/tik1.wav",
    # "T2": "./sounds/tik2.wav",
    "S": "./sounds/skeleton/silence.wav",
}


def get_audio_data_skeleton(symbol, sr=48000): 
    path = paths.get(symbol) 
    y, _ = librosa.load(path, sr=sr)
    return y