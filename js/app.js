//-------------------------------------------------------------------
// 1. CONFIGURAÇÃO GLOBAL E INICIALIZAÇÃO DO SUPABASE
//-------------------------------------------------------------------

// CORREÇÃO: Acessa a função createClient a partir do objeto global 'supabase' fornecido pelo script CDN.
// Importa o cliente Supabase e as funções de autenticação e modais personalizadas
import { supabaseClient, checkAuthAndGetProfile, currentUser, showCustomAlert, showCustomConfirm } from './auth.js';

//-------------------------------------------------------------------
// 2. LÓGICA ESPECÍFICA PARA CADA PÁGINA
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
        if (error) showCustomAlert("Erro no Login", "Erro ao iniciar sessão: " + error.message);
    });

    if(registerForm) registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        if (password.length < 6) { showCustomAlert("Erro de Registo", "A palavra-passe deve ter no mínimo 6 caracteres."); return; }
        if (password !== passwordConfirm) { showCustomAlert("Erro de Registo", "As palavras-passe não coincidem."); return; }

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
                    role: 'member' // Define a role padrão como 'member'
                }
            }
        });
        if (error) { showCustomAlert("Erro ao Criar Conta", "Erro ao criar conta: " + error.message); }
        else {
            showCustomAlert("Registo Bem-Sucedido!", "Verifique o seu e-mail para confirmar a sua conta.", () => {
                toggleForms(false); // Volta para o formulário de login
            });
        }
    });
}


// --- LÓGICA DA PÁGINA DO DASHBOARD (/dashboard.html) ---
async function initDashboardPage() {
    await checkAuthAndGetProfile(); // Atualiza o currentUser global
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
    const postCategories = document.getElementById('post-categories'); // Novo campo
    const postHashtags = document.getElementById('post-hashtags'); // Novo campo

    // Setup do Perfil no Header
    if(userAvatar) userAvatar.src = currentUser.photo_url || `https://placehold.co/40x40/FF7F50/FFFFFF?text=${currentUser.display_name ? currentUser.display_name.charAt(0) : 'U'}`;
    if(userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
    if (adminLink && (currentUser.role === 'admin' || currentUser.role === 'admin_geral')) {
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
        const categories = postCategories.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        const hashtags = postHashtags.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        if(!content) {
            showCustomAlert("Erro ao Postar", "O conteúdo do post não pode estar vazio.");
            return;
        }

        postSubmitBtn.disabled = true;
        const { error } = await supabaseClient.from('posts').insert({
            content: content,
            created_by: currentUser.id,
            categories: categories,
            hashtags: hashtags
        });

        if(error) {
            showCustomAlert('Erro ao Postar', 'Não foi possível criar o post: ' + error.message);
            console.error(error);
        } else {
            postContent.value = '';
            postCategories.value = '';
            postHashtags.value = '';
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
                    const authorAvatar = post.profiles.photo_url || `https://placehold.co/40x40/FF7F50/FFFFFF?text=${post.profiles.display_name ? post.profiles.display_name.charAt(0) : 'U'}`;
                    const postDate = new Date(post.created_at).toLocaleString('pt-BR');

                    // Renderiza categorias e hashtags
                    const categoriesHtml = post.categories && post.categories.length > 0
                        ? post.categories.map(cat => `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full mr-1">${cat}</span>`).join('')
                        : '';
                    const hashtagsHtml = post.hashtags && post.hashtags.length > 0
                        ? post.hashtags.map(tag => `<span class="text-blue-500 text-xs mr-1">#${tag}</span>`).join('')
                        : '';

                    postEl.innerHTML = `
                        <div class="flex items-center mb-4">
                            <img src="${authorAvatar}" alt="Avatar do autor" class="w-10 h-10 rounded-full mr-3">
                            <div>
                                <p class="font-semibold">${post.profiles.display_name || 'Utilizador Anónimo'}</p>
                                <p class="text-xs text-gray-500">${postDate}</p>
                            </div>
                        </div>
                        <p class="text-gray-800 whitespace-pre-wrap">${post.content}</p>
                        <div class="mt-2 text-sm">
                            ${categoriesHtml} ${hashtagsHtml}
                        </div>
                        <div class="flex justify-around items-center mt-4 pt-4 border-t border-gray-100">
                            <button class="flex items-center space-x-1 text-gray-600 hover:text-red-500 like-btn" data-post-id="${post.id}">
                                <svg class="w-5 h-5 ${post.likes && post.likes.includes(currentUser.id) ? 'like-btn-liked' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                <span>${post.likes ? post.likes.length : 0}</span>
                            </button>
                            <button class="flex items-center space-x-1 text-gray-600 hover:text-blue-500 comment-btn" data-post-id="${post.id}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                <span>${post.comments ? post.comments.length : 0}</span>
                            </button>
                            <button class="flex items-center space-x-1 text-gray-600 hover:text-green-500 share-btn" data-post-id="${post.id}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.882 13.07 9 12.71 9 12c0-.357-.118-.69-.316-.958m0 0A2.001 2.001 0 0115 12c0 .357-.118.69-.316.958m0 0A2.001 2.001 0 018.684 13.342zm-1.318 0h.01M15.316 12.042h.01M5.636 13.318a4.5 4.5 0 100-6.364L12 2.5l6.364 6.364a4.5 4.5 0 10-6.364 6.364L12 17.5l-6.364-6.364z"></path></svg>
                                <span>Partilhar</span>
                            </button>
                        </div>
                    `;
                    feedContainer.appendChild(postEl);
                });
            }
        }
    };

    // Adiciona listeners para curtidas, comentários e compartilhamentos (delegados)
    if(feedContainer) {
        feedContainer.addEventListener('click', async (e) => {
            const likeBtn = e.target.closest('.like-btn');
            const commentBtn = e.target.closest('.comment-btn');
            const shareBtn = e.target.closest('.share-btn');

            if (likeBtn) {
                const postId = likeBtn.dataset.postId;
                const { data: post, error } = await supabaseClient.from('posts').select('likes').eq('id', postId).single();
                if (error) { console.error('Erro ao buscar likes:', error); return; }

                let currentLikes = post.likes || [];
                if (currentLikes.includes(currentUser.id)) {
                    currentLikes = currentLikes.filter(id => id !== currentUser.id); // Descurtir
                } else {
                    currentLikes.push(currentUser.id); // Curtir
                }
                await supabaseClient.from('posts').update({ likes: currentLikes }).eq('id', postId);
            } else if (commentBtn) {
                const postId = commentBtn.dataset.postId;
                // Implementar modal ou redirecionamento para página de comentários
                showCustomAlert("Comentários", "Funcionalidade de comentários será implementada em breve para o post " + postId);
            } else if (shareBtn) {
                const postId = shareBtn.dataset.postId;
                // Implementar funcionalidade de compartilhamento
                showCustomAlert("Compartilhar", "Funcionalidade de compartilhamento será implementada em breve para o post " + postId);
            }
        });
    }

    // Carregar feed inicial e ouvir por mudanças
    fetchAndRenderFeed();
    supabaseClient.channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchAndRenderFeed)
        .subscribe();

    // Atualiza status do usuário para online ao carregar o dashboard
    await supabaseClient.from('profiles').update({ status: 'online' }).eq('id', currentUser.id);
}

