# Mock Interview System with AI Integration and Resume Parser

This project is designed to provide a robust AI-powered mock interview system, integrated with resume parsing to extract relevant skills for tailored interview questions. The system leverages a combination of technologies including Node.js, Flask, MongoDB, and the Gemini API to simulate real interview experiences and evaluate user responses.

## Features

- **AI-Powered Mock Interviews**: 
  - The system generates adaptive interview questions based on the candidate's resume skills using the Gemini API.
  - Real-time feedback is provided to the user regarding their responses, focusing on clarity, relevance, and overall performance.
  
- **Resume Parsing**:
  - A Flask-based API to extract skills from a PDF resume using SpaCy's `PhraseMatcher` and predefined skill sets.
  
- **MongoDB Integration**:
  - The system stores user responses, interview questions, and other data in a MongoDB database for tracking interview progress.

## Tech Stack

- **Backend**:
  - **Node.js** with **Express**: For building the core mock interview system.
  - **Flask**: For the resume parsing service.
  - **MongoDB**: To store interview data and user information.
  - **Gemini API**: To generate interview questions and evaluate answers.
  
- **Natural Language Processing**:
  - **SpaCy**: Used for resume skill extraction via the `PhraseMatcher`.

## Project Structure

├── ai.js # AI logic for generating questions and evaluating answers ├── resparser.py # Flask-based API for resume parsing ├── server.js # Entry point for the mock interview system (Node.js) ├── package.json # Dependencies for Node.js ├── requirements.txt # Dependencies for Flask/Python ├── .env # Environment variables for API keys └── README.md # Project documentation



## Installation

### Backend (Node.js + Express)

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd <repository_directory>


2.Install Node.js dependencies:

bash
Copy
Edit
npm install

3.Set up your environment variables:

Create a .env file in the root of the project and add the following:

ini
Copy
Edit
GEMINI_API_KEY=your_api_key_here
Start the mock interview server:

bash
Copy
Edit
node ai.js
Resume Parsing API (Flask)
Set up a virtual environment (optional but recommended):

bash
Copy
Edit
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
Install Python dependencies:

bash
Copy
Edit
pip install -r requirements.txt
Start the Flask server:

bash
Copy
Edit
python resparser.py
API Endpoints
1. Mock Interview System (Node.js)
POST /generate_questions:

Input: email (string)

Output: Returns 5 interview questions based on the skills extracted from the user's resume.

POST /evaluate_answer:

Input: question (string), userAnswer (string)

Output: Returns feedback on the answer, including clarity, relevance, and overall performance.

POST /generate_topic_questions:

Input: topic (string)

Output: Returns 3 unique interview questions with answers for the given topic.

2. Resume Parsing API (Flask)
POST /parse:

Input: A PDF file uploaded in the request body.

Output: Returns a JSON object with the extracted skills from the resume.

Example:

json
Copy
Edit
{
  "skills": ["Python", "JavaScript", "Node.js"]
}
Usage Example
Example 1: Generating Interview Questions (Node.js)
Send a POST request to /generate_questions with the user email.

bash
Copy
Edit
curl -X POST http://localhost:3000/generate_questions -d '{"email": "user@example.com"}' -H "Content-Type: application/json"
You will receive a response with 5 interview questions based on the user's skills.

Example 2: Parsing Resume for Skills (Flask)
Send a POST request to /parse with the resume file:

bash
Copy
Edit
curl -X POST http://localhost:5001/parse -F "file=@resume.pdf"
You will receive a response with the extracted skills:

json
Copy
Edit
{
  "skills": ["Python", "Django", "Machine Learning"]
}
Database Schema
Users Collection: Stores user data including resumes and skills.

email: String

skills: Array of Strings (list of skills extracted from resume)

Interview Questions Collection: Stores the AI-generated interview questions for each user.

interviewId: Integer

email: String

questions: Array of Strings

Interview Responses Collection: Stores user responses and tracks progress.

interviewId: Integer

email: String

responses: Array of Objects

step: Integer

question: String

answer: String

questionCount: Integer (tracks how many questions the user has answered)

Contributing
Feel free to fork this repository, create an issue, or submit a pull request if you have suggestions or improvements.

Issues & Suggestions
If you encounter bugs or need new features, please open an issue via the GitHub Issues tab.

License
This project is licensed under the MIT License.
