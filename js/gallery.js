const photos = [];
let selectedPhotoId = null;
let elements = null;
let onPhotoSelect = null;

export function initializeGallery(galleryElements, selectPhoto) {
  elements = galleryElements;
  onPhotoSelect = selectPhoto;
  renderGallery();
}

export function addPhoto(blob) {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error("유효한 사진이 없어 보관함에 추가하지 못했어요.");
  }

  const photo = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    blob,
    url: URL.createObjectURL(blob),
    capturedAt: new Date()
  };

  photos.push(photo);
  renderGallery();
  return photo;
}

export function openPhotoDetail(photoId) {
  const photo = photos.find((item) => item.id === photoId);
  if (!photo) {
    throw new Error("선택한 사진을 찾을 수 없어요. 보관함에서 다시 선택해 주세요.");
  }

  selectedPhotoId = photo.id;
  elements.detailImage.src = photo.url;
  elements.detailDate.textContent = formatDate(photo.capturedAt);
  onPhotoSelect(photo);
}

export function downloadSelectedPhoto() {
  const photo = photos.find((item) => item.id === selectedPhotoId);
  if (!photo) {
    throw new Error("다운로드할 사진을 먼저 선택해 주세요.");
  }

  const link = document.createElement("a");
  link.href = photo.url;
  link.download = `lifefourcut-${formatFileDate(photo.capturedAt)}.png`;
  link.hidden = true;
  document.body.append(link);

  try {
    link.click();
  } finally {
    link.remove();
  }
}

export function resetGallery() {
  for (const photo of photos) {
    URL.revokeObjectURL(photo.url);
  }

  photos.length = 0;
  selectedPhotoId = null;

  if (elements) {
    elements.detailImage.removeAttribute("src");
    elements.detailDate.textContent = "";
    renderGallery();
  }
}

function renderGallery() {
  if (!elements) {
    return;
  }

  elements.list.replaceChildren();
  elements.empty.hidden = photos.length > 0;
  elements.list.hidden = photos.length === 0;

  for (const photo of photos) {
    const button = document.createElement("button");
    button.className = "gallery-card";
    button.type = "button";
    button.setAttribute("aria-label", `사진 상세 보기, ${formatDate(photo.capturedAt)}`);

    const image = document.createElement("img");
    image.src = photo.url;
    image.alt = "";
    image.loading = "lazy";

    const date = document.createElement("span");
    date.textContent = formatDate(photo.capturedAt);

    button.append(image, date);
    button.addEventListener("click", () => openPhotoDetail(photo.id));
    elements.list.append(button);
  }
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatFileDate(date) {
  const twoDigits = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${twoDigits(date.getMonth() + 1)}${twoDigits(date.getDate())}-${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}${twoDigits(date.getSeconds())}`;
}
