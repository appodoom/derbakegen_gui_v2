import os
import sys
import librosa

# Utility to handle PyInstaller resource paths
def resource_path(relative_path):
    """
    Get absolute path to resource, works for dev and for PyInstaller bundle.
    """
    base_path = getattr(sys, "_MEIPASS", os.path.abspath("."))
    return os.path.join(base_path, relative_path)

# Map of sound files (inside a "sounds" folder)
paths = {
    "D": "sounds/doum.wav",
    "OTA": "sounds/open_tak.wav",
    "OTI": "sounds/open_tik.wav",
    "PA2": "sounds/pa2.wav",
    "RA": "sounds/ra.wav",
    "T1": "sounds/tik1.wav",
    "T2": "sounds/tik2.wav",
    "S": "sounds/silence.wav",
}

def get_audio_data(symbol, sr=48000):
    path = resource_path(paths.get(symbol))
    y, _ = librosa.load(path, sr=sr)
    return y
