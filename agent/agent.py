"""
LiveKit Voice Agent with Groq Integration
A basic voice agent using Groq for STT, TTS, and LLM
"""

import logging
import os

from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import cartesia, groq, silero

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Define the agent's entry point
async def entrypoint(ctx: JobContext):
    """
    Main entry point for the voice agent
    Connects to a LiveKit room and starts the voice agent
    """
    logger.info("Agent starting...")
    
    # Connect to the room
    await ctx.connect()
    logger.info(f"Connected to room: {ctx.room.name}")

    # Create the agent session with Groq STT/LLM and Cartesia TTS
    # Note: Groq STT is non-streaming, so we add VAD to enable streaming-style turns.
    session = AgentSession(
        # Speech-to-Text (STT) using Groq's Whisper (non-streaming)
        stt=groq.STT(
            model="whisper-large-v3-turbo",
            language="en",
        ),
        # Voice Activity Detection (required for non-streaming STT)
        vad=silero.VAD.load(),
        # Text-to-Speech (TTS) using Cartesia Sonic-3
        tts=cartesia.TTS(
            model="sonic-3",
            # Default Cartesia English voice; replace with your own if desired
            voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",
        ),
        # Large Language Model (LLM) using Groq's Llama
        llm=groq.LLM(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
        ),
    )

    # Start the session with an Agent that carries the system prompt
    await session.start(
        room=ctx.room,
        agent=Agent(
            instructions=(
                "You are a knowledgeable travel assistant helping users plan trips. "
                "You provide information about destinations, routes, attractions, "
                "travel tips, and local experiences. Keep responses conversational "
                "and helpful. Ask clarifying questions when needed. Focus on practical "
                "advice and authentic travel experiences."
            ),
        ),
    )
    logger.info("Agent session completed")


def main():
    """
    Start the LiveKit agent worker
    """
    # Verify required environment variables
    required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "GROQ_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please add them to your .env file")
        return
    
    logger.info("Starting LiveKit Voice Agent (Groq STT/LLM + Cartesia TTS)...")
    logger.info("Configuration:")
    logger.info(f"  STT: Groq Whisper (whisper-large-v3-turbo)")
    logger.info(f"  TTS: Cartesia Sonic-3 (default voice)")
    logger.info(f"  LLM: Groq Llama (llama-3.3-70b-versatile)")
    
    # Start the agent with worker options
    # Note: we rely on the default worker type (room-based agent),
    # so we don't override worker_type here.
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))


if __name__ == "__main__":
    main()
