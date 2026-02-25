"""
Test script for LiveKit Voice Agent
Run this to verify your agent setup is working correctly
"""

import asyncio
import logging
import os
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def check_environment():
    """Check if all required environment variables are set"""
    required_vars = {
        "GROQ_API_KEY": "Groq API key for STT/TTS/LLM",
        "LIVEKIT_URL": "LiveKit server URL",
        "LIVEKIT_API_KEY": "LiveKit API key",
        "LIVEKIT_API_SECRET": "LiveKit API secret"
    }
    
    missing = []
    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value or value.startswith("your_"):
            missing.append(f"  - {var}: {description}")
            logger.error(f"❌ {var} is not set")
        else:
            logger.info(f"✅ {var} is set")
    
    return len(missing) == 0, missing


def check_dependencies():
    """Check if required packages are installed"""
    required_packages = {
        "livekit": "LiveKit Python SDK",
        "livekit.agents": "LiveKit Agents framework",
        "livekit.plugins.groq": "Groq plugin for LiveKit"
    }
    
    missing = []
    for package, description in required_packages.items():
        try:
            __import__(package)
            logger.info(f"✅ {package} is installed")
        except ImportError:
            missing.append(f"  - {package}: {description}")
            logger.error(f"❌ {package} is not installed")
    
    return len(missing) == 0, missing


async def test_groq_connection():
    """Test connection to Groq API"""
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Test with a simple completion
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": "Say 'test successful' if you can hear me."}],
            model="llama3-8b-8192",
            max_tokens=10
        )
        
        logger.info("✅ Groq API connection successful")
        logger.info(f"   Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        logger.error(f"❌ Groq API connection failed: {e}")
        return False


def print_configuration():
    """Print current configuration"""
    logger.info("\n" + "="*60)
    logger.info("Current Configuration:")
    logger.info("="*60)
    logger.info(f"LiveKit URL: {os.getenv('LIVEKIT_URL', 'NOT SET')}")
    logger.info(f"Groq API Key: {'***' + os.getenv('GROQ_API_KEY', '')[-8:] if os.getenv('GROQ_API_KEY') else 'NOT SET'}")
    logger.info("="*60 + "\n")


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("LiveKit Voice Agent - Setup Test")
    print("="*60 + "\n")
    
    # Check environment variables
    logger.info("1. Checking environment variables...")
    env_ok, env_missing = check_environment()
    
    if not env_ok:
        logger.error("\n❌ Missing environment variables:")
        for item in env_missing:
            logger.error(item)
        logger.error("\nPlease set these in your .env file")
        return False
    
    logger.info("✅ All environment variables are set\n")
    
    # Check dependencies
    logger.info("2. Checking Python dependencies...")
    deps_ok, deps_missing = check_dependencies()
    
    if not deps_ok:
        logger.error("\n❌ Missing Python packages:")
        for item in deps_missing:
            logger.error(item)
        logger.error("\nInstall with: pip install -r requirements.txt")
        return False
    
    logger.info("✅ All dependencies are installed\n")
    
    # Test Groq connection
    logger.info("3. Testing Groq API connection...")
    groq_ok = await test_groq_connection()
    
    if not groq_ok:
        logger.error("\n❌ Groq API connection failed")
        logger.error("Check your GROQ_API_KEY in .env file")
        return False
    
    logger.info("✅ Groq API connection successful\n")
    
    # Print configuration
    print_configuration()
    
    # All tests passed
    logger.info("\n" + "="*60)
    logger.info("✅ All tests passed! Your agent is ready to run.")
    logger.info("="*60)
    logger.info("\nTo start the agent, run:")
    logger.info("  python agent.py dev")
    logger.info("\n" + "="*60 + "\n")
    
    return True


if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        exit(0 if result else 1)
    except KeyboardInterrupt:
        logger.info("\nTest interrupted by user")
        exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}")
        exit(1)
