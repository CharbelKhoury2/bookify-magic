import { ValidationResult } from './types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateChildName(name: string): ValidationResult {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, error: 'Please enter a name for your child' };
  }
  
  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (trimmedName.length > 30) {
    return { isValid: false, error: 'Name must be 30 characters or less' };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
}

export function validatePhoto(file: File): ValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Please upload a JPEG, PNG, WebP, or GIF image' 
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: 'Image must be smaller than 10MB' 
    };
  }
  
  return { isValid: true };
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
