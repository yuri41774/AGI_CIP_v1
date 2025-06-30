//-------------------------------------------------------------------
// 1. CONFIGURAÇÃO GLOBAL E INICIALIZAÇÃO DO SUPABASE
//-------------------------------------------------------------------

// CORREÇÃO: Acessa a função createClient a partir do objeto global 'supabase' fornecido pelo script CDN.
const { createClient } = supabase;

const SUPABASE_URL = 'https://bilhtpgelctnybjemzeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbGh0cGdlbGN0bnliamVtemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzgzOTYsImV4cCI6MjA2Mzg1NDM5Nn0.yybV4HP0d9KAJGxMq7y8N_AHKgqPHNXoqu0oH_Waoh4';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variável global para o usuário, será definida após o login
let currentUser = null;

// Função de verificação de autenticação genérica e busca de perfil
async function checkAuthAndGetProfile(adminOnly = false) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        // Se não houver sessão, e não estamos na página de login, redireciona
        if (!window.location.pathname.endsWith('/login.html') && window.location.pathname !== '/') {
            window.location.href = '/login.html';
        }
        return null;
    }

    const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
    if (error && error.code !== 'PGRST116') { // Ignora erro se o perfil não for encontrado
        console.error("Erro ao buscar perfil:", error);
        return null;
    }

    if (adminOnly && profile?.role !== 'admin') {
        alert('Acesso negado. Esta página é apenas para administradores.');
        window.location.href = '/dashboard.html';
        return null;
    }
    
    // Combina o usuário da sessão com os dados do perfil
    return { ...session.user, ...profile };
}


//-------------------------------------------------------------------
// 2. LISTENER DE AUTENTICAÇÃO GLOBAL
//-------------------------------------------------------------------

// Este listener centralizado trata dos redirecionamentos de login e logout para toda a aplicação.
supabaseClient.auth.onAuthStateChange((event, session) => {
    const isOnLoginPage = window.location.pathname.endsWith('/login.html') || window.location.pathname === '/';

    if (event === 'SIGNED_IN' && session) {
        // Se o utilizador fez login e está na página de login, redireciona para o dashboard.
        if (isOnLoginPage) {
            window.location.href = '/dashboard.html';
        }
    }
    
    if (event === 'SIGNED_OUT') {
        // Se o utilizador fez logout, redireciona sempre para a página de login.
        window.location.href = '/login.html';
    }
});


//-------------------------------------------------------------------
// 3. LÓGICA ESPECÍFICA PARA CADA PÁGINA
//-------------------------------------------------------------------

// --- LÓGICA DA PÁGINA DE LOGIN (/login.html) ---
function initLoginPage() {
    // Verifica se já existe uma sessão ativa ao carregar a página
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = '/dashboard.html';
        }
    });

    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    function toggleForms(showRegister) {
        loginSection.classList.toggle('form-hidden', showRegister);
        loginSection.classList.toggle('form-visible', !showRegister);
        registerSection.classList.toggle('form-hidden', !showRegister);
        registerSection.classList.toggle('form-visible', showRegister);
    }

    if(showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });
    if(showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });

    if(loginForm) loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target['login-email'].value;
        const password = e.target['login-password'].value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("Erro no login: " + error.message);
    });

    if(registerForm) registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        if (password.length < 6) { alert("A senha deve ter no mínimo 6 caracteres."); return; }
        if (password !== passwordConfirm) { alert("As senhas não coincidem."); return; }

        const { error } = await supabaseClient.auth.signUp({
            email: document.getElementById('register-email').value,
            password: password,
            options: {
                data: {
                    display_name: document.getElementById('register-name').value,
                    birthdate: document.getElementById('register-birthdate').value,
                    phone: document.getElementById('register-phone').value,
                    gender: document.getElementById('register-gender').value,
                    marital_status: document.getElementById('register-marital-status').value,
                }
            }
        });
        if (error) { alert("Erro ao criar conta: " + error.message); } 
        else { alert("Registo bem-sucedido! Verifique o seu email para confirmar a sua conta."); toggleForms(false); }
    });
}


