from flask import Flask, send_file, request, jsonify
from algorithm import generate_derbouka
from flask_cors import CORS
import json
import uuid


app = Flask(__name__)
CORS(app, resources={"*": {"origins": "*"}})

# ONLY ROUTE for now
@app.post('/')
def serve_audio():
        data = request.get_json()

        # parse data from frontend
        num_cycles = int(data.get("numOfCycles")) # number of cycles in the output
        cycle_length = float(data.get("cycleLength")) # cycle length in beats
        bpm = float(data.get("tempo")) # tempo in bpm
        maxsubd = int(data.get("maxSubd")) # maximum subdivision of a beat
        shift_proba = float(abs(100.0 - float(data.get("std")))) # probability of wrong placements
        allowed_tempo_deviation=float(data.get("tempoVariation")) # allowed tempo change (+-)
        skeleton = data.get("skeleton") # skeleton format: [(delay, note)] where delay is in beats
        matrix = data.get("matrix") # variation matrix
        shift_proba /= 100 # make it 0 -> 1
        if isinstance(skeleton, str):
            skeleton = json.loads(skeleton)

        if isinstance(matrix, str):
            matrix = json.loads(matrix)
        
        id4 = str(uuid.uuid4()) # unique id for sound
        generate_derbouka(
            uuid=id4,
            num_cycles=num_cycles,
            cycle_length=cycle_length,
            bpm=bpm,
            maxsubd=maxsubd,
            shift_proba=shift_proba,
            allowed_tempo_deviation=allowed_tempo_deviation,
            skeleton=skeleton,
            matrix=matrix
        )


        # TODO: database
        # saving data in JSON
        data = {
            "uuid":id4,
            "num_cycles":num_cycles,
            "cycle_length":cycle_length,
            "bpm":bpm,
            "maxsubd":maxsubd,
            "shift_proba":shift_proba,
            "allowed_tempo_deviation":allowed_tempo_deviation,
            "skeleton":skeleton,
            "matrix":matrix
        }

        with open(f"./data/{id4}.json", "w") as f:
            json.dump(data,f)


        return send_file(f"./data/{id4}.wav", mimetype='audio/wav', as_attachment=False)


if __name__ == "__main__":
    app.run(port=5000) # running on 127.0.0.1:5000 (not 0.0.0.0)