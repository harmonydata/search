# Discovery App Deployment to GitHub Pages

This repository is configured to automatically deploy the Discovery app to the same GitHub Pages site as the Harmony project.

## Deployment Structure

The deployment creates the following structure on `harmonydata.ac.uk`:

- **Root (`/`)**: Harmony wrapper website
- **App folder (`/app`)**: Harmony React application
- **Search folder (`/search`)**: Discovery Next.js application (this repository)

## How it Works

### GitHub Actions Workflow

The `.github/workflows/deploy-discovery.yml` workflow:

1. **Triggers**: On pushes to `main` branch, PR merges, or manual dispatch
2. **Builds**: Creates a static export of the Discovery app with `/search` base path
3. **Deploys**: Copies the build to the `search` folder in the harmonydata.github.io repository's `gh-pages` branch

### Configuration

- **Next.js Config**: `next.config.js` is configured with conditional `basePath` and `assetPrefix`
- **Build Script**: `npm run build:github-pages` builds with `GITHUB_PAGES_DEPLOYMENT=true`
- **Static Export**: The app is built as a static site that can run on GitHub Pages
- **API Routes**: The OG API route is disabled during static builds since server-side functionality isn't available on GitHub Pages

### Required Setup

#### 1. Repository Secret

The workflow requires a `HARMONY_DEPLOY_TOKEN` secret with permissions to push to the `harmonydata/harmonydata.github.io` repository.

To set this up:

1. Go to the harmonydata.github.io repository settings
2. Generate a Personal Access Token (classic) with `repo` scope
3. Add this token as a secret named `HARMONY_DEPLOY_TOKEN` in this repository's settings

#### 2. GitHub Pages Configuration

The harmonydata.github.io repository should have GitHub Pages configured to serve from the `gh-pages` branch.

### Access

Once deployed, the Discovery app will be accessible at:
`https://harmonydata.ac.uk/search/`

## Local Development

For local development, use the standard Next.js commands:

```bash
npm run dev     # Development server (normal basePath)
npm run build   # Standard build for Vercel deployment
npm run static  # Static export for local testing
```

To test the GitHub Pages deployment locally:

```bash
npm run build:github-pages  # Build with /search basePath
npm run serve               # Serve the static files
```

Then navigate to `http://localhost:3000/search/` to see how it will look when deployed.

## Manual Deployment

To manually trigger a deployment:

1. Go to the Actions tab in this repository
2. Select "Deploy Discovery to GitHub Pages"
3. Click "Run workflow"

## Troubleshooting

### Common Issues

- **Build fails with API route errors**: The API route exports have been configured to work with static builds
- **Base path issues**: Make sure all internal links use Next.js Link component or relative paths
- **Asset loading**: The `assetPrefix` ensures all assets load from the correct `/search` path
- **Secret not configured**: Ensure `HARMONY_DEPLOY_TOKEN` is set up with correct permissions

### Testing the Deployment

You can test the build locally to ensure it works before deploying:

```bash
npm run build:github-pages
# Check that out/ directory contains files with /search paths
head out/index.html | grep "/search"
```

## Current Status

✅ Static build working with `/search` base path
✅ GitHub Actions workflow configured
⚠️ Requires `HARMONY_DEPLOY_TOKEN` secret to be configured
⚠️ Needs testing with actual deployment to harmonydata.github.io
