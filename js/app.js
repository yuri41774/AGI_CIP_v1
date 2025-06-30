//-------------------------------------------------------------------
// 1. CONFIGURAÇÃO GLOBAL E INICIALIZAÇÃO DO SUPABASE
//-------------------------------------------------------------------

// Importa a função createClient a partir do objeto global 'supabase' fornecido pelo script CDN.
// Importa o cliente Supabase e as funções de autenticação e modais personalizadas
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseClient, setSupabaseClient, checkAuthAndGetProfile, currentUser, showCustomAlert, showCustomConfirm } from './auth.js';

// Inicializa o SupabaseClient globalmente uma vez que o DOM esteja carregado
// e o objeto 'supabase' do CDN esteja disponível.
document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabaseClient(client); // Define a instância do cliente em auth.js
        console.log("SupabaseClient inicializado e listener de autenticação configurado.");
    } else {
        console.error("Supabase CDN não carregado a tempo. Funções de Supabase podem não funcionar.");
        // Em um cenário real, você pode querer exibir uma mensagem de erro ao utilizador
        // ou tentar recarregar a página.
    }
});


//-------------------------------------------------------------------
// 2. LÓGICA ESPECÍFICA PARA CADA PÁGINA
//-------------------------------------------------------------------

// --- LÓGICA DA PÁGINA DE LOGIN (/login.html) ---
function initLoginPage() {
    // A verificação inicial de sessão para redirecionamento é feita no index.html.
    // Aqui, apenas configuramos os formulários e listeners.

    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');

    function toggleForms(showRegister) {
        if (showRegister) {
            loginSection?.classList.add('form-hidden');
            loginSection?.classList.remove('form-visible');
            registerSection?.classList.add('form-visible');
            registerSection?.classList.remove('form-hidden');
        } else {
            loginSection?.classList.add('form-visible');
            loginSection?.classList.remove('form-hidden');
            registerSection?.classList.add('form-hidden');
            registerSection?.classList.remove('form-visible');
        }
    }

    if(showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });
    if(showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });

    if(loginForm) loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target['login-email'].value;
        const password = e.target['login-password'].value;

        if (!supabaseClient) {
            showCustomAlert("Erro de Inicialização", "O serviço de autenticação não está pronto. Tente novamente mais tarde.");
            return;
        }

        if (loginButton) loginButton.disabled = true;
        // Adicionar um spinner ao botão de login

        try {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                console.error("Erro no login:", error.message);
                showCustomAlert("Erro no Login", "Erro ao iniciar sessão: " + error.message);
            } else {
                console.log("Login bem-sucedido, redirecionando...");
                // O listener global em auth.js cuidará do redirecionamento para o dashboard
            }
        } catch (err) {
            console.error("Erro inesperado durante o login:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado durante o login. Tente novamente.");
        } finally {
            if (loginButton) loginButton.disabled = false;
            // Remover spinner
        }
    });

    if(registerForm) registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const email = document.getElementById('register-email').value;
        const displayName = document.getElementById('register-name').value;
        const birthdate = document.getElementById('register-birthdate').value;
        const phone = document.getElementById('register-phone').value;
        const gender = document.getElementById('register-gender').value;
        const maritalStatus = document.getElementById('register-marital-status').value;


        if (password.length < 6) { showCustomAlert("Erro de Registo", "A palavra-passe deve ter no mínimo 6 caracteres."); return; }
        if (password !== passwordConfirm) { showCustomAlert("Erro de Registo", "As palavras-passe não coincidem."); return; }

        if (!supabaseClient) {
            showCustomAlert("Erro de Inicialização", "O serviço de autenticação não está pronto. Tente novamente mais tarde.");
            return;
        }

        if (registerButton) registerButton.disabled = true;
        // Adicionar um spinner ao botão de registo

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: displayName,
                        birthdate: birthdate,
                        phone: phone,
                        gender: gender,
                        marital_status: maritalStatus,
                        role: 'member' // Define a role padrão como 'member'
                    }
                }
            });

            if (error) {
                console.error("Erro ao criar conta:", error.message);
                showCustomAlert("Erro ao Criar Conta", "Erro ao criar conta: " + error.message);
            } else if (data.user) {
                console.log("Registo bem-sucedido para o utilizador:", data.user.id);
                showCustomAlert("Registo Bem-Sucedido!", "Verifique o seu e-mail para confirmar a sua conta.", () => {
                    toggleForms(false); // Volta para o formulário de login
                    registerForm.reset();
                });
            } else {
                console.warn("SignUp concluído sem erro, mas nenhum utilizador retornado.");
                showCustomAlert("Registo Concluído", "A sua conta foi criada. Verifique o seu e-mail para confirmar.", () => {
                    toggleForms(false);
                    registerForm.reset();
                });
            }
        } catch (err) {
            console.error("Erro inesperado durante o registo:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado durante o registo. Tente novamente.");
        } finally {
            if (registerButton) registerButton.disabled = false;
            // Remover spinner
        }
    });
}


