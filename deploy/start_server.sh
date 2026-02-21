#!/bin/bash
set -e

cd ~/dermrx-agent/backend
source .venv/bin/activate

# Verify GPU
python3 -c "import torch; assert torch.cuda.is_available(), 'No GPU!'" 2>/dev/null || {
    echo "ERROR: CUDA not available."
    exit 1
}

# Clear GPU caches
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
print('  CUDA caches cleared')
"

export DERMRX_MOCK_MODE=false
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1