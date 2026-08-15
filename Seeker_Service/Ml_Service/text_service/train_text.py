import csv
import os
import sys

# Ensure parent directory (Ml_Service) is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

from joblib import dump
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from utils.preprocess import normalize_text


def _read_dataset(csv_path):
    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = (row.get("text") or "").strip()
            service = (row.get("service") or "").strip()
            sub_service = (row.get("sub_service") or "").strip()

            if text and service and sub_service:
                rows.append((normalize_text(text), service, sub_service))

    return rows


def train_and_save():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # =========================
    # USE EXPANDED DATASET
    # =========================
    dataset_path = os.path.join(base_dir, "data", "text_dataset_expanded.csv")

    rows = _read_dataset(dataset_path)

    if not rows:
        raise ValueError("Dataset is empty. Add data to text_dataset_expanded.csv")

    print("--------------------------------")
    print("Dataset Loaded Successfully")
    print(f"Total samples: {len(rows)}")
    print("--------------------------------")

    # =========================
    # PREPARE DATA
    # =========================
    texts = [r[0] for r in rows]
    service_labels = [r[1] for r in rows]
    sub_service_labels = [r[2] for r in rows]

    # =========================
    # TF-IDF FEATURE EXTRACTION
    # =========================
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 3),
        sublinear_tf=True,
        lowercase=True,
        min_df=1
    )

    X_all = vectorizer.fit_transform(texts)
    print("Text Vectorization Completed (1-3 ngrams, sublinear TF)")

    # =========================
    # EVALUATION ON TRAIN/TEST SPLIT
    # =========================
    print("\n================ EVALUATION ON HELD-OUT TEST SET (20%) ================")
    
    # 1. Service Model Evaluation
    X_tr_s, X_te_s, y_tr_s, y_te_s = train_test_split(
        X_all, service_labels, test_size=0.20, random_state=42, stratify=service_labels
    )
    eval_service_model = LogisticRegression(max_iter=1500, C=2.0)
    eval_service_model.fit(X_tr_s, y_tr_s)
    service_preds = eval_service_model.predict(X_te_s)
    service_acc = accuracy_score(y_te_s, service_preds)
    print(f"Main Service Model Accuracy: {service_acc * 100:.2f}%")
    print("Service Classification Report:")
    print(classification_report(y_te_s, service_preds, digits=4))

    # 2. Sub-Service Model Evaluation
    X_tr_sub, X_te_sub, y_tr_sub, y_te_sub = train_test_split(
        X_all, sub_service_labels, test_size=0.20, random_state=42, stratify=sub_service_labels
    )
    eval_sub_model = LogisticRegression(max_iter=1500, C=2.0)
    eval_sub_model.fit(X_tr_sub, y_tr_sub)
    sub_preds = eval_sub_model.predict(X_te_sub)
    sub_acc = accuracy_score(y_te_sub, sub_preds)
    print(f"Sub-Service Model Accuracy: {sub_acc * 100:.2f}%")
    print("Sub-Service Classification Report:")
    print(classification_report(y_te_sub, sub_preds, digits=4))

    # =========================
    # TRAIN ON FULL DATASET
    # =========================
    print("\n--------------------------------")
    print("Training Final Models on Full Dataset...")
    
    service_model = LogisticRegression(max_iter=1500, C=2.0)
    service_model.fit(X_all, service_labels)

    sub_service_model = LogisticRegression(max_iter=1500, C=2.0)
    sub_service_model.fit(X_all, sub_service_labels)

    # =========================
    # SAVE MODELS
    # =========================
    models_dir = os.path.join(base_dir, "..", "models")
    os.makedirs(models_dir, exist_ok=True)

    dump(vectorizer, os.path.join(models_dir, "text_vectorizer.joblib"))
    dump(service_model, os.path.join(models_dir, "text_service_model.joblib"))
    dump(sub_service_model, os.path.join(models_dir, "text_subservice_model.joblib"))

    print("--------------------------------")
    print("[OK] Training Completed Successfully")
    print(f"Models saved in: {models_dir}")
    print("--------------------------------")


if __name__ == "__main__":
    train_and_save()