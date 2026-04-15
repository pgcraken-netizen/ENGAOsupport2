export interface Patient {
  id: string;
  facility_id: string;
  name: string;
  name_kana: string | null;
  aliases: string[];
  room_number: string | null;
  care_level: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
