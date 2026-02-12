from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from torchvision.models import resnet50


IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def build_eval_transform(image_size: int = 224) -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize(image_size),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ]
    )


class FaceNetPartial(nn.Module):
    """
    Minimal inference-only FaceNetPartial model:
    ResNet50 backbone + linear embedding head + L2 normalization.
    """

    def __init__(self, embedding_dim: int = 128) -> None:
        super().__init__()
        backbone = resnet50(weights=None)
        self.feature_extractor = nn.Sequential(*list(backbone.children())[:-1])
        self.embedding = nn.Linear(backbone.fc.in_features, embedding_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.feature_extractor(x)
        features = torch.flatten(features, 1)
        embeddings = self.embedding(features)
        return F.normalize(embeddings, p=2, dim=1)


def infer_embedding_dim(state_dict: dict[str, torch.Tensor]) -> int:
    weight = state_dict.get("embedding.weight")
    if weight is None:
        raise KeyError("embedding.weight not found in state_dict.")
    return int(weight.shape[0])
