$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "--------------------------------------------------"
    Write-Host " 유진쌤 튜션 파트너 로컬 웹 서버 시작 완료"
    Write-Host " 주소: http://localhost:$port/"
    Write-Host "--------------------------------------------------"
    Write-Host "서버를 종료하려면 이 창을 닫으거나 Ctrl+C를 누르세요."
    Start-Process "http://localhost:$port/"
} catch {
    Write-Host "서버 시작 실패: $_"
    Write-Host "이미 포트 $port 이 사용 중이거나 관리자 권한이 필요할 수 있습니다."
    pause
    Exit
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        
        $path = $req.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        
        # 1. Resend API 프록시 포트 처리
        if ($req.HttpMethod -eq "POST" -and $path -eq "/api/send-email") {
            try {
                $reader = New-Object System.IO.StreamReader($req.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                $data = $body | ConvertFrom-Json
                
                $headers = @{
                    "Authorization" = "Bearer $($data.apiKey)"
                }
                
                $payload = @{
                    "from"        = $data.from
                    "to"          = $data.to
                    "subject"     = $data.subject
                    "html"        = $data.html
                    "attachments" = $data.attachments
                } | ConvertTo-Json -Depth 5 -Compress
                
                Write-Host "Resend 이메일 발송 요청 수신: From=$($data.from), To=$($data.to)"
                
                $resendResult = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method Post -Headers $headers -Body $payload -ContentType "application/json; charset=utf-8"
                
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes(($resendResult | ConvertTo-Json))
                $res.ContentType = "application/json; charset=utf-8"
                $res.ContentLength64 = $resBytes.Length
                $res.OutputStream.Write($resBytes, 0, $resBytes.Length)
            } catch {
                $errMessage = $_.Exception.Message
                if ($_.Exception.InnerException) {
                    $errMessage += " - " + $_.Exception.InnerException.Message
                }
                $errObj = @{ error = $errMessage } | ConvertTo-Json
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($errObj)
                $res.StatusCode = 500
                $res.ContentType = "application/json; charset=utf-8"
                $res.ContentLength64 = $resBytes.Length
                $res.OutputStream.Write($resBytes, 0, $resBytes.Length)
                Write-Host "Resend API 발송 실패: $errMessage"
            }
            $res.Close()
            continue
        }

        # 파일 경로의 슬래시 보정
        $subPath = $path.TrimStart('/')
        $local = Join-Path $pwd.Path $subPath
        
        if (Test-Path $local -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($local)
            
            # Content-Type 세팅 (ES6 모듈 동작 필수)
            if ($path.EndsWith(".html")) { $res.ContentType = "text/html; charset=utf-8" }
            elseif ($path.EndsWith(".css")) { $res.ContentType = "text/css; charset=utf-8" }
            elseif ($path.EndsWith(".js")) { $res.ContentType = "application/javascript; charset=utf-8" }
            elseif ($path.EndsWith(".png")) { $res.ContentType = "image/png" }
            elseif ($path.EndsWith(".jpg") -or $path.EndsWith(".jpeg")) { $res.ContentType = "image/jpeg" }
            elseif ($path.EndsWith(".svg")) { $res.ContentType = "image/svg+xml" }
            
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            Write-Host "404 Not Found: $path (로컬경로: $local)"
        }
        $res.Close()
    } catch {
        Write-Host "요청 처리 중 오류 발생: $_"
    }
}
