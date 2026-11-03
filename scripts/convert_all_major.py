import os
import re
import json
from pypdf import PdfReader

BASE_DIR = "/Users/home/Downloads/ข้อสอบครู"
OUTPUT_PATH = "/Users/home/Downloads/ข้อสอบครู/teacher-exam-app/public/data/questions/kb-major.json"
DIST_OUTPUT_PATH = "/Users/home/Downloads/ข้อสอบครู/teacher-exam-app/dist/data/questions/kb-major.json"

CHOICE_MAP = {"ก": 0, "ข": 1, "ค": 2, "ง": 3}

# Physics Answers
physics_answers = {
    "1. ธรรมชาติของฟิสิกส์": {
        1:"ก", 2:"ข", 3:"ข", 4:"ก", 5:"ข", 6:"ข", 7:"ก", 8:"ก", 9:"ก", 10:"ข", 11:"ข", 12:"ก", 13:"ข", 14:"ค", 15:"ข"
    },
    "2.1 แรงลัพธ์": {
        1:"ก", 2:"ค", 3:"ข", 4:"ค", 5:"ข"
    },
    "2.2 แรงเสียดทาน": {
        1:"ข", 2:"ข", 3:"ก", 4:"ข", 5:"ข", 6:"ข", 7:"ค", 8:"ค"
    }
}

# Chemistry Answers
chem_answers = {
    "1. เคมีพื้นฐาน": {
        1:"ค", 2:"ง", 3:"ง", 4:"ข", 5:"ก", 6:"ง", 7:"ข", 8:"ค", 9:"ง", 10:"ค",
        11:"ข", 12:"ก", 13:"ข", 14:"ก", 15:"ข", 16:"ค", 17:"ข", 18:"ค", 19:"ค", 20:"ข",
        21:"ง", 22:"ค", 23:"ค", 24:"ค", 25:"ค", 26:"ง"
    },
    "2. สารละลาย": {
        1:"ค", 2:"ก", 3:"ง", 4:"ก", 5:"ค", 6:"ก", 7:"ค", 8:"ค", 9:"ก", 10:"ค",
        11:"ค", 12:"ก", 13:"ข"
    }
}

# Biology Answers
bio_answers = {
    "เรื่องที่ 1 เซลล์": {
        1:"ง", 2:"ก", 3:"ง", 4:"ก", 5:"ค", 6:"ค", 7:"ง", 8:"ข", 9:"ข", 10:"ก",
        11:"ก", 12:"ข", 13:"ก", 14:"ค", 15:"ง", 16:"ข", 17:"ข", 18:"ก", 19:"ง", 20:"ข",
        21:"ข", 22:"ง", 23:"ง", 24:"ค", 25:"ค", 26:"ก", 27:"ก", 28:"ง", 29:"ก", 30:"ข",
        31:"ข", 32:"ค", 33:"ค", 34:"ข", 35:"ง", 36:"ก", 37:"ค", 38:"ค", 39:"ข", 40:"ค"
    },
    "เรื่องที่ 2 การแบ่งเซลล์": {
        1:"ก", 2:"ข", 3:"ง", 4:"ข", 5:"ง"
    }
}

earth_raw_p1 = """
1 ค 22 ง 2 ง 23 ข 3 ก 24 ข 4 ค 25 ค 5 ข 26 ข 6 ข 27 ข 7 ก 28 ง 8 ข 29 ข 9 ข 30 ค 10 ข 31 ง
11 ก 32 ค 12 ข 33 ข 13 ข 34 ง 14 ข 35 ค 15 ก 36 ง 16 ง 37 ง 17 ก 38 ก 18 ง 39 ข 19 ข 40 ข 20 ง 41 ก 21 ง
"""

earth_raw_p2 = """
1 ก 28 ค 2 ข 29 ก 3 ง 30 ง 4 ข 31 ข 5 ข 32 ง 6 ข 33 ง 7 ค 34 ง 8 ก 35 ง 9 ข 36 ง 10 ค 37 ก
11 ก 38 ค 12 ง 39 ง 13 ง 40 ค 14 ข 41 ก 15 ก 42 ง 16 ก 43 ข 17 ก 44 ข 18 ค 45 ข 19 ค 46 ข 20 ก 47 ค
21 ค 48 ข 22 ค 49 ข 23 ข 50 ข 24 ค 51 ข 25 ก 52 ข 26 ก 53 ค 27 ค 54 ข
"""

