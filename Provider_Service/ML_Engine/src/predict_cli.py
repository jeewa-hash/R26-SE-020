"""
predict_cli.py
Called by the Node.js backend via execFile.
Args:   sys.argv[1:] — list of image file paths
Stdout: JSON prediction result (predict_batch output)
"""

import sys
import json

from predictor import ServicePredictor

def main():
    paths = sys.argv[1:]
    if not paths:
        print(json.dumps({"error": "No image paths provided."}))
        sys.exit(1)

    try:
        predictor = ServicePredictor()
        result    = predictor.predict_batch(paths)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()