// --- Configuração Central do Supabase ---
// Estas constantes serão exportadas para que o cliente Supabase possa ser criado
// em outro lugar (e.g., app.js ou index.html) onde 'supabase' é garantido estar definido.
export const SUPABASE_URL = 'https://bilhtpgelctnybjemzeg.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbGh0cGdlbGN0bnliamVtemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzgzOTYsImV4cCI6MjA2Mzg1NDM5Nn0.yybV4HP0d9KAJGxMq7y8N_AHKgqPHNXoqu0oH_Waoh4';

// A instância do cliente Supabase NÃO será criada diretamente aqui.
// Ela será criada no app.js (ou onde for necessário) após o CDN ser carregado.
// Apenas declare a variável para ser usada internamente por este módulo se necessário,
// mas ela será populada externamente.
export let supabaseClient = null; // Será inicializado externamente

/**
 * Variável global para o utilizador atual, definida após a autenticação.
 * É importante que esta variável seja gerida centralmente.
 */
export let currentUser = null;

/**
 * Função para definir a instância do SupabaseClient.
 * Deve ser chamada uma vez, após o CDN do Supabase ser carregado.
 * @param {object} client - A instância do SupabaseClient.
 */
export function setSupabaseClient(client) {
    supabaseClient = client;
    // Uma vez que o cliente está definido, podemos configurar o listener de autenticação
    // que depende do supabaseClient.
    setupAuthListener();
}

/**
 * Verifica a sessão do utilizador, busca os dados do perfil e define o utilizador atual.
 * Redireciona para a página de login se não houver sessão ou se o acesso for restrito.
 * @param {boolean} adminOnly - Se true, verifica se o utilizador tem a role 'admin'.
 * @returns {Promise<object|null>} O objeto do utilizador (com dados de perfil) se autenticado e autorizado, senão null.
 */
export async function checkAuthAndGetProfile(adminOnly = false) {
  if (!supabaseClient) {
      console.error("SupabaseClient não inicializado em checkAuthAndGetProfile.");
      window.location.href = '/login.html';
      return null;
  }

  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    console.error("Erro ao obter sessão:", sessionError);
    window.location.href = '/login.html'; // Redireciona em caso de erro na sessão
    return null;
  }

  if (!session) {
    // Se não houver sessão, e não estamos na página de login, redireciona
    if (!window.location.pathname.endsWith('/login.html') && window.location.pathname !== '/') {
      window.location.href = '/login.html';
    }
    currentUser = null; // Garante que currentUser é null
    return null;
  }

  // Busca os dados do perfil do utilizador
  const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();

  if (profileError && profileError.code !== 'PGRST116') { // Ignora erro se o perfil não for encontrado (primeiro login)
    console.error("Erro ao buscar perfil:", profileError);
    // Em caso de erro grave ao buscar o perfil, pode ser necessário desautenticar
    await supabaseClient.auth.signOut();
    window.location.href = '/login.html';
    currentUser = null;
    return null;
  }

  // Combina o utilizador da sessão com os dados do perfil
  currentUser = { ...session.user, ...profile };

  // Verifica a role de administrador se necessário
  if (adminOnly && currentUser?.role !== 'admin' && currentUser?.role !== 'admin_geral') { // Adicionado 'admin_geral'
    // Mensagem amigável ao invés de alert
    showCustomAlert('Acesso Negado', 'Esta página é apenas para administradores.', () => {
      window.location.href = '/dashboard.html';
    });
    currentUser = null;
    return null;
  }

  return currentUser;
}

/**
 * Listener de autenticação global para redirecionamentos de login e logout.
 * Esta é a única fonte de verdade para o estado de autenticação.
 * Esta função é chamada APENAS DEPOIS que o supabaseClient é definido.
 */
function setupAuthListener() {
    if (!supabaseClient) {
        console.error("Tentativa de configurar listener de autenticação antes do SupabaseClient ser inicializado.");
        return;
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        const isOnLoginPage = window.location.pathname.endsWith('/login.html') || window.location.pathname === '/';

        if (event === 'SIGNED_IN' && session) {
            // Se o utilizador fez login e está na página de login, redireciona para o dashboard.
            if (isOnLoginPage) {
                window.location.href = '/dashboard.html';
            }
            // Atualiza o currentUser globalmente após o login
            await checkAuthAndGetProfile();
        }

        if (event === 'SIGNED_OUT') {
            // Se o utilizador fez logout, redireciona sempre para a página de login.
            currentUser = null; // Limpa o utilizador global
            if (!isOnLoginPage) { // Evita loop se já estiver na página de login
                window.location.href = '/login.html';
            }
        }
    });
}


// --- Funções de Modal Personalizadas (Substituem alert/confirm) ---
/**
 * Exibe um modal de alerta personalizado.
 * @param {string} title - Título do alerta.
 * @param {string} message - Mensagem do alerta.
 * @param {function} [onClose] - Função a ser executada ao fechar o modal.
 */
export function showCustomAlert(title, message, onClose = () => {}) {
  const modalHtml = `
    <div id="custom-alert-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 text-center max-w-sm w-full">
        <h3 class="text-lg font-bold mb-3">${title}</h3>
        <p class="text-gray-600 mb-6">${message}</p>
        <button id="custom-alert-ok-btn" class="bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors">OK</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('custom-alert-ok-btn').onclick = () => {
    document.getElementById('custom-alert-modal').remove();
    onClose();
  };
}

/**
 * Exibe um modal de confirmação personalizado.
 * @param {string} title - Título da confirmação.
 * @param {string} message - Mensagem da confirmação.
 * @param {function} onConfirm - Função a ser executada se o utilizador confirmar.
 * @param {function} [onCancel] - Função a ser executada se o utilizador cancelar.
 */
export function showCustomConfirm(title, message, onConfirm, onCancel = () => {}) {
  const modalHtml = `
    <div id="custom-confirm-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 text-center max-w-sm w-full">
        <h3 class="text-lg font-bold mb-3">${title}</h3>
        <p class="text-gray-600 my-4">${message}</p>
        <div class="flex justify-center space-x-4">
          <button id="custom-confirm-cancel-btn" class="bg-gray-200 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Cancelar</button>
          <button id="custom-confirm-ok-btn" class="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors">Confirmar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('custom-confirm-ok-btn').onclick = () => {
    document.getElementById('custom-confirm-modal').remove();
    onConfirm();
  };

  document.getElementById('custom-confirm-cancel-btn').onclick = () => {
    document.getElementById('custom-confirm-modal').remove();
    onCancel();
  };
}
