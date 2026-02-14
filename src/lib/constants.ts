// KELH Manager V2 - Constants
// Core configuration values used throughout the application

export const DOCTORS = [
  'Dr. Ludo',
  'Dr. Mustofa',
  'Dr. Jessica',
  'Dr. Ehab',
  'None'
] as const;

export const REFERRAL_SOURCES = [
  'Social Media',
  'Dr. Ludo',
  'Walk-in',
  'By Old Patient',
  'Other Doctor',
  'NWSC',
  'BOU',
  'UPDF',
  'Others'
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Airtel Money',
  'MoMo',
  'Insurance',
  'Card',
  'Partner'
] as const;

export const SERVICE_CATEGORIES = [
  'Consultation',
  'Surgery',
  'Medication',
  'Optical',
  'Procedure',
  'Scan',
  'Laser',
  'IV',
  'Other'
] as const;

export const CURRENCY = 'UGX';

// Type exports for TypeScript usage
export type Doctor = typeof DOCTORS[number];
export type ReferralSource = typeof REFERRAL_SOURCES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type ServiceCategory = typeof SERVICE_CATEGORIES[number];
