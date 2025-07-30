import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProfessionalSummaryForm } from '../ProfessionalSummaryForm';
import { resumeService } from '../../../services/resumeService';
import { ResumeProvider } from '../../../contexts/ResumeContext';

vi.mock('../../../services/resumeService');

const mockResumeService = resumeService as any;

const renderWithProvider = (ui: React.ReactElement, { providerProps, ...renderOptions }: any = {}) => {
  return render(
    <ResumeProvider {...providerProps}>{ui}</ResumeProvider>,
    renderOptions
  );
};

describe('ProfessionalSummaryForm', () => {
  const providerProps = {
    initialData: {
      professionalSummary: '',
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe'
      },
      workExperience: [
        {
          jobTitle: 'Software Engineer',
          company: 'TechCorp',
          responsibilities: ['Developed applications']
        }
      ],
      skills: [
        { name: 'JavaScript', category: 'technical' }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all elements', () => {
    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    expect(screen.getByText('Professional Summary')).toBeInTheDocument();
    expect(screen.getByText('Create a compelling professional summary')).toBeInTheDocument();
    expect(screen.getByText('AI-Generated Summary')).toBeInTheDocument();
    expect(screen.getByText('Generate AI Summary')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Write your own professional summary/)).toBeInTheDocument();
  });

  it('displays word count and character count', () => {
    providerProps.initialData.professionalSummary = 'This is a test summary with some words.';
    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    expect(screen.getByText('8 words')).toBeInTheDocument();
    expect(screen.getByText('39 characters')).toBeInTheDocument();
  });

  it('shows optimal length indicator for good word count', () => {
    providerProps.initialData.professionalSummary = 'Results-driven software engineer with 5+ years of experience developing scalable web applications using React and Node.js. Led cross-functional teams to deliver high-quality products serving thousands of users while increasing system performance by 40%.';
    
    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    // Should show green checkmark for optimal length (25-60 words)
    expect(screen.getByText(/35 words/)).toBeInTheDocument();
  });

  it('shows warning for too short summary', () => {
    providerProps.initialData.professionalSummary = 'Software engineer with experience.';
    
    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    expect(screen.getByText(/Consider expanding your summary/)).toBeInTheDocument();
  });

  it('shows warning for too long summary', () => {
    providerProps.initialData.professionalSummary = 'This is a very long professional summary that exceeds the recommended word count by including too many details and unnecessary information that could be condensed into a more concise and impactful statement that better serves the purpose of a professional summary which should be brief yet comprehensive enough to capture the attention of potential employers and hiring managers who typically spend only a few seconds scanning each resume before deciding whether to continue reading or move on to the next candidate in their review process.';
    
    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    expect(screen.getByText(/Consider condensing your summary/)).toBeInTheDocument();
  });

  it('calls handleDataChange when text is entered', () => {
    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    const textarea = screen.getByPlaceholderText(/Write your own professional summary/);
    fireEvent.change(textarea, { target: { value: 'New summary text' } });

    // We can't directly test the context function call, but we can see the result
    expect(screen.getByDisplayValue('New summary text')).toBeInTheDocument();
  });

  it('generates AI summary successfully', async () => {
    const mockSummaries = [
      'Results-driven software engineer with 5+ years of experience...',
      'Innovative developer specializing in JavaScript applications...',
      'Technical leader with expertise in full-stack development...'
    ];

    mockResumeService.generateProfessionalSummary.mockResolvedValue(mockSummaries);

    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    const generateButton = screen.getByText('Generate AI Summary');
    fireEvent.click(generateButton);

    expect(screen.getByText('Generating...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Choose your preferred summary:')).toBeInTheDocument();
    });

    // Check that all three options are displayed
    mockSummaries.forEach(summary => {
      expect(screen.getByText(summary)).toBeInTheDocument();
    });

    expect(resumeService.generateProfessionalSummary).toHaveBeenCalledWith(providerProps.initialData);
  });

  it('shows error message when AI generation fails', async () => {
    mockResumeService.generateProfessionalSummary.mockRejectedValue(
      new Error('AI service unavailable')
    );

    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    const generateButton = screen.getByText('Generate AI Summary');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to generate AI summary. Please try again.');
    });

    alertSpy.mockRestore();
  });

  it('prevents AI generation when no work experience or skills', () => {
    providerProps.initialData.workExperience = [];
    providerProps.initialData.skills = [];

    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    const generateButton = screen.getByText('Generate AI Summary');
    fireEvent.click(generateButton);

    expect(alertSpy).toHaveBeenCalledWith(
      'Please fill out your work experience and skills sections first to generate an AI summary.'
    );

    alertSpy.mockRestore();
  });

  it('selects an AI-generated option', async () => {
    const mockSummaries = [
      'First summary option',
      'Second summary option',
      'Third summary option'
    ];

    mockResumeService.generateProfessionalSummary.mockResolvedValue(mockSummaries);

    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    // Generate AI summaries
    const generateButton = screen.getByText('Generate AI Summary');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Choose your preferred summary:')).toBeInTheDocument();
    });

    // Click on the first option
    const firstOption = screen.getByText('First summary option');
    fireEvent.click(firstOption);

    expect(screen.getByDisplayValue('First summary option')).toBeInTheDocument();
  });

  it('displays helpful guidelines and examples', () => {
    renderWithProvider(<ProfessionalSummaryForm />, { providerProps });

    // Check for guidelines
    expect(screen.getByText('✅ Do Include')).toBeInTheDocument();
    expect(screen.getByText('❌ Avoid')).toBeInTheDocument();
    expect(screen.getByText('💡 Example Professional Summaries')).toBeInTheDocument();

    // Check for specific guidelines
    expect(screen.getByText(/Your professional title and years of experience/)).toBeInTheDocument();
    expect(screen.getByText(/Generic phrases like "hard-working"/)).toBeInTheDocument();

    // Check for examples
    expect(screen.getByText('Software Engineer:')).toBeInTheDocument();
    expect(screen.getByText('Marketing Manager:')).toBeInTheDocument();
  });
});