// --- LÓGICA DA PÁGINA DO DASHBOARD (/dashboard.html) ---
async function initDashboardPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const userAvatar = document.getElementById('user-avatar');
    const userEmailDisplay = document.getElementById('user-email-display');
    const adminLink = document.getElementById('admin-link');
    const logoutBtn = document.getElementById('logout-btn');
    const profileMenuBtn = document.getElementById('profile-menu-btn');
    const profileMenu = document.getElementById('profile-menu');
    const createPostForm = document.getElementById('create-post-form');
    const postContent = document.getElementById('post-content');
    const postCategories = document.getElementById('post-categories');
    const postHashtags = document.getElementById('post-hashtags');
    const postSubmitBtn = document.getElementById('post-submit-btn');
    const feedContainer = document.getElementById('feed-container');

    if(userAvatar) userAvatar.src = currentUser.photo_url || `https://placehold.co/40x40/FF7F50/FFFFFF?text=${currentUser.display_name ? currentUser.display_name.charAt(0) : 'U'}`;
    if(userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
    if (adminLink && (currentUser.role === 'admin' || currentUser.role === 'admin_geral')) {
        adminLink.classList.remove('hidden');
    }

    if(logoutBtn) logoutBtn.addEventListener('click', async () => {
        try {
            await supabaseClient.from('profiles').update({ status: 'offline' }).eq('id', currentUser.id);
            await supabaseClient.auth.signOut();
            console.log("Logout bem-sucedido.");
        } catch (error) {
            console.error("Erro ao fazer logout:", error.message);
            showCustomAlert("Erro ao Sair", "Não foi possível terminar a sessão: " + error.message);
        }
    });

    if(profileMenuBtn) profileMenuBtn.addEventListener('click', () => {
        if(profileMenu) profileMenu.classList.toggle('hidden');
    });

    if(createPostForm) createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = postContent.value.trim();
        const categories = postCategories.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        const hashtags = postHashtags.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        if(!content) {
            showCustomAlert("Erro ao Publicar", "O conteúdo da publicação não pode estar vazio.");
            return;
        }

        postSubmitBtn.disabled = true;

        try {
            const { error } = await supabaseClient.from('posts').insert({
                content: content,
                created_by: currentUser.id,
                categories: categories,
                hashtags: hashtags
            });

            if(error) {
                showCustomAlert('Erro ao Publicar', 'Não foi possível criar a publicação: ' + error.message);
                console.error(error);
            } else {
                postContent.value = '';
                postCategories.value = '';
                postHashtags.value = '';
                console.log("Publicação criada com sucesso.");
            }
        } catch (err) {
            console.error("Erro inesperado ao publicar:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao criar a publicação. Tente novamente.");
        } finally {
            postSubmitBtn.disabled = false;
        }
    });

    const fetchAndRenderFeed = async () => {
        try {
            const { data, error } = await supabaseClient.from('posts')
                .select(`*, profiles(display_name, photo_url)`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar publicações:', error);
                showCustomAlert("Erro ao Carregar Feed", "Não foi possível carregar as publicações: " + error.message);
                return;
            }

            if(feedContainer) {
                feedContainer.innerHTML = '';
                if(data.length === 0) {
                    feedContainer.innerHTML = `<p class="text-center text-gray-500">Ainda não há publicações. Seja o primeiro!</p>`;
                } else {
                    data.forEach(post => {
                        const postEl = document.createElement('div');
                        postEl.className = 'bg-white p-4 rounded-lg shadow-md feed-item';
                        const authorAvatar = post.profiles.photo_url || `https://placehold.co/40x40/FF7F50/FFFFFF?text=${post.profiles.display_name ? post.profiles.display_name.charAt(0) : 'U'}`;
                        const postDate = new Date(post.created_at).toLocaleString('pt-BR');

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
        } catch (err) {
            console.error("Erro inesperado ao buscar e renderizar feed:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar o feed. Tente novamente.");
        }
    };

    if(feedContainer) {
        feedContainer.addEventListener('click', async (e) => {
            const likeBtn = e.target.closest('.like-btn');
            const commentBtn = e.target.closest('.comment-btn');
            const shareBtn = e.target.closest('.share-btn');

            if (likeBtn) {
                const postId = likeBtn.dataset.postId;
                try {
                    const { data: post, error } = await supabaseClient.from('posts').select('likes').eq('id', postId).single();
                    if (error) {
                        console.error('Erro ao buscar likes:', error);
                        showCustomAlert("Erro ao Curtir", "Não foi possível processar a sua curtida.");
                        return;
                    }

                    let currentLikes = post.likes || [];
                    if (currentLikes.includes(currentUser.id)) {
                        currentLikes = currentLikes.filter(id => id !== currentUser.id); // Descurtir
                    } else {
                        currentLikes.push(currentUser.id); // Curtir
                    }
                    await supabaseClient.from('posts').update({ likes: currentLikes }).eq('id', postId);
                    console.log(`Post ${postId} curtido/descurtido.`);
                } catch (err) {
                    console.error("Erro inesperado ao curtir:", err);
                    showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao curtir. Tente novamente.");
                }
            } else if (commentBtn) {
                const postId = commentBtn.dataset.postId;
                showCustomAlert("Comentários", "Funcionalidade de comentários será implementada em breve para a publicação " + postId);
            } else if (shareBtn) {
                const postId = shareBtn.dataset.postId;
                showCustomAlert("Partilhar", "Funcionalidade de partilha será implementada em breve para a publicação " + postId);
            }
        });
    }

    fetchAndRenderFeed();
    supabaseClient.channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchAndRenderFeed)
        .subscribe();

    (async () => {
        try {
            if (currentUser && currentUser.id) {
                await supabaseClient.from('profiles').update({ status: 'online' }).eq('id', currentUser.id);
                console.log("Status do utilizador atualizado para online.");
            }
        } catch (e) {
            console.error("Erro ao atualizar status para online:", e.message);
        }
    })();
}

// --- LÓGICA DA PÁGINA DE PERFIL (/profile.html) ---
async function initProfilePage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
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
            id: currentUser.id, updated_at: new Date().toISOString(),
            display_name: formElements.name.value, bio: formElements.bio.value, phone: formElements.phone.value,
            birthdate: formElements.birthdate.value, gender: formElements.gender.value, marital_status: formElements.maritalStatus.value,
        };
        try {
            const { error } = await supabaseClient.from('profiles').upsert(updates);
            if (error) {
                console.error("Erro ao salvar o perfil:", error.message);
                showCustomAlert('Erro ao Salvar', 'Erro ao salvar o perfil: ' + error.message);
            }
            else {
                showCustomAlert('Sucesso!', 'Perfil atualizado!', () => {
                    checkAuthAndGetProfile().then(() => {
                        updateProfileDisplay(currentUser);
                        profileForm.classList.add('hidden');
                        profileView.classList.remove('hidden');
                    });
                });
            }
        } catch (err) {
            console.error("Erro inesperado ao salvar perfil:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao salvar o perfil. Tente novamente.");
        }
    });
}

// --- LÓGICA DA PÁGINA DE EVENTOS (/eventos.html) ---
async function initEventsPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const eventsContainer = document.getElementById('events-container');
    const eventModal = document.getElementById('event-modal');
    const eventForm = document.getElementById('event-form');
    const modalTitle = document.getElementById('modal-title');
    const createEventBtn = document.getElementById('create-event-btn');
    const cancelEventBtn = document.getElementById('cancel-event-btn');

    const fetchAndRenderEvents = async () => {
        try {
            const { data, error } = await supabaseClient.from('events').select(`*, profiles(display_name)`).order('datetime', { ascending: true });
            if(eventsContainer) eventsContainer.innerHTML = '';
            if (error || !data || data.length === 0) {
                if(eventsContainer) eventsContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center">Nenhum evento agendado.</p>`;
                return;
            }
            data.forEach(event => {
                const card = document.createElement('div');
                card.className = 'bg-white p-6 rounded-lg shadow-md flex flex-col event-card relative';
                const isAuthor = currentUser && event.created_by === currentUser.id;
                const isAdmin = currentUser.role === 'admin' || currentUser.role === 'admin_geral';
                const authorControls = (isAuthor || isAdmin) ? `
                    <div class="absolute top-2 right-2 flex space-x-1">
                        <button class="edit-event-btn p-2 rounded-full hover:bg-gray-100" data-id="${event.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button class="delete-event-btn p-2 rounded-full hover:bg-gray-100" data-id="${event.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>` : '';
                const eventDateTime = new Date(event.datetime);
                const dateStr = eventDateTime.toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'});
                const timeStr = eventDateTime.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});

                card.innerHTML = `${authorControls}<div class="flex-1"><h3 class="text-xl font-bold text-gray-800 mb-2 pr-16">${event.title}</h3><p class="text-orange-600 font-semibold">${dateStr} às ${timeStr}</p><p class="text-gray-500 mt-1">${event.location}</p><p class="text-gray-600 mt-4">${event.description || ''}</p></div>`;
                if(eventsContainer) eventsContainer.appendChild(card);
            });
        } catch (err) {
            console.error("Erro inesperado ao buscar e renderizar eventos:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar os eventos. Tente novamente.");
        }
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
            title: document.getElementById('event-name').value,
            datetime: `${document.getElementById('event-date').value}T${document.getElementById('event-time').value}:00Z`,
            location: document.getElementById('event-location').value,
            description: document.getElementById('event-description').value,
            created_by: currentUser.id,
        };
        try {
            const { error } = eventId ? await supabaseClient.from('events').update(eventData).eq('id', eventId) : await supabaseClient.from('events').insert(eventData);
            if (error) {
                console.error("Erro ao salvar evento:", error.message);
                showCustomAlert("Erro ao Salvar", "Não foi possível salvar o evento: " + error.message);
            } else {
                showCustomAlert("Sucesso!", "Evento salvo com sucesso!");
                if(eventModal) eventModal.classList.add('hidden');
                fetchAndRenderEvents();
            }
        } catch (err) {
            console.error("Erro inesperado ao salvar evento:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao salvar o evento. Tente novamente.");
        }
    });

    if(eventsContainer) eventsContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-event-btn');
        if (editBtn) {
            try {
                const { data } = await supabaseClient.from('events').select('*').eq('id', editBtn.dataset.id).single();
                if (data) {
                    document.getElementById('event-id').value = data.id;
                    document.getElementById('event-name').value = data.title;
                    const eventDateTime = new Date(data.datetime);
                    document.getElementById('event-date').value = eventDateTime.toISOString().split('T')[0];
                    document.getElementById('event-time').value = eventDateTime.toISOString().split('T')[1].substring(0, 5);
                    document.getElementById('event-location').value = data.location;
                    document.getElementById('event-description').value = data.description;

                    if(modalTitle) modalTitle.textContent = "Editar Evento";
                    if(eventModal) eventModal.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Erro inesperado ao editar evento:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar dados do evento para edição.");
            }
        }
        const deleteBtn = e.target.closest('.delete-event-btn');
        if (deleteBtn) {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir este evento?", async () => {
                try {
                    const eventId = deleteBtn.dataset.id;
                    await supabaseClient.from('events').delete().eq('id', eventId);
                    fetchAndRenderEvents();
                    showCustomAlert("Sucesso!", "Evento excluído com sucesso!");
                } catch (err) {
                    console.error("Erro ao excluir evento:", err.message);
                    showCustomAlert("Erro ao Excluir", "Não foi possível excluir o evento: " + err.message);
                }
            });
        }
    });

    supabaseClient.channel('public:events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchAndRenderEvents).subscribe();
    fetchAndRenderEvents();
}


