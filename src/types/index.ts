export interface DentalStatistics {
  id?: string;
  user_id: string;
  date: string;
  extractions: number;
  oro_facial_pain_relief: number;
  dento_alveolar_trauma: number;
  soft_tissue_injuries: number;
  post_op_infections_bleeding: number;
  tf: number;
  gic: number;
  composite: number;
  scaling: number;
  opmd: number;
  minor_oral_surgery: number;
  referrals: number;
  others: number;
  total_attendance: number;
  pregnant_mothers: number;
  age_under_3: number;
  age_13_19: number;
  inward_patients: number;
  created_at?: string;
}

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role?: UserRole;
}
