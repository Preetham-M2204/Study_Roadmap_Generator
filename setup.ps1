# ============================================
# StudyBuddy - Complete Setup Script
# ============================================
# This script checks for required files and installs all dependencies
# Run with: .\setup.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  StudyBuddy Setup Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$hasErrors = $false

# ============================================
# STEP 1: CHECK PREREQUISITES
# ============================================
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
Write-Host "  [Checking] Node.js..." -NoNewline
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host " ✓ Found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor Red
    Write-Host "    Download from: https://nodejs.org/" -ForegroundColor Red
    $hasErrors = $true
}

# Check Python
Write-Host "  [Checking] Python..." -NoNewline
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Host " ✓ Found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor Red
    Write-Host "    Download from: https://www.python.org/" -ForegroundColor Red
    $hasErrors = $true
}

# Check MongoDB
Write-Host "  [Checking] MongoDB (optional - can use Atlas)..." -NoNewline
if (Get-Command mongod -ErrorAction SilentlyContinue) {
    Write-Host " ✓ Found" -ForegroundColor Green
} else {
    Write-Host " ⚠ Not found (You can use MongoDB Atlas)" -ForegroundColor Yellow
}

if ($hasErrors) {
    Write-Host "`n❌ Missing prerequisites. Please install them and run again." -ForegroundColor Red
    exit 1
}

# ============================================
# STEP 2: CHECK REQUIRED FILES
# ============================================
Write-Host "`nStep 2: Checking required configuration files..." -ForegroundColor Yellow

$requiredFiles = @(
    @{Path=".env"; Description="Root environment variables"},
    @{Path="backend\.env"; Description="Backend environment variables"},
    @{Path="frontend\.env"; Description="Frontend environment variables"}
)

$missingFiles = @()

