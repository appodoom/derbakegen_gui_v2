from flask import Flask, send_file, request, jsonify
from algorithm import main
from flask_cors import CORS
import json
app = Flask(__name__)
CORS(app)

@app.post('/')
def serve_audio():
        data = request.get_json()
        
        num_cycles = int(data.get("numOfCycles"))
        cycle_length = float(data.get("cycleLength"))
        bpm = float(data.get("tempo"))
        maxsubd = int(data.get("maxSubd"))
        shift_proba = float(data.get("std"))
        allowed_tempo_deviation=float(data.get("tempoVariation"))
        skeleton = data.get("skeleton")
        matrix = data.get("matrix")

        if isinstance(skeleton, str):
            skeleton = json.loads(skeleton)

        if isinstance(matrix, str):
            matrix = json.loads(matrix)

        main(
            num_cycles=num_cycles,
            cycle_length=cycle_length,
            bpm=bpm,
            maxsubd=maxsubd,
            shift_proba=shift_proba,
            allowed_tempo_deviation=allowed_tempo_deviation,
            skeleton=skeleton,
            matrix=matrix
        )

        return send_file("./generated.wav", mimetype='audio/wav', as_attachment=False)


if __name__ == "__main__":
    app.run(port=5000)