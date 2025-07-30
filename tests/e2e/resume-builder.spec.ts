import { test, expect } from '@playwright/test';

test.describe('Resume Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the resume builder page
    await page.goto('/dashboard/resume/builder');
    
    // Mock authentication if needed
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });
  });

  test('should display resume builder steps', async ({ page }) => {
    // Check that all resume building steps are visible
    await expect(page.getByText('Personal Info')).toBeVisible();
    await expect(page.getByText('Experience')).toBeVisible();
    await expect(page.getByText('Education')).toBeVisible();
    await expect(page.getByText('Skills')).toBeVisible();
    await expect(page.getByText('Projects')).toBeVisible();
    await expect(page.getByText('Review & Optimize')).toBeVisible();
  });

  test('should allow filling personal information', async ({ page }) => {
    // Fill out personal information
    await page.fill('input[placeholder*="First"]', 'John');
    await page.fill('input[placeholder*="Last"]', 'Doe');
    await page.fill('input[type="email"]', 'john.doe@example.com');
    await page.fill('input[type="tel"]', '+1234567890');
    
    // Fill professional summary
    await page.fill('textarea[placeholder*="professional summary"]', 
      'Experienced software engineer with 5+ years of development experience.');

    // Verify the values are filled
    await expect(page.locator('input[placeholder*="First"]')).toHaveValue('John');
    await expect(page.locator('input[placeholder*="Last"]')).toHaveValue('Doe');
    await expect(page.locator('input[type="email"]')).toHaveValue('john.doe@example.com');
  });

  test('should navigate between steps', async ({ page }) => {
    // Start on personal info step
    await expect(page.getByText('Personal Information')).toBeVisible();

    // Navigate to experience step
    await page.click('text=Experience');
    await expect(page.getByText('Work Experience')).toBeVisible();

    // Navigate using next button
    await page.click('button:has-text("Next")');
    await expect(page.getByText('Education')).toBeVisible();

    // Navigate using previous button
    await page.click('button:has-text("Previous")');
    await expect(page.getByText('Work Experience')).toBeVisible();
  });

  test('should add work experience', async ({ page }) => {
    // Navigate to experience step
    await page.click('text=Experience');
    
    // Add new experience
    await page.click('button:has-text("Add Experience")');
    
    // Fill experience details
    await page.fill('input[placeholder*="Job Title"]', 'Software Engineer');
    await page.fill('input[placeholder*="Company"]', 'TechCorp Inc.');
    await page.fill('textarea[placeholder*="role and achievements"]', 
      'Developed scalable web applications using React and Node.js. Led a team of 3 developers.');

    // Verify experience was added
    await expect(page.locator('input[placeholder*="Job Title"]')).toHaveValue('Software Engineer');
    await expect(page.locator('input[placeholder*="Company"]')).toHaveValue('TechCorp Inc.');
  });

  test('should generate AI summary', async ({ page }) => {
    // Fill some basic info first
    await page.fill('input[placeholder*="First"]', 'Jane');
    await page.fill('input[placeholder*="Last"]', 'Smith');
    
    // Add some experience for AI to work with
    await page.click('text=Experience');
    await page.click('button:has-text("Add Experience")');
    await page.fill('input[placeholder*="Job Title"]', 'Developer');
    await page.fill('input[placeholder*="Company"]', 'DevCorp');
    
    // Navigate back to personal info
    await page.click('text=Personal Info');
    
    // Click AI Summary button
    await page.click('button:has-text("AI Summary")');
    
    // Wait for generation to complete
    await expect(page.getByText('Generating...')).toBeVisible();
    
    // Wait for the button to return to normal state
    await expect(page.getByText('Generating...')).toHaveCount(0, { timeout: 5000 });
    
    // Check that summary was generated
    const summaryTextarea = page.locator('textarea[placeholder*="professional summary"]');
    await expect(summaryTextarea).not.toHaveValue('');
  });

  test('should perform ATS analysis', async ({ page }) => {
    // Navigate to review step
    await page.click('text=Review & Optimize');
    
    // Fill job description
    const jobDescription = `
      We are looking for a Senior Software Engineer with experience in:
      - React and JavaScript
      - Node.js and Express
      - AWS cloud services
      - Agile development methodologies
      - Team leadership experience
    `;
    
    await page.fill('textarea[placeholder*="job description"]', jobDescription);
    
    // Click analyze button
    await page.click('button:has-text("Analyze ATS Score")');
    
    // Wait for analysis to complete
    await expect(page.getByText('Analyzing...')).toBeVisible();
    await expect(page.getByText('Analyzing...')).toHaveCount(0, { timeout: 5000 });
    
    // Check that ATS score is displayed
    await expect(page.getByText('Overall Score')).toBeVisible();
    await expect(page.getByText('Suggestions')).toBeVisible();
    await expect(page.getByText('Missing Keywords')).toBeVisible();
    
    // Check that a percentage score is shown
    await expect(page.locator('text=/\\d+%/')).toBeVisible();
  });

  test('should save resume draft', async ({ page }) => {
    // Fill minimal information
    await page.fill('input[placeholder*="First"]', 'Test');
    await page.fill('input[placeholder*="Last"]', 'User');
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Click save button
    await page.click('button:has-text("Save Draft")');
    
    // Wait for save confirmation
    await expect(page.getByText('Saving...')).toBeVisible();
    await expect(page.getByText('Saving...')).toHaveCount(0, { timeout: 5000 });
    
    // Check for success message (would need toast implementation)
    // This might need to be adjusted based on how toasts are implemented
  });

  test('should handle preview toggle', async ({ page }) => {
    // Navigate to review step
    await page.click('text=Review & Optimize');
    
    // Initially should show "Preview" button
    await expect(page.getByText('Preview')).toBeVisible();
    
    // Click preview button
    await page.click('button:has-text("Preview")');
    
    // Should now show "Hide Preview" button
    await expect(page.getByText('Hide Preview')).toBeVisible();
    
    // Click to hide preview
    await page.click('button:has-text("Hide Preview")');
    
    // Should return to "Preview" button
    await expect(page.getByText('Preview')).toBeVisible();
  });

  test('should display step progress correctly', async ({ page }) => {
    // Check initial state - step 1 should be active
    const step1 = page.locator('button:has-text("1")').first();
    await expect(step1).toHaveClass(/border-purple-600/);
    
    // Navigate to step 2
    await page.click('text=Experience');
    
    // Both steps 1 and 2 should now be active/completed
    await expect(step1).toHaveClass(/border-purple-600/);
    
    const step2 = page.locator('button:has-text("2")').first();
    await expect(step2).toHaveClass(/border-purple-600/);
  });

  test('should handle empty experience state', async ({ page }) => {
    // Navigate to experience step
    await page.click('text=Experience');
    
    // Should show empty state message
    await expect(page.getByText('No work experience added yet.')).toBeVisible();
    await expect(page.getByText('Add your first experience')).toBeVisible();
    
    // Click the empty state link
    await page.click('text=Add your first experience');
    
    // Should now show experience form
    await expect(page.locator('input[placeholder*="Job Title"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Company"]')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that the page is still functional
    await expect(page.getByText('Personal Info')).toBeVisible();
    
    // Fill form fields (should work on mobile)
    await page.fill('input[placeholder*="First"]', 'Mobile');
    await page.fill('input[placeholder*="Last"]', 'User');
    
    // Navigation should work
    await page.click('text=Experience');
    await expect(page.getByText('Work Experience')).toBeVisible();
    
    // Buttons should be clickable
    await page.click('button:has-text("Add Experience")');
    await expect(page.locator('input[placeholder*="Job Title"]')).toBeVisible();
  });
});