// --- LÓGICA DA PÁGINA DE ADMIN (/admin.html) ---
async function initAdminPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile(true);
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

    const eventFormFields = {
        id: document.getElementById('event-id'),
        name: document.getElementById('event-name'),
        date: document.getElementById('event-date'),
        time: document.getElementById('event-time'),
        location: document.getElementById('event-location'),
        description: document.getElementById('event-description'),
    };

    const fetchMetrics = async () => {
        try {
            const { count: u } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true });
            const { count: o } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'online');
            const { count: p } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true });
            const { count: e } = await supabaseClient.from('events').select('*', { count: 'exact', head: true });
            if(metricsDOMElements.totalUsers) metricsDOMElements.totalUsers.textContent = u ?? 0;
            if(metricsDOMElements.onlineUsers) metricsDOMElements.onlineUsers.textContent = o ?? 0;
            if(metricsDOMElements.totalPosts) metricsDOMElements.totalPosts.textContent = p ?? 0;
            if(metricsDOMElements.totalEvents) metricsDOMElements.totalEvents.textContent = e ?? 0;
        } catch (err) {
            console.error("Erro ao buscar métricas:", err.message);
            showCustomAlert("Erro de Métricas", "Não foi possível carregar as métricas.");
        }
    };

    let allUsers = [];
    const fetchUsers = async () => {
        try {
            const { data: users, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
            if (error) {
                console.error("Erro ao buscar utilizadores:", error);
                showCustomAlert("Erro de Utilizadores", "Não foi possível carregar a lista de utilizadores.");
                return;
            }
            allUsers = users;
            if (!usersTableBody) return;
            usersTableBody.innerHTML = '';
            users.forEach(user => {
                const row = document.createElement('tr'); row.className = 'border-b hover:bg-gray-50';
                const isAdmin = user.role === 'admin' || user.role === 'admin_geral';
                const isGeneralAdmin = user.role === 'admin_geral';

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
        } catch (err) {
            console.error("Erro inesperado ao buscar utilizadores:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar a lista de utilizadores.");
        }
    };

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabaseClient.from('events').select('*').order('datetime', { ascending: true });
            if (!eventsContainer) return;
            eventsContainer.innerHTML = '';
            if (error || !data || data.length === 0) { eventsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Nenhum evento.</p>'; return; }
            data.forEach(ev => {
                const card = document.createElement('div'); card.className = 'bg-white p-5 rounded-lg shadow-md space-y-2 fade-in';
                const eventDateTime = new Date(ev.datetime);
                const dateStr = eventDateTime.toLocaleDateString('pt-BR', {timeZone:'UTC'});
                const timeStr = eventDateTime.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
                card.innerHTML = `<h3 class="text-lg font-bold">${ev.title}</h3><p class="text-sm text-gray-600">${dateStr} às ${timeStr}</p><p class="text-sm text-gray-500">${ev.location}</p><p class="text-sm pt-2 border-t">${ev.description||'Sem descrição.'}</p><div class="flex justify-end space-x-2 pt-2"><button class="text-sm font-semibold text-blue-600 hover:underline" data-action="edit-event" data-id="${ev.id}">Editar</button><button class="text-sm font-semibold text-red-600 hover:underline" data-action="delete-event" data-id="${ev.id}">Excluir</button></div>`;
                eventsContainer.appendChild(card);
            });
        } catch (err) {
            console.error("Erro ao buscar eventos (Admin):", err.message);
            showCustomAlert("Erro de Eventos", "Não foi possível carregar os eventos no painel de administração.");
        }
    };

    if(usersTableBody) usersTableBody.addEventListener('click', async (e) => {
        const { action, id } = e.target.dataset;
        if (!action || !id) return;

        const targetUser = allUsers.find(u => u.id === id);
        if (!targetUser) {
            showCustomAlert("Erro", "Utilizador não encontrado.");
            return;
        }

        if (id === currentUser.id) {
            showCustomAlert("Erro", "Não pode alterar a sua própria role.");
            return;
        }
        if (currentUser.role !== 'admin_geral' && targetUser.role === 'admin_geral') {
            showCustomAlert("Erro", "Não tem permissão para alterar a role de um Administrador Geral.");
            return;
        }

        showCustomConfirm("Confirmar Alteração", `Deseja realmente ${action === 'make-admin' ? 'tornar' : 'remover'} este utilizador como administrador?`, async () => {
            try {
                const newRole = action === 'make-admin' ? 'admin' : 'member';
                const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', id);
                if (error) {
                    console.error("Erro ao atualizar role do utilizador:", error.message);
                    showCustomAlert("Erro", "Falha ao atualizar a role do utilizador: " + error.message);
                }
                else {
                    showCustomAlert("Sucesso!", "Role do utilizador atualizada!");
                    fetchUsers();
                }
            } catch (err) {
                console.error("Erro inesperado ao alterar role:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao alterar a role do utilizador.");
            }
        });
    });

    if(createEventBtn) createEventBtn.onclick = () => {
        if(eventForm) eventForm.reset();
        eventFormFields.id.value = '';
        if(eventModalTitle) eventModalTitle.textContent = 'Novo Evento';
        if(eventModal) eventModal.classList.remove('hidden');
    };
    if(cancelBtn) cancelBtn.onclick = () => { if(eventModal) eventModal.classList.add('hidden'); };

    if(eventForm) eventForm.onsubmit = async (e) => {
        e.preventDefault();
        const eventId = eventFormFields.id.value;
        const eventData = {
            title: eventFormFields.name.value,
            datetime: `${eventFormFields.date.value}T${eventFormFields.time.value}:00Z`,
            location: eventFormFields.location.value,
            description: eventFormFields.description.value,
            created_by: currentUser.id,
        };

        try {
            const { error } = eventId
                ? await supabaseClient.from('events').update(eventData).eq('id', eventId)
                : await supabaseClient.from('events').insert(eventData);

            if (error) {
                console.error("Erro ao salvar evento (Admin):", error.message);
                showCustomAlert("Erro ao Salvar", "Erro ao salvar evento: " + error.message);
            }
            else {
                showCustomAlert("Sucesso!", "Evento salvo com sucesso!");
                if(eventModal) eventModal.classList.add('hidden');
            }
        } catch (err) {
            console.error("Erro inesperado ao salvar evento (Admin):", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao salvar o evento.");
        }
    };

    if(eventsContainer) eventsContainer.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        if (!action || !id) return;

        if (action === 'edit-event') {
            try {
                const { data } = await supabaseClient.from('events').select('*').eq('id', id).single();
                if(data) {
                    eventFormFields.id.value = data.id;
                    eventFormFields.name.value = data.title;
                    const eventDateTime = new Date(data.datetime);
                    eventFormFields.date.value = eventDateTime.toISOString().split('T')[0];
                    eventFormFields.time.value = eventDateTime.toISOString().split('T')[1].substring(0, 5);
                    eventFormFields.location.value = data.location;
                    eventFormFields.description.value = data.description;

                    if(eventModalTitle) eventModalTitle.textContent = 'Editar Evento';
                    if(eventModal) eventModal.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Erro inesperado ao editar evento (Admin):", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar dados do evento para edição.");
            }
        } else if (action === 'delete-event') {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir este evento?", async () => {
                try {
                    await supabaseClient.from('events').delete().eq('id', id);
                    showCustomAlert("Sucesso!", "Evento excluído com sucesso!");
                } catch (err) {
                    console.error("Erro ao excluir evento (Admin):", err.message);
                    showCustomAlert("Erro ao Excluir", "Não foi possível excluir o evento: " + err.message);
                }
            });
        }
    });

    const loadAndListen = () => {
        fetchMetrics();
        fetchUsers();
        fetchEvents();
    };

    loadAndListen();
    supabaseClient.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchMetrics();
          fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
          fetchMetrics();
          fetchEvents();
      })
      .subscribe();
}

