import os
import pandas as pd


DATASET_DIR = "datasets/fairface"

TRAIN_CSV = os.path.join(DATASET_DIR, "fairface_label_train.csv")
VAL_CSV = os.path.join(DATASET_DIR, "fairface_label_val.csv")

OUT_TRAIN_CSV = os.path.join(DATASET_DIR, "train_gender_age.csv")
OUT_VAL_CSV = os.path.join(DATASET_DIR, "val_gender_age.csv")


# RTX3050 train khoảng 1-2h tùy batch size
TRAIN_SAMPLES = 30000
VAL_SAMPLES = 5000

RANDOM_STATE = 42


def map_age_group(age: str) -> str:
    age = str(age)

    if age in ["0-2", "3-9", "10-19"]:
        return "under_18"

    if age == "20-29":
        return "18_25"

    if age == "30-39":
        return "26_35"

    return "36_plus"


def prepare_csv(input_csv: str, output_csv: str, max_samples: int):
    df = pd.read_csv(input_csv)

    # Chỉ giữ cột cần thiết
    df = df[["file", "age", "gender"]].copy()

    # Chuẩn hóa gender
    df["gender"] = df["gender"].astype(str).str.lower()

    # Map age FairFace -> age_group của shop
    df["age_group"] = df["age"].apply(map_age_group)

    # Chỉ giữ file, gender, age_group
    df = df[["file", "gender", "age_group"]]

    # Xóa dòng lỗi nếu có
    df = df.dropna()

    # Shuffle + lấy mẫu
    if len(df) > max_samples:
        df = df.sample(n=max_samples, random_state=RANDOM_STATE)

    df = df.reset_index(drop=True)

    df.to_csv(output_csv, index=False)

    print(f"Saved: {output_csv}")
    print(f"Rows: {len(df)}")
    print()
    print("Gender distribution:")
    print(df["gender"].value_counts())
    print()
    print("Age group distribution:")
    print(df["age_group"].value_counts())
    print("-" * 50)


def main():
    prepare_csv(TRAIN_CSV, OUT_TRAIN_CSV, TRAIN_SAMPLES)
    prepare_csv(VAL_CSV, OUT_VAL_CSV, VAL_SAMPLES)


if __name__ == "__main__":
    main()