// --- LÓGICA DA PÁGINA DE PERFIL (/profile.html) ---
async function initProfilePage() {
    await checkAuthAndGetProfile(); // Atualiza o currentUser global
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
        if (error) { showCustomAlert('Erro ao Salvar', 'Erro ao salvar o perfil: ' + error.message); }
        else {
            showCustomAlert('Sucesso!', 'Perfil atualizado!', () => {
                // Atualiza o currentUser global após a atualização
                checkAuthAndGetProfile().then(() => {
                    updateProfileDisplay(currentUser);
                    profileForm.classList.add('hidden');
                    profileView.classList.remove('hidden');
                });
            });
        }
    });
}

// --- LÓGICA DA PÁGINA DE EVENTOS (/eventos.html) ---
async function initEventsPage() {
    await checkAuthAndGetProfile(); // Atualiza o currentUser global
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
            const authorControls = isAuthor || currentUser.role === 'admin' || currentUser.role === 'admin_geral' ? `
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
        if (error) { showCustomAlert("Erro ao Salvar", "Não foi possível salvar o evento: " + error.message); } else if(eventModal) { eventModal.classList.add('hidden'); }
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
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir este evento?", async () => {
                const eventId = deleteBtn.dataset.id;
                await supabaseClient.from('events').delete().eq('id', eventId);
                fetchAndRenderEvents(); // Atualiza a lista após exclusão
            });
        }
    });

    supabaseClient.channel('public:events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchAndRenderEvents).subscribe();
    fetchAndRenderEvents();
}


// --- LÓGICA DA PÁGINA DE ADMIN (/admin.html) ---
async function initAdminPage() {
    await checkAuthAndGetProfile(true); // Verifica se é admin
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

    // Mapeamento dos campos do formulário de evento no admin
    const eventFormFields = {
        id: document.getElementById('event-id'),
        name: document.getElementById('event-name'),
        date: document.getElementById('event-date'),
        time: document.getElementById('event-time'),
        location: document.getElementById('event-location'),
        description: document.getElementById('event-description'),
    };

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
            const isAdmin = user.role === 'admin' || user.role === 'admin_geral'; // Considera admin_geral como admin
            const isGeneralAdmin = user.role === 'admin_geral';

            // Desabilita o botão se o usuário for o próprio admin_geral ou se tentar alterar outro admin_geral
            const disableButton = (currentUser.id === user.id) || (currentUser.role !== 'admin_geral' && isGeneralAdmin);

            row.innerHTML = `
                <td class="p-4"><p class="font-bold">${user.display_name||'N/A'}</p><p class="text-sm text-gray-500">${user.email}</p></td>
                <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${user.status==='online'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}">${user.status==='online'?'Online':'Offline'}</span></td>
                <td class="p-4 text-sm">${isGeneralAdmin ? 'Admin Geral' : (isAdmin ? 'Admin' : 'Membro')}</td>
                <td class="p-4 text-right">
                    <button data-action="${isAdmin?'remove-admin':'make-admin'}" data-id="${user.id}"
                        class="px-3 py-1 rounded-lg text-sm font-semibold ${isAdmin?'bg-red-100 text-red-700 hover:bg-red-200':'bg-blue-100 text-blue-700 hover:bg-blue-200'} ${disableButton ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${disableButton ? 'disabled' : ''}>
                        ${isAdmin?'Remover Admin':'Tornar Admin'}
                    </button>
                </td>`;
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
        if (!action || !id) return;

        // Prevenção de auto-alteração e alteração de admin_geral por admin comum
        const targetUserRole = users.find(u => u.id === id)?.role; // Assumindo 'users' está disponível do fetchUsers
        if (id === currentUser.id) {
            showCustomAlert("Erro", "Não pode alterar a sua própria role.");
            return;
        }
        if (currentUser.role !== 'admin_geral' && targetUserRole === 'admin_geral') {
            showCustomAlert("Erro", "Não tem permissão para alterar a role de um Administrador Geral.");
            return;
        }

        showCustomConfirm("Confirmar Alteração", `Deseja realmente ${action === 'make-admin' ? 'tornar' : 'remover'} este utilizador como administrador?`, async () => {
            const newRole = action === 'make-admin' ? 'admin' : 'member';
            const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', id);
            if (error) showCustomAlert("Erro", "Falha ao atualizar a role do utilizador: " + error.message);
            else fetchUsers(); // Re-renderiza a lista de utilizadores
        });
    });

    if(createEventBtn) createEventBtn.onclick = () => {
        if(eventForm) eventForm.reset();
        eventFormFields.id.value = ''; // Limpa o ID para um novo evento
        if(eventModalTitle) eventModalTitle.textContent = 'Novo Evento';
        if(eventModal) eventModal.classList.remove('hidden');
    };
    if(cancelBtn) cancelBtn.onclick = () => { if(eventModal) eventModal.classList.add('hidden'); };

    if(eventForm) eventForm.onsubmit = async (e) => {
        e.preventDefault();
        const eventId = eventFormFields.id.value;
        const eventData = {
            name: eventFormFields.name.value,
            date: eventFormFields.date.value,
            time: eventFormFields.time.value,
            location: eventFormFields.location.value,
            description: eventFormFields.description.value,
            created_by: currentUser.id,
        };

        const { error } = eventId
            ? await supabaseClient.from('events').update(eventData).eq('id', eventId)
            : await supabaseClient.from('events').insert(eventData);

        if (error) { showCustomAlert("Erro ao Salvar", "Erro ao salvar evento: " + error.message); }
        else if(eventModal) eventModal.classList.add('hidden');
    };

    if(eventsContainer) eventsContainer.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        if (!action || !id) return;

        if (action === 'edit-event') {
            const { data } = await supabaseClient.from('events').select('*').eq('id', id).single();
            if(data) {
                // Preenchimento seguro do formulário
                for (const key in eventFormFields) {
                    if (eventFormFields[key] && data[key]) {
                        eventFormFields[key].value = data[key];
                    }
                }
                eventFormFields.id.value = data.id; // Garante que o ID está preenchido
                if(eventModalTitle) eventModalTitle.textContent = 'Editar Evento';
                if(eventModal) eventModal.classList.remove('hidden');
            }
        } else if (action === 'delete-event') {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir este evento?", async () => {
                await supabaseClient.from('events').delete().eq('id', id);
                fetchEvents(); // Atualiza a lista após exclusão
            });
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

// --- LÓGICA DA PÁGINA DE ESTUDOS BÍBLICOS (/estudos.html) ---
async function initEstudosPage() {
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const estudosContainer = document.getElementById('estudos-container');
    const estudoModal = document.getElementById('estudo-modal');
    const estudoForm = document.getElementById('estudo-form');
    const modalTitle = document.getElementById('estudo-modal-title');
    const createEstudoBtn = document.getElementById('create-estudo-btn');
    const cancelEstudoBtn = document.getElementById('cancel-estudo-btn');

    const fetchAndRenderEstudos = async () => {
        const { data, error } = await supabaseClient.from('estudos_biblicos').select(`*, profiles(display_name)`).order('data_publicacao', { ascending: false });
        if(estudosContainer) estudosContainer.innerHTML = '';
        if (error || !data || data.length === 0) {
            if(estudosContainer) estudosContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center">Nenhum estudo bíblico encontrado.</p>`;
            return;
        }
        data.forEach(estudo => {
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-lg shadow-md flex flex-col event-card relative';
            const isAuthorOrAdmin = currentUser && (estudo.created_by === currentUser.id || currentUser.role === 'admin' || currentUser.role === 'admin_geral');
            const authorControls = isAuthorOrAdmin ? `
                <div class="absolute top-2 right-2 flex space-x-1">
                    <button class="edit-estudo-btn p-2 rounded-full hover:bg-gray-100" data-id="${estudo.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button class="delete-estudo-btn p-2 rounded-full hover:bg-gray-100" data-id="${estudo.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>` : '';

            let contentHtml = '';
            if (estudo.tipo_estudo === 'Video' && estudo.link_video_youtube) {
                const videoId = estudo.link_video_youtube.split('v=')[1] || estudo.link_video_youtube.split('youtu.be/')[1];
                contentHtml = `<div class="aspect-video w-full"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-md"></iframe></div>`;
            } else if (estudo.tipo_estudo === 'Texto' && estudo.conteudo_texto) {
                contentHtml = `<p class="text-gray-600 mt-4 whitespace-pre-wrap">${estudo.conteudo_texto.substring(0, 200)}...</p>`; // Prévia do texto
            }

            card.innerHTML = `${authorControls}
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-gray-800 mb-2 pr-16">${estudo.titulo}</h3>
                    <p class="text-orange-600 font-semibold">Por: ${estudo.profiles.display_name || 'Admin'}</p>
                    <p class="text-gray-500 mt-1">Publicado em: ${new Date(estudo.data_publicacao).toLocaleDateString('pt-BR')}</p>
                    ${contentHtml}
                    <button class="view-estudo-btn text-blue-600 hover:underline mt-2" data-id="${estudo.id}">Ver Estudo Completo</button>
                </div>`;
            if(estudosContainer) estudosContainer.appendChild(card);
        });
    };

    if(createEstudoBtn) createEstudoBtn.addEventListener('click', () => {
        if(estudoForm) estudoForm.reset();
        if(modalTitle) modalTitle.textContent = "Criar Novo Estudo";
        document.getElementById('estudo-id').value = '';
        if(estudoModal) estudoModal.classList.remove('hidden');
    });

    if(cancelEstudoBtn) cancelEstudoBtn.addEventListener('click', () => estudoModal.classList.add('hidden'));

    if(estudoForm) estudoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const estudoId = document.getElementById('estudo-id').value;
        const estudoData = {
            titulo: document.getElementById('estudo-titulo').value,
            tipo_estudo: document.getElementById('estudo-tipo').value,
            link_video_youtube: document.getElementById('estudo-link-video').value,
            conteudo_texto: document.getElementById('estudo-conteudo-texto').value,
            data_publicacao: new Date().toISOString(),
            created_by: currentUser.id,
        };

        const { error } = estudoId
            ? await supabaseClient.from('estudos_biblicos').update(estudoData).eq('id', estudoId)
            : await supabaseClient.from('estudos_biblicos').insert(estudoData);

        if (error) { showCustomAlert("Erro ao Salvar", "Não foi possível salvar o estudo: " + error.message); }
        else {
            showCustomAlert("Sucesso!", "Estudo salvo com sucesso!");
            if(estudoModal) estudoModal.classList.add('hidden');
            fetchAndRenderEstudos();
        }
    });

    if(estudosContainer) estudosContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-estudo-btn');
        const deleteBtn = e.target.closest('.delete-estudo-btn');
        const viewBtn = e.target.closest('.view-estudo-btn');

        if (editBtn) {
            const { data } = await supabaseClient.from('estudos_biblicos').select('*').eq('id', editBtn.dataset.id).single();
            if (data) {
                document.getElementById('estudo-id').value = data.id;
                document.getElementById('estudo-titulo').value = data.titulo;
                document.getElementById('estudo-tipo').value = data.tipo_estudo;
                document.getElementById('estudo-link-video').value = data.link_video_youtube || '';
                document.getElementById('estudo-conteudo-texto').value = data.conteudo_texto || '';

                if(modalTitle) modalTitle.textContent = "Editar Estudo";
                if(estudoModal) estudoModal.classList.remove('hidden');
            }
        } else if (deleteBtn) {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir este estudo?", async () => {
                await supabaseClient.from('estudos_biblicos').delete().eq('id', deleteBtn.dataset.id);
                fetchAndRenderEstudos();
            });
        } else if (viewBtn) {
            // Lógica para ver o estudo completo (pode redirecionar para uma página de detalhe)
            window.location.href = `/estudo_detalhe.html?id=${viewBtn.dataset.id}`;
        }
    });

    supabaseClient.channel('public:estudos_biblicos').on('postgres_changes', { event: '*', schema: 'public', table: 'estudos_biblicos' }, fetchAndRenderEstudos).subscribe();
    fetchAndRenderEstudos();
}

