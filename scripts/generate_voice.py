import os
import re
import sys
from pathlib import Path

import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS


MAX_CHUNK_CHARACTERS = 230


def generate_voice(
    text: str,
    output_path: str,
) -> None:
    cleaned_text = text.strip()

    if not cleaned_text:
        raise ValueError(
            "The voice script cannot be empty."
        )

    destination = Path(output_path)
    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = ChatterboxTTS.from_pretrained(device=device)
    reference_path = os.getenv("KAI_VOICE_REFERENCE", "").strip()
    audio_prompt_path = reference_path if reference_path and Path(reference_path).is_file() else None

    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", cleaned_text) if part.strip()]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        candidate = f"{current} {sentence}".strip()
        if current and len(candidate) > MAX_CHUNK_CHARACTERS:
            chunks.append(current)
            current = sentence
        else:
            current = candidate
    if current:
        chunks.append(current)

    audio_segments: list[torch.Tensor] = []
    pause = torch.zeros(1, int(model.sr * 0.16), dtype=torch.float32)
    for index, chunk in enumerate(chunks):
        audio = model.generate(
            chunk,
            audio_prompt_path=audio_prompt_path,
            exaggeration=0.62,
            cfg_weight=0.35,
        ).detach().cpu()
        audio_segments.append(audio)
        if index < len(chunks) - 1:
            audio_segments.append(pause)

    if not audio_segments:
        raise RuntimeError(
            "Chatterbox did not generate any audio."
        )

    finished_audio = torch.cat(audio_segments, dim=-1)
    ta.save(str(destination), finished_audio, model.sr)

    print(
        f"KAI_VOICE_RESULT={destination.as_posix()} device={device} engine=chatterbox"
    )


def main() -> None:
    if len(sys.argv) < 3:
        raise ValueError(
            "Usage: generate_voice.py "
            '"<script>" "<output-path>"'
        )

    generate_voice(
        text=sys.argv[1],
        output_path=sys.argv[2],
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(
            f"KAI voice generation failed: {error}",
            file=sys.stderr,
        )
        sys.exit(1)
