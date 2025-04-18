require("dotenv").config();
const axios = require("axios");
const { MongoClient } = require("mongodb");

const mongoURI = "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoURI, { useUnifiedTopology: true });

let db;
client.connect().then(() => {
    db = client.db("mock_interview");
    console.log("✅ Connected to MongoDB");
}).catch(err => console.error("❌ MongoDB connection error:", err));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-pro";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent";

// ✅ Fetch user skills from MongoDB
const getUserSkills = async (email) => {
    try {
        const user = await db.collection("resumes").findOne({ email }, { projection: { skills: 1 } });
        return user?.skills || [];
    } catch (error) {
        console.error("❌ Error fetching user skills:", error);
        return [];
    }
};

// ✅ Store AI-generated questions for an interview
const storeAIQuestions = async (interviewId, email, questions) => {
    try {
        await db.collection("interview_questions").updateOne(
            { interviewId, email },
            { $set: { questions } },
            { upsert: true }
        );
    } catch (error) {
        console.error("❌ Error storing AI questions:", error);
    }
};

// ✅ Generate 5 AI interview questions at the start
const generateAIQuestions = async (email) => {
    const skills = await getUserSkills(email);
    const skillsString = skills.length > 0 ? skills.join(", ") : "Software Engineering";

    const prompt = `The candidate is skilled in ${skillsString}. Generate exactly 5 technical interview questions. 
    The questions should be clear and concise, and should not be too complex. 
    Return only the questions in a numbered list, each on a new line.`;

    try {
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            { contents: [{ role: "user", parts: [{ text: prompt }] }] }
        );

        const aiQuestions = response.data.candidates[0]?.content?.parts[0]?.text
            .split("\n")
            .map(q => q.trim())
            .filter(q => q.length > 0);

        // ✅ Ensure exactly 5 questions are returned
        if (aiQuestions.length < 5) {
            console.warn("⚠️ AI returned fewer than 5 questions. Using fallback.");
            return [
                "What is your experience in software development?",
                "Describe a technical challenge you've solved.",
                "How do you approach debugging?",
                "Tell me about your favorite programming language.",
                "What are your career goals?"
            ];
        }

        return aiQuestions.slice(0, 5); // ✅ Always return 5 questions
    } catch (error) {
        console.error("❌ Error generating AI questions:", error.response?.data || error.message);
        return [
            "What is your experience in software development?",
            "Describe a technical challenge you've solved.",
            "How do you approach debugging?",
            "Tell me about your favorite programming language.",
            "What are your career goals?"
        ];
    }
};


// ✅ Generate next question for an interview
const generateQuestions = async (interviewId, email, answer, currentQuestion) => {
    if (!email || !interviewId) throw new Error("❌ Email and Interview ID are required.");

    interviewId = parseInt(interviewId, 10);

    // ✅ Fetch interview response history
    const interviewData = await db.collection("interview_responses").findOne(
        { interviewId, email }, 
        { projection: { responses: 1, questionCount: 1 } }
    );

    let answeredCount = interviewData?.questionCount || 0;
    console.log(`📝 User ${email} has answered ${answeredCount} questions for interviewId ${interviewId}.`);

    // ✅ Store the answer before generating the next question
    if (currentQuestion && answer) {
        await db.collection("interview_responses").updateOne(
            { interviewId, email },
            { 
                $push: { responses: { step: answeredCount, question: currentQuestion, answer } },
                $inc: { questionCount: 1 }
            },
            { upsert: true }
        );
        answeredCount++;
    }

    // ✅ If 5 questions have been answered, end the interview
    if (answeredCount >= 5) {
        return { complete: true, question: "✅ Thank you for completing the mock interview!" };
    }

    // ✅ Fetch or generate questions
    let questionData = await db.collection("interview_questions").findOne({ interviewId, email });

    if (!questionData || !questionData.questions || questionData.questions.length < 5) {
        console.log(`⚠️ No questions found for interviewId ${interviewId}. Generating now...`);

        const aiQuestions = await generateAIQuestions(email);

        await db.collection("interview_questions").updateOne(
            { interviewId, email },
            { $set: { questions: aiQuestions } },
            { upsert: true }
        );

        questionData = await db.collection("interview_questions").findOne({ interviewId, email });
    }

    // ✅ Ensure exactly 5 questions exist
    if (!questionData || !questionData.questions || questionData.questions.length < 5) {
        console.error("❌ ERROR: Less than 5 questions found for interviewId", interviewId);
        return { complete: false, question: "❌ Error retrieving the next question. Please restart the interview." };
    }

    // ✅ Retrieve the correct question based on `answeredCount`
    const nextQuestion = questionData.questions[answeredCount];

    if (!nextQuestion || typeof nextQuestion !== "string") {
        console.error("❌ ERROR: Invalid question received:", nextQuestion);
        return { complete: false, question: "❌ Error retrieving the next question. Please restart the interview." };
    }

    console.log(`🎯 Next question for interviewId ${interviewId}: ${nextQuestion}`);

    return { complete: false, question: nextQuestion };
};





