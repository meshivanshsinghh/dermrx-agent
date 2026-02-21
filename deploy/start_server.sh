#!/bin/bash
set -e

echo "Starting DermRx Agent (GPU mode)..."

cd ~/dermrx-agent/backend
source .venv/bin/activate

# Verify GPU is available
python3 -c "import torch; assert torch.cuda.is_available(), 'No GPU!'" 2>/dev/null || {
    echo "ERROR: CUDA not available. Check nvidia-smi."
    exit 1
}

# ── Fresh start: nuke all GPU caches ──
echo "Clearing all CUDA/PyTorch caches..."
python3 -c "
import gc, torch
gc.collect()
if torch.cuda.is_available():
    torch.cuda.empty_cache()
    torch.cuda.ipc_collect()
    torch.cuda.reset_peak_memory_stats()
    torch.cuda.reset_accumulated_memory_stats()
    free, total = torch.cuda.mem_get_info()
    print(f'  GPU memory: {free/1e9:.2f} GB free / {total/1e9:.2f} GB total')
print('  CUDA caches cleared ✓')
"

export DERMRX_MOCK_MODE=false
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

# ── Install cloudflared if not present ──
if [ ! -f ~/cloudflared ]; then
    echo "Installing cloudflared..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ~/cloudflared
    chmod +x ~/cloudflared
fi

# ── Start Cloudflare Tunnel in background ──
echo "Starting Cloudflare tunnel..."
nohup ~/cloudflared tunnel --url http://localhost:8000 > ~/cloudflared.log 2>&1 &
TUNNEL_PID=$!
sleep 5

# Extract and display the HTTPS URL
TUNNEL_URL=$(grep -o 'https://[^ ]*trycloudflare.com' ~/cloudflared.log | head -1)
echo ""
echo "============================================="
echo "  TUNNEL URL: $TUNNEL_URL"
echo "  Use this URL in your Vercel env variables"
echo "============================================="
echo ""

# ── Cleanup tunnel on exit ──
trap "echo 'Stopping tunnel...'; kill $TUNNEL_PID 2>/dev/null" EXIT

echo "Models will load on startup (~1-2 minutes)..."
echo "API will be available at http://0.0.0.0:8000"
echo "Press Ctrl+C to stop"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

When you run it, you'll see something like:
```
=============================================
  TUNNEL URL: https://some-random-words.trycloudflare.com
  Use this URL in your Vercel env variables
=============================================