// --- LÓGICA DA PÁGINA DE DETALHE DE ESTUDO BÍBLICO (/estudo_detalhe.html) ---
async function initEstudoDetalhePage() {
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const urlParams = new URLSearchParams(window.location.search);
    const estudoId = urlParams.get('id');

    if (!estudoId) {
        showCustomAlert("Erro", "Estudo não encontrado.", () => {
            window.location.href = '/estudos.html';
        });
        return;
    }

    const estudoContentDiv = document.getElementById('estudo-content');
    const forumContainer = document.getElementById('forum-container');
    const forumPostForm = document.getElementById('forum-post-form');
    const forumPostContent = document.getElementById('forum-post-content');

    const fetchAndRenderEstudo = async () => {
        const { data: estudo, error } = await supabaseClient.from('estudos_biblicos').select(`*, profiles(display_name)`).eq('id', estudoId).single();

        if (error || !estudo) {
            showCustomAlert("Erro", "Erro ao carregar estudo: " + (error ? error.message : "Estudo não encontrado."));
            window.location.href = '/estudos.html';
            return;
        }

        if (estudoContentDiv) {
            let contentHtml = `<h1 class="text-3xl font-bold text-gray-800 mb-2">${estudo.titulo}</h1>
                               <p class="text-orange-600 font-semibold mb-4">Por: ${estudo.profiles.display_name || 'Admin'} | Publicado em: ${new Date(estudo.data_publicacao).toLocaleDateString('pt-BR')}</p>`;

            if (estudo.tipo_estudo === 'Video' && estudo.link_video_youtube) {
                const videoId = estudo.link_video_youtube.split('v=')[1] || estudo.link_video_youtube.split('youtu.be/')[1];
                contentHtml += `<div class="aspect-video w-full mb-6"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-md"></iframe></div>`;
            } else if (estudo.tipo_estudo === 'Texto' && estudo.conteudo_texto) {
                contentHtml += `<div class="prose max-w-none text-gray-700">${estudo.conteudo_texto.replace(/\n/g, '<br>')}</div>`; // Renderiza quebras de linha
            }
            estudoContentDiv.innerHTML = contentHtml;
        }

        // Fetch e renderiza comentários do fórum
        const { data: mensagens, error: mensagensError } = await supabaseClient.from('mensagens_forum')
            .select(`*, profiles(display_name, photo_url)`)
            .eq('estudo_id', estudoId)
            .order('data_mensagem', { ascending: true });

        if (mensagensError) { console.error('Erro ao buscar mensagens do fórum:', mensagensError); return; }

        if (forumContainer) {
            forumContainer.innerHTML = '';
            if (mensagens.length === 0) {
                forumContainer.innerHTML = `<p class="text-center text-gray-500">Nenhuma mensagem no fórum ainda. Seja o primeiro a comentar!</p>`;
            } else {
                mensagens.forEach(msg => {
                    const msgEl = document.createElement('div');
                    msgEl.className = 'bg-gray-50 p-3 rounded-lg mb-3 shadow-sm';
                    const authorAvatar = msg.profiles.photo_url || `https://placehold.co/30x30/FF7F50/FFFFFF?text=${msg.profiles.display_name ? msg.profiles.display_name.charAt(0) : 'U'}`;
                    msgEl.innerHTML = `
                        <div class="flex items-center mb-2">
                            <img src="${authorAvatar}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
                            <div>
                                <p class="font-semibold text-gray-800">${msg.profiles.display_name || 'Utilizador Anónimo'}</p>
                                <p class="text-xs text-gray-500">${new Date(msg.data_mensagem).toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                        <p class="text-gray-700 whitespace-pre-wrap">${msg.conteudo}</p>
                    `;
                    forumContainer.appendChild(msgEl);
                });
            }
        }
    };

    if (forumPostForm) {
        forumPostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = forumPostContent.value.trim();
            if (!content) {
                showCustomAlert("Erro", "A mensagem não pode estar vazia.");
                return;
            }

            const { error } = await supabaseClient.from('mensagens_forum').insert({
                estudo_id: estudoId,
                autor_id: currentUser.id,
                conteudo: content,
                data_mensagem: new Date().toISOString()
            });

            if (error) { showCustomAlert("Erro ao Enviar", "Não foi possível enviar a mensagem: " + error.message); }
            else {
                forumPostContent.value = '';
                fetchAndRenderEstudo(); // Recarrega o estudo para ver a nova mensagem
            }
        });
    }

    supabaseClient.channel(`estudo_${estudoId}_forum`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_forum', filter: `estudo_id=eq.${estudoId}` }, fetchAndRenderEstudo)
        .subscribe();

    fetchAndRenderEstudo();
}