// --- LÓGICA DA PÁGINA DE ESTUDOS BÍBLICOS (/estudos.html) ---
async function initEstudosPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const estudosContainer = document.getElementById('estudos-container');
    const estudoModal = document.getElementById('estudo-modal');
    const estudoForm = document.getElementById('estudo-form');
    const modalTitle = document.getElementById('estudo-modal-title');
    const createEstudoBtn = document.getElementById('create-estudo-btn');
    const cancelEstudoBtn = document.getElementById('cancel-estudo-btn');

    const fetchAndRenderEstudos = async () => {
        try {
            const { data, error } = await supabaseClient.from('studies').select(`*, profiles(display_name)`).order('created_at', { ascending: false });
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
                if (estudo.type === 'video' && estudo.youtube_url) {
                    const videoId = estudo.youtube_url.split('v=')[1] || estudo.youtube_url.split('youtu.be/')[1];
                    contentHtml = `<div class="aspect-video w-full"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-md"></iframe></div>`;
                } else if (estudo.type === 'text' && estudo.text_content) {
                    contentHtml = `<p class="text-gray-600 mt-4 whitespace-pre-wrap">${estudo.text_content.substring(0, 200)}...</p>`;
                }

                card.innerHTML = `${authorControls}
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-gray-800 mb-2 pr-16">${estudo.title}</h3>
                        <p class="text-orange-600 font-semibold">Por: ${estudo.profiles.display_name || 'Admin'}</p>
                        <p class="text-gray-500 mt-1">Publicado em: ${new Date(estudo.created_at).toLocaleDateString('pt-BR')}</p>
                        ${contentHtml}
                        <button class="view-estudo-btn text-blue-600 hover:underline mt-2" data-id="${estudo.id}">Ver Estudo Completo</button>
                    </div>`;
                if(estudosContainer) estudosContainer.appendChild(card);
            });
        } catch (err) {
            console.error("Erro inesperado ao buscar e renderizar estudos:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar os estudos bíblicos. Tente novamente.");
        }
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
            title: document.getElementById('estudo-titulo').value,
            type: document.getElementById('estudo-tipo').value,
            youtube_url: document.getElementById('estudo-link-video').value,
            text_content: document.getElementById('estudo-conteudo-texto').value,
            created_at: new Date().toISOString(),
            created_by: currentUser.id,
        };

        try {
            const { error } = estudoId
                ? await supabaseClient.from('studies').update(estudoData).eq('id', estudoId)
                : await supabaseClient.from('studies').insert(estudoData);

            if (error) {
                console.error("Erro ao salvar estudo:", error.message);
                showCustomAlert("Erro ao Salvar", "Não foi possível salvar o estudo: " + error.message);
            } else {
                showCustomAlert("Sucesso!", "Estudo salvo com sucesso!");
                if(estudoModal) estudoModal.classList.add('hidden');
                fetchAndRenderEstudos();
            }
        } catch (err) {
            console.error("Erro inesperado ao salvar estudo:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao salvar o estudo. Tente novamente.");
        }
    });

    if(estudosContainer) estudosContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-estudo-btn');
        const deleteBtn = e.target.closest('.delete-estudo-btn');
        const viewBtn = e.target.closest('.view-estudo-btn');

        if (editBtn) {
            try {
                const { data } = await supabaseClient.from('studies').select('*').eq('id', editBtn.dataset.id).single();
                if (data) {
                    document.getElementById('estudo-id').value = data.id;
                    document.getElementById('estudo-titulo').value = data.title;
                    document.getElementById('estudo-tipo').value = data.type;
                    document.getElementById('estudo-link-video').value = data.youtube_url || '';
                    document.getElementById('estudo-conteudo-texto').value = data.text_content || '';

                    document.getElementById('estudo-tipo')?.dispatchEvent(new Event('change'));

                    if(modalTitle) modalTitle.textContent = "Editar Estudo";
                    if(estudoModal) estudoModal.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Erro inesperado ao editar estudo:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar dados do estudo para edição.");
            }
        } else if (deleteBtn) {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir este estudo?", async () => {
                try {
                    await supabaseClient.from('studies').delete().eq('id', deleteBtn.dataset.id);
                    fetchAndRenderEstudos();
                    showCustomAlert("Sucesso!", "Estudo excluído com sucesso!");
                } catch (err) {
                    console.error("Erro ao excluir estudo:", err.message);
                    showCustomAlert("Erro ao Excluir", "Não foi possível excluir o estudo: " + err.message);
                }
            });
        } else if (viewBtn) {
            window.location.href = `/estudo_detalhe.html?id=${viewBtn.dataset.id}`;
        }
    });

    supabaseClient.channel('public:studies').on('postgres_changes', { event: '*', schema: 'public', table: 'studies' }, fetchAndRenderEstudos).subscribe();
    fetchAndRenderEstudos();
}