earth_raw_water = """
1 ข 11 ข 2 ข 12 ค 3 ง 13 ข 4 ง 14 ข 5 ก 15 ก 6 ก 16 ค 7 ก 17 ค 8 ง 18 ข 9 ก 19 ก 10 ข 20 ค
"""

earth_raw_fuel = """
1 ก 16 ค 2 ง 17 ข 3 ก 18 ข 4 ข 19 ค 5 ค 20 ง 6 ข 21 ค 7 ก 22 ง 8 ก 23 ง 9 ค 10 ข 11 ค 12 ข 13 ง 14 ข 15 ง
"""

def parse_pairs(t):
    return {int(m[0]): m[1] for m in re.findall(r"(\d+)\s+([ก-ง])", t)}

earth_sec1_answers = parse_pairs(earth_raw_p1)
earth_sec2_answers = parse_pairs(earth_raw_p2)
earth_water_answers = parse_pairs(earth_raw_water)
earth_fuel_answers = parse_pairs(earth_raw_fuel)

def parse_md(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    sections = re.split(r"\n(?=#{1,3}\s+)", text)
    result = []
    for s in sections:
        if not s.strip(): continue
        lines = s.strip().split("\n")
        header = lines[0].replace("#", "").strip()
        q_blocks = re.split(r"\n(?=\s*\d+\.\s+)", "\n" + s)
        for block in q_blocks:
            m = re.match(r"^(\d+)\.\s*(.+)", block.strip(), re.DOTALL)
            if not m: continue
            q_num = int(m.group(1))
            body = m.group(2).strip()
            parts = re.split(r"\n(?=\s*[ก-ง][\.\s\)])", "\n" + body)
            q_text = parts[0].strip()
            choices = [re.sub(r"^\s*[ก-ง][\.\s\)]*", "", cp.strip()).strip() for cp in parts[1:] if cp.strip()]
            if len(choices) >= 4:
                result.append({
                    "section": header,
                    "q_num": q_num,
                    "question": q_text,
                    "choices": choices[:4]
                })
    return result

phys_items = parse_md(f"{BASE_DIR}/วิทยาศาสตร์ – ฟิสิกส์.md")
chem_items = parse_md(f"{BASE_DIR}/วิทยาศาสตร์ – เคมี.md")
bio_items = parse_md(f"{BASE_DIR}/วิทยาศาสตร์ – ชีวะ.md")
earth_items = parse_md(f"{BASE_DIR}/วิทยาศาสตร์ - โลกดาราศาสตร์ และอวกาศ.md")

all_q = []

# Process Physics
for item in phys_items:
    q_num, sec = item["q_num"], item["section"]
    if "1. ธรรมชาติ" in sec:
        subtopic = "1. ธรรมชาติของฟิสิกส์ ปริมาณทางฟิสิกส์ หน่วย และ การวัด"
        ans_letter = physics_answers["1. ธรรมชาติของฟิสิกส์"].get(q_num, "ก")
    else:
        subtopic = "2. แรงในชีวิตประจำวัน (แรงลัพธ์, แรงเสียดทาน...)"
        if "2.1" in sec:
            ans_letter = physics_answers["2.1 แรงลัพธ์"].get(q_num, "ก")
        else:
            ans_letter = physics_answers["2.2 แรงเสียดทาน"].get(q_num, "ก")

    ans_idx = CHOICE_MAP.get(ans_letter, 0)
    all_q.append({
        "id": f"kb-major-phys-{len(all_q)+1:03d}",
        "subject": "kb-major",
        "discipline": "⚡ ฟิสิกส์",
        "topic": subtopic,
        "question": item["question"],
        "choices": item["choices"],
        "answer": ans_idx,
        "explanation": f"เฉลยข้อ {ans_letter} ({item['choices'][ans_idx]}) ตามคู่มือเฉลยข้อสอบครูผู้ช่วย วิชาเอกวิทยาศาสตร์ ({subtopic})",
        "source": "ข้อสอบครูผู้ช่วย วิชาเอกวิทยาศาสตร์ (ฟิสิกส์)"
    })

# Process Chemistry
for item in chem_items:
    q_num, sec = item["q_num"], item["section"]
    if "1. เคมีพื้นฐาน" in sec:
        subtopic = "1. เคมีพื้นฐาน สารในชีวิตประจำวัน"
        ans_letter = chem_answers["1. เคมีพื้นฐาน"].get(q_num, "ค")
    else:
        subtopic = "2. สารละลายและร้อยละความเข้มข้น"
        ans_letter = chem_answers["2. สารละลาย"].get(q_num, "ค")

    ans_idx = CHOICE_MAP.get(ans_letter, 0)
    all_q.append({
        "id": f"kb-major-chem-{len(all_q)+1:03d}",
        "subject": "kb-major",
        "discipline": "🧪 เคมี",
        "topic": subtopic,
        "question": item["question"],
        "choices": item["choices"],
        "answer": ans_idx,
        "explanation": f"เฉลยข้อ {ans_letter} ({item['choices'][ans_idx]}) ตามคู่มือเฉลยข้อสอบครูผู้ช่วย วิชาเอกวิทยาศาสตร์ ({subtopic})",
        "source": "ข้อสอบครูผู้ช่วย วิชาเอกวิทยาศาสตร์ (เคมี)"
    })

# Process Biology
for item in bio_items:
    q_num, sec = item["q_num"], item["section"]
    if "เรื่องที่ 1" in sec:
        subtopic = "1. เซลล์ และ การลำเลียงสารผ่านเซลล์"
        ans_letter = bio_answers["เรื่องที่ 1 เซลล์"].get(q_num, "ก")
    else:
        subtopic = "2. การแบ่งเซลล์"
        ans_letter = bio_answers["เรื่องที่ 2 การแบ่งเซลล์"].get(q_num, "ก")

    ans_idx = CHOICE_MAP.get(ans_letter, 0)
    all_q.append({
        "id": f"kb-major-bio-{len(all_q)+1:03d}",
        "subject": "kb-major",
        "discipline": "🧬 ชีววิทยา",
        "topic": subtopic,
        "question": item["question"],
        "choices": item["choices"],
        "answer": ans_idx,
        "explanation": f"เฉลยข้อ {ans_letter} ({item['choices'][ans_idx]}) ตามคู่มือเฉลยข้อสอบครูผู้ช่วย วิชาเอกวิทยาศาสตร์ ({subtopic})",
        "source": "ข้อสอบครูผู้ช่วย วิชาเอกวิทยาศาสตร์ (ชีววิทยา)"
    })

# Process Earth & Space
for item in earth_items:
    q_num, sec = item["q_num"], item["section"]
    if "1. โครงสร้าง" in sec:
        subtopic = "1. โครงสร้างของโลก และ การเปลี่ยนแปลงของเปลือกโลก"
        ans_letter = earth_sec1_answers.get(q_num, "ก")
    elif "2. ทรัพยากรณ์ดิน" in sec:
        subtopic = "2. ทรัพยากรณ์ - ดิน"
        ans_letter = earth_sec2_answers.get(q_num, "ก")
    elif "3. ทรัพยากรณ์หิน" in sec:
        subtopic = "3. ทรัพยากรณ์ - หินและแร่ธาตุ"
        ans_letter = earth_sec2_answers.get(20 + q_num, "ก")
    elif "4. ทรัพยากรณ์น้ำ" in sec:
        subtopic = "4. ทรัพยากรณ์ - น้ำ"
        ans_letter = earth_water_answers.get(q_num, "ก")
    elif "5. เชื้อเพลิง" in sec:
        subtopic = "5. เชื้อเพลิง และ พลังงานทดแทน"
        ans_letter = earth_fuel_answers.get(q_num, "ก")
    else:
        subtopic = "1. โครงสร้างของโลก และ การเปลี่ยนแปลงของเปลือกโลก"
        ans_letter = "ก"

    ans_idx = CHOICE_MAP.get(ans_letter, 0)
    all_q.append({
        "id": f"kb-major-earth-{len(all_q)+1:03d}",
        "subject": "kb-major",
        "discipline": "🪐 โลก ดาราศาสตร์ และอวกาศ",
        "topic": subtopic,
        "question": item["question"],
        "choices": item["choices"],
        "answer": ans_idx,
        "explanation": f"เฉลยข้อ {ans_letter} ({item['choices'][ans_idx]}) ตามคู่มือเฉลยข้อสอบครูผู้ช่วย วิชาเอกวิทยาศาสตร์ ({subtopic})",
        "source": "ข้อสอบครูผู้ช่วย วิชาเอกวิทยาศาสตร์ (โลก ดาราศาสตร์ และอวกาศ)"
    })

print(f"Total recompiled: {len(all_q)} questions")

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(all_q, f, ensure_ascii=False, indent=2)

if os.path.exists(os.path.dirname(DIST_OUTPUT_PATH)):
    with open(DIST_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_q, f, ensure_ascii=False, indent=2)

print("Saved to", OUTPUT_PATH)
