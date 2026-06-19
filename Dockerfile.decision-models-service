FROM python:3.12-slim-bookworm

WORKDIR /usr/src/app

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

COPY ./DecisionModelsService/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./DecisionModelsService .

EXPOSE 7000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7000/health', timeout=3).read()"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7000"]