import torch.nn as nn
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights


class GenderAgeModel(nn.Module):
    def __init__(self):
        super().__init__()

        base = mobilenet_v3_small(
            weights=MobileNet_V3_Small_Weights.DEFAULT
        )

        in_features = base.classifier[0].in_features

        base.classifier = nn.Identity()

        self.backbone = base

        self.gender_head = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 2),
        )

        self.age_head = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 4),
        )

    def forward(self, x):
        features = self.backbone(x)

        gender = self.gender_head(features)
        age = self.age_head(features)

        return gender, age