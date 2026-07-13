# Meu Multichat - Interface Windows (WinForms)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$EnvPath = Join-Path $RootDir ".env"
$Ports = @(3847, 3857, 3867)

function Read-EnvConfig {
    $cfg = @{
        PORT = "3847"
        TWITCH_CHANNEL = ""
        KICK_CHANNEL = ""
        YOUTUBE_CHANNEL = ""
        YOUTUBE_VIDEO_ID = ""
        TWITCH_OAUTH = ""
    }

    if (-not (Test-Path $EnvPath)) { return $cfg }

    Get-Content $EnvPath -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $eq = $line.IndexOf("=")
        if ($eq -lt 1) { return }
        $key = $line.Substring(0, $eq).Trim()
        $val = $line.Substring($eq + 1).Trim()
        if ($cfg.ContainsKey($key)) { $cfg[$key] = $val }
    }
    return $cfg
}

function Write-EnvConfig($cfg) {
    $port = [string]$cfg.PORT
    if ($Ports -notcontains [int]$port) {
        throw "Porta invalida. Use: $($Ports -join ', ')"
    }

    $content = @"
# Porta do servidor local
PORT=$port

# Canais
TWITCH_CHANNEL=$($cfg.TWITCH_CHANNEL)
KICK_CHANNEL=$($cfg.KICK_CHANNEL)

# YouTube
YOUTUBE_CHANNEL=$($cfg.YOUTUBE_CHANNEL)
YOUTUBE_VIDEO_ID=$($cfg.YOUTUBE_VIDEO_ID)

# Opcional: token OAuth do Twitch
TWITCH_OAUTH=$($cfg.TWITCH_OAUTH)

"@
    [System.IO.File]::WriteAllText($EnvPath, $content, [System.Text.UTF8Encoding]::new($false))
}

function Test-PortInUse([int]$Port) {
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        $listener.Stop()
        return $false
    } catch {
        return $true
    } finally {
        if ($listener) { try { $listener.Stop() } catch {} }
    }
}

function Get-ServerPidOnPort([int]$Port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) { return $conn.OwningProcess }
    } catch {}
    return $null
}

