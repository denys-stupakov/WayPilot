from flask import Flask, send_from_directory
from routes.plot import plot_blueprint
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR)
app.register_blueprint(plot_blueprint)
@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")
@app.route("/static/<path:filename>")
def static_file(filename):
    return send_from_directory(STATIC_DIR, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)