// ✅ Evaluate answer with AI (Skip "Introduce yourself")
const evaluateAnswerWithAI = async (question, userAnswer, retries = 3) => {
    const prompt = `Evaluate the following interview response:
    Question: ${question}
    Answer: ${userAnswer}

    Provide feedback on:
    1. Clarity
    2. Relevance
    3. Overall score (0-10)

    Response format:
    - Clarity: [Rating out of 10]
    - Relevance: [Rating out of 10]
    - Score: [Overall rating out of 10]
    - Comments: [Detailed feedback]
    `;

    try {
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            { contents: [{ role: "user", parts: [{ text: prompt }] }] }
        );

        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "AI evaluation failed.";
    } catch (error) {
        console.error("❌ AI Evaluation Error:", error.response?.data || error.message);

        // ✅ Retry logic for API rate limits
        if (error.response?.status === 429 && retries > 0) {
            console.warn(`⚠️ API limit hit. Retrying... (${3 - retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // ✅ Wait 2 seconds before retrying
            return evaluateAnswerWithAI(question, userAnswer, retries - 1);
        }

        return "⚠️ AI evaluation is unavailable due to API limits. Please try again later.";
    }
};




const generateTopicQuestions = async (topic, offset = 0, retries = 3) => {
    if (!topic) return [];

    try {
        console.log(`🔍 Generating new questions for topic: ${topic} (Offset: ${offset})`);

        // ✅ AI prompt forces unique questions on every request
        const prompt = `Generate 3 unique interview questions about ${topic}.
Each question should be **completely different** from previous ones.
For each question, provide a detailed answer.
Return ONLY the JSON array:

[
  { "question": "New question 1", "answer": "New answer 1" },
  { "question": "New question 2", "answer": "New answer 2" },
  { "question": "New question 3", "answer": "New answer 3" }
]`;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            { contents: [{ role: "user", parts: [{ text: prompt }] }] }
        );

        let aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // ✅ Remove backticks if AI still adds them
        aiResponse = aiResponse.replace(/^```json\n/, "").replace(/\n```$/, "").trim();

        // ✅ Ensure AI response is valid JSON
        let questionAnswerPairs;
        try {
            questionAnswerPairs = JSON.parse(aiResponse);
        } catch (jsonError) {
            console.error("❌ AI response was not valid JSON:", aiResponse);
            throw new Error("Invalid AI response format.");
        }

        if (!Array.isArray(questionAnswerPairs) || questionAnswerPairs.length < 3) {
            throw new Error("AI did not generate enough questions.");
        }

        console.log(`✅ Generated ${questionAnswerPairs.length} new questions for topic: ${topic}`);
        return questionAnswerPairs;
    } catch (error) {
        console.error("❌ Error generating topic questions:", error.message);

        // ✅ Retry logic for rate limits (429)
        if (error.response?.status === 429 && retries > 0) {
            console.warn(`⚠️ API rate limit hit. Retrying in 3 seconds... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // ✅ Wait 3 seconds before retrying
            return generateTopicQuestions(topic, offset, retries - 1);
        }

        // ✅ Fallback questions if AI fails
        console.warn(`⚠️ Using fallback questions for topic: ${topic}`);
        return [
            { question: `What is ${topic}?`, answer: "A brief explanation of the topic." },
            { question: `Why is ${topic} important?`, answer: "Explains its significance." },
            { question: `How do you apply ${topic} in real-world scenarios?`, answer: "Describes use cases." }
        ];
    }
};







module.exports = { generateQuestions, evaluateAnswerWithAI, generateTopicQuestions };
