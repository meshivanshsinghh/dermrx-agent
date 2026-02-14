from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    patient_medications: list[str] = Field(
        ...,
        min_length=1,
        description="List of current patient medications",
        examples=[["warfarin", "metformin", "lisinopril"]],
    )


class DrugCheckRequest(BaseModel):
    drug_name: str = Field(
        ...,
        min_length=2,
        description="Drug to check (e.g. fluconazole)",
    )
    patient_medications: list[str] = Field(
        ...,
        min_length=1,
        description="List of current patient medications",
    )