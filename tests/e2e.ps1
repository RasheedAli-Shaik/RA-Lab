$ErrorActionPreference = "SilentlyContinue"
$pass = 0; $fail = 0; $total = 0

function T($name, $sb) {
    $script:total++
    try {
        $r = & $sb
        if ($r) { Write-Host "  PASS: $name" -ForegroundColor Green; $script:pass++ }
        else { Write-Host "  FAIL: $name" -ForegroundColor Red; $script:fail++ }
    } catch { Write-Host "  FAIL: $name [$_]" -ForegroundColor Red; $script:fail++ }
}

Write-Host "=== RA-Lab Full Stack E2E Tests ===" -ForegroundColor Cyan
Write-Host "    Node.js :3001 | FastAPI :8000 | Vite :5173" -ForegroundColor DarkGray

# ============================================================
# A. NODE.JS BACKEND
# ============================================================
Write-Host "`n== A. Node.js Backend ==" -ForegroundColor Yellow

# --- Health ---
Write-Host "`n-- A1. Health --"
T "GET /api/health -> healthy + ralab-server" {
    $r = Invoke-RestMethod http://localhost:3001/api/health
    $r.status -eq "healthy" -and $r.service -eq "ralab-server" -and $r.version -eq "1.0.0"
}

# --- Document CRUD ---
Write-Host "`n-- A2. Document CRUD --"
T "POST save document" {
    $b = '{"code":"\\documentclass{article}\\begin{document}Test\\end{document}","filename":"e2e.tex"}'
    $r = Invoke-RestMethod http://localhost:3001/api/document/save -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true
}
T "GET load document" {
    $r = Invoke-RestMethod "http://localhost:3001/api/document/load?filename=e2e.tex"
    $r.success -eq $true -and $r.document -ne $null
}
T "GET list documents" {
    $r = Invoke-RestMethod http://localhost:3001/api/document/list
    $r.documents.Count -ge 1
}
T "PATCH patch document" {
    $b = '{"filename":"e2e.tex","find":"Test","replace":"Patched"}'
    $r = Invoke-RestMethod http://localhost:3001/api/document/patch -Method PATCH -Body $b -ContentType "application/json"
    $r.success -eq $true
}
T "GET verify patch content" {
    $r = Invoke-RestMethod "http://localhost:3001/api/document/load?filename=e2e.tex"
    ($r | ConvertTo-Json) -match "Patched"
}
T "DELETE delete document" {
    $r = Invoke-RestMethod "http://localhost:3001/api/document/delete?filename=e2e.tex" -Method DELETE
    $r.success -eq $true
}
T "GET load deleted -> 404" {
    try { Invoke-RestMethod "http://localhost:3001/api/document/load?filename=e2e.tex" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 404 }
}

