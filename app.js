const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const axios = require("axios");
const { MongoClient } = require("mongodb");
const { evaluateAnswerWithAI } = require("./ai"); // ✅ Ensure this file contains the function
const { generateQuestions } = require("./ai"); // ✅ Ensure correct path
const { generateTopicQuestions } = require("./ai"); // ✅ Import function

const app = express();
const PORT = 3100;

// Middleware & Config
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/mock_interview", { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model("User", UserSchema);

const mongoURI = "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoURI, { useUnifiedTopology: true });

let db;
client.connect()
    .then(() => {
        db = client.db("mock_interview");
        console.log("✅ Connected to MongoDB");
    })
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Session setup
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1-hour session expiration
}));

app.use((req, res, next) => {
    if (req.session.user) {
        req.session.userEmail = req.session.user.email; // Ensure email is accessible globally
    }
    next();
});

// Routes
app.get("/", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

// Handle Signup
app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.send("User already exists. Please login.");

        const newUser = new User({ email, password });
        await newUser.save();
        res.redirect("/");
    } catch (err) {
        console.error("Signup error:", err);
        res.send("Error signing up.");
    }
});

// Handle Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.password !== password) return res.status(401).json({ error: "Invalid email or password" });

    req.session.user = { email: user.email };
    res.redirect("/dashboard");
});

// Protected Routes
app.get("/dashboard", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    res.render("dashboard", { user: req.session.user });
});


// ✅ Logout Route
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).send("Logout failed");
      }
      res.redirect("/");
    });
  });
  

// Resume Upload Setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload-resume", upload.single("resume"), async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const email = req.session.user.email;
        const fileBuffer = req.file.buffer;

        // ✅ Send resume to Flask server for parsing
        const flaskResponse = await axios.post("http://127.0.0.1:5001/parse", fileBuffer, {
            headers: { "Content-Type": "application/pdf" }
        });

        const { skills, experience, projects } = flaskResponse.data;

        // ✅ Replace existing resume (or create new entry if not found)
        await db.collection("resumes").updateOne(
            { email },
            { 
                $set: { 
                    skills, 
                    experience, 
                    projects, 
                    resumeFile: fileBuffer, 
                    updatedAt: new Date() // ✅ Track last update time
                } 
            },
            { upsert: true } // ✅ Create a new document if no resume exists
        );

        console.log(`✅ Resume uploaded successfully for ${email}`);
        res.json({ message: "Resume uploaded successfully.", skills, refresh: true }); // ✅ Signal frontend to refresh
    } catch (error) {
        console.error("❌ Resume processing error:", error);
        res.status(500).json({ error: "Failed to process resume" });
    }
});

// Profile Page
app.get("/profile", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    try {
        const email = req.session.user.email;

        // ✅ Fetch user data, ensure skills exist
        const user = await db.collection("resumes").findOne({ email }) || {};
        user.skills = user.skills || []; // ✅ Ensure skills is always an array
        user.experience = user.experience || "No experience listed.";
        user.projects = user.projects || "No projects listed.";
        user.resumeFile = user.resumeFile || null;

        // ✅ Fetch all interviews for this user
        const interviews = await db.collection("interview_responses")
            .find({ email })
            .sort({ createdAt: -1 }) // Sort by most recent
            .toArray();

        res.render("profile", { user, interviews });

    } catch (err) {
        console.error("❌ Error fetching profile:", err);
        res.render("profile", { 
            user: { email: req.session.user.email, skills: [], experience: "No experience listed.", projects: "No projects listed.", resumeFile: null },
            interviews: []
        });
    }
});

app.post("/delete-resume", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const email = req.session.user.email;

        // ✅ Remove resume from the database
        await db.collection("resumes").updateOne(
            { email },
            { $unset: { resumeFile: 1 } } // ✅ Remove the resume
        );

        console.log(`✅ Resume deleted for ${email}`);
        res.json({ success: true, message: "Resume deleted successfully." }); // ✅ Send success flag
    } catch (error) {
        console.error("❌ Error deleting resume:", error);
        res.status(500).json({ error: "Failed to delete resume." });
    }
});

