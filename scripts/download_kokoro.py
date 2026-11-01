#!/usr/bin/env python3
"""Download Kokoro v1.0 ONNX model (~310 MB) and voice embeddings (~27 MB) into models/."""

import urllib.request
from pathlib import Path

FILES = {
    "models/kokoro-v1.0.onnx": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
    "models/voices-v1.0.bin": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
}


def main() -> None:
    Path("models").mkdir(parents=True, exist_ok=True)
    for rel_path, url in FILES.items():
        dest = Path(rel_path)
        if dest.exists() and dest.stat().st_size > 1_000_000:
            print(f"[models] Already exists: {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
            continue
        print(f"[models] Downloading {url} -> {dest} ...")
        urllib.request.urlretrieve(url, dest)
        print(f"[models] Saved {dest} ({dest.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
