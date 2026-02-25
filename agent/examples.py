"""
Advanced Agent Configuration Examples
Demonstrates various configurations for different use cases
"""

from livekit.agents import AgentSession, JobContext
from livekit.plugins import groq
from livekit.agents import llm


# ============================================================================
# EXAMPLE 1: Travel Assistant Agent (for tbo-ai-compass project)
# ============================================================================

async def travel_assistant_entrypoint(ctx: JobContext):
    """
    Voice agent specialized for travel planning and recommendations
    """
    await ctx.connect()
    
    session = AgentSession(
        stt=groq.STT(
            model="whisper-large-v3-turbo",
            language="en",
        ),
        tts=groq.TTS(
            model="playai-tts",
            voice="Sofia-PlayAI",  # Friendly female voice
        ),
        llm=groq.LLM(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
        ),
        chat_ctx={
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a knowledgeable travel assistant helping users plan trips. "
                        "You provide information about destinations, routes, attractions, "
                        "travel tips, and local experiences. Keep responses conversational "
                        "and helpful. Ask clarifying questions when needed. Focus on practical "
                        "advice and authentic travel experiences."
                    )
                }
            ]
        },
    )
    
    session.start(ctx.room)
    await session.wait()


# ============================================================================
# EXAMPLE 2: Customer Support Agent
# ============================================================================

async def customer_support_entrypoint(ctx: JobContext):
    """
    Voice agent for customer service and support
    """
    await ctx.connect()
    
    session = AgentSession(
        stt=groq.STT(
            model="whisper-large-v3-turbo",
            language="en",
        ),
        tts=groq.TTS(
            model="playai-tts",
            voice="Jarvis-PlayAI",  # Professional male voice
        ),
        llm=groq.LLM(
            model="llama-3.3-70b-versatile",
            temperature=0.5,  # More consistent responses
        ),
        chat_ctx={
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a professional customer support agent. "
                        "Be empathetic, patient, and solution-oriented. "
                        "Listen carefully to customer issues and provide clear, "
                        "step-by-step guidance. Always remain calm and professional. "
                        "If you cannot solve an issue, acknowledge it and offer to "
                        "escalate to a human agent."
                    )
                }
            ]
        },
    )
    
    session.start(ctx.room)
    await session.wait()


# ============================================================================
# EXAMPLE 3: Multilingual Agent (with language detection)
# ============================================================================

async def multilingual_entrypoint(ctx: JobContext):
    """
    Voice agent that can handle multiple languages
    """
    await ctx.connect()
    
    session = AgentSession(
        stt=groq.STT(
            model="whisper-large-v3-turbo",
            language="",  # Auto-detect language
        ),
        tts=groq.TTS(
            model="playai-tts",
            voice="Santana-PlayAI",
        ),
        llm=groq.LLM(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
        ),
        chat_ctx={
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a multilingual assistant. Respond in the same language "
                        "the user speaks to you in. Support English, Spanish, French, "
                        "German, Italian, Portuguese, Hindi, and other major languages. "
                        "Be culturally aware and adapt your communication style "
                        "to the language being used."
                    )
                }
            ]
        },
    )
    
    session.start(ctx.room)
    await session.wait()


# ============================================================================
# EXAMPLE 4: Agent with Function Calling (Weather Tool)
# ============================================================================

async def weather_agent_entrypoint(ctx: JobContext):
    """
    Voice agent with function calling capabilities
    """
    await ctx.connect()
    
    # Define a weather tool
    weather_tool = llm.FunctionTool(
        name="get_weather",
        description="Get current weather information for a specific location",
        parameters={
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name or location"
                },
                "units": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature units"
                }
            },
            "required": ["location"]
        }
    )
    
    # Example function implementation
    async def get_weather_impl(location: str, units: str = "celsius"):
        # In a real implementation, call a weather API here
        return {
            "location": location,
            "temperature": 22,
            "units": units,
            "condition": "partly cloudy",
            "humidity": 65
        }
    
    session = AgentSession(
        stt=groq.STT(model="whisper-large-v3-turbo", language="en"),
        tts=groq.TTS(model="playai-tts", voice="Axton-PlayAI"),
        llm=groq.LLM(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            tools=[weather_tool],
        ),
        chat_ctx={
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant that can provide weather information. "
                        "When users ask about weather, use the get_weather function to "
                        "retrieve current conditions. Provide friendly and informative responses."
                    )
                }
            ]
        },
    )
    
    # Register function implementation
    session.register_function("get_weather", get_weather_impl)
    
    session.start(ctx.room)
    await session.wait()


