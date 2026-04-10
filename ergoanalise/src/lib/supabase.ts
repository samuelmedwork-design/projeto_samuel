import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gbciphzoqjhgsnuqdwjr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiY2lwaHpvcWpoZ3NudXFkd2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDE1MjEsImV4cCI6MjA5MDQ3NzUyMX0.AY_Bkqf6aFPx-yr-QTNQcZbqVlIMdlJTP3skBqKqkZc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { db: { schema: "ergoanalise" } });
