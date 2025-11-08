from flask import Flask, send_file, request, jsonify, make_response
from algorithm import generate_derbouka
from flask_cors import CORS
from dotenv import load_dotenv
import json
import uuid
import os
import aiofiles
import aioboto3
import asyncio
import jwt

load_dotenv()
from db.schema import init_models, AsyncSessionLocal, Sound



app = Flask(__name__)
CORS(app, resources={"*": {"origins": "*"}}, supports_credentials=True)

@app.get("/api/generate/test/")
def test():
    return "Success", 200

S3_BUCKET = os.getenv("S3_BUCKET")
S3_REGION = os.getenv("S3_REGION")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")


@app.get("/api/generate/publish/")
async def publish():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Missing token"}), 403

    audioid = request.args.get("id")
    if not audioid:
        return jsonify({"error": "Missing ?id parameter."}), 400

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("id")
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 403

    data_dir = "./data"
    wav_path = os.path.join(data_dir, f"{audioid}.wav")
    json_path = os.path.join(data_dir, f"{audioid}.json")

    if not os.path.exists(wav_path) or not os.path.exists(json_path):
        return jsonify({"error": "Audio or metadata file not found"}), 404

    try:
        # Load JSON asynchronously
        async with aiofiles.open(json_path, "r", encoding="utf-8") as f:
            metadata_str = await f.read()
            metadata = json.loads(metadata_str)

        # Upload asynchronously to S3
        session = aioboto3.Session()

        async with session.client(
            "s3",
            region_name=S3_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        ) as s3:
            async with aiofiles.open(wav_path, "rb") as audio_file:
                await s3.upload_fileobj(audio_file, S3_BUCKET, f"{audioid}.wav")

        s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{audioid}.wav"

        async with AsyncSessionLocal() as session:
            sound = Sound(
                id=audioid,
                generated_by=user_id,
                settings=metadata,
                url=s3_url
            )
            session.add(sound)
            await session.commit()

        # Delete files asynchronously
        await asyncio.gather(
            asyncio.to_thread(os.remove, wav_path),
            asyncio.to_thread(os.remove, json_path)
        )

        return "OK", 200

    except Exception as e:
        print("Error:", e)
        return "Internal Server Error", 500


@app.post('/api/generate/')
async def serve_audio():
        data = request.get_json()
        if "std" not in data or data.get("std") == None:
            data["std"] = "0"
        if "tempoVariation" not in data or data.get("tempoVariation") == None:
            data["tempoVariation"] = "0"
        if "amplitudeVariation" not in data or data.get("amplitudeVariation") == None:
            data["amplitudeVariation"]="100"

        # parse data from frontend
        num_cycles = int(data.get("numOfCycles")) # number of cycles in the output
        cycle_length = float(data.get("cycleLength")) # cycle length in beats
        bpm = float(data.get("tempo")) # tempo in bpm
        maxsubd = int(data.get("maxSubd")) # maximum subdivision of a beat
        shift_proba = float(abs(100.0 - float(data.get("std")))) # probability of wrong placements
        allowed_tempo_deviation=float(data.get("tempoVariation")) # allowed tempo change (+-)
        skeleton = data.get("skeleton") # skeleton format: [(delay, note)] where delay is in beats
        matrix = data.get("matrix") # variation matrix
        amplitude_variation = float(data.get("amplitudeVariation"))
        shift_proba /= 100 # make it 0 -> 1
        amplitude_variation/=100 # make it 0 -> 1
        if isinstance(skeleton, str):
            skeleton = json.loads(skeleton)

        if isinstance(matrix, str):
            matrix = json.loads(matrix)
        
        id4 = str(uuid.uuid4()) # unique id for sound

        await asyncio.to_thread(
        generate_derbouka,
        id4,
        num_cycles,
        cycle_length,
        bpm,
        maxsubd,
        shift_proba,
        allowed_tempo_deviation,
        skeleton,
        matrix,
        amplitude_variation,
        )

        metadata = {
            "uuid":id4,
            "num_cycles":num_cycles,
            "cycle_length":cycle_length,
            "bpm":bpm,
            "maxsubd":maxsubd,
            "shift_proba":shift_proba,
            "allowed_tempo_deviation":allowed_tempo_deviation,
            "skeleton":skeleton,
            "matrix":matrix,
            "amplitudeVariation": amplitude_variation
        }

        os.makedirs("./data", exist_ok=True)
        async with aiofiles.open(f"./data/{id4}.json", "w") as f:
            await f.write(json.dumps(metadata))

        response = await asyncio.to_thread(
            make_response,
            send_file(f"./data/{id4}.wav", mimetype="audio/wav", as_attachment=False)
        )
        response.headers["X-Audio-ID"] = id4
        return response

async def create_app():
    """Async application factory"""
    await init_models()
    return app

if __name__ == "__main__":
    import uvicorn
    from asgiref.wsgi import WsgiToAsgi
    
    async def main():
        # Initialize database first
        await create_app()
        
        # Convert Flask app to ASGI
        asgi_app = WsgiToAsgi(app)
        
        # Create uvicorn config and server
        config = uvicorn.Config(
            asgi_app,
            host="0.0.0.0",
            port=int(os.getenv("GENERATE_PORT")),
            log_level="info"
        )
        server = uvicorn.Server(config)
        
        # Run the server using the same event loop
        await server.serve()
    
    asyncio.run(main())