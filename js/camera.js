let activeStream = null;

export async function startCamera(video, onDisconnect) {
  stopCamera();

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    throw new Error("이 브라우저에서는 카메라를 사용할 수 없어요. HTTPS 또는 localhost 주소로 접속해 주세요.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 1080 },
      height: { ideal: 1920 }
    }
  });

  activeStream = stream;
  video.srcObject = stream;

  for (const track of stream.getVideoTracks()) {
    track.addEventListener("ended", () => {
      if (activeStream !== stream) {
        return;
      }

      stopCamera();
      onDisconnect();
    }, { once: true });
  }

  try {
    await video.play();
  } catch (error) {
    stopCamera();
    throw error;
  }
}

export function capturePhoto(video) {
  if (!activeStream || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 || video.videoHeight === 0) {
    return Promise.reject(new Error("카메라 영상이 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요."));
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("사진을 처리할 수 없어요. 기기의 메모리를 확인한 뒤 다시 시도해 주세요."));
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error("사진을 만들지 못했어요. 카메라를 확인한 뒤 다시 시도해 주세요."));
          return;
        }

        resolve(blob);
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

export function stopCamera(video) {
  if (activeStream) {
    for (const track of activeStream.getTracks()) {
      track.stop();
    }
  }

  activeStream = null;

  if (video && video.srcObject) {
    video.srcObject = null;
  }
}
