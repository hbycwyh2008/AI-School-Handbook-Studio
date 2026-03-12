# AI School Handbook — Starter Code

A minimal working example of an AI-powered school handbook assistant.
Students can use this as a starting point and customize it for their own project.

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | HTML + Bootstrap 5 + Vanilla JS     |
| Backend  | Node.js + Express                   |
| Vector DB| ChromaDB (stores & searches chunks) |
| AI       | OpenAI API (GPT-4o-mini + Embeddings) |

## How It Works (RAG Flow)

```
User asks a question
        │
        ▼
ChromaDB embeds the question (OpenAI Embeddings)
        │
        ▼
ChromaDB finds the most similar handbook chunks
        │
        ▼
Send top 3 chunks + question to GPT-4o-mini
        │
        ▼
Return answer + sources to the user
```

## File Structure

```
starter-code/
├── public/
│   ├── index.html      ← Frontend page (Bootstrap)
│   └── app.js          ← Frontend logic (Vanilla JS)
├── server.js           ← Express server + API routes
├── ingest.js           ← Script to load handbook into ChromaDB
├── package.json        ← Dependencies
├── .env.example        ← Environment variables template
└── .gitignore
```

## Setup (Step by Step)

### 1. Install Prerequisites

- **Node.js**: Download from https://nodejs.org (LTS version)
- **Python**: Download from https://python.org (needed to run ChromaDB)
- **ChromaDB**: Install via pip:
  ```bash
  pip install chromadb
  ```

### 2. Get an OpenAI API Key

- Go to https://platform.openai.com/api-keys
- Create a new key and copy it

### 3. Start ChromaDB

Open a terminal and run:

```bash
chroma run --path ./chroma_data
```

Keep this terminal open — ChromaDB runs at `http://localhost:8000`.

### 4. Set Up the Node.js Project

Open a **new** terminal:

```bash
cd starter-code

npm install

cp .env.example .env
# Edit .env and paste your OpenAI API key
```

### 5. Load Your Handbook

Put your school handbook in a `.txt` file, then run:

```bash
node ingest.js handbook.txt
```

ChromaDB will automatically embed the text and store the chunks.

You can also upload a file through the web UI after starting the server.

### 6. Start the Server

```bash
npm start
```

Open http://localhost:3000 in your browser. Ask a question!

## What Students Should Customize

This starter is a **shell** — students are expected to make it their own:

- [ ] Change the page design to match your target user
- [ ] Improve the chunk splitting logic (detect sections / headers)
- [ ] Add section names and page numbers to source metadata
- [ ] Design a better citation / source display
- [ ] Add error handling and loading states
- [ ] Handle "I don't know" answers gracefully
- [ ] Test with real users and iterate on the UI
- [ ] Deploy to Railway, Render, or another hosting platform

## API Endpoints

| Method | Endpoint      | Description                     |
| ------ | ------------- | ------------------------------- |
| POST   | `/api/ingest` | Upload and process a .txt file  |
| POST   | `/api/ask`    | Ask a question, get RAG answer  |

### POST /api/ask — Example

**Request:**
```json
{ "question": "What time does the library close on Fridays?" }
```

**Response:**
```json
{
  "answer": "The school library closes at 4:30 PM on Fridays.",
  "sources": [
    {
      "section": "Chunk 12",
      "text": "Library hours: Monday–Thursday 7:30 AM – 5:00 PM, Friday 7:30 AM – 4:30 PM…",
      "score": "91%"
    }
  ]
}
```

## Why ChromaDB?

ChromaDB is a **vector database** purpose-built for AI applications:

- **Automatic embedding**: pass in text, ChromaDB converts it to vectors for you
- **Similarity search**: finds the most relevant chunks without you writing math
- **Metadata support**: store section names, page numbers alongside each chunk — this powers your citations
- **Simple API**: just `collection.add()` and `collection.query()`
