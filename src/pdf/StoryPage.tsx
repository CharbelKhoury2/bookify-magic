import React from 'react';
import { Page, Text, View, Image } from '@react-pdf/renderer';
import { Theme, StoryPage as StoryPageType } from '../utils/types';
import { createStyles } from './styles';

interface StoryPageProps {
  page: StoryPageType;
  theme: Theme;
  photoUrl?: string;
  totalPages: number;
}

export const StoryPage: React.FC<StoryPageProps> = ({ 
  page, 
  theme, 
  photoUrl,
  totalPages 
}) => {
  const styles = createStyles(theme);
  
  return (
    <Page size="A5" style={styles.storyPage}>
      <View style={styles.decorativeBorder} />
      <Text style={styles.pageHeader}>
        Chapter {page.pageNum}
      </Text>
      <Text style={styles.storyText}>{page.text}</Text>
      {page.hasPhoto && photoUrl && (
        <Image 
          src={photoUrl} 
          style={page.photoStyle === 'circular' ? styles.storyPhotoCircular : styles.storyPhoto} 
        />
      )}
      <Text style={styles.pageNumber}>
        {page.pageNum} / {totalPages}
      </Text>
    </Page>
  );
};
