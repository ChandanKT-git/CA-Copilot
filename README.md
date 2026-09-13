# CA AI CoPilot

## Live Deployments
* **Frontend Application**: https://ca-copilot-hazel.vercel.app/
* **Backend API**: https://ca-copilot-cusg.onrender.com/

## Overview
CA AI CoPilot is an advanced, AI powered assistant tailored specifically for Chartered Accountants. It streamlines workflows by allowing users to upload financial documents, extract crucial data, perform complex tax computations, and interact with a context aware conversational agent. The platform leverages a state of the art Retrieval Augmented Generation (RAG) pipeline to ensure all answers are accurate, grounded in uploaded documents, and highly relevant to accounting and financial regulations.

## Core Features
* **Intelligent Document Processing**: Upload PDFs and text documents. The system automatically extracts text, chunks it, and generates dense vector embeddings for semantic search.
* **Context Aware Chat**: Chat with a powerful AI model that retrieves answers directly from your uploaded documents, reducing hallucinations and improving accuracy.
* **Tax Computations**: Built in tax calculators and rule engines specific to Chartered Accountant requirements.
* **Robust Authentication**: Secure JWT based user authentication and session management.
* **Theme Toggling**: Seamless switching between light and dark modes for an optimal viewing experience.
* **Resilient AI Fallbacks**: Primary language generation is powered by Google Gemini, with automatic seamless fallbacks to Groq models to ensure high availability and bypass rate limits.

## Architecture and Tech Stack

### Frontend
* **Framework**: React with Vite for lightning fast builds and optimized production assets.
* **Styling**: Modern, responsive design with full theme toggling support.
* **Deployment**: Hosted on Vercel for edge caching and high performance delivery.

### Backend
* **Framework**: FastAPI (Python) for asynchronous, high performance API routing.
* **Database**: MongoDB (motor async driver) for flexible document storage and user data.
* **Vector Search**: Custom embedding generation and similarity ranking implemented natively.
* **AI and Embeddings**:
  * Embeddings: HuggingFace BAAI/bge-large-en-v1.5.
  * LLM Generation: Google Generative AI (Gemini) and Groq (Qwen).
* **Deployment**: Hosted on Render using a strict Python 3.11 environment.

## Local Setup Instructions

### Prerequisites
* Python 3.11.9
* Node.js 18+
* MongoDB instance (local or Atlas)

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment.
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file with the required variables:
   * `MONGO_URI`
   * `GEMINI_API_KEY`
   * `GROQ_API_KEY`
   * `JWT_SECRET`
6. Run the database seed script: `python seed_db.py`
7. Start the FastAPI server: `uvicorn server:app --reload --port 8000`

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Create a `.env` file and set the backend URL:
   * `VITE_API_URL=http://localhost:8000/api`
4. Start the development server: `npm run dev`

## Infrastructure and Build Optimizations
The project uses strict dependency locking to ensure parity between local development and production environments. The backend explicitly targets Python 3.11.9 using a `.python-version` file to optimize Render build times, guaranteeing that pre-compiled binary wheels are utilized during cloud deployment instead of building from source.
