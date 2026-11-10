from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AITriageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., max_length=100)
    type: Literal["bug", "feature", "task", "improvement"] = "bug"
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    severity: Literal["trivial", "minor", "major", "critical"] = "minor"
    steps_to_reproduce: list[str] = Field(default_factory=list)
    expected_behavior: str = Field(default="")
    actual_behavior: str = Field(default="")
    suggested_labels: list[str] = Field(default_factory=list)
    possible_root_cause: str = Field(default="")
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    reasoning: str = Field(default="", max_length=200)
    missing_info: list[str] = Field(default_factory=list)


class AISummaryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tldr: str = Field(..., description="1-2 sentences summarizing the core issue and status")
    status: str = Field(..., description="Concise statement of current status")
    open_questions: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
