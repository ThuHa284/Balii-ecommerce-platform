from fastapi import FastAPI, UploadFile, File
from PIL import Image
import io

from inference import predict_gender_age

app = FastAPI(title="Balii Gender Age AI Service")


@app.get("/")
def health_check():
    return {
        "success": True,
        "message": "Gender Age AI Service is running"
    }


@app.post("/analyze-person")
async def analyze_person(image: UploadFile = File(...)):
    image_bytes = await image.read()
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    result = predict_gender_age(pil_image)

    result["imageWidth"] = pil_image.width
    result["imageHeight"] = pil_image.height

    return {
        "success": True,
        "data": result
    }