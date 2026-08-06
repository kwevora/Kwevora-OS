"use client";

import { useEffect, useRef, useState } from "react";

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
      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

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

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      const cameraStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

      clearRecording();

      streamRef.current = cameraStream;
      setStream(cameraStream);
      setMessage("Camera and microphone are ready.");
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

      // Let Chrome select its own compatible format and codec.
      const recorder = new MediaRecorder(activeStream);

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

        const mimeType =
          chunks[0].type ||
          recorder.mimeType ||
          "video/webm";

        const blob = new Blob(chunks, {
          type: mimeType,
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
        setMessage(
          `Recording complete. ${(blob.size / 1024).toFixed(1)} KB captured.`
        );
      };

      recorderRef.current = recorder;
      recorder.start();

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

    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

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
    setMessage("Ready for another take.");

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