// --- LÓGICA DA PÁGINA DE DETALHE DE ESTUDO BÍBLICO (/estudo_detalhe.html) ---
async function initEstudoDetalhePage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
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
        try {
            const { data: estudo, error } = await supabaseClient.from('studies').select(`*, profiles(display_name)`).eq('id', estudoId).single();

            if (error || !estudo) {
                console.error("Erro ao carregar estudo:", error ? error.message : "Estudo não encontrado.");
                showCustomAlert("Erro", "Erro ao carregar estudo: " + (error ? error.message : "Estudo não encontrado."), () => {
                    window.location.href = '/estudos.html';
                });
                return;
            }

            if (estudoContentDiv) {
                let contentHtml = `<h1 class="text-3xl font-bold text-gray-800 mb-2">${estudo.title}</h1>
                                   <p class="text-orange-600 font-semibold mb-4">Por: ${estudo.profiles.display_name || 'Admin'} | Publicado em: ${new Date(estudo.created_at).toLocaleDateString('pt-BR')}</p>`;

                if (estudo.type === 'video' && estudo.youtube_url) {
                    const videoId = estudo.youtube_url.split('v=')[1] || estudo.youtube_url.split('youtu.be/')[1];
                    contentHtml += `<div class="aspect-video w-full mb-6"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-md"></iframe></div>`;
                } else if (estudo.type === 'text' && estudo.text_content) {
                    contentHtml += `<div class="prose max-w-none text-gray-700">${estudo.text_content.replace(/\n/g, '<br>')}</div>`;
                }
                estudoContentDiv.innerHTML = contentHtml;
            }

            const { data: mensagens, error: mensagensError } = await supabaseClient.from('forum_messages')
                .select(`*, profiles(display_name, photo_url)`)
                .eq('topic_id', estudoId)
                .order('created_at', { ascending: true });

            if (mensagensError) {
                console.error('Erro ao buscar mensagens do fórum:', mensagensError);
                showCustomAlert("Erro no Fórum", "Não foi possível carregar as mensagens do fórum.");
                return;
            }

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
                                    <p class="text-xs text-gray-500">${new Date(msg.created_at).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                            <p class="text-gray-700 whitespace-pre-wrap">${msg.content}</p>
                        `;
                        forumContainer.appendChild(msgEl);
                    });
                }
            }
        } catch (err) {
            console.error("Erro inesperado ao carregar detalhe do estudo:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar o detalhe do estudo. Tente novamente.");
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

            try {
                const { error } = await supabaseClient.from('forum_messages').insert({
                    topic_id: estudoId,
                    author_id: currentUser.id,
                    content: content,
                    created_at: new Date().toISOString()
                });

                if (error) {
                    console.error("Erro ao enviar mensagem do fórum:", error.message);
                    showCustomAlert("Erro ao Enviar", "Não foi possível enviar a mensagem: " + error.message);
                }
                else {
                    forumPostContent.value = '';
                    fetchAndRenderEstudo();
                }
            } catch (err) {
                console.error("Erro inesperado ao enviar mensagem do fórum:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao enviar a mensagem do fórum.");
            }
        });
    }

    supabaseClient.channel(`estudo_${estudoId}_forum`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_messages', filter: `topic_id=eq.${estudoId}` }, fetchAndRenderEstudo)
        .subscribe();

    fetchAndRenderEstudo();
}


// --- LÓGICA DA PÁGINA DE LIVES (/lives.html) ---
async function initLivesPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const livesContainer = document.getElementById('lives-container');
    const liveModal = document.getElementById('live-modal');
    const liveForm = document.getElementById('live-form');
    const modalTitle = document.getElementById('live-modal-title');
    const createLiveBtn = document.getElementById('create-live-btn');
    const cancelLiveBtn = document.getElementById('cancel-live-btn');

    const fetchAndRenderLives = async () => {
        try {
            const { data, error } = await supabaseClient.from('lives').select(`*, profiles(display_name)`).order('start_datetime', { ascending: false });
            if(livesContainer) livesContainer.innerHTML = '';
            if (error || !data || data.length === 0) {
                if(livesContainer) livesContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center">Nenhuma live agendada ou gravada.</p>`;
                return;
            }
            data.forEach(live => {
                const card = document.createElement('div');
                card.className = 'bg-white p-6 rounded-lg shadow-md flex flex-col relative';
                const isAuthorOrAdmin = currentUser && (live.created_by === currentUser.id || currentUser.role === 'admin' || currentUser.role === 'admin_geral');
                const liveDateTime = new Date(live.start_datetime);
                const isLiveNow = live.is_live_now && (new Date() >= liveDateTime);

                const authorControls = isAuthorOrAdmin ? `
                    <div class="absolute top-2 right-2 flex space-x-1">
                        <button class="edit-live-btn p-2 rounded-full hover:bg-gray-100" data-id="${live.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button class="delete-live-btn p-2 rounded-full hover:bg-gray-100" data-id="${live.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>` : '';

                let liveStatusHtml = '';
                if (isLiveNow) {
                    liveStatusHtml = `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full absolute top-2 left-2">AO VIVO</span>`;
                } else if (live.recording_url) {
                    liveStatusHtml = `<span class="bg-gray-500 text-white text-xs px-2 py-1 rounded-full absolute top-2 left-2">GRAVADO</span>`;
                }

                let videoHtml = '';
                const videoLink = isLiveNow ? live.youtube_live_url : live.recording_url;
                if (videoLink) {
                    const videoId = videoLink.split('v=')[1] || videoLink.split('youtu.be/')[1];
                    if (videoId) {
                        videoHtml = `<div class="aspect-video w-full mb-4"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-md"></iframe></div>`;
                    } else {
                        videoHtml = `<div class="bg-gray-200 aspect-video w-full mb-4 rounded-md flex items-center justify-center text-gray-500">Link de vídeo inválido.</div>`;
                    }
                } else {
                    videoHtml = `<div class="bg-gray-200 aspect-video w-full mb-4 rounded-md flex items-center justify-center text-gray-500">Sem vídeo disponível.</div>`;
                }


                card.innerHTML = `${authorControls} ${liveStatusHtml}
                    <div class="flex-1 mt-4">
                        <h3 class="text-xl font-bold text-gray-800 mb-2 pr-16">${live.title}</h3>
                        <p class="text-orange-600 font-semibold">Início: ${liveDateTime.toLocaleDateString('pt-BR')} às ${liveDateTime.toLocaleTimeString('pt-BR')}</p>
                        <p class="text-gray-500 mt-1">Por: ${live.profiles.display_name || 'Admin'}</p>
                        ${videoHtml}
                        <p class="text-gray-600 mt-2">${live.description || ''}</p>
                        ${isLiveNow ? `<a href="${live.youtube_live_url}" target="_blank" class="block text-center bg-red-600 text-white px-4 py-2 rounded-lg mt-4 hover:bg-red-700">Assistir Agora</a>` : ''}
                        ${!isLiveNow && live.recording_url ? `<a href="${live.recording_url}" target="_blank" class="block text-center bg-blue-600 text-white px-4 py-2 rounded-lg mt-4 hover:bg-blue-700">Ver Gravação</a>` : ''}
                    </div>`;
                if(livesContainer) livesContainer.appendChild(card);
            });
        } catch (err) {
            console.error("Erro inesperado ao buscar e renderizar lives:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar as lives. Tente novamente.");
        }
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
            title: document.getElementById('live-titulo').value,
            youtube_live_url: document.getElementById('live-link-youtube').value,
            start_datetime: document.getElementById('live-data-hora-inicio').value,
            is_live_now: document.getElementById('live-esta-ao-vivo').checked,
            recording_url: document.getElementById('live-link-gravacao').value,
            description: document.getElementById('live-descricao').value,
            created_by: currentUser.id,
        };

        try {
            const { error } = liveId
                ? await supabaseClient.from('lives').update(liveData).eq('id', liveId)
                : await supabaseClient.from('lives').insert(liveData);

            if (error) {
                console.error("Erro ao salvar live:", error.message);
                showCustomAlert("Erro ao Salvar", "Não foi possível salvar a live: " + error.message);
            } else {
                showCustomAlert("Sucesso!", "Live salva com sucesso!");
                if(liveModal) liveModal.classList.add('hidden');
                fetchAndRenderLives();
            }
        } catch (err) {
            console.error("Erro inesperado ao salvar live:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao salvar a live. Tente novamente.");
        }
    });

    if(livesContainer) livesContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-live-btn');
        const deleteBtn = e.target.closest('.delete-live-btn');

        if (editBtn) {
            try {
                const { data } = await supabaseClient.from('lives').select('*').eq('id', editBtn.dataset.id).single();
                if (data) {
                    document.getElementById('live-id').value = data.id;
                    document.getElementById('live-titulo').value = data.title;
                    document.getElementById('live-link-youtube').value = data.youtube_live_url || '';
                    document.getElementById('live-data-hora-inicio').value = data.start_datetime.substring(0, 16);
                    document.getElementById('live-esta-ao-vivo').checked = data.is_live_now;
                    document.getElementById('live-link-gravacao').value = data.recording_url || '';
                    document.getElementById('live-descricao').value = data.description || '';

                    if(modalTitle) modalTitle.textContent = "Editar Live";
                    if(liveModal) liveModal.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Erro inesperado ao editar live:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar dados da live para edição.");
            }
        } else if (deleteBtn) {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir esta live?", async () => {
                try {
                    await supabaseClient.from('lives').delete().eq('id', deleteBtn.dataset.id);
                    fetchAndRenderLives();
                    showCustomAlert("Sucesso!", "Live excluída com sucesso!");
                }
            } catch (err) {
                console.error("Erro ao excluir live:", err.message);
                showCustomAlert("Erro ao Excluir", "Não foi possível excluir a live: " + err.message);
            }
        });
    }
});

