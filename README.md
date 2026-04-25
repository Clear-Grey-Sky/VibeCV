# VibeCV
Turn messy notes into a clean resume with local AI. 100% private – everything runs on your machine.

## Setup

1. Install Ollama
   Download from ollama.com and install.

2. Pull the Gemma model
   ollama pull gemma3

3. Start Ollama (if not already running)
   ollama serve
   The server runs at localhost:11434.

## Run VibeCV

1. Download this project's files (or clone the repo).
2. In the project folder, start a simple HTTP server:
   python3 -m http.server 8000
3. Open http://localhost:8000 in your browser.

## How to Use

1. Dump your experience into the big text box – bullet points, half‑thoughts, whatever.
2. (Optional) Paste a job description to tailor the resume.
3. Click Generate CV – the local AI takes ~10‑30 seconds.
4. Edit the result inline, or export as Markdown (.md) or PDF.

Your draft saves automatically in the browser – no sign‑up, no cloud.