foreach ($file in $requiredFiles) {
    Write-Host "  [Checking] $($file.Path)..." -NoNewline
    if (Test-Path $file.Path) {
        Write-Host " ✓ Found" -ForegroundColor Green
        
        # Check if .env has required keys
        if ($file.Path -like "*.env") {
            $content = Get-Content $file.Path -Raw
            
            if ($file.Path -eq ".env") {
                if ($content -notmatch "GEMINI_API_KEY=.+") {
                    Write-Host "    ⚠ Warning: GEMINI_API_KEY not set" -ForegroundColor Yellow
                }
                if ($content -notmatch "MONGODB_URI=.+") {
                    Write-Host "    ⚠ Warning: MONGODB_URI not set" -ForegroundColor Yellow
                }
                if ($content -notmatch "JWT_SECRET=.+") {
                    Write-Host "    ⚠ Warning: JWT_SECRET not set" -ForegroundColor Yellow
                }
            } elseif ($file.Path -eq "frontend\.env") {
                if ($content -notmatch "VITE_API_URL=.+") {
                    Write-Host "    ⚠ Warning: VITE_API_URL not set" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host " ✗ MISSING" -ForegroundColor Red
        $missingFiles += $file
    }
}

# Check for dataset files
Write-Host "  [Checking] RAG dataset (rag_service\app\data\*.json)..." -NoNewline
$dataFiles = Get-ChildItem -Path "rag_service\app\data" -Filter "*.json" -ErrorAction SilentlyContinue
if ($dataFiles.Count -gt 0) {
    Write-Host " ✓ Found $($dataFiles.Count) dataset file(s)" -ForegroundColor Green
    foreach ($file in $dataFiles) {
        Write-Host "    - $($file.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host " ⚠ NO DATASETS FOUND" -ForegroundColor Yellow
    Write-Host "    You must create JSON files in rag_service\app\data\" -ForegroundColor Yellow
    Write-Host "    Example: dsa.json, interview.json, etc." -ForegroundColor Yellow
}

# ============================================
# CREATE MISSING .ENV FILES
# ============================================
if ($missingFiles.Count -gt 0) {
    Write-Host "`n⚠ Missing configuration files detected!" -ForegroundColor Yellow
    Write-Host "Would you like to create template .env files? (Y/N): " -NoNewline -ForegroundColor Cyan
    $response = Read-Host
    
    if ($response -eq "Y" -or $response -eq "y") {
        foreach ($file in $missingFiles) {
            Write-Host "  [Creating] $($file.Path)..." -NoNewline
            
            $template = ""
            
            if ($file.Path -eq ".env" -or $file.Path -eq "backend\.env") {
                $template = @"
# ============================================
# ENVIRONMENT VARIABLES
# ============================================

# GEMINI API KEY (GET YOUR OWN!)
# https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_NAME=gemini-2.0-flash-exp

# EXPRESS BACKEND
PORT=5000
NODE_ENV=development

# MONGODB (Local or Atlas)
# Local: mongodb://localhost:27017/studybuddy
# Atlas: mongodb+srv://username:password@cluster.mongodb.net/studybuddy
MONGODB_URI=mongodb://localhost:27017/studybuddy

# JWT SECRET (Generate random: openssl rand -base64 32)
JWT_SECRET=change_this_to_a_secure_random_string

# FASTAPI URL
FASTAPI_URL=http://localhost:8001

# REACT FRONTEND
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
"@
            } elseif ($file.Path -eq "frontend\.env") {
                $template = @"
# Frontend Environment Variables
VITE_API_URL=http://localhost:5000
VITE_DEBUG=false
"@
            }
            
            Set-Content -Path $file.Path -Value $template
            Write-Host " ✓ Created" -ForegroundColor Green
        }
        
        Write-Host "`n⚠ IMPORTANT: Edit the .env files and add your API keys!" -ForegroundColor Yellow
        Write-Host "  1. Get Gemini API key: https://makersuite.google.com/app/apikey" -ForegroundColor Yellow
        Write-Host "  2. Set MongoDB URI (local or Atlas)" -ForegroundColor Yellow
        Write-Host "  3. Generate JWT secret: openssl rand -base64 32" -ForegroundColor Yellow
        Write-Host "`nPress Enter to continue with dependency installation..." -ForegroundColor Cyan
        Read-Host
    } else {
        Write-Host "`n❌ Cannot proceed without .env files. Exiting." -ForegroundColor Red
        exit 1
    }
}

# ============================================
# STEP 3: INSTALL DEPENDENCIES
# ============================================
Write-Host "`nStep 3: Installing dependencies..." -ForegroundColor Yellow

# Backend (Express)
Write-Host "`n  [Backend] Installing Node.js dependencies..." -ForegroundColor Cyan
if (Test-Path "backend\package.json") {
    Push-Location backend
    Write-Host "    Running: npm install" -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ Backend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Backend installation failed" -ForegroundColor Red
        $hasErrors = $true
    }
    Pop-Location
} else {
    Write-Host "    ✗ backend\package.json not found" -ForegroundColor Red
    $hasErrors = $true
}

# Frontend (React)
Write-Host "`n  [Frontend] Installing Node.js dependencies..." -ForegroundColor Cyan
if (Test-Path "frontend\package.json") {
    Push-Location frontend
    Write-Host "    Running: npm install" -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Frontend installation failed" -ForegroundColor Red
        $hasErrors = $true
    }
    Pop-Location
} else {
    Write-Host "    ✗ frontend\package.json not found" -ForegroundColor Red
    $hasErrors = $true
}

# RAG Service (Python)
Write-Host "`n  [RAG Service] Setting up Python environment..." -ForegroundColor Cyan
if (Test-Path "rag_service\app\requirements.txt") {
    Push-Location rag_service
    
    # Create virtual environment if it doesn't exist
    if (-not (Test-Path ".venv")) {
        Write-Host "    Creating virtual environment..." -ForegroundColor Gray
        python -m venv .venv
    }
    
    # Activate and install
    Write-Host "    Activating virtual environment..." -ForegroundColor Gray
    & .\.venv\Scripts\Activate.ps1
    
    Write-Host "    Running: pip install -r app\requirements.txt" -ForegroundColor Gray
    pip install -r app\requirements.txt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ Python dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Python installation failed" -ForegroundColor Red
        $hasErrors = $true
    }
    
    Pop-Location
} else {
    Write-Host "    ✗ rag_service\app\requirements.txt not found" -ForegroundColor Red
    $hasErrors = $true
}

# ============================================
# STEP 4: FINAL SUMMARY
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if (-not $hasErrors) {
    Write-Host "✅ Setup completed successfully!`n" -ForegroundColor Green
    
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Verify .env files have correct API keys" -ForegroundColor White
    Write-Host "  2. Add your dataset to rag_service\app\data\" -ForegroundColor White
    Write-Host "  3. Start the services:" -ForegroundColor White
    Write-Host "`n     Terminal 1 (Backend):" -ForegroundColor Cyan
    Write-Host "       cd backend" -ForegroundColor Gray
    Write-Host "       npm run dev" -ForegroundColor Gray
    Write-Host "`n     Terminal 2 (Frontend):" -ForegroundColor Cyan
    Write-Host "       cd frontend" -ForegroundColor Gray
    Write-Host "       npm run dev" -ForegroundColor Gray
    Write-Host "`n     Terminal 3 (RAG Service):" -ForegroundColor Cyan
    Write-Host "       cd rag_service" -ForegroundColor Gray
    Write-Host "       .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host "       uvicorn app.main:app --reload --port 8001" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Setup completed with errors. Please fix the issues above.`n" -ForegroundColor Red
    exit 1
}

Write-Host "========================================`n" -ForegroundColor Cyan
