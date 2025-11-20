# Activate virtual environment and start FastAPI server
& "$PSScriptRoot\.venv\Scripts\Activate.ps1"
uvicorn app.main:app --reload --port 8001