function Stop-AllServers {
    foreach ($p in $Ports) {
        $procId = Get-ServerPidOnPort $p
        if ($procId) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}

function Update-PortLabels {
    param($RadioButtons, $StatusLabels, $SelectedPort)

    for ($i = 0; $i -lt $Ports.Count; $i++) {
        $port = $Ports[$i]
        $inUse = Test-PortInUse $port
        $isCurrent = ($port -eq [int]$SelectedPort) -and $inUse

        if ($isCurrent) {
            $StatusLabels[$i].Text = "Ativa"
            $StatusLabels[$i].ForeColor = [System.Drawing.Color]::FromArgb(0, 103, 192)
            $RadioButtons[$i].Enabled = $true
        } elseif ($inUse) {
            $StatusLabels[$i].Text = "Em uso"
            $StatusLabels[$i].ForeColor = [System.Drawing.Color]::FromArgb(196, 43, 28)
            $RadioButtons[$i].Enabled = $false
            if ($RadioButtons[$i].Checked) {
                foreach ($rb in $RadioButtons) {
                    if ($rb.Enabled) { $rb.Checked = $true; break }
                }
            }
        } else {
            $StatusLabels[$i].Text = "Livre"
            $StatusLabels[$i].ForeColor = [System.Drawing.Color]::FromArgb(16, 124, 16)
            $RadioButtons[$i].Enabled = $true
        }
    }
}

function Get-SelectedPort($RadioButtons) {
    for ($i = 0; $i -lt $RadioButtons.Count; $i++) {
        if ($RadioButtons[$i].Checked) { return $Ports[$i] }
    }
    return $Ports[0]
}

function Update-ObsUrls($Port, $TextBoxNormal, $TextBoxFixo) {
    $TextBoxNormal.Text = "http://localhost:$Port/overlaypublico"
    $TextBoxFixo.Text = "http://localhost:$Port/chatfixostremer"
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "Meu Multichat"
$form.Size = New-Object System.Drawing.Size(500, 688)
$form.MinimumSize = $form.Size
$form.MaximumSize = $form.Size
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(243, 243, 243)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Configuracao do Multichat"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
$title.ForeColor = [System.Drawing.Color]::FromArgb(0, 0, 0)
$title.Location = New-Object System.Drawing.Point(16, 12)
$title.Size = New-Object System.Drawing.Size(460, 28)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Overlay de chat para OBS - Twitch, Kick e YouTube"
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(96, 96, 96)
$subtitle.Location = New-Object System.Drawing.Point(18, 40)
$subtitle.Size = New-Object System.Drawing.Size(460, 20)
$form.Controls.Add($subtitle)

$grpCanais = New-Object System.Windows.Forms.GroupBox
$grpCanais.Text = "Canais"
$grpCanais.Location = New-Object System.Drawing.Point(16, 68)
$grpCanais.Size = New-Object System.Drawing.Size(452, 218)
$form.Controls.Add($grpCanais)

function Add-Field($parent, $label, $y) {
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = $label
    $lbl.Location = New-Object System.Drawing.Point(14, $y)
    $lbl.Size = New-Object System.Drawing.Size(420, 18)
    $parent.Controls.Add($lbl)

    $tb = New-Object System.Windows.Forms.TextBox
    $tb.Location = New-Object System.Drawing.Point(14, ($y + 20))
    $tb.Size = New-Object System.Drawing.Size(420, 24)
    $parent.Controls.Add($tb)
    return $tb
}

$tbTwitch = Add-Field $grpCanais "Twitch - canal" 24
$tbKick = Add-Field $grpCanais "Kick - canal" 72
$tbYtChannel = Add-Field $grpCanais "YouTube - canal (@nome)" 120
$tbYtVideo = Add-Field $grpCanais "YouTube - ID do video ao vivo" 168

$grpPort = New-Object System.Windows.Forms.GroupBox
$grpPort.Text = "Porta do servidor"
$grpPort.Location = New-Object System.Drawing.Point(16, 294)
$grpPort.Size = New-Object System.Drawing.Size(452, 72)
$form.Controls.Add($grpPort)

$portRadios = @()
$portStatuses = @()

for ($i = 0; $i -lt $Ports.Count; $i++) {
    $x = 14 + ($i * 145)

    $rb = New-Object System.Windows.Forms.RadioButton
    $rb.Text = [string]$Ports[$i]
    $rb.Location = New-Object System.Drawing.Point($x, 26)
    $rb.Size = New-Object System.Drawing.Size(80, 22)
    $rb.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $grpPort.Controls.Add($rb)
    $portRadios += $rb

    $st = New-Object System.Windows.Forms.Label
    $st.Location = New-Object System.Drawing.Point($x, 48)
    $st.Size = New-Object System.Drawing.Size(120, 18)
    $st.Font = New-Object System.Drawing.Font("Segoe UI", 8)
    $grpPort.Controls.Add($st)
    $portStatuses += $st

    $rb.Add_CheckedChanged({
        if ($this.Checked) {
            $p = Get-SelectedPort $portRadios
            Update-ObsUrls $p $tbObsUrl $tbObsUrlFixo
        }
    })
}

$grpObs = New-Object System.Windows.Forms.GroupBox
$grpObs.Text = "URL para o OBS"
$grpObs.Location = New-Object System.Drawing.Point(16, 374)
$grpObs.Size = New-Object System.Drawing.Size(452, 108)
$form.Controls.Add($grpObs)

$lblObsNormal = New-Object System.Windows.Forms.Label
$lblObsNormal.Text = "Overlay transparente, fica sobre a tela do jogo, usuários conseguem ver as mensagens"
$lblObsNormal.Location = New-Object System.Drawing.Point(14, 18)
$lblObsNormal.Size = New-Object System.Drawing.Size(200, 16)
$lblObsNormal.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblObsNormal.ForeColor = [System.Drawing.Color]::FromArgb(96, 96, 96)
$grpObs.Controls.Add($lblObsNormal)

$tbObsUrl = New-Object System.Windows.Forms.TextBox
$tbObsUrl.ReadOnly = $true
$tbObsUrl.BackColor = [System.Drawing.Color]::White
$tbObsUrl.Location = New-Object System.Drawing.Point(14, 34)
$tbObsUrl.Size = New-Object System.Drawing.Size(340, 24)
$grpObs.Controls.Add($tbObsUrl)

$btnCopy = New-Object System.Windows.Forms.Button
$btnCopy.Text = "Copiar"
$btnCopy.Location = New-Object System.Drawing.Point(362, 32)
$btnCopy.Size = New-Object System.Drawing.Size(72, 28)
$btnCopy.FlatStyle = "System"
$grpObs.Controls.Add($btnCopy)

$lblObsFixo = New-Object System.Windows.Forms.Label
$lblObsFixo.Text = "Chat fixo, somente o streamer consegue ver, textos somem após 10 minutos"
$lblObsFixo.Location = New-Object System.Drawing.Point(14, 62)
$lblObsFixo.Size = New-Object System.Drawing.Size(200, 16)
$lblObsFixo.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblObsFixo.ForeColor = [System.Drawing.Color]::FromArgb(96, 96, 96)
$grpObs.Controls.Add($lblObsFixo)

$tbObsUrlFixo = New-Object System.Windows.Forms.TextBox
$tbObsUrlFixo.ReadOnly = $true
$tbObsUrlFixo.BackColor = [System.Drawing.Color]::White
$tbObsUrlFixo.Location = New-Object System.Drawing.Point(14, 78)
$tbObsUrlFixo.Size = New-Object System.Drawing.Size(340, 24)
$grpObs.Controls.Add($tbObsUrlFixo)

$btnCopyFixo = New-Object System.Windows.Forms.Button
$btnCopyFixo.Text = "Copiar"
$btnCopyFixo.Location = New-Object System.Drawing.Point(362, 76)
$btnCopyFixo.Size = New-Object System.Drawing.Size(72, 28)
$btnCopyFixo.FlatStyle = "System"
$grpObs.Controls.Add($btnCopyFixo)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "Servidor parado"
$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(96, 96, 96)
$lblStatus.Location = New-Object System.Drawing.Point(18, 490)
$lblStatus.Size = New-Object System.Drawing.Size(450, 20)
$form.Controls.Add($lblStatus)

$btnSave = New-Object System.Windows.Forms.Button
$btnSave.Text = "Salvar"
$btnSave.Location = New-Object System.Drawing.Point(16, 520)
$btnSave.Size = New-Object System.Drawing.Size(100, 32)
$btnSave.FlatStyle = "System"
$form.Controls.Add($btnSave)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Iniciar"
$btnStart.Location = New-Object System.Drawing.Point(124, 520)
$btnStart.Size = New-Object System.Drawing.Size(100, 32)
$btnStart.FlatStyle = "System"
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "Parar"
$btnStop.Location = New-Object System.Drawing.Point(232, 520)
$btnStop.Size = New-Object System.Drawing.Size(100, 32)
$btnStop.FlatStyle = "System"
$form.Controls.Add($btnStop)

$btnOverlay = New-Object System.Windows.Forms.Button
$btnOverlay.Text = "Abrir Overlay"
$btnOverlay.Location = New-Object System.Drawing.Point(340, 520)
$btnOverlay.Size = New-Object System.Drawing.Size(128, 32)
$btnOverlay.FlatStyle = "System"
$form.Controls.Add($btnOverlay)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Text = "Apos salvar ou mudar a porta, reinicie o servidor com Iniciar."
$lblHint.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 120)
$lblHint.Location = New-Object System.Drawing.Point(18, 560)
$lblHint.Size = New-Object System.Drawing.Size(450, 48)
$form.Controls.Add($lblHint)

$cfg = Read-EnvConfig
$tbTwitch.Text = $cfg.TWITCH_CHANNEL
$tbKick.Text = $cfg.KICK_CHANNEL
$tbYtChannel.Text = $cfg.YOUTUBE_CHANNEL
$tbYtVideo.Text = $cfg.YOUTUBE_VIDEO_ID

$portIndex = [array]::IndexOf($Ports, [int]$cfg.PORT)
if ($portIndex -lt 0) { $portIndex = 0 }
$portRadios[$portIndex].Checked = $true
Update-ObsUrls $Ports[$portIndex] $tbObsUrl $tbObsUrlFixo
Update-PortLabels $portRadios $portStatuses (Get-SelectedPort $portRadios)

$portTimer = New-Object System.Windows.Forms.Timer
$portTimer.Interval = 5000
$portTimer.Add_Tick({
    Update-PortLabels $portRadios $portStatuses (Get-SelectedPort $portRadios)
    $p = Get-SelectedPort $portRadios
    if (Get-ServerPidOnPort $p) {
        $lblStatus.Text = "Servidor rodando na porta $p"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(16, 124, 16)
    } else {
        $lblStatus.Text = "Servidor parado"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(96, 96, 96)
    }
})
$portTimer.Start()

$btnSave.Add_Click({
    try {
        $newCfg = @{
            PORT = [string](Get-SelectedPort $portRadios)
            TWITCH_CHANNEL = $tbTwitch.Text.Trim()
            KICK_CHANNEL = $tbKick.Text.Trim()
            YOUTUBE_CHANNEL = $tbYtChannel.Text.Trim()
            YOUTUBE_VIDEO_ID = $tbYtVideo.Text.Trim()
            TWITCH_OAUTH = (Read-EnvConfig).TWITCH_OAUTH
        }
        Write-EnvConfig $newCfg
        Update-ObsUrls $newCfg.PORT $tbObsUrl $tbObsUrlFixo
        [System.Windows.Forms.MessageBox]::Show(
            "Configuracao salva!`n`nReinicie o servidor (Parar + Iniciar) para aplicar.",
            "Meu Multichat",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
    } catch {
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Erro", "OK", "Error") | Out-Null
    }
})

$btnCopy.Add_Click({
    [System.Windows.Forms.Clipboard]::SetText($tbObsUrl.Text)
    $lblStatus.Text = "URL copiada!"
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 103, 192)
})

$btnCopyFixo.Add_Click({
    [System.Windows.Forms.Clipboard]::SetText($tbObsUrlFixo.Text)
    $lblStatus.Text = "URL chat fixo copiada!"
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 103, 192)
})

