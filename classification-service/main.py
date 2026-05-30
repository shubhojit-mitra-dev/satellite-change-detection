from fastapi import FastAPI

app = FastAPI(
    title="Classification Service",
    description="Satellite change classification via Google Earth Engine",
    version="0.1.0",
)


@app.get("/health")
def health():
    return {"status": "UP"}