// --- LÓGICA DA PÁGINA DO DASHBOARD (/dashboard.html) ---
async function initDashboardPage() {
    currentUser = await checkAuthAndGetProfile();
    if (!currentUser) return;
    
    // Elementos do DOM do Dashboard
    const userAvatar = document.getElementById('user-avatar');
    const userEmailDisplay = document.getElementById('user-email-display');
    const adminLink = document.getElementById('admin-link');
    const logoutBtn = document.getElementById('logout-btn');
    const profileMenuBtn = document.getElementById('profile-menu-btn');
    const profileMenu = document.getElementById('profile-menu');
    const createPostForm = document.getElementById('create-post-form');
    const postContent = document.getElementById('post-content');
    const postSubmitBtn = document.getElementById('post-submit-btn');
    const feedContainer = document.getElementById('feed-container');

    // Setup do Perfil no Header
    if(userAvatar) userAvatar.src = currentUser.photo_url || `https://i.pravatar.cc/40?u=${currentUser.id}`;
    if(userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
    if (adminLink && currentUser.role === 'admin') {
        adminLink.classList.remove('hidden');
    }
    
    // Listeners do Header
    if(logoutBtn) logoutBtn.addEventListener('click', async () => {
        await supabaseClient.from('profiles').update({ status: 'offline' }).eq('id', currentUser.id);
        await supabaseClient.auth.signOut();
    });

    if(profileMenuBtn) profileMenuBtn.addEventListener('click', () => {
        if(profileMenu) profileMenu.classList.toggle('hidden');
    });

    // Lógica de Postagem
    if(createPostForm) createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = postContent.value.trim();
        if(!content) return;

        postSubmitBtn.disabled = true;
        const { error } = await supabaseClient.from('posts').insert({
            content: content,
            created_by: currentUser.id
        });

        if(error) {
            alert('Não foi possível criar o post.');
            console.error(error);
        } else {
            postContent.value = '';
        }
        postSubmitBtn.disabled = false;
    });

    // Lógica do Feed
    const fetchAndRenderFeed = async () => {
        const { data, error } = await supabaseClient.from('posts')
            .select(`*, profiles(display_name, photo_url)`)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erro ao buscar posts:', error);
            return;
        }

        if(feedContainer) {
            feedContainer.innerHTML = '';
            if(data.length === 0) {
                feedContainer.innerHTML = `<p class="text-center text-gray-500">Ainda não há posts. Seja o primeiro!</p>`;
            } else {
                data.forEach(post => {
                    const postEl = document.createElement('div');
                    postEl.className = 'bg-white p-4 rounded-lg shadow-md feed-item';
                    const authorAvatar = post.profiles.photo_url || `https://i.pravatar.cc/40?u=${post.created_by}`;
                    const postDate = new Date(post.created_at).toLocaleString('pt-BR');

                    postEl.innerHTML = `
                        <div class="flex items-center mb-4">
                            <img src="${authorAvatar}" alt="Avatar do autor" class="w-10 h-10 rounded-full mr-3">
                            <div>
                                <p class="font-semibold">${post.profiles.display_name || 'Utilizador Anónimo'}</p>
                                <p class="text-xs text-gray-500">${postDate}</p>
                            </div>
                        </div>
                        <p class="text-gray-800 whitespace-pre-wrap">${post.content}</p>
                    `;
                    feedContainer.appendChild(postEl);
                });
            }
        }
    };
    
    // Carregar feed inicial e ouvir por mudanças
    fetchAndRenderFeed();
    supabaseClient.channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchAndRenderFeed)
        .subscribe();
}

