import torch
from PIL import Image
from torchvision import transforms
from model import GenderAgeModel

GENDER_CLASSES = ["male", "female"]
AGE_CLASSES = ["under_18", "18_25", "26_35", "36_plus"]

device = "cuda" if torch.cuda.is_available() else "cpu"

model = GenderAgeModel()
checkpoint = torch.load("models/gender_age_model.pth", map_location=device)
model.load_state_dict(checkpoint["model_state_dict"])
model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def predict_gender_age(image: Image.Image):
    image = image.convert("RGB")
    image_tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        gender_logits, age_logits = model(image_tensor)

        gender_probs = torch.softmax(gender_logits, dim=1)[0]
        age_probs = torch.softmax(age_logits, dim=1)[0]

        gender_idx = torch.argmax(gender_probs).item()
        age_idx = torch.argmax(age_probs).item()

    return {
        "gender": GENDER_CLASSES[gender_idx],
        "genderConfidence": round(gender_probs[gender_idx].item(), 4),
        "ageGroup": AGE_CLASSES[age_idx],
        "ageConfidence": round(age_probs[age_idx].item(), 4),
    }