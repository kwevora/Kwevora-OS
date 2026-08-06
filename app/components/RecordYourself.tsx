"use client";

import { useEffect, useRef, useState } from "react";

type IngestVideoResponse = {
  success?: boolean;
  message?: string;
  item?: {
    id?: string;
  };
};

type ProcessVideoResponse = {
  success?: boolean;
  message?: string;
};

export default function RecordYourself() {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordedUrlRef = useRef("");

  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(
    null
  );
  const [recordedUrl, setRecordedUrl] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    return () => {
      stopTimer();
      stopActiveStream();

      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
      }
    };
  }, []);

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    stopTimer();
    setElapsedSeconds(0);

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
  }

  function stopActiveStream() {
    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;
  }

  function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  function clearRecording() {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
    }

    recordedUrlRef.current = "";
    recordedChunksRef.current = [];

    setRecordedBlob(null);
    setRecordedUrl("");
  }

  function attachPreview(stream: MediaStream) {
    const preview = previewRef.current;

    if (!preview) {
      return;
    }

    preview.srcObject = stream;
    preview.muted = true;

    preview.play().catch((error) => {
      console.error("Preview playback failed:", error);
    });
  }

  function chooseMimeType() {
    const options = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    return (
      options.find((type) =>
        MediaRecorder.isTypeSupported(type)
      ) || ""
    );
  }

  async function startCamera() {
    try {
      setMessage("Starting camera...");

      stopActiveStream();
      clearRecording();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      streamRef.current = stream;
      setCameraReady(true);

      window.setTimeout(() => {
        attachPreview(stream);
      }, 50);

      setMessage("Camera and microphone are ready.");
    } catch (error) {
      console.error("Camera access failed:", error);

      setCameraReady(false);
      setMessage(
        "KWEVORA could not access your camera or microphone. Check Chrome permissions."
      );
    }
  }

  function startRecording() {
    const stream = streamRef.current;

    if (!stream) {
      setMessage("Start the camera first.");
      return;
    }

    try {
      clearRecording();
      recordedChunksRef.current = [];

      const mimeType = chooseMimeType();

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType
          ? {
              mimeType,
              videoBitsPerSecond: 2_500_000,
              audioBitsPerSecond: 128_000,
            }
          : undefined
      );

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);

        stopTimer();
        setRecording(false);
        setFinalizing(false);
        setMessage(
          "KWEVORA encountered a recording error."
        );
      };

      mediaRecorder.onstop = () => {
        try {
          const blobType =
            mediaRecorder.mimeType ||
            mimeType ||
            "video/webm";

          const completedBlob = new Blob(
            recordedChunksRef.current,
            {
              type: blobType,
            }
          );

          if (completedBlob.size === 0) {
            throw new Error(
              "The recording file was empty."
            );
          }

          const url =
            URL.createObjectURL(completedBlob);

          recordedUrlRef.current = url;
          setRecordedBlob(completedBlob);
          setRecordedUrl(url);

          setMessage(
            `Recording complete. ${(
              completedBlob.size /
              1024 /
              1024
            ).toFixed(2)} MB captured.`
          );
        } catch (error) {
          console.error(
            "Recording finalization failed:",
            error
          );

          setMessage(
            error instanceof Error
              ? error.message
              : "KWEVORA could not finalize the recording."
          );
        } finally {
          stopActiveStream();
          mediaRecorderRef.current = null;
          setCameraReady(false);
          setFinalizing(false);
        }
      };

      mediaRecorder.start(1000);

      startTimer();
      setRecording(true);
      setMessage("Recording...");
    } catch (error) {
      console.error("Recording start failed:", error);

      setRecording(false);
      setMessage(
        "KWEVORA could not start recording."
      );
    }
  }

  function stopRecording() {
    const mediaRecorder = mediaRecorderRef.current;

    if (
      !mediaRecorder ||
      mediaRecorder.state === "inactive" ||
      !recording
    ) {
      return;
    }

    stopTimer();
    setRecording(false);
    setFinalizing(true);
    setMessage("Finalizing recording...");

    mediaRecorder.stop();
  }

  function stopCamera() {
    stopTimer();

    const mediaRecorder = mediaRecorderRef.current;

    if (
      mediaRecorder &&
      mediaRecorder.state !== "inactive"
    ) {
      mediaRecorder.stop();
    } else {
      stopActiveStream();
      mediaRecorderRef.current = null;
      setCameraReady(false);
      setRecording(false);
      setElapsedSeconds(0);
      setMessage("Camera stopped.");
    }

    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }
  }

  async function recordAgain() {
    clearRecording();
    setElapsedSeconds(0);
    setMessage("Starting another take...");

    await startCamera();
  }

  function editBeforeSending() {
    if (!recordedBlob) {
      setMessage(
        "Record a video before editing it."
      );
      return;
    }

    setMessage(
      "The recording is ready for KAI editing instructions."
    );
  }

  function saveDraft() {
    if (!recordedBlob) {
      setMessage(
        "Record a video before saving a draft."
      );
      return;
    }

    setMessage("Draft saved for this session.");
  }

  async function sendToKai() {
    if (!recordedBlob) {
      setMessage(
        "Record a video before sending it to KAI."
      );
      return;
    }

    setSending(true);
    setMessage("Uploading the recording to KAI...");

    try {
      const extension = recordedBlob.type.includes(
        "webm"
      )
        ? "webm"
        : "mp4";

      const file = new File(
        [recordedBlob],
        `kwevora-recording-${Date.now()}.${extension}`,
        {
          type:
            recordedBlob.type || "video/webm",
        }
      );

      const formData = new FormData();

      formData.append("video", file);
      formData.append("source", "recording");
      formData.append(
        "title",
        "New KWEVORA Recording"
      );
      formData.append(
        "notes",
        "Recorded inside KWEVORA. Prepare this video for review and publishing."
      );

      const uploadResponse = await fetch(
        "/api/kai/ingest-video",
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData =
        (await uploadResponse.json()) as IngestVideoResponse;

      if (
        !uploadResponse.ok ||
        !uploadData.success
      ) {
        throw new Error(
          uploadData.message ||
            "KWEVORA could not send this recording to KAI."
        );
      }

      const reviewItemId =
        uploadData.item?.id;

      if (!reviewItemId) {
        setMessage(
          "Recording saved in the Review Queue, but no item ID was returned."
        );
        return;
      }

      setMessage(
        "Recording uploaded. KAI is transcribing and analyzing it..."
      );

      const processResponse = await fetch(
        "/api/kai/process-video",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: reviewItemId,
          }),
        }
      );

      const processData =
        (await processResponse.json()) as ProcessVideoResponse;

      if (
        !processResponse.ok ||
        !processData.success
      ) {
        throw new Error(
          processData.message ||
            "The recording was saved, but KAI could not process it."
        );
      }

      setMessage(
        "KAI finished processing the recording. Your content package is ready in the Review Queue."
      );
    } catch (error) {
      console.error(
        "Recording upload or processing failed:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not send this recording to KAI."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-green-400/20 bg-green-500/10 p-6">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-300">
        Record Yourself
      </p>

      <h3 className="mt-3 text-2xl font-black">
        Record directly inside KWEVORA.
      </h3>

      <p className="mt-3 text-gray-300">
        Record, review your take, record again, save
        it, or send it to KAI.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black">
        {recordedUrl ? (
          <video
            key={recordedUrl}
            src={recordedUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full object-contain"
          />
        ) : (
          <div className="relative">
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full object-cover"
            />

            {recording ? (
              <div className="absolute left-4 top-4 rounded-full bg-red-600 px-4 py-2 font-black text-white">
                ● REC {formatTime(elapsedSeconds)}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {!cameraReady && !recordedUrl ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={finalizing}
            className="rounded-xl bg-green-600 px-5 py-3 font-black disabled:opacity-60"
          >
            Start Camera
          </button>
        ) : null}

        {cameraReady &&
        !recording &&
        !recordedUrl ? (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="rounded-xl bg-red-600 px-5 py-3 font-black"
            >
              Start Recording
            </button>

            <button
              type="button"
              onClick={stopCamera}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-bold"
            >
              Stop Camera
            </button>
          </>
        ) : null}

        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-xl bg-white px-5 py-3 font-black text-black"
          >
            Stop Recording
          </button>
        ) : null}

        {finalizing ? (
          <button
            type="button"
            disabled
            className="rounded-xl bg-white/10 px-5 py-3 font-black text-white/60"
          >
            Finalizing...
          </button>
        ) : null}
      </div>

      {recordedUrl ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={recordAgain}
            disabled={sending}
            className="rounded-xl bg-red-600 px-5 py-3 font-black disabled:opacity-60"
          >
            Record Again
          </button>

          <button
            type="button"
            onClick={editBeforeSending}
            disabled={sending}
            className="rounded-xl bg-blue-600 px-5 py-3 font-black disabled:opacity-60"
          >
            Edit Before Sending
          </button>

          <button
            type="button"
            onClick={saveDraft}
            disabled={sending}
            className="rounded-xl bg-yellow-500 px-5 py-3 font-black text-black disabled:opacity-60"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={sendToKai}
            disabled={sending}
            className="rounded-xl bg-purple-600 px-5 py-3 font-black disabled:opacity-60"
          >
            {sending
              ? "KAI Is Processing..."
              : "Send Recording to KAI"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          {message}
        </p>
      ) : null}
    </section>
  );
}