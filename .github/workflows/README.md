local: act workflow_dispatch --secret-file .secrets -W .github/workflows/local
dev: act push --secret-file .secrets -W .github/workflows/dev
