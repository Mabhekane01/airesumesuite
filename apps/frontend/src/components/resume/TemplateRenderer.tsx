import React from 'react';
import { Resume } from '../../types';
import { ResumeTemplate } from '../../data/resumeTemplates';

interface TemplateRendererProps {
  resume: Resume;
  template: ResumeTemplate;
  isPreview?: boolean;
}

export default function TemplateRenderer({ resume, template, isPreview = false }: TemplateRendererProps) {
  const {
    personalInfo = {},
    professionalSummary = '',
    workExperience = [],
    education = [],
    skills = [],
    projects = [],
    certifications = [],
    languages = []
  } = resume;

  // Fixed font sizes and spacing that never change - same as TemplatePreview
  const fixedStyles = {
    fontSize: '10px',
    lineHeight: '1.2',
    fontFamily: template.fontStyle === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif'
  };

  return (
    <div 
      className="bg-white shadow-lg overflow-hidden"
      style={{ 
        width: '100%', 
        height: '100%',
        margin: 0,
        padding: 0,
        ...fixedStyles
      }}
    >
      {template.layout === 'two-column' ? (
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Left Sidebar - Fixed 35% width */}
          <div 
            style={{ 
              width: '35%', 
              padding: isPreview ? '0px' : '16px',
              backgroundColor: template.colors.secondary + '15',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Profile Section */}
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{ 
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  margin: '0 auto 8px',
                  backgroundColor: template.colors.primary
                }}
              ></div>
              <h1 style={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                marginBottom: '4px',
                color: template.colors.text,
                margin: '0 0 4px 0'
              }}>
                {personalInfo.firstName} {personalInfo.lastName}
              </h1>
              <p style={{ 
                fontSize: '10px', 
                fontWeight: '500',
                color: template.colors.secondary,
                margin: '0'
              }}>
                {personalInfo.title || 'Professional'}
              </p>
            </div>

            {/* Contact Info */}
            <div>
              <h3 style={{ 
                fontWeight: 'bold', 
                fontSize: '10px', 
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: template.colors.primary,
                margin: '0 0 8px 0'
              }}>
                CONTACT
              </h3>
              <div style={{ fontSize: '9px', color: template.colors.text }}>
                <div style={{ marginBottom: '2px' }}>{personalInfo.email}</div>
                <div style={{ marginBottom: '2px' }}>{personalInfo.phone}</div>
                <div style={{ marginBottom: '2px' }}>{personalInfo.location}</div>
                {personalInfo.linkedinUrl && (
                  <div>linkedin.com/in/{personalInfo.linkedinUrl.split('/').pop()}</div>
                )}
              </div>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '10px', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: template.colors.primary,
                  margin: '0 0 8px 0'
                }}>
                  SKILLS
                </h3>
                <div>
                  {skills.slice(0, 10).map((skill, idx) => (
                    <div key={idx} style={{ 
                      fontSize: '9px',
                      padding: '3px 6px',
                      marginBottom: '2px',
                      borderRadius: '3px',
                      backgroundColor: template.colors.accent + '30', 
                      color: template.colors.text,
                      display: 'inline-block',
                      marginRight: '4px'
                    }}>
                      {skill.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {languages.length > 0 && (
              <div>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '10px', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: template.colors.primary,
                  margin: '0 0 8px 0'
                }}>
                  LANGUAGES
                </h3>
                <div style={{ fontSize: '9px', color: template.colors.text }}>
                  {languages.slice(0, 3).map((lang, idx) => (
                    <div key={idx} style={{ marginBottom: '2px' }}>
                      <span style={{ float: 'left' }}>{typeof lang === 'string' ? lang : lang.name}</span>
                      <span style={{ float: 'right' }}>
                        {typeof lang === 'string' ? 'Fluent' : lang.proficiency || 'Fluent'}
                      </span>
                      <div style={{ clear: 'both' }}></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content - Fixed 65% width */}
          <div style={{ width: '65%', padding: isPreview ? '4px' : '16px' }}>
            {/* Professional Summary */}
            {professionalSummary && (
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '12px', 
                  marginBottom: '8px',
                  paddingBottom: '4px',
                  borderBottom: `2px solid ${template.colors.accent}`,
                  color: template.colors.primary,
                  margin: '0 0 8px 0'
                }}>
                  PROFESSIONAL SUMMARY
                </h2>
                <p style={{ 
                  fontSize: '9px', 
                  lineHeight: '1.4',
                  color: template.colors.text,
                  margin: '0'
                }}>
                  {professionalSummary}
                </p>
              </div>
            )}

            {/* Experience */}
            {workExperience.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '12px', 
                  marginBottom: '12px',
                  paddingBottom: '4px',
                  borderBottom: `2px solid ${template.colors.accent}`,
                  color: template.colors.primary,
                  margin: '0 0 12px 0'
                }}>
                  EXPERIENCE
                </h2>
                <div>
                  {workExperience.slice(0, 3).map((job, index) => (
                    <div key={index} style={{ marginBottom: '12px' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <h3 style={{ 
                          fontWeight: '600', 
                          fontSize: '10px',
                          color: template.colors.text,
                          margin: '0',
                          float: 'left'
                        }}>
                          {job.jobTitle}
                        </h3>
                        <span style={{ 
                          fontSize: '9px',
                          color: template.colors.secondary,
                          float: 'right'
                        }}>
                          {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                          {job.isCurrentJob ? ' Present' : new Date(job.endDate || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                        <div style={{ clear: 'both' }}></div>
                      </div>
                      <p style={{ 
                        fontSize: '9px', 
                        fontWeight: '500',
                        marginBottom: '4px',
                        color: template.colors.secondary,
                        margin: '0 0 4px 0'
                      }}>
                        {job.company}{job.location && `, ${job.location}`}
                      </p>
                      {job.responsibilities.length > 0 && (
                        <div style={{ fontSize: '9px', color: template.colors.text }}>
                          {job.responsibilities.slice(0, 3).map((resp, idx) => (
                            <div key={idx} style={{ marginBottom: '2px' }}>• {resp}</div>
                          ))}
                        </div>
                      )}
                      {job.achievements.length > 0 && (
                        <div style={{ fontSize: '9px', color: template.colors.text, marginTop: '2px' }}>
                          {job.achievements.slice(0, 2).map((achievement, idx) => (
                            <div key={idx} style={{ marginBottom: '2px' }}>• {achievement}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '12px', 
                  marginBottom: '12px',
                  paddingBottom: '4px',
                  borderBottom: `2px solid ${template.colors.accent}`,
                  color: template.colors.primary,
                  margin: '0 0 12px 0'
                }}>
                  EDUCATION
                </h2>
                <div>
                  {education.slice(0, 2).map((edu, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <div style={{ float: 'left' }}>
                        <h3 style={{ 
                          fontWeight: '600', 
                          fontSize: '10px',
                          color: template.colors.text,
                          margin: '0 0 2px 0'
                        }}>
                          {edu.degree}
                        </h3>
                        <p style={{ 
                          fontSize: '9px',
                          color: template.colors.secondary,
                          margin: '0'
                        }}>
                          {edu.institution}
                        </p>
                      </div>
                      <span style={{ 
                        fontSize: '9px',
                        color: template.colors.secondary,
                        float: 'right'
                      }}>
                        {new Date(edu.graduationDate).toLocaleDateString('en-US', { year: 'numeric' })}
                      </span>
                      <div style={{ clear: 'both' }}></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <div>
                <h2 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '12px', 
                  marginBottom: '12px',
                  paddingBottom: '4px',
                  borderBottom: `2px solid ${template.colors.accent}`,
                  color: template.colors.primary,
                  margin: '0 0 12px 0'
                }}>
                  PROJECTS
                </h2>
                <div>
                  {projects.slice(0, 2).map((project, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <h3 style={{ 
                        fontWeight: '600', 
                        fontSize: '10px',
                        marginBottom: '2px',
                        color: template.colors.text,
                        margin: '0 0 2px 0'
                      }}>
                        {project.name}
                      </h3>
                      <p style={{ 
                        fontSize: '9px',
                        color: template.colors.text,
                        margin: '0'
                      }}>
                        {project.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Single Column Layout - Fixed Sizes */
        <div style={{ padding: isPreview ? '4px' : '16px', height: '100%' }}>
          {/* Header */}
          <div style={{ 
            textAlign: 'center', 
            paddingBottom: '12px', 
            marginBottom: '12px',
            borderBottom: `2px solid ${template.colors.accent}`
          }}>
            <h1 style={{ 
              fontWeight: 'bold', 
              fontSize: '16px', 
              marginBottom: '4px',
              color: template.colors.primary,
              margin: '0 0 4px 0'
            }}>
              {personalInfo.firstName} {personalInfo.lastName}
            </h1>
            <p style={{ 
              fontSize: '12px', 
              fontWeight: '500',
              marginBottom: '8px',
              color: template.colors.secondary,
              margin: '0 0 8px 0'
            }}>
              {personalInfo.title || 'Professional'}
            </p>
            <div style={{ 
              fontSize: '10px',
              color: template.colors.text
            }}>
              {personalInfo.email} • {personalInfo.phone} • {personalInfo.location}
            </div>
          </div>
          
          {/* Professional Summary */}
          {professionalSummary && (
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                marginBottom: '8px',
                color: template.colors.primary,
                margin: '0 0 8px 0'
              }}>
                PROFESSIONAL SUMMARY
              </h2>
              <p style={{ 
                fontSize: '10px', 
                lineHeight: '1.4',
                color: template.colors.text,
                margin: '0'
              }}>
                {professionalSummary}
              </p>
            </div>
          )}

          {/* Experience */}
          {workExperience.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                marginBottom: '8px',
                color: template.colors.primary,
                margin: '0 0 8px 0'
              }}>
                EXPERIENCE
              </h2>
              <div>
                {workExperience.slice(0, 3).map((job, index) => (
                  <div key={index} style={{ marginBottom: '8px' }}>
                    <div style={{ marginBottom: '2px' }}>
                      <h3 style={{ 
                        fontWeight: '600', 
                        fontSize: '10px',
                        color: template.colors.text,
                        margin: '0',
                        float: 'left'
                      }}>
                        {job.jobTitle}
                      </h3>
                      <span style={{ 
                        fontSize: '9px',
                        color: template.colors.secondary,
                        float: 'right'
                      }}>
                        {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                        {job.isCurrentJob ? ' Present' : new Date(job.endDate || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                      <div style={{ clear: 'both' }}></div>
                    </div>
                    <p style={{ 
                      fontSize: '9px', 
                      fontWeight: '500',
                      marginBottom: '2px',
                      color: template.colors.secondary,
                      margin: '0 0 2px 0'
                    }}>
                      {job.company}{job.location && `, ${job.location}`}
                    </p>
                    {job.responsibilities.length > 0 && (
                      <div style={{ fontSize: '9px', color: template.colors.text }}>
                        {job.responsibilities.slice(0, 2).map((resp, idx) => (
                          <div key={idx} style={{ marginBottom: '1px' }}>• {resp}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                marginBottom: '8px',
                color: template.colors.primary,
                margin: '0 0 8px 0'
              }}>
                EDUCATION
              </h2>
              <div>
                {education.slice(0, 2).map((edu, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    <div style={{ float: 'left' }}>
                      <h3 style={{ 
                        fontWeight: '600', 
                        fontSize: '10px',
                        color: template.colors.text,
                        margin: '0 0 2px 0'
                      }}>
                        {edu.degree}
                      </h3>
                      <p style={{ 
                        fontSize: '9px',
                        color: template.colors.secondary,
                        margin: '0'
                      }}>
                        {edu.institution}
                      </p>
                    </div>
                    <span style={{ 
                      fontSize: '9px',
                      color: template.colors.secondary,
                      float: 'right'
                    }}>
                      {new Date(edu.graduationDate).toLocaleDateString('en-US', { year: 'numeric' })}
                    </span>
                    <div style={{ clear: 'both' }}></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <h2 style={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                marginBottom: '8px',
                color: template.colors.primary,
                margin: '0 0 8px 0'
              }}>
                TECHNICAL SKILLS
              </h2>
              <p style={{ 
                fontSize: '10px',
                color: template.colors.text,
                margin: '0'
              }}>
                {skills.slice(0, 15).map(skill => skill.name).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
