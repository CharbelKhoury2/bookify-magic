import { ValidationResult } from './types';

export function validateChildName(name: string): ValidationResult {
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (trimmed.length > 30) {
    return { isValid: false, error: 'Name must be less than 30 characters' };
  }
  
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
}

export function validatePhoto(file: File): ValidationResult {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (!validTypes.includes(file.type)) {
    return { isValid: false, error: 'Photo must be JPG or PNG format' };
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'Photo must be less than 5MB' };
  }
  
  return { isValid: true };
}

export function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

export function validateBookData(
  childName: string,
  themeId: string | null,
  photoFile: File | null
): ValidationResult {
  const nameValidation = validateChildName(childName);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  if (!themeId) {
    return { isValid: false, error: 'Please select a story theme' };
  }
  
  if (!photoFile) {
    return { isValid: false, error: 'Please upload a photo of your child' };
  }
  
  return { isValid: true };
}
