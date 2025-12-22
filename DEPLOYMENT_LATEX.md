# LaTeX-Enabled Deployment Guide for Render.com

This guide covers deploying the AI Job Suite backend with LaTeX support for high-quality PDF generation.

## Updated Files

### 1. `apps/backend/Dockerfile`
- Added LaTeX packages (texlive-latex-base, texlive-latex-extra, etc.)
- Includes all necessary LaTeX fonts and extensions
- Maintains Puppeteer support for fallback PDF generation

### 2. `Dockerfile.render.backend` (New)
- Optimized single-stage build for Render.com
- Includes LaTeX packages and build dependencies
- Reduced build time and complexity for cloud deployment
- Proper health checks and security configurations

### 3. `render.yaml`
- Updated to use the new LaTeX-enabled Dockerfile
- Added LaTeX-specific environment variables
- Configured proper timeouts for LaTeX compilation

## LaTeX Packages Installed

```dockerfile
# Core LaTeX packages
texlive-latex-base      # Basic LaTeX functionality
texlive-latex-extra     # Additional LaTeX packages
texlive-fonts-recommended # Standard fonts
texlive-fonts-extra     # Additional fonts
texlive-xetex          # XeTeX engine for Unicode support
texlive-luatex         # LuaTeX engine for advanced typography
lmodern                # Latin Modern fonts
fontconfig             # Font configuration
```

## Environment Variables

The following environment variables have been added for LaTeX support:

```yaml
- key: LATEX_ENGINE
  value: pdflatex          # LaTeX engine to use
- key: PDF_ENGINE
  value: latex             # Primary PDF generation method
- key: ENABLE_LATEX_PDF
  value: true              # Enable LaTeX PDF generation
- key: LATEX_TIMEOUT
  value: 300000            # 5-minute timeout for LaTeX compilation
```

## Deployment Steps

### Option 1: Using Render Dashboard

1. **Connect Repository**
   - Connect your GitHub repository to Render
   - Select the branch (typically `main`)

2. **Configure Service**
   - Service Type: Web Service
   - Environment: Docker
   - Dockerfile Path: `./Dockerfile.render.backend`
   - Docker Context: `.` (root directory)

3. **Set Environment Variables**
   - Use the variables from `render.yaml`
   - Ensure all API keys are properly configured
   - Set `LATEX_TIMEOUT=300000` for 5-minute compilation timeout

4. **Deploy**
   - Render will build the Docker image with LaTeX support
   - First build may take 10-15 minutes due to LaTeX package installation

### Option 2: Using render.yaml (Infrastructure as Code)

1. **Update render.yaml**
   - Ensure `dockerfilePath` points to `./Dockerfile.render.backend`
   - Verify all environment variables are set
   - Update URLs and API keys for your deployment

2. **Deploy via Git**
   ```bash
   git add .
   git commit -m "Add LaTeX support for PDF generation"
   git push origin main
   ```

3. **Create Service**
   - Push the `render.yaml` to your repository
   - Create service in Render dashboard using "Connect repository"

## Performance Considerations

### Build Time
- Initial builds will take longer due to LaTeX package installation (10-15 minutes)
- Subsequent builds will be faster due to Docker layer caching
- Consider using Render's Pro plan for faster build times

### Runtime Performance
- LaTeX compilation takes 30-120 seconds per PDF
- Increased memory usage during PDF generation
- Consider upgrading to Standard/Pro plans for better performance

### Resource Requirements
- **Memory**: Minimum 1GB, Recommended 2GB+
- **Disk**: Additional ~500MB for LaTeX packages
- **CPU**: LaTeX compilation is CPU-intensive

## Monitoring and Debugging

### Health Checks
The Dockerfile includes health checks for monitoring:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
```

### Logging
- LaTeX compilation logs are available in application logs
- Set `LOG_LEVEL=debug` for detailed LaTeX output
- Monitor build logs for LaTeX package installation issues

### Common Issues

1. **LaTeX Compilation Timeout**
   - Increase `LATEX_TIMEOUT` environment variable
   - Check for complex resume data that might cause long compilation times

2. **Memory Issues**
   - Upgrade to higher memory plans
   - Monitor memory usage during PDF generation

3. **Missing LaTeX Packages**
   - Check Dockerfile for required packages
   - Add additional packages if needed for specific templates

## Testing LaTeX Installation

After deployment, test LaTeX functionality:

1. **Create Test Resume**
   - Use the application to create a resume
   - Generate PDF preview to test LaTeX engine

2. **Check Logs**
   - Monitor application logs for LaTeX compilation messages
   - Look for successful PDF generation confirmations

3. **API Endpoint Test**
   ```bash
   curl -X POST https://your-app.onrender.com/api/v1/resumes/generate-preview-pdf \
     -H "Content-Type: application/json" \
     -d '{"templateId":"template01","resumeData":{...}}'
   ```

## Fallback Support

The system maintains Puppeteer support as a fallback:
- If LaTeX fails, system falls back to HTML-to-PDF conversion
- Graceful error handling ensures service availability
- Users receive PDFs regardless of generation method

## Cost Optimization

### Render Plan Recommendations
- **Starter Plan**: Basic testing and low usage
- **Standard Plan**: Production deployment with moderate usage
- **Pro Plan**: High-performance deployment with frequent PDF generation

### Build Optimization
- Use multi-stage builds to minimize final image size
- Layer caching reduces rebuild times
- Consider using Docker build cache for faster deployments

## Security Considerations

- LaTeX execution is sandboxed within Docker container
- No direct file system access for user input
- Input validation prevents LaTeX injection attacks
- Regular security updates for LaTeX packages

## Support and Troubleshooting

If you encounter issues:
1. Check Render build logs for LaTeX installation errors
2. Monitor application logs for compilation failures
3. Verify environment variables are properly set
4. Test locally with Docker to isolate issues

For additional support, refer to:
- Render.com documentation
- LaTeX community resources
- Project repository issues