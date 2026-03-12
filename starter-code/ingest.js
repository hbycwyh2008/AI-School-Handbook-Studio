// ============================================================
// ingest.js — Load a handbook .txt file into ChromaDB
//
// Usage:  node ingest.js handbook.txt
// ============================================================

require("dotenv").config();

var fs = require("fs");
var { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

var chroma = new ChromaClient({
  path: process.env.CHROMA_URL || "http://localhost:8000"
});

var embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY,
  openai_model: "text-embedding-3-small"
});

var CHUNK_SIZE = 500;

// ---- Helper: split text into chunks ----
function splitIntoChunks(text) {
  var sentences = text.split(/(?<=[.!?。！？\n])\s*/);
  var chunks = [];
  var current = "";

  for (var i = 0; i < sentences.length; i++) {
    if ((current + " " + sentences[i]).length > CHUNK_SIZE && current.length > 0) {
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

// ---- Main ----
async function main() {
  var filePath = process.argv[2];

  if (!filePath) {
    console.log("Usage: node ingest.js <path-to-handbook.txt>");
    console.log("Example: node ingest.js handbook.txt");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  console.log("Reading file:", filePath);
  var text = fs.readFileSync(filePath, "utf-8");

  console.log("Splitting into chunks...");
  var chunks = splitIntoChunks(text);
  console.log("Created " + chunks.length + " chunks");

  // Reset the collection
  try { await chroma.deleteCollection({ name: "handbook" }); } catch (e) {}
  var collection = await chroma.getOrCreateCollection({
    name: "handbook",
    embeddingFunction: embedder
  });

  // Build arrays
  var ids = [];
  var documents = [];
  var metadatas = [];

  for (var i = 0; i < chunks.length; i++) {
    ids.push("chunk-" + i);
    documents.push(chunks[i]);
    metadatas.push({ section: "Chunk " + (i + 1), index: i });
  }

  console.log("Sending to ChromaDB (embedding + storing)...");
  await collection.add({ ids: ids, documents: documents, metadatas: metadatas });

  console.log("Done! " + chunks.length + " chunks saved to ChromaDB.");
}

main().catch(function (err) {
  console.error("Error:", err);
  process.exit(1);
});
