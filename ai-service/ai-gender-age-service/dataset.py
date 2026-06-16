import os
import pandas as pd
from PIL import Image

from torch.utils.data import Dataset
from torchvision import transforms


GENDER_MAP = {
    "male": 0,
    "female": 1,
}

AGE_MAP = {
    "under_18": 0,
    "18_25": 1,
    "26_35": 2,
    "36_plus": 3,
}


class FairFaceGenderAgeDataset(Dataset):
    def __init__(self, csv_file, dataset_root, is_train=True):
        self.df = pd.read_csv(csv_file)
        self.dataset_root = dataset_root

        if is_train:
            self.transform = transforms.Compose([
                transforms.Resize((256, 256)),
                transforms.RandomResizedCrop(224, scale=(0.85, 1.0)),
                transforms.RandomHorizontalFlip(),
                transforms.ColorJitter(
                    brightness=0.15,
                    contrast=0.15,
                    saturation=0.15,
                ),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ])
        else:
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ])

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]

        image_path = os.path.join(self.dataset_root, row["file"])

        image = Image.open(image_path).convert("RGB")
        image = self.transform(image)

        gender = GENDER_MAP[str(row["gender"]).lower()]
        age = AGE_MAP[str(row["age_group"])]

        return image, gender, age