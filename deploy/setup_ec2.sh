#!/bin/bash
set -e
echo "  DermRx Agent - EC2 GPU Setup Script"

# 1. Verify GPU
echo ""
echo "[1/6] Verifying GPU..."
if ! nvidia-smi &> /dev/null; then
    echo "ERROR: No NVIDIA GPU detected. Are you on a g5.xlarge instance?"
    exit 1
fi
echo "GPU detected:"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
echo ""

# 2. System dependencies
echo "[2/6] Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3-venv python3-pip git curl > /dev/null 2>&1
echo "System dependencies installed."

# 3. Create virtual environment
echo "[3/6] Creating Python virtual environment..."
cd ~/dermrx-agent/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel -q
echo "Virtual environment created."

# 4. Install Python dependencies
echo "[4/6] Installing Python dependencies (this takes 3-5 minutes)..."
pip install -r requirements-gpu.txt -q
echo "Python dependencies installed."

# 5. Verify PyTorch GPU access
echo "[5/6] Verifying PyTorch CUDA access..."
python3 -c "
import torch
assert torch.cuda.is_available(), 'CUDA not available in PyTorch!'
print(f'  PyTorch {torch.__version__}')
print(f'  CUDA device: {torch.cuda.get_device_name(0)}')
print(f'  VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB')
"
echo ""

# 6. HuggingFace login & model download
echo "[6/6] HuggingFace authentication..."
echo ""
echo "You need a HuggingFace token with access to:"
echo "  - google/medgemma-4b-it"
echo "  - google/txgemma-2b-predict"  
echo "  - google/medsiglip2-med-s2-b16-384"
echo ""
echo "Get your token at: https://huggingface.co/settings/tokens"
echo ""

# Check if already logged in
if huggingface-cli whoami &> /dev/null; then
    echo "Already logged into HuggingFace as: $(huggingface-cli whoami)"
    read -p "Continue with this account? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        huggingface-cli login
    fi
else
    huggingface-cli login
fi

echo ""
echo "Downloading models (this takes 5-15 minutes depending on connection)..."
echo ""

python3 -c "
from transformers import AutoProcessor, AutoModel, AutoTokenizer, AutoModelForCausalLM
import torch

print('Downloading MedSigLIP...')
AutoModel.from_pretrained('google/medsiglip2-med-s2-b16-384', torch_dtype=torch.float16)
AutoProcessor.from_pretrained('google/medsiglip2-med-s2-b16-384')
print('  MedSigLIP cached.')

print('Downloading MedGemma 4B...')
AutoModelForCausalLM.from_pretrained('google/medgemma-4b-it', torch_dtype=torch.bfloat16)
AutoProcessor.from_pretrained('google/medgemma-4b-it')
print('  MedGemma cached.')

print('Downloading TxGemma 2B...')
AutoModelForCausalLM.from_pretrained('google/txgemma-2b-predict', torch_dtype=torch.bfloat16)
AutoTokenizer.from_pretrained('google/txgemma-2b-predict')
print('  TxGemma cached.')

print('')
print('All models downloaded successfully!')
"

echo "  Setup complete!"