supabaseClient.channel('public:lives').on('postgres_changes', { event: '*', schema: 'public', table: 'lives' }, fetchAndRenderLives).subscribe();
fetchAndRenderLives();
}

// --- LÓGICA DA PÁGINA DE CHAT (/chat.html) ---
async function initChatPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const chatMessagesContainer = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    const fetchAndRenderMessages = async () => {
        try {
            const { data: messages, error } = await supabaseClient.from('chat_messages')
                .select(`*, profiles(display_name, photo_url)`)
                .order('sent_at', { ascending: true });

            if (error) {
                console.error('Erro ao buscar mensagens do chat:', error);
                showCustomAlert("Erro no Chat", "Não foi possível carregar as mensagens do chat.");
                return;
            }

            if (chatMessagesContainer) {
                chatMessagesContainer.innerHTML = '';
                messages.forEach(msg => {
                    const messageEl = document.createElement('div');
                    const isCurrentUser = msg.sender_id === currentUser.id;
                    const authorName = msg.profiles?.display_name || 'Utilizador Anónimo';
                    const authorAvatar = msg.profiles?.photo_url || `https://placehold.co/30x30/FF7F50/FFFFFF?text=${authorName.charAt(0)}`;

                    messageEl.className = `flex items-start mb-4 ${isCurrentUser ? 'justify-end' : ''}`;
                    messageEl.innerHTML = `
                        <div class="flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start">
                            <img src="${authorAvatar}" alt="Avatar" class="w-8 h-8 rounded-full ${isCurrentUser ? 'ml-3' : 'mr-3'}">
                            <div class="p-3 rounded-lg ${isCurrentUser ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-800'} max-w-xs">
                                <p class="font-semibold text-sm ${isCurrentUser ? 'text-right' : 'text-left'}">${isCurrentUser ? 'Você' : authorName}</p>
                                <p class="text-sm whitespace-pre-wrap">${msg.content}</p>
                                <p class="text-xs text-right mt-1 ${isCurrentUser ? 'text-orange-100' : 'text-gray-500'}">${new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    `;
                    chatMessagesContainer.appendChild(messageEl);
                });
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            }
        } catch (err) {
            console.error("Erro inesperado ao buscar e renderizar mensagens do chat:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar as mensagens do chat. Tente novamente.");
        }
    };

    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', async () => {
            const content = chatInput.value.trim();
            if (!content) return;

            chatSendBtn.disabled = true;

            try {
                const moderatedContent = await moderateChatMessage(content);

                if (moderatedContent.status === 'rejected') {
                    showCustomAlert("Mensagem Bloqueada", "A sua mensagem foi bloqueada pela moderação de IA: " + moderatedContent.reason);
                    return;
                }

                const { error } = await supabaseClient.from('chat_messages').insert({
                    sender_id: currentUser.id,
                    content: moderatedContent.text,
                    sent_at: new Date().toISOString(),
                    moderation_status: moderatedContent.status
                });

                if (error) {
                    console.error("Erro ao enviar mensagem:", error.message);
                    showCustomAlert("Erro ao Enviar", "Não foi possível enviar a mensagem: " + error.message);
                } else {
                    chatInput.value = '';
                    console.log("Mensagem enviada com sucesso.");
                }
            } catch (err) {
                console.error("Erro inesperado ao enviar mensagem do chat:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao enviar a mensagem do chat. Tente novamente.");
            } finally {
                chatSendBtn.disabled = false;
            }
        });
    }

    async function moderateChatMessage(text) {
        try {
            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: `Analise a seguinte mensagem para conteúdo impróprio (linguagem ofensiva, ódio, spam, etc.). Responda em JSON com 'status' ('approved' ou 'rejected') e 'reason' (se rejeitado) e 'text' (a mensagem original ou uma versão limpa se possível, ou vazia se rejeitada). Mensagem: "${text}""` }] });
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
            const apiKey = "";
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
                return { status: "approved", reason: "AI response error, approved by default", text: text };
            }
        } catch (e) {
            console.error("Erro ao chamar API de moderação de IA:", e);
            return { status: "approved", reason: "API call failed, approved by default", text: text };
        }
    }


    supabaseClient.channel('public:chat_messages').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, fetchAndRenderMessages).subscribe();
    fetchAndRenderMessages();
}

