import http.server
import socketserver
from pathlib import Path
from datetime import datetime

PORT = 8791
LOG_FILE = Path(__file__).parent / "ocr_debug.log"


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/log":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8", errors="replace")
            with LOG_FILE.open("a", encoding="utf-8") as f:
                f.write(f"\n=== {datetime.now().isoformat()} ===\n{body}\n")
            self.send_response(204)
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving on port {PORT}, logging POST /log to {LOG_FILE}")
        httpd.serve_forever()
