from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import secrets
import time


DATA_PATH = Path(__file__).with_name("circle-safe-data.json")
PORT = int(os.environ.get("PORT", "5175"))
SESSION_MAX_AGE = 60 * 60 * 24 * 7
ACCOUNTS = {
    "parent": {
        "password": os.environ.get("CIRCLESAFE_PARENT_PASSWORD", "parent123"),
        "role": "parent",
    },
    "child": {
        "password": os.environ.get("CIRCLESAFE_CHILD_PASSWORD", "child123"),
        "role": "child",
    },
}
SESSIONS = {}
DEFAULT_STATE = {
    "latestLocation": None,
    "contacts": [{"name": "Emergency contact", "route": "9930679739"}],
    "lastCheckin": "",
    "activeAlert": "",
    "isSharingLive": False,
}


def read_state():
    if not DATA_PATH.exists():
        write_state(DEFAULT_STATE)
        return DEFAULT_STATE.copy()
    try:
        return {**DEFAULT_STATE, **json.loads(DATA_PATH.read_text(encoding="utf-8"))}
    except json.JSONDecodeError:
        return DEFAULT_STATE.copy()


def write_state(state):
    DATA_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def read_body(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    body = handler.rfile.read(length).decode("utf-8")
    return json.loads(body or "{}")


class CircleSafeHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        origin = self.headers.get("Origin")
        self.send_header("Access-Control-Allow-Origin", origin or "*")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/me":
            session = self.current_session()
            if not session:
                self.send_json({"authenticated": False}, status=401)
                return
            self.send_json({"authenticated": True, "role": session["role"]})
            return

        if self.path == "/api/state":
            if not self.require_session():
                return
            self.send_json(read_state())
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/login":
            payload = read_body(self)
            username = str(payload.get("username", "")).strip().lower()
            password = str(payload.get("password", ""))
            account = ACCOUNTS.get(username)
            if not account or account["password"] != password:
                self.send_json({"error": "Invalid username or password"}, status=401)
                return

            token = secrets.token_urlsafe(32)
            SESSIONS[token] = {
                "role": account["role"],
                "username": username,
                "expires": time.time() + SESSION_MAX_AGE,
            }
            self.send_json(
                {"authenticated": True, "role": account["role"]},
                headers={
                    "Set-Cookie": (
                        f"circlesafe_session={token}; HttpOnly; Path=/; "
                        f"Max-Age={SESSION_MAX_AGE}; SameSite=Lax"
                    )
                },
            )
            return

        if self.path == "/api/logout":
            token = self.session_token()
            if token:
                SESSIONS.pop(token, None)
            self.send_json(
                {"authenticated": False},
                headers={
                    "Set-Cookie": "circlesafe_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
                },
            )
            return

        if self.path != "/api/state":
            self.send_error(404)
            return

        if not self.require_session():
            return

        incoming = read_body(self)
        state = read_state()
        state.update(incoming)
        write_state(state)
        self.send_json(state)

    def session_token(self):
        header = self.headers.get("Cookie", "")
        jar = cookies.SimpleCookie(header)
        morsel = jar.get("circlesafe_session")
        return morsel.value if morsel else ""

    def current_session(self):
        token = self.session_token()
        session = SESSIONS.get(token)
        if not session:
            return None
        if session["expires"] < time.time():
            SESSIONS.pop(token, None)
            return None
        return session

    def require_session(self):
        if self.current_session():
            return True
        self.send_json({"error": "Please log in first"}, status=401)
        return False

    def send_json(self, payload, status=200, headers=None):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), CircleSafeHandler)
    print(f"CircleSafe running on port {PORT}")
    server.serve_forever()
