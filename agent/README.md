# LiveKit Voice Agent with Groq

A basic voice agent implementation using LiveKit Agents with Groq plugins for Speech-to-Text (STT), Text-to-Speech (TTS), and Large Language Model (LLM) capabilities.

## Features

- **Speech-to-Text**: Groq's Whisper model (`whisper-large-v3-turbo`)
- **Text-to-Speech**: Groq's PlayAI model (`Arista-PlayAI` voice)
- **LLM**: Groq's Llama model (`llama-3.3-70b-versatile`)
- Real-time voice conversations
- Low-latency responses powered by Groq's LPU inference

## Prerequisites

1. **LiveKit Account**
   - Sign up at [LiveKit Cloud](https://cloud.livekit.io/) or set up a self-hosted instance
   - Get your API credentials (URL, API Key, API Secret)

2. **Groq API Key**
   - Sign up at [Groq Console](https://console.groq.com/)
   - Generate an API key from [Keys page](https://console.groq.com/keys)

3. **Python 3.9+**

## Installation

1. Navigate to the agent directory:
```bash
cd agent
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

Or using uv (faster):
```bash
uv pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
GROQ_API_KEY=your_groq_api_key
```

## Usage

### Start the Agent

```bash
python agent.py dev
```

This starts the agent in development mode, which:
- Automatically creates a room
- Provides a playground URL to test the agent
- Shows real-time logs

### Connect to the Agent

Once started, you'll see output like:
```
Agent starting in dev mode
Room URL: https://your-project.livekit.cloud/custom-room-name?token=...
```

Open the URL in your browser to interact with the voice agent.

### Production Deployment

For production, run the agent as a worker:
```bash
python agent.py start
```

This connects to your LiveKit server and waits for room assignments.

## Configuration

### Customize the Agent Behavior

Edit `agent.py` and modify the `chat_ctx` in the `entrypoint()` function:

```python
chat_ctx={
    "messages": [
        {
            "role": "system",
            "content": "Your custom system prompt here"
        }
    ]
}
```

### Change Models

**STT (Speech-to-Text):**
```python
stt=groq.STT(
    model="whisper-large-v3-turbo",  # Options: whisper-large-v3-turbo, whisper-large-v3
    language="en",  # ISO-639-1 code (en, es, fr, etc.)
)
```

**TTS (Text-to-Speech):**
```python
tts=groq.TTS(
    model="playai-tts",
    voice="Arista-PlayAI",  # See available voices below
)
```

Available English voices:
- Arista-PlayAI (default)
- Axton-PlayAI
- Dexter-PlayAI
- Gideon-PlayAI
- Hayden-PlayAI
- Jarvis-PlayAI
- Quinn-PlayAI
- Santana-PlayAI
- Sofia-PlayAI

[More voices](https://console.groq.com/docs/text-to-speech#available-english-voices)

**LLM (Language Model):**
```python
llm=groq.LLM(
    model="llama-3.3-70b-versatile",  # See options below
    temperature=0.7,  # 0.0 = deterministic, 1.0 = creative
)
```

Available models:
- `llama-3.3-70b-versatile` (recommended for general use)
- `llama3-8b-8192` (faster, less capable)
- `llama3-70b-8192` (balanced)
- `mixtral-8x7b-32768` (good for reasoning)

[All models](https://console.groq.com/docs/models)

## Project Structure

```
agent/
├── agent.py              # Main agent implementation
├── requirements.txt      # Python dependencies
├── .env.example         # Environment variable template
└── README.md            # This file
```

## Troubleshooting

### "Missing required environment variables"
Make sure all variables in `.env` are set correctly.

### "Connection refused" or "Authentication failed"
Verify your LiveKit credentials are correct and your LiveKit server is accessible.

### "Groq API error"
Check that your Groq API key is valid and has available credits.

### Agent not responding to voice
- Check your microphone permissions in the browser
- Ensure audio input is working
- Look at the agent logs for STT errors

## Resources

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Groq Documentation](https://console.groq.com/docs/overview)
- [LiveKit Groq Integration Guide](https://docs.livekit.io/agents/integrations/groq/)
- [LiveKit Voice AI Quickstart](https://docs.livekit.io/agents/start/voice-ai-quickstart/)

## Advanced Usage

### Adding Tools/Function Calling

You can extend the agent with custom functions:

```python
from livekit.agents import llm

tools = [
    llm.FunctionTool(
        name="get_weather",
        description="Get current weather for a location",
        parameters={
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name"}
            },
            "required": ["location"]
        }
    )
]

session = AgentSession(
    llm=groq.LLM(
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        tools=tools,
    ),
    # ... other config
)
```

### Custom VAD (Voice Activity Detection)

```python
from livekit.plugins import silero

session = AgentSession(
    vad=silero.VAD.load(),
    # ... other config
)
```

## License

This project is part of the tbo-ai-compass repository.
