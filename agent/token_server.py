"""
Minimal token server for the frontend: create a LiveKit room and return a token.
Run with: python token_server.py
Then frontend can GET /token?room=playground-xyz to get a token for that room.
"""

import os
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_token(room_name: str, participant_identity: str = "user") -> str:
    from livekit.api import AccessToken, VideoGrants

    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    if not all([api_key, api_secret]):
        raise ValueError("LIVEKIT_API_KEY, LIVEKIT_API_SECRET required")

    token = (
        AccessToken(api_key, api_secret)
        .with_identity(participant_identity)
        .with_name(participant_identity)
        .with_grants(VideoGrants(room_join=True, room=room_name))
    )
    return token.to_jwt()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/token":
            self.send_response(404)
            self.end_headers()
            return
        q = parse_qs(parsed.query)
        room = (q.get("room") or ["playground-default"])[0]
        identity = (q.get("identity") or ["user"])[0]
        try:
            token = get_token(room, identity)
            ws_url = os.getenv("LIVEKIT_URL", "").strip()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            body = {"token": token, "room": room}
            if ws_url:
                body["wsUrl"] = ws_url
            import json as _json
            self.wfile.write(_json.dumps(body).encode())
        except Exception as e:
            logger.exception("Token error")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error":"{str(e)}"}}'.encode())

    def log_message(self, format, *args):
        logger.info("%s - %s", self.address_string(), format % args)


def main():
    from dotenv import load_dotenv
    load_dotenv()
    port = int(os.getenv("TOKEN_SERVER_PORT", "8765"))
    server = HTTPServer(("", port), Handler)
    logger.info("Token server on http://localhost:%s — GET /token?room=ROOM", port)
    server.serve_forever()


if __name__ == "__main__":
    main()
