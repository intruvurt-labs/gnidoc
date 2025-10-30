Write-Host "🧹 Cleaning caches & builds…"
$paths = "node_modules",".expo",".turbo",".next","android\build","ios\build","bun.lockb","package-lock.json","yarn.lock"
foreach ($p in $paths) { Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue }

if (Get-Command bun -ErrorAction SilentlyContinue) {
  Write-Host "🔥 Bun detected — clearing Bun cache & reinstalling"
  bun pm cache clean
  bun install
  bunx expo start -c
} else {
  Write-Warning "⚠️ Bun not found — using npm fallback"
  npm cache verify
  npm i
  npx expo start -c
}
