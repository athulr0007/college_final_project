from flask import Flask, request, jsonify
import pdfplumber
import io
import spacy
from spacy.matcher import PhraseMatcher

# Load NLP model
nlp = spacy.load("en_core_web_sm")
matcher = PhraseMatcher(nlp.vocab)

# Predefined skills list (extendable)
SKILLS_LIST = {"Python", "HTML", "CSS", "JS", "JavaScript", "Java", "C", "C++", "SQL", "PostgreSQL", "Machine Learning", "Django", "Flask", "React", "Node.js"}
patterns = [nlp.make_doc(skill) for skill in SKILLS_LIST]
matcher.add("SKILLS", None, *patterns)

app = Flask(__name__)

def extract_text_from_pdf(pdf_bytes):
    """Extract text from PDF."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        text = " ".join([page.extract_text() for page in pdf.pages if page.extract_text()])
    return text

def extract_skills_with_spacy(text):
    """Extract skills using SpaCy and PhraseMatcher."""
    doc = nlp(text)
    matches = matcher(doc)
    skills_found = {doc[start:end].text for match_id, start, end in matches}
    return list(skills_found)

@app.route("/parse", methods=["POST"])
def parse_resume():
    """Parse resume and extract details."""
    file = request.data
    if not file:
        return jsonify({"error": "No file received"}), 400

    text = extract_text_from_pdf(file)
    skills = extract_skills_with_spacy(text)

    print("Extracted Skills:", skills)

    return jsonify({"skills": skills})

if __name__ == "__main__":
    app.run(port=5001, debug=True)