# --- Input Validation ---
Write-Host "`n-- A3. Input Validation --"
T "POST save no code -> 400" {
    try { Invoke-RestMethod http://localhost:3001/api/document/save -Method POST -Body '{"filename":"x.tex"}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}
T "POST save no filename -> uses default" {
    $r = Invoke-RestMethod http://localhost:3001/api/document/save -Method POST -Body '{"code":"hello"}' -ContentType "application/json"
    $r.success -eq $true
}
T "DELETE nonexistent -> 404" {
    try { Invoke-RestMethod "http://localhost:3001/api/document/delete?filename=nope.tex" -Method DELETE -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 404 }
}

# --- Compilation ---
Write-Host "`n-- A4. Compilation --"
T "POST compile valid LaTeX -> PDF" {
    $b = '{"code":"\\documentclass{article}\\begin{document}Hello!\\end{document}"}'
    $r = Invoke-RestMethod http://localhost:3001/api/compile -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true -and $r.pdfGenerated -eq $true
}
T "POST compile invalid LaTeX -> errors" {
    $b = '{"code":"\\documentclass{article}\\begin{document}\\badcmd\\end{document}"}'
    $r = Invoke-RestMethod http://localhost:3001/api/compile -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $false
}
T "POST compile missing code -> 400" {
    try { Invoke-RestMethod http://localhost:3001/api/compile -Method POST -Body '{"x":"y"}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}
T "POST compile empty code -> 400" {
    try { Invoke-RestMethod http://localhost:3001/api/compile -Method POST -Body '{"code":""}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}
T "GET compile/status -> tectonic installed" {
    $r = Invoke-RestMethod http://localhost:3001/api/compile/status
    $r.success -eq $true -and $r.tectonic.installed -eq $true
}
T "GET document/pdf -> application/pdf" {
    $r = Invoke-WebRequest http://localhost:3001/api/document/pdf -UseBasicParsing
    $r.StatusCode -eq 200 -and $r.Headers["Content-Type"] -match "pdf"
}

# --- Error Handling ---
Write-Host "`n-- A5. Error Handling --"
T "GET unknown route -> 404" {
    try { Invoke-RestMethod http://localhost:3001/api/unknown -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 404 }
}
T "POST unknown route -> 404" {
    try { Invoke-RestMethod http://localhost:3001/api/nonexistent -Method POST -Body '{}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 404 }
}

# ============================================================
# B. FASTAPI CODING AGENT (direct)
# ============================================================
Write-Host "`n== B. FastAPI Agent (direct :8000) ==" -ForegroundColor Yellow

Write-Host "`n-- B1. Health --"
T "GET /health -> ralab-agent" {
    $r = Invoke-RestMethod http://localhost:8000/health
    $r.status -eq "healthy" -and $r.service -eq "ralab-agent" -and $r.version -eq "1.0.0"
}

Write-Host "`n-- B2. Agent Endpoints --"
T "POST /api/agent/generate" {
    $b = '{"query":"Create a minimal LaTeX article"}'
    $r = Invoke-RestMethod http://localhost:8000/api/agent/generate -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true -and $r.mode -eq "generate" -and $r.response.Length -gt 0
}
T "POST /api/agent/explain" {
    $b = '{"query":"explain","code":"\\documentclass{article}\\begin{document}Hi\\end{document}"}'
    $r = Invoke-RestMethod http://localhost:8000/api/agent/explain -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true -and $r.mode -eq "explain"
}
T "POST /api/agent/chat" {
    $b = '{"messages":[{"role":"user","content":"What is a \\\\section command?"}]}'
    $r = Invoke-RestMethod http://localhost:8000/api/agent/chat -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true -and $r.mode -eq "chat"
}

Write-Host "`n-- B3. Agent Validation --"
T "POST /api/agent/fix no code -> 400" {
    try { Invoke-RestMethod http://localhost:8000/api/agent/fix -Method POST -Body '{"query":"fix"}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}
T "POST /api/agent/refactor no code -> 400" {
    try { Invoke-RestMethod http://localhost:8000/api/agent/refactor -Method POST -Body '{"query":"refactor"}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}
T "POST /api/agent/explain no code -> 400" {
    try { Invoke-RestMethod http://localhost:8000/api/agent/explain -Method POST -Body '{"query":"explain"}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}
T "POST /api/agent/complete no code -> 400" {
    try { Invoke-RestMethod http://localhost:8000/api/agent/complete -Method POST -Body '{"query":"complete"}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}
T "POST /api/agent/compile no code -> 400" {
    try { Invoke-RestMethod http://localhost:8000/api/agent/compile -Method POST -Body '{"query":"compile"}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}
T "POST /api/agent/chat empty msgs -> 422" {
    try { Invoke-RestMethod http://localhost:8000/api/agent/chat -Method POST -Body '{"messages":[]}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 422 }
}
T "POST /api/agent/generate empty body -> 422" {
    try { Invoke-RestMethod http://localhost:8000/api/agent/generate -Method POST -Body '{}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 422 }
}

Write-Host "`n-- B4. Agent Node Bridge --"
# Save a doc first so agent can read it
Invoke-RestMethod http://localhost:3001/api/document/save -Method POST -Body '{"code":"\\documentclass{article}\\begin{document}Bridge Test\\end{document}","filename":"bridge.tex"}' -ContentType "application/json" | Out-Null

T "GET /api/agent/document -> reads from Node" {
    $r = Invoke-RestMethod "http://localhost:8000/api/agent/document?filename=bridge.tex"
    $r.success -eq $true -and $r.content -match "Bridge Test"
}
T "GET /api/agent/document not found -> 404" {
    try { Invoke-RestMethod "http://localhost:8000/api/agent/document?filename=nope.tex" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 404 }
}
T "POST /api/agent/apply-edit via Node" {
    $b = '{"filename":"bridge.tex","find":"Bridge Test","replace":"Agent Patched"}'
    $r = Invoke-RestMethod http://localhost:8000/api/agent/apply-edit -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true
}
T "Verify agent edit applied" {
    $r = Invoke-RestMethod "http://localhost:3001/api/document/load?filename=bridge.tex"
    ($r | ConvertTo-Json) -match "Agent Patched"
}
T "POST /api/agent/compile via Node" {
    $b = '{"query":"compile","code":"\\documentclass{article}\\begin{document}Hi\\end{document}"}'
    $r = Invoke-RestMethod http://localhost:8000/api/agent/compile -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true -and $r.pdfGenerated -eq $true
}

# Cleanup bridge test doc
Invoke-RestMethod "http://localhost:3001/api/document/delete?filename=bridge.tex" -Method DELETE -ErrorAction SilentlyContinue | Out-Null

# ============================================================
# C. NODE.JS AGENT PROXY (Node -> FastAPI)
# ============================================================
Write-Host "`n== C. Node.js Agent Proxy (:3001 -> :8000) ==" -ForegroundColor Yellow

T "GET /api/agent/health via Node" {
    $r = Invoke-RestMethod http://localhost:3001/api/agent/health
    $r.status -eq "healthy" -and $r.service -eq "ralab-agent"
}
T "POST /api/agent/generate via Node" {
    $b = '{"query":"Write a simple LaTeX letter"}'
    $r = Invoke-RestMethod http://localhost:3001/api/agent/generate -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true -and $r.mode -eq "generate"
}
T "POST /api/agent/chat via Node" {
    $b = '{"messages":[{"role":"user","content":"What is LaTeX?"}]}'
    $r = Invoke-RestMethod http://localhost:3001/api/agent/chat -Method POST -Body $b -ContentType "application/json"
    $r.success -eq $true -and $r.mode -eq "chat"
}
T "POST /api/agent/fix via Node -> 400 (no code)" {
    try { Invoke-RestMethod http://localhost:3001/api/agent/fix -Method POST -Body '{"query":"fix"}' -ContentType "application/json" -ErrorAction Stop; $false }
    catch { $_.Exception.Response.StatusCode.value__ -eq 400 }
}

# ============================================================
# D. FRONTEND
# ============================================================
Write-Host "`n== D. Frontend (:5173) ==" -ForegroundColor Yellow

T "GET / -> HTML with RA-Lab" {
    $r = Invoke-WebRequest http://localhost:5173/ -UseBasicParsing
    $r.StatusCode -eq 200 -and $r.Content -match "RA-Lab"
}
T "Frontend proxies /api/health" {
    $r = Invoke-RestMethod http://localhost:5173/api/health
    $r.status -eq "healthy"
}
T "Frontend proxies /api/compile/status" {
    $r = Invoke-RestMethod http://localhost:5173/api/compile/status
    $r.success -eq $true -and $r.tectonic.installed -eq $true
}
T "Frontend proxies /api/agent/health" {
    $r = Invoke-RestMethod http://localhost:5173/api/agent/health
    $r.status -eq "healthy" -and $r.service -eq "ralab-agent"
}
T "Frontend serves JS bundle" {
    $r = Invoke-WebRequest http://localhost:5173/src/main.jsx -UseBasicParsing
    $r.StatusCode -eq 200
}

# --- Cleanup ---
try { Invoke-RestMethod "http://localhost:3001/api/document/delete?filename=document.tex" -Method DELETE -ErrorAction SilentlyContinue } catch {}

# ============================================================
# SUMMARY
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
$color = if ($fail -eq 0) {"Green"} else {"Red"}
Write-Host "  TOTAL: $pass/$total passed, $fail failed" -ForegroundColor $color
Write-Host "========================================" -ForegroundColor Cyan