// --- LÓGICA DA PÁGINA DE DOAÇÕES (/doacoes.html) ---
async function initDoacoesPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const doacoesInfoDiv = document.getElementById('doacoes-info');
    const doacoesForm = document.getElementById('doacoes-form');
    const editDoacoesBtn = document.getElementById('edit-doacoes-btn');
    const cancelDoacoesBtn = document.getElementById('cancel-doacoes-btn');
    const saveDoacoesBtn = document.getElementById('save-doacoes-btn');

    const formFields = {
        pixKey: document.getElementById('form-pix-key'),
        qrCodeLink: document.getElementById('form-qr-code-link'),
        bankDetails: document.getElementById('form-bank-details')
    };

    const fetchAndRenderDoacoes = async () => {
        try {
            const { data, error } = await supabaseClient.from('donation_info').select('*').limit(1).single();

            if (error && error.code !== 'PGRST116') {
                console.error('Erro ao buscar informações de doação:', error);
                if(doacoesInfoDiv) doacoesInfoDiv.innerHTML = `<p class="text-red-500">Erro ao carregar informações de doação.</p>`;
                return;
            }

            if (!data) {
                if(doacoesInfoDiv) doacoesInfoDiv.innerHTML = `<p class="text-gray-500">Nenhuma informação de doação configurada ainda.</p>`;
                if (currentUser.role === 'admin_geral') {
                    if(editDoacoesBtn) editDoacoesBtn.classList.remove('hidden');
                    if(doacoesInfoDiv) doacoesInfoDiv.classList.add('hidden');
                    if(doacoesForm) doacoesForm.classList.remove('hidden');
                    if(saveDoacoesBtn) saveDoacoesBtn.textContent = 'Criar Informações';
                }
                return;
            }

            if(doacoesInfoDiv) {
                doacoesInfoDiv.innerHTML = `
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">Informações para Doação</h2>
                    <div class="space-y-4">
                        <div>
                            <p class="font-semibold text-gray-700">Chave Pix:</p>
                            <p class="text-gray-600">${data.pix_key || 'Não informado'}</p>
                        </div>
                        ${data.pix_qr_code_image ? `
                        <div>
                            <p class="font-semibold text-gray-700">QR Code Pix:</p>
                            <img src="${data.pix_qr_code_image}" alt="QR Code Pix" class="w-48 h-48 border rounded-lg mt-2">
                        </div>
                        ` : ''}
                        <div>
                            <p class="font-semibold text-gray-700">Dados Bancários:</p>
                            <p class="text-gray-600 whitespace-pre-wrap">${data.bank_details || 'Não informado'}</p>
                        </div>
                        <p class="text-sm text-gray-500 mt-4">Última atualização por: ${data.last_updated_by_name || 'N/A'} em ${new Date(data.last_updated_at).toLocaleString('pt-BR')}</p>
                    </div>
                `;
                doacoesInfoDiv.classList.remove('hidden');
            }

            if (currentUser.role === 'admin_geral') {
                if(editDoacoesBtn) editDoacoesBtn.classList.remove('hidden');
                formFields.pixKey.value = data.pix_key || '';
                formFields.qrCodeLink.value = data.pix_qr_code_image || '';
                formFields.bankDetails.value = data.bank_details || '';
                if(saveDoacoesBtn) saveDoacoesBtn.textContent = 'Salvar Alterações';
            } else {
                if(editDoacoesBtn) editDoacoesBtn.classList.add('hidden');
            }
        } catch (err) {
            console.error("Erro inesperado ao buscar e renderizar informações de doação:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar as informações de doação. Tente novamente.");
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
                id: '00000000-0000-0000-0000-000000000001',
                pix_key: formFields.pixKey.value,
                pix_qr_code_image: formFields.qrCodeLink.value,
                bank_details: formFields.bankDetails.value,
                last_updated_by: currentUser.id,
                last_updated_by_name: currentUser.display_name || currentUser.email,
                last_updated_at: new Date().toISOString()
            };

            try {
                const { data, error } = await supabaseClient.from('donation_info').upsert(updates, { onConflict: 'id' });

                if (error) {
                    console.error("Erro ao salvar informações de doação:", error.message);
                    showCustomAlert("Erro ao Salvar", "Não foi possível salvar as informações de doação: " + error.message);
                } else {
                    showCustomAlert("Sucesso!", "Informações de doação atualizadas!", () => {
                        if(doacoesForm) doacoesForm.classList.add('hidden');
                        fetchAndRenderDoacoes();
                    });
                }
            } catch (err) {
                console.error("Erro inesperado ao salvar informações de doação:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao salvar as informações de doação. Tente novamente.");
            }
        });
    }

    supabaseClient.channel('public:donation_info').on('postgres_changes', { event: '*', schema: 'public', table: 'donation_info' }, fetchAndRenderDoacoes).subscribe();
    fetchAndRenderDoacoes();
}