// --- LÓGICA DA PÁGINA DE LIVES (/lives.html) ---
async function initLivesPage() {
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const livesContainer = document.getElementById('lives-container');
    const liveModal = document.getElementById('live-modal');
    const liveForm = document.getElementById('live-form');
    const modalTitle = document.getElementById('live-modal-title');
    const createLiveBtn = document.getElementById('create-live-btn');
    const cancelLiveBtn = document.getElementById('cancel-live-btn');

    const fetchAndRenderLives = async () => {
        const { data, error } = await supabaseClient.from('lives').select(`*, profiles(display_name)`).order('data_hora_inicio', { ascending: false });
        if(livesContainer) livesContainer.innerHTML = '';
        if (error || !data || data.length === 0) {
            if(livesContainer) livesContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center">Nenhuma live agendada ou gravada.</p>`;
            return;
        }
        data.forEach(live => {
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-lg shadow-md flex flex-col relative';
            const isAuthorOrAdmin = currentUser && (live.created_by === currentUser.id || currentUser.role === 'admin' || currentUser.role === 'admin_geral');
            const liveDate = new Date(live.data_hora_inicio);
            const isLiveNow = live.esta_ao_vivo && (new Date() >= liveDate); // Verifica se está ao vivo e se a data já passou

            const authorControls = isAuthorOrAdmin ? `
                <div class="absolute top-2 right-2 flex space-x-1">
                    <button class="edit-live-btn p-2 rounded-full hover:bg-gray-100" data-id="${live.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button class="delete-live-btn p-2 rounded-full hover:bg-gray-100" data-id="${live.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>` : '';

            let liveStatusHtml = '';
            if (isLiveNow) {
                liveStatusHtml = `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full absolute top-2 left-2">AO VIVO</span>`;
            } else if (live.link_gravacao) {
                liveStatusHtml = `<span class="bg-gray-500 text-white text-xs px-2 py-1 rounded-full absolute top-2 left-2">GRAVADO</span>`;
            }

            let videoHtml = '';
            const videoLink = isLiveNow ? live.link_youtube_live : live.link_gravacao;
            if (videoLink) {
                const videoId = videoLink.split('v=')[1] || videoLink.split('youtu.be/')[1];
                videoHtml = `<div class="aspect-video w-full mb-4"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-md"></iframe></div>`;
            } else {
                videoHtml = `<div class="bg-gray-200 aspect-video w-full mb-4 rounded-md flex items-center justify-center text-gray-500">Sem vídeo disponível.</div>`;
            }


            card.innerHTML = `${authorControls} ${liveStatusHtml}
                <div class="flex-1 mt-4">
                    <h3 class="text-xl font-bold text-gray-800 mb-2 pr-16">${live.titulo}</h3>
                    <p class="text-orange-600 font-semibold">Início: ${liveDate.toLocaleDateString('pt-BR')} às ${liveDate.toLocaleTimeString('pt-BR')}</p>
                    <p class="text-gray-500 mt-1">Por: ${live.profiles.display_name || 'Admin'}</p>
                    ${videoHtml}
                    <p class="text-gray-600 mt-2">${live.descricao || ''}</p>
                    ${isLiveNow ? `<a href="${live.link_youtube_live}" target="_blank" class="block text-center bg-red-600 text-white px-4 py-2 rounded-lg mt-4 hover:bg-red-700">Assistir Agora</a>` : ''}
                    ${!isLiveNow && live.link_gravacao ? `<a href="${live.link_gravacao}" target="_blank" class="block text-center bg-blue-600 text-white px-4 py-2 rounded-lg mt-4 hover:bg-blue-700">Ver Gravação</a>` : ''}
                </div>`;
            if(livesContainer) livesContainer.appendChild(card);
        });
    };

    if(createLiveBtn) createLiveBtn.addEventListener('click', () => {
        if(liveForm) liveForm.reset();
        if(modalTitle) modalTitle.textContent = "Agendar Nova Live";
        document.getElementById('live-id').value = '';
        if(liveModal) liveModal.classList.remove('hidden');
    });

    if(cancelLiveBtn) cancelLiveBtn.addEventListener('click', () => liveModal.classList.add('hidden'));

    if(liveForm) liveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const liveId = document.getElementById('live-id').value;
        const liveData = {
            titulo: document.getElementById('live-titulo').value,
            link_youtube_live: document.getElementById('live-link-youtube').value,
            data_hora_inicio: document.getElementById('live-data-hora-inicio').value,
            esta_ao_vivo: document.getElementById('live-esta-ao-vivo').checked,
            link_gravacao: document.getElementById('live-link-gravacao').value,
            descricao: document.getElementById('live-descricao').value,
            created_by: currentUser.id,
        };

        const { error } = liveId
            ? await supabaseClient.from('lives').update(liveData).eq('id', liveId)
            : await supabaseClient.from('lives').insert(liveData);

        if (error) { showCustomAlert("Erro ao Salvar", "Não foi possível salvar a live: " + error.message); }
        else {
            showCustomAlert("Sucesso!", "Live salva com sucesso!");
            if(liveModal) liveModal.classList.add('hidden');
            fetchAndRenderLives();
        }
    });

    if(livesContainer) livesContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-live-btn');
        const deleteBtn = e.target.closest('.delete-live-btn');

        if (editBtn) {
            const { data } = await supabaseClient.from('lives').select('*').eq('id', editBtn.dataset.id).single();
            if (data) {
                document.getElementById('live-id').value = data.id;
                document.getElementById('live-titulo').value = data.titulo;
                document.getElementById('live-link-youtube').value = data.link_youtube_live || '';
                document.getElementById('live-data-hora-inicio').value = data.data_hora_inicio.substring(0, 16); // Formato YYYY-MM-DDTHH:MM
                document.getElementById('live-esta-ao-vivo').checked = data.esta_ao_vivo;
                document.getElementById('live-link-gravacao').value = data.link_gravacao || '';
                document.getElementById('live-descricao').value = data.descricao || '';

                if(modalTitle) modalTitle.textContent = "Editar Live";
                if(liveModal) liveModal.classList.remove('hidden');
            }
        } else if (deleteBtn) {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir esta live?", async () => {
                await supabaseClient.from('lives').delete().eq('id', deleteBtn.dataset.id);
                fetchAndRenderLives();
            });
        }
    });

    supabaseClient.channel('public:lives').on('postgres_changes', { event: '*', schema: 'public', table: 'lives' }, fetchAndRenderLives).subscribe();
    fetchAndRenderLives();
}

