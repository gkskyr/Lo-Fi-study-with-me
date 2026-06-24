from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException
import torch
import numpy as np
from PIL import Image
import io
import cv2

device = torch.device("cpu")
extractor = None
matcher   = None

RANSAC_INLIER_THRESHOLD = 10
RANSAC_REPROJ_ERROR     = 8.0
REF_SIZE       = (640, 480)
MAX_SCREEN_LONG = 1280


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global extractor, matcher
    from lightglue import LightGlue, SuperPoint
    extractor = SuperPoint(max_num_keypoints=2048).eval().to(device)
    matcher   = LightGlue(
        features="superpoint",
        depth_confidence=-1,
        width_confidence=-1,
    ).eval().to(device)
    print("Models loaded.")
    yield


app = FastAPI(lifespan=lifespan)


def bytes_to_tensor(data: bytes, is_screenshot: bool = False) -> torch.Tensor:
    img = Image.open(io.BytesIO(data)).convert("L")
    if is_screenshot:
        w, h  = img.size
        scale = MAX_SCREEN_LONG / max(w, h)
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    else:
        img = img.resize(REF_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0).unsqueeze(0).to(device)


def ransac_inliers(kps0: np.ndarray, kps1: np.ndarray, matches: np.ndarray) -> int:
    if len(matches) < 4:
        return 0
    src = kps0[matches[:, 0]].reshape(-1, 1, 2)
    dst = kps1[matches[:, 1]].reshape(-1, 1, 2)
    _, mask = cv2.findHomography(src, dst, cv2.RANSAC, RANSAC_REPROJ_ERROR)
    if mask is None:
        return 0
    return int(mask.ravel().sum())


@app.post("/match")
async def match(ref: UploadFile = File(...), screenshot: UploadFile = File(...)):
    from lightglue.utils import rbd
    try:
        ref_tensor    = bytes_to_tensor(await ref.read(),        is_screenshot=False)
        screen_tensor = bytes_to_tensor(await screenshot.read(), is_screenshot=True)

        with torch.no_grad():
            feats0 = extractor.extract(ref_tensor)
            feats1 = extractor.extract(screen_tensor)
            result = matcher({"image0": feats0, "image1": feats1})

        feats0, feats1, result = [rbd(x) for x in [feats0, feats1, result]]

        matches_idx    = result["matches"].cpu().numpy()
        kps0           = feats0["keypoints"].cpu().numpy()
        kps1           = feats1["keypoints"].cpu().numpy()

        num_matches    = len(matches_idx)
        num_ref_kps    = len(kps0)
        num_screen_kps = len(kps1)
        inliers        = ransac_inliers(kps0, kps1, matches_idx)
        passed         = inliers >= RANSAC_INLIER_THRESHOLD
        score          = min(inliers / 50.0, 1.0)

        print(f"[DEBUG] inliers={inliers} matches={num_matches} "
              f"ref_kps={num_ref_kps} screen_kps={num_screen_kps} passed={passed}")

        return {
            "passed":         bool(passed),
            "score":          float(score),
            "inliers":        int(inliers),
            "num_matches":    int(num_matches),
            "num_ref_kps":    int(num_ref_kps),
            "num_screen_kps": int(num_screen_kps),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"ok": True}
