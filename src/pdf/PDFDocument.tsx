import React from 'react';
import { Document } from '@react-pdf/renderer';
import { Theme, Story } from '../utils/types';
import { CoverPage } from './CoverPage';
import { StoryPage } from './StoryPage';

interface PDFDocumentProps {
  story: Story;
  theme: Theme;
  childName: string;
  photoUrl: string;
}

export const PDFDocument: React.FC<PDFDocumentProps> = ({ 
  story, 
  theme, 
  childName, 
  photoUrl 
}) => {
  return (
    <Document
      title={`${childName}'s ${theme.name} Adventure`}
      author="Personalized Book Generator"
      subject={`A personalized storybook for ${childName}`}
      keywords={`children, book, story, ${theme.name}, personalized`}
    >
      <CoverPage
        title={story.coverTitle}
        subtitle={story.coverSubtitle}
        photoUrl={photoUrl}
        theme={theme}
      />
      {story.pages.map((page) => (
        <StoryPage
          key={page.pageNum}
          page={page}
          theme={theme}
          photoUrl={page.hasPhoto ? photoUrl : undefined}
          totalPages={story.pages.length}
        />
      ))}
    </Document>
  );
};
