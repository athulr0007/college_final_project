# AI Mock Interview System

## Overview

The **AI Mock Interview System** is a dynamic and adaptive interview simulation platform designed to help job seekers practice for technical interviews. The system leverages advanced AI techniques to generate relevant interview questions, evaluate answers, and provide personalized feedback to candidates. The platform includes resume parsing, skill extraction, interview question generation, and answer evaluation features, using AI-powered tools like **Gemini API** for generating questions and evaluating answers.

---

## Project Structure

The project is divided into multiple parts:

- **Backend (Flask + MongoDB)**: Handles resume parsing, skill extraction, and the management of interview data.
- **Server (Node.js + Express)**: Manages AI question generation, user authentication, and chat functionality.
- **Frontend (React/EJS)**: Displays the user interface for candidates to interact with the system and receive feedback.

---

## Features

- **Resume Parsing**: Extracts skills and relevant information from resumes in PDF format using `pdfplumber` and SpaCy NLP.
- **AI Question Generation**: Generates technical interview questions based on the candidate's skills using the Gemini API.
- **Answer Evaluation**: Evaluates candidate answers to interview questions, providing feedback on clarity, relevance, and overall performance.
- **User Authentication**: Supports login and registration for both candidates and admins.
- **Admin Dashboard**: Allows administrators to view and manage interview data, including resumes and interview progress.
- **Multimodal Feedback**: Combines text-based AI evaluations with emotional and body language analysis (if implemented in the frontend).

---

## Prerequisites

1. **MongoDB**: Ensure MongoDB is installed and running on your local machine or use a cloud instance like MongoDB Atlas.
2. **Python**: Make sure Python 3.x is installed on your system.
3. **Node.js**: Make sure Node.js (and npm) is installed for the backend and frontend setup.

---

## Installation and Setup

Follow these steps to set up the project on your local machine.

1. Clone the repository to your local machine:

    ```bash
    git clone <your-repository-url>
    cd <your-repository-directory>
    ```

2. **Set Up the Backend Environment (Flask)**

    - Create and activate a virtual environment for Python:

        ```bash
        python -m venv venv
        source venv/bin/activate  # On Windows, use venv\Scripts\activate
        ```

    - Install the required dependencies for the backend:

        ```bash
        pip install -r requirements.txt
        ```

    - Ensure MongoDB is running locally (or set up a cloud MongoDB instance). Adjust the MongoDB URI in your code if using a cloud database.

    - Start the Flask server for the resume parsing service:

        ```bash
        python resparser.py
        ```

3. **Set Up the Frontend and Server (Node.js)**

    - If you are using **React** for the frontend:

        ```bash
        cd client
        npm install
        npm start
        ```

    - If you are using **EJS** (Node.js backend), follow these steps:

        ```bash
        cd server
        npm install
        npm start
        ```

4. **Open the Application**

    After starting the backend and frontend servers, open your web browser and navigate to the following URLs:

    - Frontend: `http://localhost:3000` (for React-based frontend)
    - Flask API: `http://localhost:5001` (for resume parsing)
    - Server API: `http://localhost:5000` (for interview question generation and evaluation)

---

## Usage

### Resume Parsing

To use the resume parsing functionality:

1. Upload a PDF resume through the frontend interface.
2. The system will parse the resume, extract skills, and save them in the database.

### AI Question Generation

Once the candidate logs in and uploads their resume, the system will generate 5 technical interview questions based on their skills.

1. The candidate will receive 5 questions at the start of the interview.
2. As the candidate answers each question, the system evaluates their answers and stores the responses.
3. If the candidate completes 5 questions, the interview session will be marked as complete.

### Answer Evaluation

Once a candidate answers a question, the AI evaluates the answer based on:

1. Clarity
2. Relevance
3. Overall score (out of 10)
4. Detailed comments on how the candidate can improve their answers

### Admin Dashboard

Admins can log in to the dashboard to view candidate resumes, interview progress, and manage interview data.

---

## Technologies Used

- **Backend**: Flask, MongoDB
- **Frontend**: React (or EJS for Node.js), HTML/CSS/JS
- **NLP**: SpaCy, PhraseMatcher
- **AI**: Gemini API (for question generation and answer evaluation)
- **PDF Parsing**: pdfplumber (for resume parsing)
- **Authentication**: JWT (JSON Web Tokens) for secure authentication

---

## API Endpoints

### POST /parse

- **Description**: Parse the resume and extract skills.
- **Request**: `POST` with PDF file in the request body.
- **Response**: A list of skills found in the resume.

### POST /generateQuestions

- **Description**: Generate AI-based interview questions based on the candidate's skills.
- **Request**: `POST` with user email to fetch skills and generate questions.
- **Response**: A list of 5 AI-generated interview questions.

### POST /evaluateAnswer

- **Description**: Evaluate a candidate's answer to a specific interview question.
- **Request**: `POST` with the question and user answer.
- **Response**: Evaluation feedback with clarity, relevance, score, and comments.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Gemini API**: For generating questions and evaluating answers.
- **SpaCy**: For NLP and skill extraction.
- **pdfplumber**: For PDF resume parsing.