// --- LÓGICA DA PÁGINA DE CHAT (/chat.html) ---
async function initChatPage() {
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const chatMessagesContainer = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    const fetchAndRenderMessages = async () => {
        const { data: messages, error } = await supabaseClient.from('mensagens_chat')
            .select(`*, profiles(display_name, photo_url)`)
            .order('data_envio', { ascending: true });

        if (error) { console.error('Erro ao buscar mensagens do chat:', error); return; }

        if (chatMessagesContainer) {
            chatMessagesContainer.innerHTML = '';
            messages.forEach(msg => {
                const messageEl = document.createElement('div');
                const isCurrentUser = msg.autor_id === currentUser.id;
                const authorName = msg.profiles.display_name || 'Utilizador Anónimo';
                const authorAvatar = msg.profiles.photo_url || `https://placehold.co/30x30/FF7F50/FFFFFF?text=${authorName.charAt(0)}`;

                messageEl.className = `flex items-start mb-4 ${isCurrentUser ? 'justify-end' : ''}`;
                messageEl.innerHTML = `
                    <div class="flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start">
                        <img src="${authorAvatar}" alt="Avatar" class="w-8 h-8 rounded-full ${isCurrentUser ? 'ml-3' : 'mr-3'}">
                        <div class="p-3 rounded-lg ${isCurrentUser ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-800'} max-w-xs">
                            <p class="font-semibold text-sm ${isCurrentUser ? 'text-right' : 'text-left'}">${isCurrentUser ? 'Você' : authorName}</p>
                            <p class="text-sm whitespace-pre-wrap">${msg.conteudo}</p>
                            <p class="text-xs text-right mt-1 ${isCurrentUser ? 'text-orange-100' : 'text-gray-500'}">${new Date(msg.data_envio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                `;
                chatMessagesContainer.appendChild(messageEl);
            });
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Rola para o final
        }
    };

    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', async () => {
            const content = chatInput.value.trim();
            if (!content) return;

            // Simulação de moderação por IA (chamada à API Gemini)
            const moderatedContent = await moderateChatMessage(content);

            if (moderatedContent.status === 'rejected') {
                showCustomAlert("Mensagem Bloqueada", "Sua mensagem foi bloqueada pela moderação de IA: " + moderatedContent.reason);
                return;
            }

            const { error } = await supabaseClient.from('mensagens_chat').insert({
                autor_id: currentUser.id,
                conteudo: moderatedContent.text,
                data_envio: new Date().toISOString(),
                status_moderacao_ia: moderatedContent.status
            });

            if (error) { showCustomAlert("Erro ao Enviar", "Não foi possível enviar a mensagem: " + error.message); }
            else { chatInput.value = ''; }
        });
    }

    // Função de moderação de chat simulada com Gemini API
    async function moderateChatMessage(text) {
        try {
            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: `Analise a seguinte mensagem para conteúdo impróprio (linguagem ofensiva, ódio, spam, etc.). Responda em JSON com 'status' ('approved' ou 'rejected') e 'reason' (se rejeitado) e 'text' (a mensagem original ou uma versão limpa se possível, ou vazia se rejeitada). Mensagem: "${text}"` }] });
            const payload = {
                contents: chatHistory,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "status": { "type": "STRING", "enum": ["approved", "rejected"] },
                            "reason": { "type": "STRING" },
                            "text": { "type": "STRING" }
                        }
                    }
                }
            };
            const apiKey = ""; // Canvas will provide this
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                const json = result.candidates[0].content.parts[0].text;
                const parsedJson = JSON.parse(json);
                return parsedJson;
            } else {
                console.warn("Resposta inesperada da moderação de IA:", result);
                return { status: "approved", reason: "AI response error, approved by default", text: text }; // Aprova por padrão em caso de erro da IA
            }
        } catch (e) {
            console.error("Erro ao chamar API de moderação de IA:", e);
            return { status: "approved", reason: "API call failed, approved by default", text: text }; // Aprova por padrão em caso de erro
        }
    }


    supabaseClient.channel('public:mensagens_chat').on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_chat' }, fetchAndRenderMessages).subscribe();
    fetchAndRenderMessages();
}

