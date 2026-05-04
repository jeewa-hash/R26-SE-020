import csv
import os
import random
from collections import defaultdict
from joblib import dump
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from utils.preprocess import normalize_text
TARGET_PER_SUBSERVICE = 80
RANDOM_SEED = 42

TEXT_PREFIXES = [
    "need",
    "please",
    "can you",
    "i want",
    "looking for",
    "urgent",
    "plz",
]

TEXT_SUFFIXES = [
    "today",
    "soon",
    "for my home",
    "for my place",
    "asap",
    "",
]

TYPO_MAP = {
    "cleaning": "clening",
    "kitchen": "kichen",
    "bathroom": "bathrom",
    "garden": "gardan",
    "maintenance": "maintaince",
    "child": "chlid",
    "elderly": "eldery",
    "support": "suport",
    "service": "servis",
}


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


def _inject_typo(text):
    words = text.split()
    if not words:
        return text
    idx = random.randrange(len(words))
    replacement = TYPO_MAP.get(words[idx], words[idx])
    words[idx] = replacement
    return " ".join(words)


def _variant_phrases(base):
    variants = {
        base,
        f"{random.choice(TEXT_PREFIXES)} {base}",
        f"{base} {random.choice(TEXT_SUFFIXES)}".strip(),
        f"{random.choice(TEXT_PREFIXES)} {base} {random.choice(TEXT_SUFFIXES)}".strip(),
    }
    # Add one low-literacy/noisy variant
    variants.add(_inject_typo(base))
    return {normalize_text(v) for v in variants if v.strip()}


def _expand_rows(rows, target_per_subservice=TARGET_PER_SUBSERVICE):
    grouped = defaultdict(list)
    for text, service, sub_service in rows:
        grouped[sub_service].append((text, service, sub_service))

    expanded = []
    for sub_service, samples in grouped.items():
        service = samples[0][1]
        unique_texts = {s[0] for s in samples}
        pool = set(unique_texts)

        # Generate paraphrase-like variants until target count.
        base_texts = list(unique_texts)
        while len(pool) < target_per_subservice:
            base = random.choice(base_texts)
            for variant in _variant_phrases(base):
                pool.add(variant)
                if len(pool) >= target_per_subservice:
                    break

        selected = sorted(pool)[:target_per_subservice]
        expanded.extend((txt, service, sub_service) for txt in selected)

    return expanded


def _write_expanded_dataset(path, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "service", "sub_service"])
        for text, service, sub_service in rows:
            writer.writerow([text, service, sub_service])


def train_and_save():
    random.seed(RANDOM_SEED)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, "data", "text_dataset.csv")
    rows = _read_dataset(dataset_path)
    if not rows:
        raise ValueError("Dataset is empty. Add rows to text_service/data/text_dataset.csv")

    expanded_rows = _expand_rows(rows, target_per_subservice=TARGET_PER_SUBSERVICE)
    expanded_csv = os.path.join(base_dir, "data", "text_dataset_expanded.csv")
    _write_expanded_dataset(expanded_csv, expanded_rows)

    texts = [r[0] for r in expanded_rows]
    service_labels = [r[1] for r in expanded_rows]
    sub_service_labels = [r[2] for r in expanded_rows]

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), lowercase=True)
    x = vectorizer.fit_transform(texts)

    service_model = LogisticRegression(max_iter=1200)
    sub_service_model = LogisticRegression(max_iter=1200)
    service_model.fit(x, service_labels)
    sub_service_model.fit(x, sub_service_labels)

    models_dir = os.path.join(base_dir, "..", "models")
    os.makedirs(models_dir, exist_ok=True)
    dump(vectorizer, os.path.join(models_dir, "text_vectorizer.joblib"))
    dump(service_model, os.path.join(models_dir, "text_service_model.joblib"))
    dump(sub_service_model, os.path.join(models_dir, "text_subservice_model.joblib"))
    print(f"Saved text models to: {models_dir}")
    print(f"Expanded dataset saved: {expanded_csv}")
    print(f"Total expanded samples: {len(expanded_rows)}")


if __name__ == "__main__":
    train_and_save()
