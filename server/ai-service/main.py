"""
GrayArt AI Service — Kokoro TTS + MoonDream3 + Gemini Photo Analysis
Porta 3066 — roda ao lado do Express (3065)
"""

import os
import io
import json
import uuid
import base64
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

app = FastAPI(title="GrayArt AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://flowgray.com.br"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "outputs"
UPLOAD_DIR.mkdir(exist_ok=True)

# ── Lazy loading dos modelos (só carrega quando usa) ─────────────────────────

_kokoro_pipeline = None
_moondream_model = None

def get_kokoro():
    global _kokoro_pipeline
    if _kokoro_pipeline is None:
        from kokoro import KPipeline
        _kokoro_pipeline = KPipeline(lang_code='p')  # Português BR
    return _kokoro_pipeline

def get_moondream():
    global _moondream_model
    if _moondream_model is None:
        import moondream as md
        _moondream_model = md.vl(model="moondream-2b-int8-cpu")
    return _moondream_model


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "grayart-ai",
        "features": ["tts-kokoro", "photo-analysis-moondream", "photo-report-gemini"],
    }


# ── Kokoro TTS ───────────────────────────────────────────────────────────────

@app.post("/tts/generate")
async def tts_generate(
    text: str = Form(...),
    voice: str = Form("af_heart"),
    speed: float = Form(1.0),
):
    if not text.strip():
        raise HTTPException(400, "Texto vazio")
    if len(text) > 5000:
        raise HTTPException(400, "Texto muito longo (max 5000 chars)")

    try:
        import soundfile as sf
        pipeline = get_kokoro()

        audio_chunks = []
        for _, _, audio in pipeline(text, voice=voice, speed=speed):
            audio_chunks.append(audio)

        if not audio_chunks:
            raise HTTPException(500, "Kokoro não gerou áudio")

        import numpy as np
        full_audio = np.concatenate(audio_chunks)

        filename = f"tts_{uuid.uuid4().hex[:8]}.wav"
        filepath = UPLOAD_DIR / filename
        sf.write(str(filepath), full_audio, 24000)

        return FileResponse(
            str(filepath),
            media_type="audio/wav",
            filename=filename,
            headers={"X-Audio-Duration": str(len(full_audio) / 24000)},
        )
    except ImportError as e:
        raise HTTPException(503, f"Kokoro TTS não instalado: {e}")
    except Exception as e:
        raise HTTPException(500, f"Erro ao gerar TTS: {e}")


@app.get("/tts/voices")
def tts_voices():
    return {
        "voices": [
            {"id": "af_heart", "name": "Heart (feminina)", "lang": "pt-BR"},
            {"id": "af_bella", "name": "Bella (feminina)", "lang": "pt-BR"},
            {"id": "af_sarah", "name": "Sarah (feminina)", "lang": "pt-BR"},
            {"id": "am_adam", "name": "Adam (masculina)", "lang": "pt-BR"},
            {"id": "am_michael", "name": "Michael (masculina)", "lang": "pt-BR"},
            {"id": "bf_emma", "name": "Emma (feminina BR)", "lang": "pt-BR"},
            {"id": "bm_george", "name": "George (masculina BR)", "lang": "pt-BR"},
        ],
        "default": "af_heart",
    }


# ── MoonDream3 Photo Analysis ───────────────────────────────────────────────

@app.post("/photo/detect")
async def photo_detect(
    image: UploadFile = File(...),
    query: str = Form("Descreva todos os elementos visíveis nesta foto: pessoas, objetos, iluminação, composição, qualidade da imagem, problemas visuais."),
):
    try:
        from PIL import Image
        model = get_moondream()

        contents = await image.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")

        answer = model.query(img, query)
        return {"analysis": answer.get("answer", str(answer)), "model": "moondream-2b"}

    except ImportError as e:
        raise HTTPException(503, f"MoonDream não instalado: {e}")
    except Exception as e:
        raise HTTPException(500, f"Erro na análise: {e}")


@app.post("/photo/analyze")
async def photo_analyze(
    image: UploadFile = File(...),
):
    """
    Análise completa estilo Auto Retoucher (Tadewald):
    1. MoonDream detecta pontos na foto
    2. Gemini gera laudo técnico com sugestões de retoque
    """
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if not gemini_key:
        raise HTTPException(503, "GEMINI_API_KEY não configurada")

    try:
        from PIL import Image
        model = get_moondream()

        contents = await image.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")

        # Fase 1: MoonDream detecta elementos
        detection_query = (
            "Analyze this photo in detail for a professional retouching report. "
            "Identify: skin imperfections (wrinkles, blemishes, dark circles, uneven tone), "
            "lighting issues (harsh shadows, overexposure, underexposure), "
            "composition problems (framing, background distractions), "
            "hair issues (flyaways, frizz), "
            "and overall image quality (noise, blur, white balance)."
        )
        detection = model.query(img, detection_query)
        detection_text = detection.get("answer", str(detection))

        # Fase 2: Gemini gera laudo técnico
        img_buffer = io.BytesIO()
        img.save(img_buffer, format="JPEG", quality=85)
        img_b64 = base64.b64encode(img_buffer.getvalue()).decode()

        gemini_prompt = f"""Você é um especialista em retoque fotográfico profissional.

Com base na análise de visão computacional abaixo e na imagem fornecida, gere um LAUDO DE RETOQUE em JSON.

## Análise da IA de visão:
{detection_text}

## Formato de saída (JSON):
{{
  "score": 1-10,
  "items": [
    {{
      "area": "nome da área (ex: Olhos, Pele, Cabelo, Iluminação, Composição)",
      "priority": "essencial" | "recomendado" | "opcional",
      "issue": "descrição do problema encontrado",
      "technique": "técnica sugerida (Dodge & Burn, Frequency Separation, Clone Stamp, Healing Brush, Hue/Saturation, Curves, etc.)",
      "details": "explicação breve de como aplicar"
    }}
  ],
  "overall": "avaliação geral da foto em 1-2 frases",
  "ready_to_publish": true/false
}}

Responda APENAS com o JSON, sem markdown."""

        import urllib.request
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
        payload = json.dumps({
            "contents": [{
                "parts": [
                    {"text": gemini_prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}},
                ]
            }],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
                "thinkingBudget": 0,
            },
        }).encode()

        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            gemini_data = json.loads(resp.read().decode())

        raw_text = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
        report = json.loads(raw_text)
        tokens = gemini_data.get("usageMetadata", {}).get("totalTokenCount")

        return {
            "report": report,
            "detection_raw": detection_text,
            "model_vision": "moondream-2b",
            "model_analysis": "gemini-2.5-flash",
            "tokens_used": tokens,
        }

    except ImportError as e:
        raise HTTPException(503, f"Dependência não instalada: {e}")
    except json.JSONDecodeError:
        return {
            "report": {"score": 0, "items": [], "overall": raw_text, "ready_to_publish": False},
            "detection_raw": detection_text,
            "error": "Gemini retornou formato inválido",
        }
    except Exception as e:
        raise HTTPException(500, f"Erro na análise: {e}")


# ── Cleanup de arquivos antigos ──────────────────────────────────────────────

@app.on_event("startup")
async def cleanup_old_files():
    import time
    cutoff = time.time() - 3600  # 1 hora
    for f in UPLOAD_DIR.glob("tts_*.wav"):
        if f.stat().st_mtime < cutoff:
            f.unlink(missing_ok=True)


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=3066)