# ============================================================================
# EXAMPLE 5: Low-Latency Agent (Optimized for Speed)
# ============================================================================

async def fast_agent_entrypoint(ctx: JobContext):
    """
    Voice agent optimized for lowest possible latency
    """
    await ctx.connect()
    
    session = AgentSession(
        stt=groq.STT(
            model="whisper-large-v3-turbo",  # Fastest STT model
            language="en",
        ),
        tts=groq.TTS(
            model="playai-tts",
            voice="Quinn-PlayAI",
        ),
        llm=groq.LLM(
            model="llama3-8b-8192",  # Faster, smaller model
            temperature=0.7,
            max_tokens=150,  # Shorter responses = faster
        ),
        chat_ctx={
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a quick and efficient assistant. "
                        "Provide brief, direct answers. Keep responses under 2-3 sentences "
                        "unless more detail is specifically requested. Be helpful but concise."
                    )
                }
            ]
        },
    )
    
    session.start(ctx.room)
    await session.wait()


# ============================================================================
# EXAMPLE 6: Context-Aware Agent (with Memory)
# ============================================================================

async def contextual_agent_entrypoint(ctx: JobContext):
    """
    Voice agent that maintains conversation context and memory
    """
    await ctx.connect()
    
    session = AgentSession(
        stt=groq.STT(model="whisper-large-v3-turbo", language="en"),
        tts=groq.TTS(model="playai-tts", voice="Gideon-PlayAI"),
        llm=groq.LLM(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
        ),
        chat_ctx={
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a conversational AI assistant with excellent memory. "
                        "Remember details from earlier in the conversation and reference "
                        "them naturally. Build rapport by showing you remember what the "
                        "user told you. Ask follow-up questions based on context. "
                        "Be personable and engaging."
                    )
                }
            ]
        },
    )
    
    session.start(ctx.room)
    await session.wait()


# ============================================================================
# EXAMPLE 7: Educational Tutor Agent
# ============================================================================

async def tutor_agent_entrypoint(ctx: JobContext):
    """
    Voice agent designed for educational tutoring
    """
    await ctx.connect()
    
    session = AgentSession(
        stt=groq.STT(model="whisper-large-v3-turbo", language="en"),
        tts=groq.TTS(model="playai-tts", voice="Dexter-PlayAI"),
        llm=groq.LLM(
            model="llama-3.3-70b-versatile",
            temperature=0.6,
        ),
        chat_ctx={
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a patient and encouraging tutor. Break down complex "
                        "topics into simple, digestible explanations. Use analogies "
                        "and examples. Check for understanding by asking questions. "
                        "Praise effort and progress. Adapt your teaching style to the "
                        "student's pace. Never give direct answers to homework - guide "
                        "students to discover solutions themselves."
                    )
                }
            ]
        },
    )
    
    session.start(ctx.room)
    await session.wait()


# ============================================================================
# Configuration Tips
# ============================================================================

"""
CHOOSING THE RIGHT MODEL:

STT Models:
- whisper-large-v3-turbo: Best balance of speed and accuracy (recommended)
- whisper-large-v3: Higher accuracy, slower

TTS Voices (all use playai-tts model):
- Arista-PlayAI: Neutral, professional female
- Axton-PlayAI: Warm, friendly male
- Dexter-PlayAI: Clear, articulate male
- Gideon-PlayAI: Deep, authoritative male
- Hayden-PlayAI: Energetic, youthful
- Jarvis-PlayAI: Professional, business-like
- Quinn-PlayAI: Bright, enthusiastic female
- Santana-PlayAI: Warm, conversational female
- Sofia-PlayAI: Friendly, approachable female

LLM Models:
- llama-3.3-70b-versatile: Best all-around (recommended)
- llama3-70b-8192: Good balance of speed and capability
- llama3-8b-8192: Fastest, good for simple tasks
- mixtral-8x7b-32768: Excellent for reasoning tasks

TEMPERATURE SETTINGS:
- 0.0-0.3: Deterministic, consistent (good for support, FAQs)
- 0.4-0.7: Balanced (good for general conversation)
- 0.8-1.0: Creative, varied (good for brainstorming, storytelling)

OPTIMIZATION TIPS:
1. Use smaller models (llama3-8b) for low-latency needs
2. Limit max_tokens for faster responses
3. Set specific languages in STT to avoid detection overhead
4. Choose appropriate temperature based on use case
5. Use function calling sparingly - adds latency
"""
