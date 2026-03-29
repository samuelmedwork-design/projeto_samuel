import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://khdvaghdrsmxrfuuhqgc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZHZhZ2hkcnNteHJmdXVocWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjUxODYsImV4cCI6MjA5MDMwMTE4Nn0.9uGIjTvB_m9V-BMbz2mrxQeNnv9LlswwhCri69e1wZw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
