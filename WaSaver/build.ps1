# Build WaSaver APK using Android SDK command-line tools only
# Run from the project root:  .\WaSaver\build.ps1

$ErrorActionPreference = "Stop"

$SDK     = "$env:LOCALAPPDATA\Android\Sdk"
$BT      = "$SDK\build-tools\35.0.0"
$PLAT    = "$SDK\platforms\android-35"
$ROOT    = "$PSScriptRoot"
$PKG     = "com.niquewrld.wasaver"

$SRC     = "$ROOT\src"
$BIN     = "$ROOT\bin"
$OBJ     = "$ROOT\obj"
$GEN     = "$ROOT\gen"
$APKDIR  = "$ROOT\apk"

# Clean
Remove-Item -Recurse -Force $BIN,$OBJ,$GEN,$APKDIR -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $BIN,$OBJ,$GEN,$APKDIR | Out-Null

Write-Host "=== 1. aapt — create R.java ==="
& "$BT\aapt.exe" package -f -m `
    -S "$ROOT\res" `
    -J "$GEN" `
    -M "$ROOT\AndroidManifest.xml" `
    -I "$PLAT\android.jar"

Write-Host "=== 2. javac — compile sources ==="
$sources = Get-ChildItem -Recurse "$SRC" -Filter "*.java" | ForEach-Object { $_.FullName }
$genSources = Get-ChildItem -Recurse "$GEN" -Filter "*.java" | ForEach-Object { $_.FullName }
& javac -source 8 -target 8 `
    -bootclasspath "$PLAT\android.jar" `
    -classpath "$PLAT\android.jar" `
    -d "$OBJ" `
    ($sources + $genSources)

Write-Host "=== 3. d8 — dex ==="
$classes = Get-ChildItem -Recurse "$OBJ" -Filter "*.class" | ForEach-Object { $_.FullName }
& "$BT\d8.bat" --output "$BIN" $classes

Write-Host "=== 4. aapt — package APK (unsigned) ==="
& "$BT\aapt.exe" package -f `
    -M "$ROOT\AndroidManifest.xml" `
    -S "$ROOT\res" `
    -I "$PLAT\android.jar" `
    -F "$APKDIR\wasaver-unsigned.apk" `
    "$BIN"

Write-Host "=== 5. zipalign ==="
& "$BT\zipalign.exe" -f 4 "$APKDIR\wasaver-unsigned.apk" "$APKDIR\wasaver-aligned.apk"

Write-Host "=== 6. apksigner — debug sign ==="
# Generate a throwaway debug keystore if it doesn't exist
$KS = "$env:USERPROFILE\.android\debug.keystore"
if (-not (Test-Path $KS)) {
    & keytool -genkeypair -v `
        -keystore $KS -alias androiddebugkey `
        -keypass android -storepass android `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -dname "CN=Android Debug,O=Android,C=US"
}
& "$BT\apksigner.bat" sign `
    --ks $KS `
    --ks-key-alias androiddebugkey `
    --ks-pass pass:android `
    --key-pass pass:android `
    --out "$APKDIR\wasaver.apk" `
    "$APKDIR\wasaver-aligned.apk"

Write-Host ""
$done = $APKDIR + "\wasaver.apk"
Write-Host "Done: $done"
