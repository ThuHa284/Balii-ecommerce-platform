import os
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, HttpUrl
from real_lens import run_real_google_lens


app = FastAPI(title="Balii Google Lens Worker")


class SearchByImageRequest(BaseModel):
    imageUrl: HttpUrl | None = None
    keyword: str | None = None
    limit: int = Field(default=10, ge=1, le=20)


def use_mock_mode() -> bool:
    return os.getenv("USE_MOCK_LENS", "false").lower() == "true"


def search_google_lens(
    image_url: str | None,
    keyword: str | None,
    limit: int,
    image_bytes: bytes | None = None,
    image_filename: str | None = None,
) -> list[dict[str, Any]]:
    if use_mock_mode():
        return [
            {
                "title": "Bộ đồ ngủ nữ lụa satin mock",
                "price": 129000,
                "currency": "VND",
                "shopName": "Mock Shop",
                "source": "shopee.vn",
                "imageUrl": image_url or "https://example.com/mock-image.jpg",
                "productUrl": "https://example.com/mock-product",
                "confidenceScore": 0.78,
                "rawData": {
                    "mock": True,
                    "keyword": keyword,
                    "imageFilename": image_filename,
                    "imageBytesLength": len(image_bytes or b""),
                },
            },
            {
                "title": "Kết quả thiếu productUrl để kiểm thử nhánh không lưu",
                "price": None,
                "currency": "VND",
                "shopName": "Mock Shop 2",
                "source": "google_lens_mock",
                "imageUrl": image_url or "https://example.com/mock-image-2.jpg",
                "productUrl": None,
                "confidenceScore": 0.51,
                "rawData": {
                    "mock": True,
                    "missingProductUrl": True,
                },
            },
        ][:limit]

    return run_real_google_lens(
        image_url=image_url,
        keyword=keyword,
        limit=limit,
        image_bytes=image_bytes,
        image_filename=image_filename,
    )


@app.post("/search-by-image")
async def search_by_image(
    image: UploadFile | None = File(default=None),
    imageUrl: str | None = Form(default=None),
    keyword: str | None = Form(default=None),
    limit: int = Form(default=10),
):
    if image is None and not imageUrl:
        raise HTTPException(status_code=400, detail="image hoặc imageUrl là bắt buộc")

    if image is not None:
        image_bytes = await image.read()
    else:
        image_bytes = None

    try:
        results = search_google_lens(
            image_url=imageUrl,
            keyword=keyword,
            limit=limit,
            image_bytes=image_bytes,
            image_filename=image.filename if image else None,
        )
    except RuntimeError as error:
        message = str(error)
        status_code = 503 if "blocking automated requests" in message.lower() else 502
        raise HTTPException(status_code=status_code, detail=message) from error

    return {"success": True, "data": results}


@app.post("/search-by-image/json")
async def search_by_image_json(payload: SearchByImageRequest):
    try:
        results = search_google_lens(
            image_url=str(payload.imageUrl) if payload.imageUrl else None,
            keyword=payload.keyword,
            limit=payload.limit,
        )
    except RuntimeError as error:
        message = str(error)
        status_code = 503 if "blocking automated requests" in message.lower() else 502
        raise HTTPException(status_code=status_code, detail=message) from error

    return {"success": True, "data": results}
