import React from 'react';
import { Page, Text, View, Image } from '@react-pdf/renderer';
import { Theme } from '../utils/types';
import { createStyles } from './styles';

interface CoverPageProps {
  title: string;
  subtitle: string;
  photoUrl: string;
  theme: Theme;
}

export const CoverPage: React.FC<CoverPageProps> = ({ 
  title, 
  subtitle, 
  photoUrl, 
  theme 
}) => {
  const styles = createStyles(theme);
  
  return (
    <Page size="A5" style={styles.coverPage}>
      <View style={styles.decorativeBorder} />
      <Text style={styles.coverDecoration}>{theme.emoji}</Text>
      <Text style={styles.coverTitle}>{title}</Text>
      <Text style={styles.coverSubtitle}>{subtitle}</Text>
      {photoUrl && (
        <Image src={photoUrl} style={styles.coverPhoto} />
      )}
      <Text style={styles.coverDecoration}>✨</Text>
    </Page>
  );
};
