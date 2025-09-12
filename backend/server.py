from flask import Flask, send_file, request, jsonify

from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.post('/')
def serve_audio():
        data = request.get_json()

        # Example: extract values from the JSON
        # filename = data.get('filename')
        # user_id = data.get('user_id')
        # language = data.get('language')
        print(data)

        return send_file("./sounds/doum.wav", mimetype='audio/wav', as_attachment=False)


if __name__ == "__main__":
    app.run(port=5000)