$btnStart.Add_Click({
    try {
        $newCfg = @{
            PORT = [string](Get-SelectedPort $portRadios)
            TWITCH_CHANNEL = $tbTwitch.Text.Trim()
            KICK_CHANNEL = $tbKick.Text.Trim()
            YOUTUBE_CHANNEL = $tbYtChannel.Text.Trim()
            YOUTUBE_VIDEO_ID = $tbYtVideo.Text.Trim()
            TWITCH_OAUTH = (Read-EnvConfig).TWITCH_OAUTH
        }
        Write-EnvConfig $newCfg
        Stop-AllServers
        Start-Sleep -Milliseconds 400

        $port = $newCfg.PORT
        Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $RootDir -WindowStyle Hidden

        Start-Sleep -Seconds 1
        if (Get-ServerPidOnPort ([int]$port)) {
            $lblStatus.Text = "Servidor iniciado na porta $port"
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(16, 124, 16)
        } else {
            $lblStatus.Text = "Servidor pode ter falhado - verifique a janela do Node"
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(196, 43, 28)
        }
        Update-PortLabels $portRadios $portStatuses $port
    } catch {
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Erro", "OK", "Error") | Out-Null
    }
})

$btnStop.Add_Click({
    Stop-AllServers
    $lblStatus.Text = "Servidor parado"
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(96, 96, 96)
    Update-PortLabels $portRadios $portStatuses (Get-SelectedPort $portRadios)
})

$btnOverlay.Add_Click({
    $port = Get-SelectedPort $portRadios
    Start-Process "http://localhost:$port/overlaypublico?preview=1"
})

[void]$form.ShowDialog()
