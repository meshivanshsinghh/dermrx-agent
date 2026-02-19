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

export DERMRX_MOCK_MODE=false

echo "Models will load on startup (~1-2 minutes)..."
echo "API will be available at http://0.0.0.0:8000"
echo "Press Ctrl+C to stop"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1