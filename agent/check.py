from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

resp = client.audio.speech.create(
    model="playai-tts",
    voice="Arista-PlayAI",
    input="Hello from Groq TTS",
    response_format="wav",
)

# If this line raises, your key / TTS access is the issue
print("TTS call succeeded, bytes length:", len(resp.read()))