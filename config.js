// Valores PÚBLICOS del proyecto (la clave "anon" y la clave pública VAPID están pensadas para ir en el navegador).
// Nunca pegues aquí la clave "service_role" ni la privada de VAPID.
export default {
  supabaseUrl: "https://hehktlpweiymwnxoxnys.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaGt0bHB3ZWl5bXdueG94bnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTE1NzQsImV4cCI6MjEwODkyNzU3NH0.vqE29J5DaIa8lkoDpZudo0Zy3U1ESvIJXUlL2hWJzO8",  // clave pública "anon" (Project Settings → API)
  vapidPublic: "BDZL7oiJUn5tbHLk4IvXkHk7Je6nYcj3JVHJLsSeYC_lxvkZ8rF1z-vxUFoOpCKcW7jPIbHrwKB9HcWls7VT-J0",     // clave pública VAPID para los avisos push
};