// --- LÓGICA DA PÁGINA DE DOAÇÕES (/doacoes.html) ---
async function initDoacoesPage() {
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const doacoesInfoDiv = document.getElementById('doacoes-info');
    const doacoesForm = document.getElementById('doacoes-form');
    const editDoacoesBtn = document.getElementById('edit-doacoes-btn');
    const cancelDoacoesBtn = document.getElementById('cancel-doacoes-btn');
    const saveDoacoesBtn = document.getElementById('save-doacoes-btn');

    // Campos do formulário de doações
    const formFields = {
        pixKey: document.getElementById('form-pix-key'),
        qrCodeLink: document.getElementById('form-qr-code-link'),
        bankDetails: document.getElementById('form-bank-details')
    };

    const fetchAndRenderDoacoes = async () => {
        // Assume que há apenas um registro de informações de doação (ID fixo ou primeiro)
        const { data, error } = await supabaseClient.from('informacoes_doacao').select('*').limit(1).single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Erro ao buscar informações de doação:', error);
            if(doacoesInfoDiv) doacoesInfoDiv.innerHTML = `<p class="text-red-500">Erro ao carregar informações de doação.</p>`;
            return;
        }

        if (!data) {
            if(doacoesInfoDiv) doacoesInfoDiv.innerHTML = `<p class="text-gray-500">Nenhuma informação de doação configurada ainda.</p>`;
            // Se não houver dados, e for admin geral, permite criar
            if (currentUser.role === 'admin_geral') {
                if(editDoacoesBtn) editDoacoesBtn.classList.remove('hidden');
                if(doacoesInfoDiv) doacoesInfoDiv.classList.add('hidden');
                if(doacoesForm) doacoesForm.classList.remove('hidden');
                if(saveDoacoesBtn) saveDoacoesBtn.textContent = 'Criar Informações';
            }
            return;
        }

        // Exibe as informações para todos os utilizadores
        if(doacoesInfoDiv) {
            doacoesInfoDiv.innerHTML = `
                <h2 class="text-2xl font-bold text-gray-800 mb-4">Informações para Doação</h2>
                <div class="space-y-4">
                    <div>
                        <p class="font-semibold text-gray-700">Chave Pix:</p>
                        <p class="text-gray-600">${data.chave_pix || 'Não informado'}</p>
                    </div>
                    ${data.link_qr_code_pix ? `
                    <div>
                        <p class="font-semibold text-gray-700">QR Code Pix:</p>
                        <img src="${data.link_qr_code_pix}" alt="QR Code Pix" class="w-48 h-48 border rounded-lg mt-2">
                    </div>
                    ` : ''}
                    <div>
                        <p class="font-semibold text-gray-700">Dados Bancários:</p>
                        <p class="text-gray-600 whitespace-pre-wrap">${data.dados_bancarios || 'Não informado'}</p>
                    </div>
                    <p class="text-sm text-gray-500 mt-4">Última atualização por: ${data.ultima_atualizacao_por_nome || 'N/A'} em ${new Date(data.data_ultima_atualizacao).toLocaleString('pt-BR')}</p>
                </div>
            `;
            doacoesInfoDiv.classList.remove('hidden');
        }

        // Preenche o formulário se for admin geral
        if (currentUser.role === 'admin_geral') {
            if(editDoacoesBtn) editDoacoesBtn.classList.remove('hidden');
            formFields.pixKey.value = data.chave_pix || '';
            formFields.qrCodeLink.value = data.link_qr_code_pix || '';
            formFields.bankDetails.value = data.dados_bancarios || '';
            if(saveDoacoesBtn) saveDoacoesBtn.textContent = 'Salvar Alterações';
        } else {
            if(editDoacoesBtn) editDoacoesBtn.classList.add('hidden'); // Esconde para usuários comuns
        }
    };

    if (editDoacoesBtn) {
        editDoacoesBtn.addEventListener('click', () => {
            if(doacoesInfoDiv) doacoesInfoDiv.classList.add('hidden');
            if(doacoesForm) doacoesForm.classList.remove('hidden');
        });
    }

    if (cancelDoacoesBtn) {
        cancelDoacoesBtn.addEventListener('click', () => {
            if(doacoesForm) doacoesForm.classList.add('hidden');
            if(doacoesInfoDiv) doacoesInfoDiv.classList.remove('hidden');
        });
    }

    if (doacoesForm) {
        doacoesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (currentUser.role !== 'admin_geral') {
                showCustomAlert("Permissão Negada", "Você não tem permissão para alterar as informações de doação.");
                return;
            }

            const updates = {
                chave_pix: formFields.pixKey.value,
                link_qr_code_pix: formFields.qrCodeLink.value,
                dados_bancarios: formFields.bankDetails.value,
                ultima_atualizacao_por: currentUser.id,
                ultima_atualizacao_por_nome: currentUser.display_name || currentUser.email,
                data_ultima_atualizacao: new Date().toISOString()
            };

            // Tenta fazer upsert (insere se não existe, atualiza se existe)
            const { data, error } = await supabaseClient.from('informacoes_doacao').upsert(updates, { onConflict: 'id' });

            if (error) {
                showCustomAlert("Erro ao Salvar", "Não foi possível salvar as informações de doação: " + error.message);
            } else {
                showCustomAlert("Sucesso!", "Informações de doação atualizadas!", () => {
                    if(doacoesForm) doacoesForm.classList.add('hidden');
                    fetchAndRenderDoacoes(); // Recarrega para mostrar as informações atualizadas
                });
            }
        });
    }

    supabaseClient.channel('public:informacoes_doacao').on('postgres_changes', { event: '*', schema: 'public', table: 'informacoes_doacao' }, fetchAndRenderDoacoes).subscribe();
    fetchAndRenderDoacoes();
}

