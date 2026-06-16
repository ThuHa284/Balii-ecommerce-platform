import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from dataset import FairFaceGenderAgeDataset
from model import GenderAgeModel


DATASET_ROOT = "datasets/fairface"
TRAIN_CSV = "datasets/fairface/train_gender_age.csv"
VAL_CSV = "datasets/fairface/val_gender_age.csv"

MODEL_DIR = "models"
MODEL_PATH = "models/gender_age_model.pth"

BATCH_SIZE = 32
EPOCHS = 15
LR = 1e-4


def calculate_accuracy(logits, labels):
    preds = torch.argmax(logits, dim=1)
    return (preds == labels).float().mean().item()


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("Device:", device)

    train_dataset = FairFaceGenderAgeDataset(
        TRAIN_CSV,
        DATASET_ROOT,
        is_train=True,
    )

    val_dataset = FairFaceGenderAgeDataset(
        VAL_CSV,
        DATASET_ROOT,
        is_train=False,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=2,
        pin_memory=True,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=2,
        pin_memory=True,
    )

    model = GenderAgeModel().to(device)

    gender_loss_fn = nn.CrossEntropyLoss()
    age_loss_fn = nn.CrossEntropyLoss()

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LR,
        weight_decay=1e-4,
    )

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=EPOCHS,
    )

    best_score = 0

    for epoch in range(EPOCHS):
        model.train()

        train_loss = 0
        train_gender_acc = 0
        train_age_acc = 0

        loop = tqdm(train_loader, desc=f"Epoch {epoch + 1}/{EPOCHS}")

        for images, genders, ages in loop:
            images = images.to(device)
            genders = genders.to(device)
            ages = ages.to(device)

            optimizer.zero_grad()

            gender_logits, age_logits = model(images)

            gender_loss = gender_loss_fn(gender_logits, genders)
            age_loss = age_loss_fn(age_logits, ages)

            loss = gender_loss + age_loss

            loss.backward()
            optimizer.step()

            gender_acc = calculate_accuracy(gender_logits, genders)
            age_acc = calculate_accuracy(age_logits, ages)

            train_loss += loss.item()
            train_gender_acc += gender_acc
            train_age_acc += age_acc

            loop.set_postfix({
                "loss": loss.item(),
                "gender_acc": gender_acc,
                "age_acc": age_acc,
            })

        scheduler.step()

        model.eval()

        val_gender_acc = 0
        val_age_acc = 0
        val_loss = 0

        with torch.no_grad():
            for images, genders, ages in val_loader:
                images = images.to(device)
                genders = genders.to(device)
                ages = ages.to(device)

                gender_logits, age_logits = model(images)

                gender_loss = gender_loss_fn(gender_logits, genders)
                age_loss = age_loss_fn(age_logits, ages)

                loss = gender_loss + age_loss

                val_loss += loss.item()
                val_gender_acc += calculate_accuracy(gender_logits, genders)
                val_age_acc += calculate_accuracy(age_logits, ages)

        val_gender_acc /= len(val_loader)
        val_age_acc /= len(val_loader)
        val_loss /= len(val_loader)

        score = (val_gender_acc * 0.6) + (val_age_acc * 0.4)

        print(
            f"Epoch {epoch + 1}: "
            f"val_loss={val_loss:.4f}, "
            f"val_gender_acc={val_gender_acc:.4f}, "
            f"val_age_acc={val_age_acc:.4f}, "
            f"score={score:.4f}"
        )

        if score > best_score:
            best_score = score

            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "gender_classes": ["male", "female"],
                    "age_classes": [
                        "under_18",
                        "18_25",
                        "26_35",
                        "36_plus",
                    ],
                    "best_score": best_score,
                },
                MODEL_PATH,
            )

            print("Saved best model:", MODEL_PATH)

    print("Training done. Best score:", best_score)


if __name__ == "__main__":
    main()