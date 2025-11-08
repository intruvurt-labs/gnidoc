Write-Host "🧹 Cleaning caches & builds…"
$paths = "node_modules",".expo",".turbo",".next","android\build","ios\build","bun.lockb","package-lock.json","yarn.lock"
foreach ($p in $paths) { Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue }

if (Get-Command bun -ErrorAction SilentlyContinue) {
  Write-Host "🔥 Npx Expo detected — clearing Bun cache & reinstalling"
  npx expo pm cache clean
  npx expo install
  npx expo start -c
} else {
  Write-Warning "⚠️ Bun not found — using npm fallback"
  npm cache verify
  npm i
  npx expo start -c
}