// --- LÓGICA DA PÁGINA DE PEDIDOS DE ORAÇÃO (/pedidos_oracao.html) ---
async function initPedidosOracaoPage() {
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const pedidoForm = document.getElementById('pedido-oracao-form');
    const pedidoContent = document.getElementById('pedido-oracao-content');
    const pedidoAnonimo = document.getElementById('pedido-oracao-anonimo');
    const pedidosContainer = document.getElementById('pedidos-oracao-container');

    const fetchAndRenderPedidos = async () => {
        const { data: pedidos, error } = await supabaseClient.from('pedidos_oracao')
            .select(`*, profiles(display_name, photo_url)`)
            .order('data_solicitacao', { ascending: false });

        if (error) { console.error('Erro ao buscar pedidos de oração:', error); return; }

        if (pedidosContainer) {
            pedidosContainer.innerHTML = '';
            if (pedidos.length === 0) {
                pedidosContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum pedido de oração ainda.</p>`;
            } else {
                pedidos.forEach(pedido => {
                    const pedidoEl = document.createElement('div');
                    pedidoEl.className = 'bg-white p-4 rounded-lg shadow-md mb-4';
                    const authorName = pedido.anonimo ? 'Anónimo' : (pedido.profiles?.display_name || 'Utilizador Anónimo');
                    const authorAvatar = pedido.anonimo ? 'https://placehold.co/40x40/CCCCCC/FFFFFF?text=?' : (pedido.profiles?.photo_url || `https://placehold.co/40x40/FF7F50/FFFFFF?text=${authorName.charAt(0)}`);
                    const pedidoDate = new Date(pedido.data_solicitacao).toLocaleString('pt-BR');

                    pedidoEl.innerHTML = `
                        <div class="flex items-center mb-4">
                            <img src="${authorAvatar}" alt="Avatar" class="w-10 h-10 rounded-full mr-3">
                            <div>
                                <p class="font-semibold">${authorName}</p>
                                <p class="text-xs text-gray-500">${pedidoDate}</p>
                            </div>
                        </div>
                        <p class="text-gray-800 whitespace-pre-wrap">${pedido.conteudo}</p>
                        <div class="flex justify-around items-center mt-4 pt-4 border-t border-gray-100">
                            <button class="flex items-center space-x-1 text-gray-600 hover:text-blue-500 mark-prayed-btn" data-pedido-id="${pedido.id}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Orar</span>
                            </button>
                            <button class="flex items-center space-x-1 text-gray-600 hover:text-green-500 comment-pr-btn" data-pedido-id="${pedido.id}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                <span>Comentar</span>
                            </button>
                        </div>
                    `;
                    pedidosContainer.appendChild(pedidoEl);
                });
            }
        }
    };

    if (pedidoForm) {
        pedidoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = pedidoContent.value.trim();
            const anonimo = pedidoAnonimo.checked;

            if (!content) {
                showCustomAlert("Erro", "O pedido de oração não pode estar vazio.");
                return;
            }

            const { error } = await supabaseClient.from('pedidos_oracao').insert({
                conteudo: content,
                anonimo: anonimo,
                solicitante_id: currentUser.id,
                data_solicitacao: new Date().toISOString(),
                publicado_no_feed: true // Sempre publica no feed, conforme solicitado
            });

            if (error) { showCustomAlert("Erro ao Enviar", "Não foi possível enviar o pedido de oração: " + error.message); }
            else {
                pedidoContent.value = '';
                pedidoAnonimo.checked = false;
                showCustomAlert("Sucesso!", "Seu pedido de oração foi enviado!");
                fetchAndRenderPedidos(); // Atualiza a lista
            }
        });
    }

    // Listener para interações com pedidos de oração
    if (pedidosContainer) {
        pedidosContainer.addEventListener('click', async (e) => {
            const markPrayedBtn = e.target.closest('.mark-prayed-btn');
            const commentPrBtn = e.target.closest('.comment-pr-btn');

            if (markPrayedBtn) {
                const pedidoId = markPrayedBtn.dataset.pedidoId;
                // Lógica para marcar como "orou" (pode ser um campo de lista de usuários no pedido_oracao)
                showCustomAlert("Orar", "Funcionalidade de marcar como 'orou' será implementada em breve para o pedido " + pedidoId);
            } else if (commentPrBtn) {
                const pedidoId = commentPrBtn.dataset.pedidoId;
                // Lógica para comentar (pode abrir um modal de comentários)
                showCustomAlert("Comentar Pedido", "Funcionalidade de comentários para pedidos de oração será implementada em breve para o pedido " + pedidoId);
            }
        });
    }

    supabaseClient.channel('public:pedidos_oracao').on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_oracao' }, fetchAndRenderPedidos).subscribe();
    fetchAndRenderPedidos();
}

