"use client";

import { useEffect, useRef, useState } from "react";

const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const TARGET_FRAME_RATE = 30;
const VIDEO_BITRATE = 8_000_000;
const AUDIO_BITRATE = 192_000;

function getBestRecordingMimeType() {
  const preferredTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

export function useVideoRecorder() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [message, setMessage] = useState("");

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedUrlRef = useRef("");

  useEffect(() => {
    const preview = previewRef.current;

    if (!preview || !stream || recordedUrl) {
      return;
    }

    preview.srcObject = stream;
    preview.play().catch(() => undefined);
  }, [stream, recordedUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
      }
    };
  }, []);

  function clearRecording() {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
    }

    recordedUrlRef.current = "";
    setRecordedBlob(null);
    setRecordedUrl("");
  }

  async function startCamera() {
    try {
      setMessage("");

      streamRef.current?.getTracks().forEach((track) => track.stop());

      const cameraStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: TARGET_WIDTH,
            },
            height: {
              ideal: TARGET_HEIGHT,
            },
            frameRate: {
              ideal: TARGET_FRAME_RATE,
              max: TARGET_FRAME_RATE,
            },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 2,
            sampleRate: 48_000,
          },
        });

      clearRecording();

      streamRef.current = cameraStream;
      setStream(cameraStream);

      const videoTrack = cameraStream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();

      const actualWidth = settings?.width ?? TARGET_WIDTH;
      const actualHeight = settings?.height ?? TARGET_HEIGHT;
      const actualFrameRate =
        settings?.frameRate ?? TARGET_FRAME_RATE;

      setMessage(
        `Camera ready at ${actualWidth}×${actualHeight} @ ${Math.round(
          actualFrameRate
        )} FPS.`
      );
    } catch (error) {
      console.error("Camera access failed:", error);

      setMessage(
        "KWEVORA could not access your camera or microphone."
      );
    }
  }

  function startRecording() {
    const activeStream = streamRef.current;

    if (!activeStream) {
      setMessage("Start the camera first.");
      return;
    }

    if (recording) {
      return;
    }

    try {
      clearRecording();
      chunksRef.current = [];

      const mimeType = getBestRecordingMimeType();

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: VIDEO_BITRATE,
        audioBitsPerSecond: AUDIO_BITRATE,
      };

      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(
        activeStream,
        recorderOptions
      );

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);

        setRecording(false);
        setMessage(
          "The recording failed. Restart the camera and try again."
        );
      };

      recorder.onstop = () => {
        const chunks = chunksRef.current;

        if (chunks.length === 0) {
          setRecording(false);
          setMessage("No video data was captured.");
          return;
        }

        const finalMimeType =
          recorder.mimeType ||
          chunks[0].type ||
          mimeType ||
          "video/webm";

        const blob = new Blob(chunks, {
          type: finalMimeType,
        });

        if (blob.size === 0) {
          setRecording(false);
          setMessage("The recording file was empty.");
          return;
        }

        const url = URL.createObjectURL(blob);

        recordedUrlRef.current = url;

        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecording(false);

        const sizeInMB = blob.size / 1024 / 1024;

        setMessage(
          `Recording complete. ${sizeInMB.toFixed(
            2
          )} MB captured at high quality.`
        );
      };

      recorderRef.current = recorder;

      /*
       * Request data every second instead of waiting until the very end.
       * This helps Chrome build a more reliable recording for longer takes.
       */
      recorder.start(1000);

      setRecording(true);

      setMessage(
        `Recording in high quality (${mimeType || "browser-compatible WebM"})...`
      );
    } catch (error) {
      console.error("Recording start failed:", error);

      setRecording(false);

      setMessage(
        "KWEVORA could not start the high-quality recording."
      );
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.stop();
  }

  function stopCamera() {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    streamRef.current = null;

    setStream(null);
    setRecording(false);

    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }

    setMessage("Camera stopped.");
  }

  function recordAgain() {
    clearRecording();
    setMessage("Ready for another high-quality take.");

    window.setTimeout(() => {
      const preview = previewRef.current;
      const activeStream = streamRef.current;

      if (preview && activeStream) {
        preview.srcObject = activeStream;
        preview.play().catch(() => undefined);
      }
    }, 50);
  }

  return {
    stream,
    recording,
    recordedBlob,
    recordedUrl,
    message,
    previewRef,
    setMessage,
    startCamera,
    startRecording,
    stopRecording,
    stopCamera,
    recordAgain,
  };
}