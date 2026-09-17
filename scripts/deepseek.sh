#!/usr/bin/env bash
# Offload pure text-generation tasks to DeepSeek (separate token budget from
# the main agent). Usage: ./scripts/deepseek.sh "<prompt>" [system_prompt]
set -euo pipefail
source ~/.config/dail-hackathon/deepseek.env

PROMPT="$1"
SYSTEM="${2:-You are a precise technical writer. Output only what is asked, no preamble.}"

curl -s https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  -d "$(python3 -c '
import json, sys
system, prompt = sys.argv[1], sys.argv[2]
print(json.dumps({
    "model": "deepseek-chat",
    "messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": prompt},
    ],
    "temperature": 0.3,
}))
' "$SYSTEM" "$PROMPT")" | python3 -c "import json,sys; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