// --- LÓGICA DA PÁGINA DE PERFIL (/profile.html) ---
async function initProfilePage() {
    currentUser = await checkAuthAndGetProfile();
    if (!currentUser) return;

    const profileView = document.getElementById('profile-view');
    const profileForm = document.getElementById('profile-form');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    const viewElements = {
        name: document.getElementById('view-display-name'), email: document.getElementById('view-email'),
        bio: document.getElementById('view-bio'), phone: document.getElementById('view-phone'),
        birthdate: document.getElementById('view-birthdate'), gender: document.getElementById('view-gender'),
        maritalStatus: document.getElementById('view-marital-status'),
    };

    const formElements = {
        name: document.getElementById('form-display-name'), bio: document.getElementById('form-bio'),
        phone: document.getElementById('form-phone'), birthdate: document.getElementById('form-birthdate'),
        gender: document.getElementById('form-gender'), maritalStatus: document.getElementById('form-marital-status'),
    };
    
    const updateProfileDisplay = (profileData) => {
        if(!profileData) return;
        const naoInformado = 'Não informado';
        if(viewElements.email) viewElements.email.textContent = profileData.email;
        if(viewElements.name) viewElements.name.textContent = profileData.display_name || 'Adicione um nome';
        if(viewElements.bio) viewElements.bio.textContent = profileData.bio || 'Adicione uma bio.';
        if(viewElements.phone) viewElements.phone.textContent = profileData.phone || naoInformado;
        if(viewElements.birthdate) viewElements.birthdate.textContent = profileData.birthdate ? new Date(profileData.birthdate + 'T00:00:00').toLocaleDateString('pt-BR') : naoInformado;
        if(viewElements.gender) viewElements.gender.textContent = profileData.gender ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1) : naoInformado;
        if(viewElements.maritalStatus) viewElements.maritalStatus.textContent = profileData.marital_status ? profileData.marital_status.charAt(0).toUpperCase() + profileData.marital_status.slice(1) : naoInformado;

        if(formElements.name) formElements.name.value = profileData.display_name || '';
        if(formElements.bio) formElements.bio.value = profileData.bio || '';
        if(formElements.phone) formElements.phone.value = profileData.phone || '';
        if(formElements.birthdate) formElements.birthdate.value = profileData.birthdate || '';
        if(formElements.gender) formElements.gender.value = profileData.gender || 'nao-informar';
        if(formElements.maritalStatus) formElements.maritalStatus.value = profileData.marital_status || '';
    };

    updateProfileDisplay(currentUser);

    if(editProfileBtn) editProfileBtn.addEventListener('click', () => {
        profileView.classList.add('hidden');
        profileForm.classList.remove('hidden');
    });

    if(cancelEditBtn) cancelEditBtn.addEventListener('click', () => {
        profileForm.classList.add('hidden');
        profileView.classList.remove('hidden');
    });

    if(profileForm) profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = {
            id: currentUser.id, updated_at: new Date(),
            display_name: formElements.name.value, bio: formElements.bio.value, phone: formElements.phone.value,
            birthdate: formElements.birthdate.value, gender: formElements.gender.value, marital_status: formElements.maritalStatus.value,
        };
        const { error } = await supabaseClient.from('profiles').upsert(updates);
        if (error) { alert('Erro ao salvar o perfil.'); }
        else {
            alert('Perfil atualizado!');
            currentUser = {...currentUser, ...updates};
            updateProfileDisplay(currentUser);
            profileForm.classList.add('hidden');
            profileView.classList.remove('hidden');
        }
    });
}

