from pydantic import BaseModel


class ScaffoldedFile(BaseModel):
    path: str
    content: str
