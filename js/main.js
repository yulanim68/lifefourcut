import { capturePhoto, startCamera, stopCamera } from "./camera.js";
import {
  addPhoto,
  downloadSelectedPhoto,
  initializeGallery,
  openPhotoDetail,
  resetGallery
} from "./gallery.js";

const video = document.querySelector("#camera-preview");
const countdown = document.querySelector("#countdown");
const resultImage = document.querySelector("#result-photo");
const errorMessage = document.querySelector("#error-message");
const screens = new Map(
  ["ready", "preview", "result", "gallery", "detail", "error"].map((name) => [
    name,
    document.querySelector(`#screen-${name}`)
  ])
);

let currentScreen = "ready";
let countdownTimeout = null;
let cancelCountdownWait = null;
let countdownRunId = 0;
let retryAction = startCameraScreen;

initializeGallery({
  list: document.querySelector("#gallery-list"),
  empty: document.querySelector("#gallery-empty"),
  detailImage: document.querySelector("#detail-photo"),
  detailDate: document.querySelector("#detail-date")
}, () => showScreen("detail"));

document.querySelector("#start-camera").addEventListener("click", startCameraScreen);
document.querySelector("#open-gallery").addEventListener("click", openGallery);
document.querySelector("#take-photo").addEventListener("click", beginCountdown);
document.querySelector("#retake-photo").addEventListener("click", startCameraScreen);
document.querySelector("#gallery-camera").addEventListener("click", startCameraScreen);
document.querySelector("#detail-back").addEventListener("click", openGallery);
document.querySelector("#retry-action").addEventListener("click", () => retryAction());
document.querySelector("#error-gallery").addEventListener("click", openGallery);
document.querySelector("#download-photo").addEventListener("click", downloadPhoto);

window.addEventListener("pagehide", () => {
  cancelCountdown();
  stopCamera(video);
  showScreen("ready");
});

window.addEventListener("pageshow", (event) => {
  if (!event.persisted) {
    return;
  }

  resetGallery();
  resultImage.removeAttribute("src");
  countdown.hidden = true;
  errorMessage.textContent = "";
  showScreen("ready");
});

function showScreen(name) {
  currentScreen = name;

  for (const [screenName, screen] of screens) {
    screen.hidden = screenName !== name;
  }
}

async function startCameraScreen() {
  cancelCountdown();
  showScreen("preview");
  document.querySelector("#start-camera").disabled = true;
  document.querySelector("#take-photo").disabled = true;
  document.querySelector("#open-gallery").disabled = true;

  try {
    await startCamera(video, handleCameraDisconnect);
    if (currentScreen !== "preview") {
      stopCamera(video);
      return;
    }

    document.querySelector("#take-photo").disabled = false;
  } catch (error) {
    retryAction = startCameraScreen;
    showError(cameraErrorMessage(error));
  } finally {
    document.querySelector("#start-camera").disabled = false;
    document.querySelector("#open-gallery").disabled = false;
  }
}

function openGallery() {
  cancelCountdown();
  stopCamera(video);
  showScreen("gallery");
}

async function beginCountdown() {
  if (currentScreen !== "preview" || countdownTimeout !== null) {
    return;
  }

  const runId = ++countdownRunId;
  const captureButton = document.querySelector("#take-photo");
  captureButton.disabled = true;
  countdown.hidden = false;
  showScreen("preview");

  try {
    for (let number = 5; number > 0; number -= 1) {
      if (!isCurrentCountdown(runId)) {
        return;
      }

      countdown.textContent = String(number);
      await waitOneSecond();

      if (!isCurrentCountdown(runId)) {
        return;
      }
    }

    countdown.hidden = true;
    const blob = await capturePhoto(video);
    if (!isCurrentCountdown(runId)) {
      return;
    }

    const photo = addPhoto(blob);
    resultImage.src = photo.url;
    stopCamera(video);
    showScreen("result");
  } catch (error) {
    if (!isCurrentCountdown(runId)) {
      return;
    }

    stopCamera(video);
    retryAction = startCameraScreen;
    showError(error.message || "사진 촬영에 실패했어요. 카메라를 확인한 뒤 다시 시도해 주세요.");
  } finally {
    if (countdownRunId === runId) {
      countdownTimeout = null;
      captureButton.disabled = false;
    }
  }
}

function isCurrentCountdown(runId) {
  return countdownRunId === runId && currentScreen === "preview";
}

function waitOneSecond() {
  return new Promise((resolve) => {
    countdownTimeout = window.setTimeout(() => {
      countdownTimeout = null;
      cancelCountdownWait = null;
      resolve();
    }, 1000);

    cancelCountdownWait = () => {
      if (countdownTimeout !== null) {
        window.clearTimeout(countdownTimeout);
        countdownTimeout = null;
      }

      cancelCountdownWait = null;
      resolve();
    };
  });
}

function cancelCountdown() {
  countdownRunId += 1;

  if (cancelCountdownWait) {
    cancelCountdownWait();
  }

  if (countdownTimeout !== null) {
    window.clearTimeout(countdownTimeout);
    countdownTimeout = null;
  }

  countdown.hidden = true;
  document.querySelector("#take-photo").disabled = false;
}

function handleCameraDisconnect() {
  if (currentScreen !== "preview") {
    return;
  }

  cancelCountdown();
  document.querySelector("#take-photo").disabled = true;
  retryAction = startCameraScreen;
  showError("카메라 연결이 끊어졌어요. 카메라가 연결되어 있는지 확인하고 다시 시도해 주세요.");
}

function showError(message) {
  errorMessage.textContent = message;
  showScreen("error");
}

function cameraErrorMessage(error) {
  switch (error.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "카메라 권한이 허용되지 않았어요. 브라우저의 사이트 설정에서 카메라를 허용한 뒤 다시 시도해 주세요.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "사용할 수 있는 카메라를 찾지 못했어요. 카메라를 연결한 뒤 다시 시도해 주세요.";
    case "NotReadableError":
    case "TrackStartError":
      return "카메라를 열 수 없어요. 다른 앱에서 카메라를 사용 중인지 확인한 뒤 다시 시도해 주세요.";
    case "SecurityError":
      return "보안 연결에서만 카메라를 사용할 수 있어요. HTTPS 또는 localhost 주소로 접속해 주세요.";
    default:
      return error.message || "카메라를 시작하지 못했어요. 카메라 연결과 브라우저 권한을 확인해 주세요.";
  }
}

function downloadPhoto() {
  try {
    downloadSelectedPhoto();
  } catch (error) {
    errorMessage.textContent = error.message || "사진 다운로드를 시작하지 못했어요. 다시 시도해 주세요.";
    retryAction = () => showScreen("detail");
    showScreen("error");
  }
}