// --- LÓGICA DA PÁGINA DE EVENTOS (/eventos.html) ---
async function initEventsPage() {
    currentUser = await checkAuthAndGetProfile();
    if (!currentUser) return;

    const eventsContainer = document.getElementById('events-container');
    const eventModal = document.getElementById('event-modal');
    const eventForm = document.getElementById('event-form');
    const modalTitle = document.getElementById('modal-title');
    const createEventBtn = document.getElementById('create-event-btn');
    const cancelEventBtn = document.getElementById('cancel-event-btn');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    const fetchAndRenderEvents = async () => {
        const { data, error } = await supabaseClient.from('events').select(`*, profiles(display_name)`).order('date', { ascending: true });
        if(eventsContainer) eventsContainer.innerHTML = '';
        if (error || !data || data.length === 0) {
            if(eventsContainer) eventsContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center">Nenhum evento agendado.</p>`;
            return;
        }
        data.forEach(event => {
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-lg shadow-md flex flex-col event-card relative';
            const eventDate = new Date(`${event.date}T${event.time}`);
            const isAuthor = currentUser && event.created_by === currentUser.id;
            const authorControls = isAuthor ? `
                <div class="absolute top-2 right-2 flex space-x-1">
                    <button class="edit-event-btn p-2 rounded-full hover:bg-gray-100" data-id="${event.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button class="delete-event-btn p-2 rounded-full hover:bg-gray-100" data-id="${event.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>` : '';
            card.innerHTML = `${authorControls}<div class="flex-1"><h3 class="text-xl font-bold text-gray-800 mb-2 pr-16">${event.name}</h3><p class="text-orange-600 font-semibold">${eventDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})} às ${eventDate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p><p class="text-gray-500 mt-1">${event.location}</p><p class="text-gray-600 mt-4">${event.description || ''}</p></div>`;
            if(eventsContainer) eventsContainer.appendChild(card);
        });
    };
    
    if(createEventBtn) createEventBtn.addEventListener('click', () => {
        if(eventForm) eventForm.reset();
        if(modalTitle) modalTitle.textContent = "Criar Novo Evento";
        const eventIdInput = document.getElementById('event-id');
        if(eventIdInput) eventIdInput.value = '';
        if(eventModal) eventModal.classList.remove('hidden');
    });

    if(cancelEventBtn) cancelEventBtn.addEventListener('click', () => eventModal.classList.add('hidden'));

    if(eventForm) eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const eventId = document.getElementById('event-id').value;
        const eventData = {
            name: document.getElementById('event-name').value, date: document.getElementById('event-date').value,
            time: document.getElementById('event-time').value, location: document.getElementById('event-location').value,
            description: document.getElementById('event-description').value, created_by: currentUser.id,
        };
        const { error } = eventId ? await supabaseClient.from('events').update(eventData).eq('id', eventId) : await supabaseClient.from('events').insert(eventData);
        if (error) { alert("Não foi possível salvar o evento."); } else if(eventModal) { eventModal.classList.add('hidden'); }
    });

    if(eventsContainer) eventsContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-event-btn');
        if (editBtn) {
            const { data } = await supabaseClient.from('events').select('*').eq('id', editBtn.dataset.id).single();
            if (data) {
                if(document.getElementById('event-id')) document.getElementById('event-id').value = data.id;
                if(document.getElementById('event-name')) document.getElementById('event-name').value = data.name;
                if(document.getElementById('event-date')) document.getElementById('event-date').value = data.date;
                if(document.getElementById('event-time')) document.getElementById('event-time').value = data.time;
                if(document.getElementById('event-location')) document.getElementById('event-location').value = data.location;
                if(document.getElementById('event-description')) document.getElementById('event-description').value = data.description;
                
                if(modalTitle) modalTitle.textContent = "Editar Evento";
                if(eventModal) eventModal.classList.remove('hidden');
            }
        }
        const deleteBtn = e.target.closest('.delete-event-btn');
        if (deleteBtn) {
            if(confirmDeleteBtn) confirmDeleteBtn.dataset.id = deleteBtn.dataset.id;
            if(deleteConfirmModal) deleteConfirmModal.classList.remove('hidden');
        }
    });

    if(cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => deleteConfirmModal.classList.add('hidden'));
    
    if(confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', async (e) => {
        const eventId = e.target.dataset.id;
        if(eventId) await supabaseClient.from('events').delete().eq('id', eventId);
        if(deleteConfirmModal) deleteConfirmModal.classList.add('hidden');
    });

    supabaseClient.channel('public:events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchAndRenderEvents).subscribe();
    fetchAndRenderEvents();
}


