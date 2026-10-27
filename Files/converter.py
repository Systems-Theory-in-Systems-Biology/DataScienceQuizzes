import json
import pandas as pd
from openpyxl import Workbook

def excel_to_json(name: str, name_out: str = "questions.json") -> None:
    """
    Erstellt eine .json Datei aus einer .xlsx Datei. Die Kopfzeile der Excel-Datei sollte folgendermaßen aussehen:
    
    Thema   Frage    Antwort 1    Antwort 2    Antwort 3    Antwort 4    Richtig   Schwierigkeit    Hinweis     Merksatz

    Wobei "Richtig" der Nummer der richtigen Antwort entspricht.

    Parameter
    ----------
    name: str
        Name der .xlsx Datei.
    name_out: str
        Name der zu erstellenden .json Datei.
    """
    df = pd.read_excel(name)
    diff_map = {
        "Einfach": "easy",
        "Schwer": "hard"
    }

    data = {}

    for _, row in df.iterrows():
        topic = row["Thema"]
        answers = [
            row["Antwort 1"],
            row["Antwort 2"],
            row["Antwort 3"],
            row["Antwort 4"]
        ]

        correct = row["Richtig"]

        question = {
            "text": row["Frage"],
            "answers": answers,
            "correct": int(correct) - 1, # Counting in JSON beginning from 0
            "difficulty": diff_map[row["Schwierigkeit"]]
        }

        if "Hinweis" in df.columns and pd.notna(row["Hinweis"]):
            hint_val = str(row["Hinweis"]).strip()
            if hint_val and hint_val.lower() != "nan":
                question["hint"] = hint_val

        if "Merksatz" in df.columns and pd.notna(row["Merksatz"]):
            note_val = str(row["Merksatz"]).strip()
            if note_val and note_val.lower() != "nan":
                question["note"] = note_val

        if topic not in data:
            data[topic] = []
        data[topic].append(question)

    with open(name_out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    return None

def json_to_excel(name: str, name_out: str) -> None:
    """
    Erstellt eine .xsls Datei aus einer .json Datei. Die JSON sollte folgendermaßen strukturiert sein:
    {
    "Topic": [
        {
            "text": "Question",
            "answers": [
                "Answer 1",
                "Answer 2",
                "Answer 3",
                "Answer 4"
            ],
            "correct": 0, 
            "difficulty": "easy",
            "hint": "Some hint",
            "note": "Some noteworthy message"
        }
    ]
    }
    Both "hint" and "note" are optional.

    Parameter
    ----------
    name: str
        Name der .json Datei.
    name_out: str
        Name der zu erstellenden .xlsx Datei.
    """
    diff_map = {
        "Einfach": "easy",
        "Schwer": "hard",
        "easy": "Einfach",
        "hard": "Schwer"
    }    
    with open(name, "r", encoding="utf-8") as file:
        data = json.load(file)
    wb = Workbook()
    ws = wb.active
    ws.title = "Quizfragen"

    headers = ["Thema", "Frage", "Antwort 1", "Antwort 2", "Antwort 3", "Antwort 4", "Richtig", "Schwierigkeit", "Hinweis", "Merksatz"]
    ws.append(headers)

    for topic, questions in data.items():
        for q in questions:
            answers = q.get("answers", [])
            ans1 = answers[0] if len(answers) > 0 else ""
            ans2 = answers[1] if len(answers) > 1 else ""
            ans3 = answers[2] if len(answers) > 2 else ""
            ans4 = answers[3] if len(answers) > 3 else ""

            correct = q.get("correct") + 1 # Counting in Excel beginning from 1

            diff = q.get("difficulty", "easy")
            difficulty = diff_map.get(diff, diff)
            hint = q.get("hint", "")
            note = q.get("note", "")

            row = [
                topic, q.get("text"), ans1, ans2, ans3, ans4, correct, difficulty, hint, note
            ]
            ws.append(row)
    wb.save(name_out)

    return None

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Konvertiert eine hochgeladene Excel-Datei in questions.json.")
    parser.add_argument("input_xlsx", help="Pfad zur Excel-Datei, die konvertiert werden soll.")

    args = parser.parse_args()

    excel_to_json(name=args.input_xlsx, name_out="questions.json")