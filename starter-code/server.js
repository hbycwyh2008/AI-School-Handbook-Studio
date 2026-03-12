require("dotenv").config();

var express = require("express");
var cors = require("cors");
var multer = require("multer");
var fs = require("fs");
var { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");
var OpenAI = require("openai");

var app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

var upload = multer({ dest: "uploads/" });

// ---- Clients ----
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

var chroma = new ChromaClient({
  path: process.env.CHROMA_URL || "http://localhost:8000"
});

var embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY,
  openai_model: "text-embedding-3-small"
});

// ---- Helper: split text into chunks ----
function splitIntoChunks(text, chunkSize) {
  var sentences = text.split(/(?<=[.!?。！？\n])\s*/);
  var chunks = [];
  var current = "";

  for (var i = 0; i < sentences.length; i++) {
    if ((current + " " + sentences[i]).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += " " + sentences[i];
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }
  return chunks;
}

// ============================================================
// POST /api/ingest  —  upload a .txt handbook, chunk & store
// ============================================================
app.post("/api/ingest", upload.single("file"), async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    var text = fs.readFileSync(req.file.path, "utf-8");
    fs.unlinkSync(req.file.path);

    var chunks = splitIntoChunks(text, 500);

    // Reset the collection
    try { await chroma.deleteCollection({ name: "handbook" }); } catch (e) {}
    var collection = await chroma.getOrCreateCollection({
      name: "handbook",
      embeddingFunction: embedder
    });

    // Build arrays for ChromaDB
    var ids = [];
    var documents = [];
    var metadatas = [];

    for (var i = 0; i < chunks.length; i++) {
      ids.push("chunk-" + i);
      documents.push(chunks[i]);
      metadatas.push({ section: "Chunk " + (i + 1), index: i });
    }

    // ChromaDB handles embedding automatically
    await collection.add({ ids: ids, documents: documents, metadatas: metadatas });

    res.json({ message: "Handbook ingested", chunks: chunks.length });
  } catch (err) {
    console.error("Ingest error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/ask  —  question → retrieve chunks → GPT answer
// ============================================================
app.post("/api/ask", async function (req, res) {
  try {
    var question = req.body.question;
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    var collection = await chroma.getOrCreateCollection({
      name: "handbook",
      embeddingFunction: embedder
    });

    var count = await collection.count();
    if (count === 0) {
      return res.json({
        answer: "No handbook has been uploaded yet. Please upload a handbook first.",
        sources: []
      });
    }

    // Step 1 & 2: ChromaDB embeds the question and finds similar chunks
    var results = await collection.query({
      queryTexts: [question],
      nResults: 3
    });

    var topDocs = results.documents[0];
    var topMeta = results.metadatas[0];
    var topDist = results.distances[0];

    // Step 3: Build prompt with retrieved context
    var context = topDocs.map(function (doc, i) {
      return "[Source " + (i + 1) + ": " + topMeta[i].section + "]\n" + doc;
    }).join("\n\n");

    var messages = [
      {
        role: "system",
        content:
          "You are a helpful school handbook assistant. " +
          "Answer the student's question using ONLY the provided handbook excerpts. " +
          "If the answer is not in the excerpts, say you don't have enough information. " +
          "Keep answers clear and concise."
      },
      {
        role: "user",
        content: "Handbook excerpts:\n\n" + context + "\n\n---\nQuestion: " + question
      }
    ];

    // Step 4: Call OpenAI chat completion
    var completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.3
    });

    var answer = completion.choices[0].message.content;

    // Step 5: Return answer + sources
    var sources = topDocs.map(function (doc, i) {
      return {
        section: topMeta[i].section,
        text: doc.substring(0, 150) + (doc.length > 150 ? "…" : ""),
        score: Math.round((1 - topDist[i]) * 100) + "%"
      };
    });

    res.json({ answer: answer, sources: sources });
  } catch (err) {
    console.error("Ask error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Start Server ----
var PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
  console.log("Server running at http://localhost:" + PORT);
  console.log("Make sure ChromaDB is running at " + (process.env.CHROMA_URL || "http://localhost:8000"));
});