// --- LÓGICA DA PÁGINA DE SALAS DE ESTUDO VIRTUAIS (/salas_estudo.html) ---
async function initSalasEstudoPage() {
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const salasContainer = document.getElementById('salas-estudo-container');
    const salaModal = document.getElementById('sala-modal');
    const salaForm = document.getElementById('sala-form');
    const modalTitle = document.getElementById('sala-modal-title');
    const createSalaBtn = document.getElementById('create-sala-btn');
    const cancelSalaBtn = document.getElementById('cancel-sala-btn');

    const fetchAndRenderSalas = async () => {
        const { data: salas, error } = await supabaseClient.from('salas_estudo_virtual').select(`*, criador:profiles(display_name)`).order('data_criacao', { ascending: false });

        if (error) { console.error('Erro ao buscar salas de estudo:', error); return; }

        if (salasContainer) {
            salasContainer.innerHTML = '';
            if (salas.length === 0) {
                salasContainer.innerHTML = `<p class="text-center text-gray-500">Nenhuma sala de estudo virtual criada ainda.</p>`;
            } else {
                salas.forEach(sala => {
                    const card = document.createElement('div');
                    card.className = 'bg-white p-6 rounded-lg shadow-md flex flex-col relative';
                    const isCreatorOrAdmin = currentUser && (sala.criador_id === currentUser.id || currentUser.role === 'admin' || currentUser.role === 'admin_geral');

                    const authorControls = isCreatorOrAdmin ? `
                        <div class="absolute top-2 right-2 flex space-x-1">
                            <button class="edit-sala-btn p-2 rounded-full hover:bg-gray-100" data-id="${sala.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                            <button class="delete-sala-btn p-2 rounded-full hover:bg-gray-100" data-id="${sala.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                        </div>` : '';

                    card.innerHTML = `${authorControls}
                        <div class="flex-1">
                            <h3 class="text-xl font-bold text-gray-800 mb-2 pr-16">${sala.nome_sala}</h3>
                            <p class="text-orange-600 font-semibold">Criado por: ${sala.criador?.display_name || 'Admin'}</p>
                            <p class="text-gray-500 mt-1">Data de Criação: ${new Date(sala.data_criacao).toLocaleDateString('pt-BR')}</p>
                            ${sala.estudo_referencia ? `<p class="text-gray-600 mt-2">Estudo de Referência: <span class="font-semibold">${sala.estudo_referencia}</span></p>` : ''}
                            ${sala.link_meet ? `<a href="${sala.link_meet}" target="_blank" class="block text-center bg-blue-600 text-white px-4 py-2 rounded-lg mt-4 hover:bg-blue-700">Entrar na Sala (Google Meet)</a>` : ''}
                            ${sala.link_gravacao ? `<a href="${sala.link_gravacao}" target="_blank" class="block text-center bg-gray-600 text-white px-4 py-2 rounded-lg mt-2 hover:bg-gray-700">Ver Gravação</a>` : ''}
                        </div>`;
                    if(salasContainer) salasContainer.appendChild(card);
                });
            }
        }
    };

    if(createSalaBtn) createSalaBtn.addEventListener('click', () => {
        if(salaForm) salaForm.reset();
        if(modalTitle) modalTitle.textContent = "Criar Nova Sala de Estudo";
        document.getElementById('sala-id').value = '';
        if(salaModal) salaModal.classList.remove('hidden');
    });

    if(cancelSalaBtn) cancelSalaBtn.addEventListener('click', () => salaModal.classList.add('hidden'));

    if(salaForm) salaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const salaId = document.getElementById('sala-id').value;
        const salaData = {
            nome_sala: document.getElementById('sala-nome').value,
            estudo_referencia: document.getElementById('sala-estudo-referencia').value,
            link_meet: document.getElementById('sala-link-meet').value,
            link_gravacao: document.getElementById('sala-link-gravacao').value,
            criador_id: currentUser.id,
            data_criacao: new Date().toISOString()
        };

        const { error } = salaId
            ? await supabaseClient.from('salas_estudo_virtual').update(salaData).eq('id', salaId)
            : await supabaseClient.from('salas_estudo_virtual').insert(salaData);

        if (error) { showCustomAlert("Erro ao Salvar", "Não foi possível salvar a sala: " + error.message); }
        else {
            showCustomAlert("Sucesso!", "Sala salva com sucesso!");
            if(salaModal) salaModal.classList.add('hidden');
            fetchAndRenderSalas();
        }
    });

    if(salasContainer) salasContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-sala-btn');
        const deleteBtn = e.target.closest('.delete-sala-btn');

        if (editBtn) {
            const { data } = await supabaseClient.from('salas_estudo_virtual').select('*').eq('id', editBtn.dataset.id).single();
            if (data) {
                document.getElementById('sala-id').value = data.id;
                document.getElementById('sala-nome').value = data.nome_sala;
                document.getElementById('sala-estudo-referencia').value = data.estudo_referencia || '';
                document.getElementById('sala-link-meet').value = data.link_meet || '';
                document.getElementById('sala-link-gravacao').value = data.link_gravacao || '';

                if(modalTitle) modalTitle.textContent = "Editar Sala de Estudo";
                if(salaModal) salaModal.classList.remove('hidden');
            }
        } else if (deleteBtn) {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir esta sala de estudo?", async () => {
                await supabaseClient.from('salas_estudo_virtual').delete().eq('id', deleteBtn.dataset.id);
                fetchAndRenderSalas();
            });
        }
    });

    supabaseClient.channel('public:salas_estudo_virtual').on('postgres_changes', { event: '*', schema: 'public', table: 'salas_estudo_virtual' }, fetchAndRenderSalas).subscribe();
    fetchAndRenderSalas();
}


//-------------------------------------------------------------------
// 3. ROTEADOR PRINCIPAL DA APLICAÇÃO
//-------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path === '/' || path.endsWith('/login.html')) { initLoginPage(); }
    else if (path.endsWith('/dashboard.html')) { initDashboardPage(); }
    else if (path.endsWith('/profile.html')) { initProfilePage(); }
    else if (path.endsWith('/eventos.html')) { initEventsPage(); }
    else if (path.endsWith('/admin.html')) { initAdminPage(); }
    else if (path.endsWith('/estudos.html')) { initEstudosPage(); }
    else if (path.endsWith('/estudo_detalhe.html')) { initEstudoDetalhePage(); } // Nova página para detalhe do estudo
    else if (path.endsWith('/lives.html')) { initLivesPage(); }
    else if (path.endsWith('/chat.html')) { initChatPage(); }
    else if (path.endsWith('/doacoes.html')) { initDoacoesPage(); }
    else if (path.endsWith('/pedidos_oracao.html')) { initPedidosOracaoPage(); }
    else if (path.endsWith('/salas_estudo.html')) { initSalasEstudoPage(); }
});
