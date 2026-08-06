import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline


SAMPLE_RATE = 24000
DEFAULT_VOICE = "af_heart"


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

    pipeline = KPipeline(
        lang_code="a",
    )

    generator = pipeline(
        cleaned_text,
        voice=DEFAULT_VOICE,
        speed=1.0,
    )

    audio_segments: list[np.ndarray] = []

    for _graphemes, _phonemes, audio in generator:
        audio_segments.append(
            np.asarray(
                audio,
                dtype=np.float32,
            )
        )

    if not audio_segments:
        raise RuntimeError(
            "Kokoro did not generate any audio."
        )

    finished_audio = np.concatenate(
        audio_segments
    )

    sf.write(
        destination,
        finished_audio,
        SAMPLE_RATE,
    )

    print(
        f"KAI_VOICE_RESULT={destination.as_posix()}"
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