// --- LÓGICA DA PÁGINA DE PEDIDOS DE ORAÇÃO (/pedidos_oracao.html) ---
async function initPedidosOracaoPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const pedidoForm = document.getElementById('pedido-oracao-form');
    const pedidoContent = document.getElementById('pedido-oracao-content');
    const pedidoAnonimo = document.getElementById('pedido-oracao-anonimo');
    const pedidosContainer = document.getElementById('pedidos-oracao-container');

    const fetchAndRenderPedidos = async () => {
        try {
            const { data: pedidos, error } = await supabaseClient.from('prayer_requests')
                .select(`*, profiles(display_name, photo_url)`)
                .order('requested_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar pedidos de oração:', error);
                showCustomAlert("Erro de Pedidos", "Não foi possível carregar os pedidos de oração.");
                return;
            }

            if (pedidosContainer) {
                pedidosContainer.innerHTML = '';
                if (pedidos.length === 0) {
                    pedidosContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum pedido de oração ainda.</p>`;
                } else {
                    pedidos.forEach(pedido => {
                        const pedidoEl = document.createElement('div');
                        pedidoEl.className = 'bg-white p-4 rounded-lg shadow-md mb-4';
                        const authorName = pedido.is_anonymous ? 'Anónimo' : (pedido.profiles?.display_name || 'Utilizador Anónimo');
                        const authorAvatar = pedido.is_anonymous ? 'https://placehold.co/40x40/CCCCCC/FFFFFF?text=?' : (pedido.profiles?.photo_url || `https://placehold.co/40x40/FF7F50/FFFFFF?text=${authorName.charAt(0)}`);
                        const pedidoDate = new Date(pedido.requested_at).toLocaleString('pt-BR');

                        pedidoEl.innerHTML = `
                            <div class="flex items-center mb-4">
                                <img src="${authorAvatar}" alt="Avatar" class="w-10 h-10 rounded-full mr-3">
                                <div>
                                    <p class="font-semibold">${authorName}</p>
                                    <p class="text-xs text-gray-500">${pedidoDate}</p>
                                </div>
                            </div>
                            <p class="text-gray-800 whitespace-pre-wrap">${pedido.content}</p>
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
        } catch (err) {
            console.error("Erro inesperado ao buscar e renderizar pedidos de oração:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar os pedidos de oração. Tente novamente.");
        }
    };

    if (pedidoForm) {
        pedidoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = pedidoContent.value.trim();
            const isAnonymous = pedidoAnonimo.checked;

            if (!content) {
                showCustomAlert("Erro", "O pedido de oração não pode estar vazio.");
                return;
            }

            try {
                const { error } = await supabaseClient.from('prayer_requests').insert({
                    content: content,
                    is_anonymous: isAnonymous,
                    requester_id: currentUser.id,
                    requested_at: new Date().toISOString(),
                });

                if (error) {
                    console.error("Erro ao enviar pedido de oração:", error.message);
                    showCustomAlert("Erro ao Enviar", "Não foi possível enviar o pedido de oração: " + error.message);
                }
                else {
                    pedidoContent.value = '';
                    pedidoAnonimo.checked = false;
                    showCustomAlert("Sucesso!", "O seu pedido de oração foi enviado!");
                    fetchAndRenderPedidos();
                }
            } catch (err) {
                console.error("Erro inesperado ao enviar pedido de oração:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao enviar o pedido de oração. Tente novamente.");
            }
        });
    }

    if (pedidosContainer) {
        pedidosContainer.addEventListener('click', async (e) => {
            const markPrayedBtn = e.target.closest('.mark-prayed-btn');
            const commentPrBtn = e.target.closest('.comment-pr-btn');

            if (markPrayedBtn) {
                const pedidoId = markPrayedBtn.dataset.pedidoId;
                try {
                    const { data: pedido, error } = await supabaseClient.from('prayer_requests').select('prayed_by_users').eq('id', pedidoId).single();
                    if (error) {
                        console.error('Erro ao buscar prayed_by_users:', error);
                        showCustomAlert("Erro", "Não foi possível processar a ação 'Orar'.");
                        return;
                    }

                    let prayedByUsers = pedido.prayed_by_users || [];
                    if (prayedByUsers.includes(currentUser.id)) {
                        prayedByUsers = prayedByUsers.filter(id => id !== currentUser.id);
                    } else {
                        prayedByUsers.push(currentUser.id);
                    }
                    await supabaseClient.from('prayer_requests').update({ prayed_by_users: prayedByUsers }).eq('id', pedidoId);
                    showCustomAlert("Sucesso!", "Ação 'Orar' registada!");
                    fetchAndRenderPedidos();
                } catch (err) {
                    console.error("Erro inesperado ao marcar como orou:", err);
                    showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao marcar como 'orou'. Tente novamente.");
                }
            } else if (commentPrBtn) {
                const pedidoId = commentPrBtn.dataset.pedidoId;
                showCustomAlert("Comentar Pedido", "Funcionalidade de comentários para pedidos de oração será implementada em breve para o pedido " + pedidoId);
            }
        });
    }

    supabaseClient.channel('public:prayer_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_requests' }, fetchAndRenderPedidos).subscribe();
    fetchAndRenderPedidos();
}

// --- LÓGICA DA PÁGINA DE SALAS DE ESTUDO VIRTUAIS (/salas_estudo.html) ---
async function initSalasEstudoPage() {
    if (!supabaseClient) {
        showCustomAlert("Erro de Inicialização", "O serviço não está pronto. Redirecionando para o login.", () => {
            window.location.href = '/login.html';
        });
        return;
    }
    await checkAuthAndGetProfile();
    if (!currentUser) return;

    const salasContainer = document.getElementById('salas-estudo-container');
    const salaModal = document.getElementById('sala-modal');
    const salaForm = document.getElementById('sala-form');
    const modalTitle = document.getElementById('sala-modal-title');
    const createSalaBtn = document.getElementById('create-sala-btn');
    const cancelSalaBtn = document.getElementById('cancel-sala-btn');

    const fetchAndRenderSalas = async () => {
        try {
            const { data: salas, error } = await supabaseClient.from('virtual_study_rooms').select(`*, creator:profiles(display_name)`).order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar salas de estudo:', error);
                showCustomAlert("Erro de Salas de Estudo", "Não foi possível carregar as salas de estudo.");
                return;
            }

            if (salasContainer) {
                salasContainer.innerHTML = '';
                if (salas.length === 0) {
                    salasContainer.innerHTML = `<p class="text-center text-gray-500">Nenhuma sala de estudo virtual criada ainda.</p>`;
                } else {
                    salas.forEach(sala => {
                        const card = document.createElement('div');
                        card.className = 'bg-white p-6 rounded-lg shadow-md flex flex-col relative';
                        const isCreatorOrAdmin = currentUser && (sala.created_by === currentUser.id || currentUser.role === 'admin' || currentUser.role === 'admin_geral');

                        const authorControls = isCreatorOrAdmin ? `
                            <div class="absolute top-2 right-2 flex space-x-1">
                                <button class="edit-sala-btn p-2 rounded-full hover:bg-gray-100" data-id="${sala.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                                <button class="delete-sala-btn p-2 rounded-full hover:bg-gray-100" data-id="${sala.id}"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>` : '';

                        card.innerHTML = `${authorControls}
                            <div class="flex-1">
                                <h3 class="text-xl font-bold text-gray-800 mb-2 pr-16">${sala.name}</h3>
                                <p class="text-orange-600 font-semibold">Criado por: ${sala.creator?.display_name || 'Admin'}</p>
                                <p class="text-gray-500 mt-1">Data de Criação: ${new Date(sala.created_at).toLocaleDateString('pt-BR')}</p>
                                ${sala.related_study_id ? `<p class="text-gray-600 mt-2">Estudo de Referência: <span class="font-semibold">${sala.related_study_id}</span></p>` : ''}
                                ${sala.meet_link ? `<a href="${sala.meet_link}" target="_blank" class="block text-center bg-blue-600 text-white px-4 py-2 rounded-lg mt-4 hover:bg-blue-700">Entrar na Sala (Google Meet)</a>` : ''}
                                ${sala.recording_link ? `<a href="${sala.recording_link}" target="_blank" class="block text-center bg-gray-600 text-white px-4 py-2 rounded-lg mt-2 hover:bg-gray-700">Ver Gravação</a>` : ''}
                            </div>`;
                        if(salasContainer) salasContainer.appendChild(card);
                    });
                }
            }
        } catch (err) {
            console.error("Erro inesperado ao buscar e renderizar salas de estudo:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar as salas de estudo. Tente novamente.");
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
            name: document.getElementById('sala-nome').value,
            related_study_id: document.getElementById('sala-estudo-referencia').value || null,
            meet_link: document.getElementById('sala-link-meet').value,
            recording_link: document.getElementById('sala-link-gravacao').value,
            created_by: currentUser.id,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = salaId
                ? await supabaseClient.from('virtual_study_rooms').update(salaData).eq('id', salaId)
                : await supabaseClient.from('virtual_study_rooms').insert(salaData);

            if (error) {
                console.error("Erro ao salvar sala:", error.message);
                showCustomAlert("Erro ao Salvar", "Não foi possível salvar a sala: " + error.message);
            } else {
                showCustomAlert("Sucesso!", "Sala salva com sucesso!");
                if(salaModal) salaModal.classList.add('hidden');
                fetchAndRenderSalas();
            }
        } catch (err) {
            console.error("Erro inesperado ao salvar sala:", err);
            showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao salvar a sala. Tente novamente.");
        }
    });

    if(salasContainer) salasContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-sala-btn');
        const deleteBtn = e.target.closest('.delete-sala-btn');

        if (editBtn) {
            try {
                const { data } = await supabaseClient.from('virtual_study_rooms').select('*').eq('id', editBtn.dataset.id).single();
                if (data) {
                    document.getElementById('sala-id').value = data.id;
                    document.getElementById('sala-nome').value = data.name;
                    document.getElementById('sala-estudo-referencia').value = data.related_study_id || '';
                    document.getElementById('sala-link-meet').value = data.meet_link || '';
                    document.getElementById('sala-link-gravacao').value = data.recording_link || '';

                    if(modalTitle) modalTitle.textContent = "Editar Sala de Estudo";
                    if(salaModal) salaModal.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Erro inesperado ao editar sala:", err);
                showCustomAlert("Erro Inesperado", "Ocorreu um erro inesperado ao carregar dados da sala para edição.");
            }
        } else if (deleteBtn) {
            showCustomConfirm("Confirmar Exclusão", "Deseja realmente excluir esta sala de estudo?", async () => {
                try {
                    await supabaseClient.from('virtual_study_rooms').delete().eq('id', deleteBtn.dataset.id);
                    fetchAndRenderSalas();
                    showCustomAlert("Sucesso!", "Sala excluída com sucesso!");
                } catch (err) {
                    console.error("Erro ao excluir sala:", err.message);
                    showCustomAlert("Erro ao Excluir", "Não foi possível excluir a sala: " + err.message);
                }
            });
        }
    });

    supabaseClient.channel('public:virtual_study_rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'virtual_study_rooms' }, fetchAndRenderSalas).subscribe();
    fetchAndRenderSalas();
}


//-------------------------------------------------------------------
// 3. ROTEADOR PRINCIPAL DA APLICAÇÃO
//-------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.endsWith('/login.html')) { initLoginPage(); }
    else if (path.endsWith('/dashboard.html')) { initDashboardPage(); }
    else if (path.endsWith('/profile.html')) { initProfilePage(); }
    else if (path.endsWith('/eventos.html')) { initEventsPage(); }
    else if (path.endsWith('/admin.html')) { initAdminPage(); }
    else if (path.endsWith('/estudos.html')) { initEstudosPage(); }
    else if (path.endsWith('/estudo_detalhe.html')) { initEstudoDetalhePage(); }
    else if (path.endsWith('/lives.html')) { initLivesPage(); }
    else if (path.endsWith('/chat.html')) { initChatPage(); }
    else if (path.endsWith('/doacoes.html')) { initDoacoesPage(); }
    else if (path.endsWith('/pedidos_oracao.html')) { initPedidosOracaoPage(); }
    else if (path.endsWith('/salas_estudo.html')) { initSalasEstudoPage(); }
});
