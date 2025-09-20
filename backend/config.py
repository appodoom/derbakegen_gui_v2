import librosa

# this file contains configuration for generator
paths = {
    "D": "./sounds/doum.wav",
    "OTA": "./sounds/open_tak.wav",
    "OTI": "./sounds/open_tik.wav",
    "PA2": "./sounds/pa2.wav",
    # "RA": "./sounds/ra.wav",
    # "T1": "./sounds/tik1.wav",
    # "T2": "./sounds/tik2.wav",
    "S": "./sounds/silence.wav",
}


def get_audio_data(symbol, sr=48000):
    path = paths.get(symbol)
    y, _ = librosa.load(path, sr=sr)
    return y