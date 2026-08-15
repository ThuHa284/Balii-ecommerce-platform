# Production API Testing

Run `npm run test:production-api -- --mode=smoke` for gateway/public/anonymous-contract checks. Run `--mode=read` to add dedicated customer and admin read-only checks. Reports are saved to `artifacts/production-api-report.json`.

## GitHub Actions secrets

- `PROD_API_BASE_URL`
- `PROD_TEST_CUSTOMER_EMAIL`, `PROD_TEST_CUSTOMER_PASSWORD`
- `PROD_TEST_ADMIN_EMAIL`, `PROD_TEST_ADMIN_PASSWORD`
- `PROD_TEST_PRODUCT_ID`, `PROD_TEST_PRODUCT_SLUG`, `PROD_TEST_VARIANT_ID`
- `PROD_TEST_COLLECTION_SLUG`, `PROD_TEST_CAMPAIGN_SLUG`
- `VPS_HOST`, `VPS_PORT`, `VPS_USERNAME`, `VPS_SSH_PRIVATE_KEY`, `VPS_DEPLOY_PATH`

Use dedicated `E2E_` fixtures and test accounts. Scheduled workflows never create orders, trigger payment/webhook endpoints, crawl marketplaces, reindex chatbot data, or call AI try-on providers. Those side-effect scenarios must stay in a separately approved staging/manual suite.

`backend-ci-cd.yml` copies only backend source to the VPS, preserves `.env.production.vps` on the server, rebuilds Docker services, waits for gateway readiness, then runs the production smoke suite. `frontend-ci-cd.yml` remains responsible for Vercel.