// Start Interview Route
app.get("/interview", async (req, res) => {
    if (!req.session.userEmail) return res.redirect("/login");

    try {
        const email = req.session.userEmail;
        const interviewId = (await db.collection("interviews").countDocuments()) + 1;

        await db.collection("interviews").insertOne({
            interviewId,
            email,
            createdAt: new Date()
        });

        res.render("interview", { email, interviewId, question: "Introduce yourself." });
    } catch (error) {
        console.error("Error starting interview:", error);
        res.status(500).send("Error starting interview.");
    }
});

// Generate & Store Next Question

const maxQuestions = 6;

app.post("/submit-answer", async (req, res) => {
    console.log("Received data:", req.body);

    const interviewId = parseInt(req.body.interviewId, 10);
    const { email, currentQuestion, answer } = req.body;

    if (!email || !interviewId || !currentQuestion || !answer) {
        console.error("❌ Missing data:", { email, interviewId, currentQuestion, answer });
        return res.status(400).json({ error: "Missing data." });
    }

    try {
        const interview = await db.collection("interviews").findOne({ interviewId, email });

        if (!interview) {
            console.error("❌ Interview not found for:", { email, interviewId });
            return res.status(404).json({ error: "Interview not found." });
        }

        console.log("✅ Storing answer for interview:", interviewId);

        const nextQuestionData = await generateQuestions(interviewId, email, answer, currentQuestion);

        if (!nextQuestionData || !nextQuestionData.question) {
            console.error("❌ ERROR: No question received from `generateQuestions`");
            return res.status(500).json({ error: "Error retrieving the next question." });
        }

        res.json(nextQuestionData);

    } catch (error) {
        console.error("❌ Error saving answer:", error);
        res.status(500).json({ error: "Error saving answer." });
    }
});


// Interview Summary Route
app.get("/interview-summary", async (req, res) => {
    const interviewId = parseInt(req.query.interviewId, 10);

    if (!interviewId) {
        return res.status(400).send("❌ Invalid interview ID.");
    }

    try {
        const interview = await db.collection("interview_responses").findOne({ interviewId });

        if (!interview || !interview.responses) {
            console.warn(`⚠️ No responses found for interviewId ${interviewId}`);
            return res.render("interview-summary", { interview: { interviewId, responses: [] } });
        }

        for (let response of interview.responses) {
            // ✅ If AI feedback is missing, evaluate the answer
            if (!response.aiFeedback || response.aiFeedback.includes("⚠️ AI evaluation is unavailable")) {
                response.aiFeedback = await evaluateAnswerWithAI(response.question, response.answer);

                // ✅ Store AI feedback in MongoDB to avoid repeat API calls
                await db.collection("interview_responses").updateOne(
                    { interviewId, "responses.question": response.question },
                    { $set: { "responses.$.aiFeedback": response.aiFeedback } }
                );
            }
        }

        res.render("interview-summary", { interview });

    } catch (error) {
        console.error("❌ Error fetching interview summary:", error);
        res.status(500).send("Error fetching interview summary.");
    }
});

app.get("/prepare", (req, res) => {
    res.render("prepare", { questions: [], topic: "" });
});



app.get("/get-questions", async (req, res) => {
    const topic = req.query.topic;
    const offset = parseInt(req.query.offset) || 0; // ✅ Tracks how many questions have been loaded

    if (!topic) return res.status(400).json({ error: "Topic is required" });

    try {
        console.log(`📢 API HIT: /get-questions - Topic: ${topic}, Offset: ${offset}`);

        // ✅ Request new questions (ignoring cache)
        let questions = await generateTopicQuestions(topic, offset);
        if (!questions || questions.length === 0) {
            console.warn(`⚠️ No new questions generated for topic: ${topic}`);
            return res.status(500).json({ error: "No more questions available. Try another topic." });
        }

        console.log(`✅ Sending ${questions.length} new questions to frontend for topic: ${topic}`);
        res.json({ questions, nextOffset: offset + questions.length }); // ✅ Update offset
    } catch (error) {
        console.error("❌ Error fetching questions:", error.message);
        res.status(500).json({ error: "Failed to generate questions." });
    }
});

const ResumeSchema = new mongoose.Schema({
    email: { type: String, required: true },
    skills: [String],
    experience: String,
    projects: String,
    resumeFile: Buffer,
    updatedAt: Date
});
const Resume = mongoose.model("Resume", ResumeSchema);

