import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("exam.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'completed'
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Examiner: Upload Questions
  app.post("/api/questions", (req, res) => {
    const { questions } = req.body; // Array of { question, a, b, c, d, correct }
    
    const deleteStmt = db.prepare("DELETE FROM questions");
    const insertStmt = db.prepare(`
      INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_answer)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((qs) => {
      deleteStmt.run();
      for (const q of qs) {
        insertStmt.run(q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer);
      }
    });

    try {
      transaction(questions);
      res.json({ message: "Questions uploaded successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to upload questions" });
    }
  });

  // Student: Get Questions (without correct answers)
  app.get("/api/questions", (req, res) => {
    const questions = db.prepare("SELECT id, question, option_a, option_b, option_c, option_d FROM questions").all();
    res.json(questions);
  });

  // Student: Submit Exam
  app.post("/api/submit", (req, res) => {
    const { studentName, answers, status = 'completed' } = req.body; // answers: { [id]: selectedOption }
    
    const questions = db.prepare("SELECT id, correct_answer FROM questions").all();
    let score = 0;
    
    questions.forEach((q: any) => {
      if (answers[q.id] === q.correct_answer) {
        score++;
      }
    });

    const insertResult = db.prepare(`
      INSERT INTO results (student_name, score, total_questions, status)
      VALUES (?, ?, ?, ?)
    `).run(studentName, score, questions.length, status);

    // Mock Email Sending
    console.log(`[EMAIL SIMULATION] Sending result to examiner...`);
    console.log(`Student: ${studentName}, Score: ${score}/${questions.length}, Status: ${status}`);

    res.json({ 
      score, 
      total: questions.length,
      resultId: insertResult.lastInsertRowid 
    });
  });

  // Examiner: Get Results
  app.get("/api/results", (req, res) => {
    const results = db.prepare("SELECT * FROM results ORDER BY timestamp DESC").all();
    res.json(results);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
