gcloud run deploy backend-api \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --env-vars-file=env.yaml