const InterviewSchema = new mongoose.Schema({
    interviewId: Number,
    email: String,
    createdAt: Date
});
const Interview = mongoose.model("Interview", InterviewSchema);




// Admin Login Page
app.get("/admin/login", (req, res) => {
    res.render("admin-login");
});

// Handle Admin Login POST
app.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;

    // Replace this with a real admin credential check or admin DB
    const ADMIN_EMAIL = "admin@g.com";
    const ADMIN_PASSWORD = "admin123";

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        req.session.admin = { email };
        return res.redirect("/admin/dashboard");
    }

    return res.status(401).send("Invalid admin credentials.");
});

// Admin Dashboard Page
app.get('/admin/dashboard', async (req, res) => {
    try {
        const resumes = await db.collection("resumes").find({}).toArray();
        const interviews = await db.collection("interviews").find({}).toArray();
        res.render('admin-dashboard', { resumes, interviews });
    } catch (err) {
        console.error('❌ Error loading dashboard:', err);
        res.status(500).send('Internal Server Error');
    }
});




app.get("/admin/logout", (req, res) => {
    req.session.admin = null;
    res.redirect("/admin/login");
});


const router = express.Router();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));




app.get('/admin/view-resume/:email', async (req, res) => {
    const { email } = req.params;
    try {
        const resume = await Resume.findOne({ email });
        if (!resume) return res.status(404).send('Resume not found');
        res.render('view-resume', { resume });
    } catch (err) {
        console.error('❌ Resume view error:', err);
        res.status(500).send('Server error');
    }
});

// admin summary view by interviewId
// Route: /admin/interview-summary/:interviewId

app.get("/admin/interview-summary/:interviewId", async (req, res) => {
    const db = client.db("mock_interview");
    const interviewId = parseInt(req.params.interviewId);
  
    if (isNaN(interviewId)) {
      return res.status(400).send("Invalid interview ID format");
    }
  
    try {
      const interview = await db.collection("interview_responses").findOne({ interviewId });
  
      if (!interview || !interview.responses || interview.responses.length === 0) {
        return res.status(404).send("Interview not found or no responses");
      }
  
      res.render("interview-summary", { interview });
  
    } catch (err) {
      console.error("[ERROR] Admin interview summary:", err);
      res.status(500).send("Internal Server Error");
    }
  });

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
  
  
 // ✅ Admin GET chat with user
app.get("/admin/chat/:email", async (req, res) => {
    const email = req.params.email;
    const db = client.db("mock_interview");
  
    const messages = await db.collection("messages").find({
      $or: [
        { from: email, to: "admin" },
        { from: "admin", to: email }
      ]
    }).sort({ timestamp: 1 }).toArray();
  
    res.render("admin-chat", { email, messages });
  });
  
  // ✅ Admin POST: send message to user
  app.post("/admin/chat/:email", async (req, res) => {
    const email = req.params.email;
    const message = req.body.message;
    const db = client.db("mock_interview");
  
    await db.collection("messages").insertOne({
      from: "admin",
      to: email,
      message,
      timestamp: new Date()
    });
  
    res.redirect("/admin/chat/" + email);
  });
  
// ✅ User GET chat with admin
app.get("/chat", async (req, res) => {
    const sessionUser = req.session?.user;
    const email = typeof sessionUser === "object" ? sessionUser.email : sessionUser;
    if (!email) return res.status(401).send("Unauthorized: No session email");
  
    const db = client.db("mock_interview");
  
    const messages = await db.collection("messages").find({
      $or: [
        { from: email, to: "admin" },
        { from: "admin", to: email }
      ]
    }).sort({ timestamp: 1 }).toArray();
  
    res.render("chat", { messages, email });
  });
  
  // ✅ User POST: send message to admin
  app.post("/chat", async (req, res) => {
    const sessionUser = req.session?.user;
    const email = typeof sessionUser === "object" ? sessionUser.email : sessionUser;
    if (!email) return res.status(401).send("Unauthorized: No session email");
  
    const message = req.body.message;
    const db = client.db("mock_interview");
  
    await db.collection("messages").insertOne({
      from: email,
      to: "admin",
      message,
      timestamp: new Date()
    });
  
    res.redirect("/chat");
  });
  
  

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://127.0.0.1:${PORT}`));