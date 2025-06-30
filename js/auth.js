// Importa a função para criar o cliente do Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// --- Configuração Central do Supabase ---
const SUPABASE_URL = 'https://bilhtpgelctnybjemzeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbGh0cGdlbGN0bnliamVtemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzgzOTYsImV4cCI6MjA2Mzg1NDM5Nn0.yybV4HP0d9KAJGxMq7y8N_AHKgqPHNXoqu0oH_Waoh4';

// Cria e exporta o cliente Supabase para ser usado em outras partes da aplicação
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Verifica a sessão do usuário e redireciona para o login se não estiver autenticado.
 * @returns {Promise<object|null>} O objeto do usuário se estiver autenticado, senão null.
 */
export async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    // Se não houver sessão, redireciona para a página de login.
    // Usar /login.html garante que o caminho é absoluto a partir da raiz do site.
    window.location.href = '/login.html';
    return null;
  }
  return session.user;
}