// --- LÓGICA DA PÁGINA DE ADMIN (/admin.html) ---
async function initAdminPage() {
    currentUser = await checkAuthAndGetProfile(true);
    if (!currentUser) return;

    const metricsDOMElements = {
        totalUsers: document.getElementById('total-users'), onlineUsers: document.getElementById('online-users'),
        totalPosts: document.getElementById('total-posts'), totalEvents: document.getElementById('total-events'),
    };
    const usersTableBody = document.getElementById('users-table-body');
    const eventsContainer = document.getElementById('events-container');
    const eventModal = document.getElementById('event-modal');
    const eventForm = document.getElementById('event-form');
    const eventModalTitle = document.getElementById('modal-title');
    const createEventBtn = document.getElementById('create-event-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    const fetchMetrics = async () => {
        const { count: u } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true });
        const { count: o } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'online');
        const { count: p } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true });
        const { count: e } = await supabaseClient.from('events').select('*', { count: 'exact', head: true });
        if(metricsDOMElements.totalUsers) metricsDOMElements.totalUsers.textContent = u ?? 0;
        if(metricsDOMElements.onlineUsers) metricsDOMElements.onlineUsers.textContent = o ?? 0;
        if(metricsDOMElements.totalPosts) metricsDOMElements.totalPosts.textContent = p ?? 0;
        if(metricsDOMElements.totalEvents) metricsDOMElements.totalEvents.textContent = e ?? 0;
    };
    
    const fetchUsers = async () => {
        const { data: users, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
        if (!usersTableBody || error) return;
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr'); row.className = 'border-b hover:bg-gray-50';
            const isAdmin = user.role === 'admin';
            row.innerHTML = `
                <td class="p-4"><p class="font-bold">${user.display_name||'N/A'}</p><p class="text-sm text-gray-500">${user.email}</p></td>
                <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${user.status==='online'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}">${user.status==='online'?'Online':'Offline'}</span></td>
                <td class="p-4 text-sm">${isAdmin?'Admin':'Membro'}</td>
                <td class="p-4 text-right"><button data-action="${isAdmin?'remove-admin':'make-admin'}" data-id="${user.id}" class="px-3 py-1 rounded-lg text-sm font-semibold ${isAdmin?'bg-red-100 text-red-700 hover:bg-red-200':'bg-blue-100 text-blue-700 hover:bg-blue-200'}">${isAdmin?'Remover Admin':'Tornar Admin'}</button></td>`;
            usersTableBody.appendChild(row);
        });
    };

    const fetchEvents = async () => {
        const { data, error } = await supabaseClient.from('events').select('*').order('date', { ascending: true });
        if (!eventsContainer) return;
        eventsContainer.innerHTML = '';
        if (error || !data || data.length === 0) { eventsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Nenhum evento.</p>'; return; }
        data.forEach(ev => {
            const card = document.createElement('div'); card.className = 'bg-white p-5 rounded-lg shadow-md space-y-2 fade-in';
            const date = new Date(`${ev.date}T${ev.time}`);
            card.innerHTML = `<h3 class="text-lg font-bold">${ev.name}</h3><p class="text-sm text-gray-600">${date.toLocaleDateString('pt-BR',{timeZone:'UTC'})} às ${date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})}</p><p class="text-sm text-gray-500">${ev.location}</p><p class="text-sm pt-2 border-t">${ev.description||'Sem descrição.'}</p><div class="flex justify-end space-x-2 pt-2"><button class="text-sm font-semibold text-blue-600 hover:underline" data-action="edit-event" data-id="${ev.id}">Editar</button><button class="text-sm font-semibold text-red-600 hover:underline" data-action="delete-event" data-id="${ev.id}">Excluir</button></div>`;
            eventsContainer.appendChild(card);
        });
    };
    
    if(usersTableBody) usersTableBody.addEventListener('click', async (e) => {
        const { action, id } = e.target.dataset;
        if (!action || !id || id === currentUser.id) { if(id === currentUser.id) alert("Não pode alterar a sua própria role."); return; }
        await supabaseClient.from('profiles').update({ role: action === 'make-admin' ? 'admin' : 'member' }).eq('id', id);
    });

    if(createEventBtn) createEventBtn.onclick = () => { if(eventForm) eventForm.reset(); const eventIdInput = document.getElementById('event-id'); if(eventIdInput) eventIdInput.value = ''; if(eventModalTitle) eventModalTitle.textContent = 'Novo Evento'; if(eventModal) eventModal.classList.remove('hidden'); };
    if(cancelBtn) cancelBtn.onclick = () => { if(eventModal) eventModal.classList.add('hidden'); };
    
    if(eventForm) eventForm.onsubmit = async (e) => { 
        e.preventDefault(); 
        const formData = new FormData(e.target);
        const eventData = Object.fromEntries(formData.entries());
        const { error } = await supabaseClient.from('events').upsert({ id: eventData.id || undefined, created_by: currentUser.id, ...eventData }); 
        if (error) { alert("Erro ao salvar evento: " + error.message); }
        else if(eventModal) eventModal.classList.add('hidden');
    };

    if(eventsContainer) eventsContainer.addEventListener('click', async (e) => {
        const { action, id } = e.target.dataset;
        if (!action || !id) return;
        if (action === 'edit-event') {
            const { data } = await supabaseClient.from('events').select('*').eq('id', id).single();
            if(data) {
                // Preenchimento seguro do formulário
                for (const key in data) { 
                    const input = document.getElementById(`event-${key}`);
                    if (input) input.value = data[key]; 
                }
                if(eventModalTitle) eventModalTitle.textContent = 'Editar Evento'; 
                if(eventModal) eventModal.classList.remove('hidden'); 
            }
        } else if (action === 'delete-event' && confirm('Excluir este evento?')) { 
            await supabaseClient.from('events').delete().eq('id', id); 
        }
    });

    const loadAndListen = () => {
        fetchMetrics();
        fetchUsers();
        fetchEvents();
    };
    
    loadAndListen();
    supabaseClient.channel('admin-realtime').on('postgres_changes', { event: '*', schema: 'public' }, loadAndListen).subscribe();
}


//-------------------------------------------------------------------
// 4. ROTEADOR PRINCIPAL DA APLICAÇÃO
//-------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path === '/' || path.endsWith('/login.html')) { initLoginPage(); }
    else if (path.endsWith('/dashboard.html')) { initDashboardPage(); } 
    else if (path.endsWith('/profile.html')) { initProfilePage(); } 
    else if (path.endsWith('/eventos.html')) { initEventsPage(); } 
    else if (path.endsWith('/admin.html')) { initAdminPage(); }
});
