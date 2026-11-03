#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sync Questions Script for Teacher Exam App
- Scans /public/data/questions/ recursively
- Detects all topic JSON files in subfolders
- Validates JSON format
- Generates manifest.json mapping subjectId -> [relative file paths]
- Bundles each subject into /public/data/questions/<subject-id>.json for backwards compatibility and fast single-fetch
"""

import os
import json
import glob

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
QUESTIONS_DIR = os.path.join(BASE_DIR, "public", "data", "questions")
DIST_QUESTIONS_DIR = os.path.join(BASE_DIR, "dist", "data", "questions")

SUBJECT_IDS = [
    "ka-analysis",
    "ka-english",
    "ka-civil",
    "kb-teaching",
    "kb-law",
    "kb-reform",
    "kb-general",
    "kb-major"
]

def sync_all():
    print("🔄 Scanning question files in", QUESTIONS_DIR)
    manifest = {}
    stats = {}

    for subject_id in SUBJECT_IDS:
        subject_folder = os.path.join(QUESTIONS_DIR, subject_id)
        if not os.path.exists(subject_folder):
            continue

        file_list = []
        combined_questions = []

        # Find all .json files inside subject folder (sorted)
        for root, dirs, files in os.walk(subject_folder):
            dirs.sort()
            for file in sorted(files):
                if not file.endswith(".json"):
                    continue
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, QUESTIONS_DIR)
                file_list.append(rel_path)

                try:
                    with open(abs_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        combined_questions.extend(data)
                    else:
                        print(f"⚠️ Warning: {rel_path} does not contain a list of questions")
                except Exception as e:
                    print(f"❌ Error reading {rel_path}: {e}")

        manifest[subject_id] = file_list
        stats[subject_id] = {
            "files": len(file_list),
            "questions": len(combined_questions)
        }

        # Write merged <subject-id>.json
        merged_path = os.path.join(QUESTIONS_DIR, f"{subject_id}.json")
        with open(merged_path, "w", encoding="utf-8") as f:
            json.dump(combined_questions, f, ensure_ascii=False, indent=2)

        # Also update dist if it exists
        if os.path.exists(DIST_QUESTIONS_DIR):
            dist_merged = os.path.join(DIST_QUESTIONS_DIR, f"{subject_id}.json")
            with open(dist_merged, "w", encoding="utf-8") as f:
                json.dump(combined_questions, f, ensure_ascii=False, indent=2)

    # Save manifest.json
    manifest_path = os.path.join(QUESTIONS_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    if os.path.exists(DIST_QUESTIONS_DIR):
        dist_manifest = os.path.join(DIST_QUESTIONS_DIR, "manifest.json")
        with open(dist_manifest, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n✅ Sync Complete! Summary:")
    print("--------------------------------------------------")
    for sub, info in stats.items():
        print(f" • {sub:<15}: {info['files']:>2} ไฟล์, รวม {info['questions']:>3} ข้อ")
    print("--------------------------------------------------")
    total_q = sum(info["questions"] for info in stats.values())
    total_f = sum(info["files"] for info in stats.values())
    print(f" รวมทั้งหมด: {total_f} ไฟล์, {total_q} ข้อสอบ")

if __name__ == "__main__":
    sync_all()
