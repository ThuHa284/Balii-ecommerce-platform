import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any


WORKER_DIR = Path(__file__).resolve().parent
ROOT_DIR = WORKER_DIR.parent.parent
NODE_SCRIPT = ROOT_DIR / "scripts" / "google-lens-search.cjs"


def run_real_google_lens(
    image_url: str | None,
    keyword: str | None,
    limit: int,
    image_bytes: bytes | None = None,
    image_filename: str | None = None,
) -> list[dict[str, Any]]:
    if not NODE_SCRIPT.exists():
        raise RuntimeError(f"Node script not found: {NODE_SCRIPT}")

    command = ["node", str(NODE_SCRIPT), "--limit", str(limit)]

    temp_file_path: str | None = None

    try:
        if image_url:
          command.extend(["--imageUrl", image_url])

        if image_bytes is not None:
            suffix = Path(image_filename or "upload.jpg").suffix or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(image_bytes)
                temp_file_path = temp_file.name

            command.extend(["--imagePath", temp_file_path])

        env = os.environ.copy()
        if keyword:
            env["LENS_SEARCH_KEYWORD"] = keyword

        completed = subprocess.run(
            command,
            cwd=ROOT_DIR,
            env=env,
            capture_output=True,
            text=True,
            timeout=int(os.getenv("LENS_NODE_TIMEOUT_SECONDS", "120")),
        )

        if completed.returncode != 0:
            stderr = (completed.stderr or "").strip()

            try:
                error_payload = json.loads(stderr) if stderr else {}
            except json.JSONDecodeError:
                error_payload = {}

            message = error_payload.get("error") or stderr or "Unknown Google Lens error"
            raise RuntimeError(message)

        payload = json.loads(completed.stdout or "{}")
        if not payload.get("success"):
            raise RuntimeError(payload.get("error") or "Unknown Google Lens error")

        data = payload.get("data")
        return data if isinstance(data, list) else []
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
