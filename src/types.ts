export type Language = 'en' | 'bn';

export interface User {
  name: string;
  phone: string;
  district: string;
  isVerified: boolean;
}

export interface Field {
  id: string;
  name: string;
  crop: string;
  area: string;
  health: number;
  status: string;
  nextIrrigation?: string;
  location: string;
}

export interface Tip {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  readTime: string;
}
