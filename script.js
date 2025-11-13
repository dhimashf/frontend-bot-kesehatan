document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen UI ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const identityForm = document.getElementById('identity-form');
    const logoutButton = document.getElementById('logout-button');
    const userInitial = document.getElementById('user-initial');
    const userUsername = document.getElementById('user-username');
    const startWho5Button = document.getElementById('start-who5');
    const chatOutput = document.getElementById('chat-output');
    const initialScreen = document.getElementById('initial-screen');
    const quizFooter = document.getElementById('quiz-footer');
    const statusMessage = document.getElementById('status-message');
    const resetButton = document.getElementById('reset-button');
    const menuButton = document.getElementById('menu-button');
    const sidebar = document.getElementById('sidebar');

    // --- State Aplikasi ---
    let questionnaireState = {
        current: null, // 'who5', 'gad7', 'mbi', 'naqr', 'k10'
        scores: {},
        currentQuestionIndex: 0
    };

    // Mengatur base URL API untuk selalu menggunakan path relatif.
    // Web server (Nginx/Vercel) akan bertanggung jawab untuk meneruskan (proxy) permintaan ini ke backend yang benar.
    const API_BASE_URL = '/api/v1';
    const token = localStorage.getItem('token');

    // Token check for protected pages
    const path = window.location.pathname;
    const isAuthPage = path === '/login' || path === '/register';

    // Tangani callback Google Auth SEBELUM melakukan pengecekan token lainnya.
    // Fungsi ini akan me-reload halaman jika menemukan token di URL.
    const handled = handleGoogleAuthCallback();

    // --- LOGIKA ROUTING & GUARD ---
    // Kita menggunakan pendekatan show/hide pada container halaman agar
    // tidak terjadi masalah history/redirect yang tidak diinginkan.

    // Asumsikan container berikut ada di HTML. Jika tidak ada, code akan
    // tetap aman karena kita menggunakan optional chaining (?.).
    const pageHome = document.getElementById('initial-screen');
    const pageLogin = document.getElementById('login-page');
    const pageRegister = document.getElementById('register-page');
    const pageProfile = document.getElementById('profile-page');
    const pageIdentityForm = document.getElementById('identity-form-page');
    const pageAdmin = document.getElementById('admin-page');

    // Sembunyikan semua halaman terlebih dahulu (aman jika elemen tidak ada)
    [pageHome, pageLogin, pageRegister, pageProfile, pageIdentityForm, pageAdmin].forEach(p => p?.classList.add('hidden'));

    if (isAuthPage) {
        // Halaman Login / Register
        if (token) {
            // Jika sudah login, jangan biarkan pengguna tetap di halaman auth.
            // Gunakan replace supaya tidak menyimpan history ke login.
            window.location.replace('/');
        } else {
            // Tampilkan container sesuai path (jika ada)
            if (path === '/login') pageLogin?.classList.remove('hidden');
            else if (path === '/register') pageRegister?.classList.remove('hidden');
        }
    } else if (!handled) {
        // Halaman yang dilindungi (bukan login/register)
        if (!token) {
            // Paksa ke login tanpa menyimpan history
            window.location.replace('/login');
        } else {
            // Tampilkan halaman sesuai path dan jalankan logika spesifik
            if (path === '/') {
                pageHome?.classList.remove('hidden');
                fetchUserProfile();
                checkProfileStatus();
            } else if (path === '/profile') {
                pageProfile?.classList.remove('hidden');
                renderProfilePage();
            } else if (path === '/identity_form') {
                pageIdentityForm?.classList.remove('hidden');
                fetchUserProfile();
            } else if (path === '/admin') {
                pageAdmin?.classList.remove('hidden');
                fetchUserProfile();
            } else {
                // Fallback: jika path tidak dikenali, tampilkan beranda
                pageHome?.classList.remove('hidden');
                fetchUserProfile();
                checkProfileStatus();
            }
        }
    }

    // --- Logika untuk Sidebar Responsif ---
    if (menuButton && sidebar) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });

        // Menutup sidebar jika mengklik di luar area sidebar (opsional)
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuButton.contains(e.target)) {
                sidebar.classList.add('-translate-x-full');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            const errorMessage = document.getElementById('error-message');

            const formData = new URLSearchParams();
            formData.append('username', email); // Backend (OAuth2) expects 'username' field for the email
            formData.append('password', password);

            try {
                const response = await fetch(`${API_BASE_URL}/web-auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('token', data.access_token);

                    // Setelah login, periksa apakah pengguna adalah admin
                    const userProfileResponse = await fetch(`${API_BASE_URL}/users/me`, {
                        headers: { 'Authorization': `Bearer ${data.access_token}` }
                    });

                    if (userProfileResponse.ok) {
    const user = await userProfileResponse.json();
    if (user.role === 'admin') {
        window.location.href = '/admin';
    } else {
        try {
            const profileStatusResponse = await fetch(`${API_BASE_URL}/users/profile/status`, { 
                headers: { 'Authorization': `Bearer ${data.access_token}` } 
            });

                if (profileStatusResponse.ok) {
                    const profileStatus = await profileStatusResponse.json();
                    
                    // Beberapa opsi pengecekan yang mungkin:
                    
                    // Opsi 1: Cek hanya biodata_completed
                    if (profileStatus.biodata_completed) {
                        window.location.href = '/';
                        return;
                    }
                    
                    // Opsi 2: Cek dengan logika yang lebih ketat
                    if (profileStatus.biodata_completed === true) {
                        window.location.href = '/';
                        return;
                    }
                    
                    // Opsi 3: Debug lebih detail
                    console.log('Biodata completed:', profileStatus.biodata_completed);
                    console.log('Health results completed:', profileStatus.health_results_completed);
                    
                    // Jika tidak memenuhi kondisi di atas, arahkan ke identity form
                    window.location.href = '/identity_form';
                    
                } else {
                    console.error('Failed to fetch profile status:', profileStatusResponse.status);
                    window.location.href = '/identity_form';
                }
            } catch (error) {
                console.error('Error checking profile status:', error);
                window.location.href = '/identity_form';
            }
        }
    } else {
        window.location.href = '/';
    }
                } else {
                    let errorMsg = 'Login failed. Please check your credentials.';
                    try {
                        // Check content-type before parsing. If it's not JSON, don't parse.
                        const contentType = response.headers.get("content-type");
                        if (contentType && contentType.indexOf("application/json") !== -1) {
                            const errorData = await response.json();
                            errorMsg = errorData.detail || errorMsg;
                        } else {
                            // If not JSON, use the status text from the server, which can be more descriptive.
                            errorMsg = response.statusText || errorMsg;
                        }
                    } catch (e) {
                        console.error("Error processing the login failure response:", e);
                    }
                    errorMessage.textContent = errorMsg;
                    errorMessage.classList.remove('hidden');
                }
            } catch (error) {
                errorMessage.textContent = 'An unexpected network error occurred. Please try again.';
                errorMessage.classList.remove('hidden');
            }
        });
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            // Arahkan pengguna ke endpoint login Google di backend
            window.location.href = `${API_BASE_URL}/auth/google/login`;
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = registerForm.email.value;
            const password = registerForm.password.value;
            const errorMessage = document.getElementById('error-message');

            try {
                const response = await fetch(`${API_BASE_URL}/web-auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    // Backend untuk register mengharapkan JSON
                    body: JSON.stringify({ email: email, password: password }),
                });

                if (response.ok) {
                    alert('Registrasi berhasil! Silakan masuk dengan akun Anda.');
                    window.location.href = '/login';
                } else {
                    const error = await response.json();
                    // Handle potential array of errors from validation
                    const errorDetail = Array.isArray(error.detail) ? error.detail.map(d => d.msg).join(', ') : error.detail;
                    errorMessage.textContent = errorDetail || 'Registrasi gagal. Silakan coba lagi.';
                    errorMessage.classList.remove('hidden');
                }
            } catch (error) {
                errorMessage.textContent = 'An unexpected error occurred.';
                errorMessage.classList.remove('hidden');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login';
        });
    }

    if (identityForm) {
        identityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMessage = document.getElementById('error-message');
            const formData = new FormData(identityForm);
            const data = Object.fromEntries(formData.entries());

            // --- Client-side validation for phone number (no letters, valid local format)
            if (data.no_wa) {
                // Normalize by removing spaces and dashes
                const normalized = String(data.no_wa).replace(/[^+0-9]/g, '');
                data.no_wa = normalized;
                const phoneRe = /^(\+62|0)\d{8,13}$/;
                if (!phoneRe.test(data.no_wa)) {
                    errorMessage.textContent = 'Nomor telepon tidak valid. Gunakan angka, mulai dengan 0 atau +62. Contoh: 08123456789 atau +628123456789';
                    errorMessage.classList.remove('hidden');
                    return;
                }
            }

            // Pre-process data: convert empty strings to null for optional fields
            // and ensure integer fields are parsed correctly.
            for (const key in data) {
                if (data[key] === '') {
                    data[key] = null; // Convert empty strings to null for Pydantic Optional fields
                }
                // Convert specific fields to integer if they are not null
                if (['usia', 'jumlah_anak', 'lama_bekerja'].includes(key) && data[key] !== null) {
                    data[key] = parseInt(data[key], 10);
                }
            }
            // Handle 'Lainnya' fields
            if (data.status_pegawai === 'Lainnya') data.status_pegawai = data.status_pegawai_other;
            if (data.jabatan === 'Lainnya') data.jabatan = data.jabatan_other;
            // Hapus field _other yang tidak perlu
            delete data.status_pegawai_other;
            delete data.jabatan_other;
            try {
                const response = await fetch(`${API_BASE_URL}/users/profile`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    // Redirect ke halaman utama untuk memulai kuesioner
                    window.location.href = '/';
                } else {
                    const error = await response.json();
                    errorMessage.textContent = error.detail || 'Gagal menyimpan data.';
                    errorMessage.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error submitting identity form:', error);
                errorMessage.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
                errorMessage.classList.remove('hidden');
            }
        });

        // --- Logic for 'Lainnya' (Other) fields ---
        function toggleOther(selectElement, otherInputId) {
            const otherInput = document.getElementById(otherInputId);
            if (!otherInput) return;

            if (selectElement.value === 'Lainnya') {
                otherInput.style.display = 'block';
                otherInput.required = true;
            } else {
                otherInput.style.display = 'none';
                otherInput.required = false;
                otherInput.value = '';
            }
        }
        document.getElementById('status_pegawai')?.addEventListener('change', (e) => {
            toggleOther(e.target, 'status_pegawai_other');
        });
        document.getElementById('jabatan')?.addEventListener('change', (e) => {
            toggleOther(e.target, 'jabatan_other');
        });

        // --- Logic for disabling pregnancy status based on gender ---
        const genderRadios = document.querySelectorAll('input[name="jenis_kelamin"]');


        function handleGenderChange() {
            // Logika yang menonaktifkan status kehamilan untuk laki-laki telah dihapus
            // untuk memungkinkan pemilihan manual dan mencegah potensi error.
            // Anda sekarang dapat memilih "Ya" atau "Tidak" untuk semua gender.
        }

        // Tambahkan listener ke setiap radio button jenis kelamin
        genderRadios.forEach(radio => {
            radio.addEventListener('change', handleGenderChange);
        });

        // Jalankan fungsi sekali saat halaman dimuat untuk menangani state awal
        handleGenderChange();
    }

    // --- Fungsi untuk menangani callback dari Google Auth ---
    function handleGoogleAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const googleToken = urlParams.get('token');

        if (googleToken) {
            // 1. Simpan token ke localStorage
            localStorage.setItem('token', googleToken);
    
            // 2. Hapus token dari URL dan muat ulang halaman.
            // Backend sudah mengarahkan kita ke halaman yang benar (/ atau /identity_form).
            // Tugas frontend hanya menyimpan token dan membersihkan URL.
            // Reload memastikan semua skrip berjalan dengan state login yang benar.
            window.location.replace(window.location.pathname);
            
            return true; // Menandakan bahwa callback sedang ditangani
        }
        return false; // Tidak ada token di URL, lanjutkan eksekusi normal
    }

    // --- Fungsi untuk Halaman Utama (index.html) ---

    async function fetchUserProfile() {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const user = await response.json();

                // Jika user adalah admin dan tidak sedang di halaman admin, alihkan ke /admin.
                if (user.role === 'admin' && path !== '/admin') {
                    window.location.href = '/admin';
                    return; // Hentikan eksekusi lebih lanjut untuk menghindari error
                }

                const initial = user.email.charAt(0).toUpperCase();
                // Isi elemen di dalam dan di bawah lingkaran dengan inisial
                if (userInitial) userInitial.textContent = initial;
                if (userUsername) userUsername.textContent = user.role === 'admin' ? 'Admin' : initial;
                // Jika di form identitas, isi field email dan buat read-only
                const emailInput = document.getElementById('email');
                if (emailInput && path === '/identity_form') {
                    emailInput.value = user.email;
                    emailInput.readOnly = true;
                    emailInput.classList.add('bg-slate-100');
                }

                // Jika di halaman admin, jalankan logika admin
                if (path === '/admin') {
                    renderAdminPage(user.role === 'admin');
                }
            } else if (response.status === 401) {
                // Token tidak valid, logout
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    }

    async function checkProfileStatus() {
        if (!token) return;
        // Fungsi ini sekarang hanya untuk pengguna biasa, karena admin sudah dialihkan oleh fetchUserProfile()
        try {
            const response = await fetch(`${API_BASE_URL}/users/profile/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch profile status');
            }
            const status = await response.json();

            if (!status.biodata_completed) {
                window.location.href = '/identity_form';
            } else {
                // Tampilkan layar untuk memulai kuesioner
                // Ini akan selalu ditampilkan jika identitas sudah lengkap,
                // memungkinkan pengguna untuk mengisi ulang.
                initialScreen.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error checking profile status:', error);
            // Jika ada error, mungkin token tidak valid
            // localStorage.removeItem('token'); // Consider re-enabling this for stricter security
            // window.location.href = '/login';
        }
    }

    // --- Fungsi untuk Halaman Admin ---
    async function renderAdminPage(isAdmin) {
        const adminNav = document.getElementById('admin-nav');
        const userNav = document.getElementById('user-nav');
        const adminOnlyMessage = document.getElementById('admin-only-message');
        const contentArea = document.getElementById('admin-content-area');

        if (!isAdmin) {
            // Jika bukan admin, sembunyikan navigasi admin dan tampilkan pesan
            if(adminNav) adminNav.classList.add('hidden');
            if(userNav) userNav.classList.remove('hidden'); // Tampilkan nav user biasa
            if(adminOnlyMessage) adminOnlyMessage.classList.remove('hidden');
            contentArea.innerHTML = `<div class="state-card"><p class="text-red-600">Anda tidak memiliki hak akses untuk melihat halaman ini.</p></div>`;
            return;
        }

        // Tampilkan navigasi admin jika belum terlihat
        if(adminNav) adminNav.classList.remove('hidden');
        if(userNav) userNav.classList.add('hidden');

        const navLinks = {
            users: document.getElementById('nav-users'),
        };

        const titles = {
            users: { title: 'Manajemen Pengguna', sub: 'Lihat dan kelola semua pengguna terdaftar.' },
        };

        const adminTitle = document.getElementById('admin-title');
        const adminSubtitle = document.getElementById('admin-subtitle');

        // Fungsi untuk memuat konten berdasarkan hash
        const loadContent = async () => {
            const hash = window.location.hash.substring(1) || 'users';
            
            // Update UI (judul dan link aktif)
            Object.values(navLinks).forEach(link => link?.classList.remove('active'));
            if (navLinks[hash]) navLinks[hash].classList.add('active');
            if (titles[hash]) {
                adminTitle.textContent = titles[hash].title;
                adminSubtitle.textContent = titles[hash].sub;
            }

            // Tampilkan loading
            contentArea.innerHTML = document.getElementById('loading-template').innerHTML;

            try {
                let endpoint = '';
                if (hash !== 'users') {
                    contentArea.innerHTML = `<div class="state-card"><p>Konten tidak ditemukan. Mengarahkan ke Manajemen Pengguna...</p></div>`;
                    window.location.hash = 'users'; // Default ke #users jika hash tidak valid
                    return;
                }

                // Gunakan endpoint baru yang kaya data sesuai instruksi dari backend.
                const response = await fetch(`${API_BASE_URL}/users/admin/all-results-with-biodata`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error(`Gagal memuat data dari ${endpoint}`);

                const data = await response.json();
                
                if (!data || data.length === 0) {
                    contentArea.innerHTML = document.getElementById('empty-template').innerHTML;
                    contentArea.querySelector('.state-card').classList.remove('hidden');
                    return;
                }

                // Render data
                let contentHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';
                if (hash === 'users') {
                    // Urutkan data berdasarkan ID pengguna secara menurun (terbaru di atas)
                    data.sort((a, b) => {
                        const idA = a.health_results?.[0]?.user_id || a.biodata?.user_id || 0;
                        const idB = b.health_results?.[0]?.user_id || b.biodata?.user_id || 0;
                        return idB - idA;
                    });

                    data.forEach(user => {
                        // Tentukan status berdasarkan keberadaan data, bukan flag boolean.
                        // Profil dianggap ada jika objek biodata dan email ada.
                        const hasProfile = !!user.biodata && !!user.biodata.email;
                        // Hasil dianggap ada jika array health_results tidak kosong.
                        const hasResults = Array.isArray(user.health_results) && user.health_results.length > 0;

                        let statusColor, statusTooltip;
                        
                        if (hasProfile && hasResults) {
                            statusColor = 'bg-green-500'; // Hijau: Profil & Riwayat lengkap
                            statusTooltip = 'Profil dan Riwayat Lengkap';
                        } else if (hasProfile && !hasResults) {
                            statusColor = 'bg-yellow-500'; // Kuning: Profil lengkap, riwayat kosong
                            statusTooltip = 'Profil Lengkap, Riwayat Kosong';
                        } else {
                            statusColor = 'bg-red-500'; // Merah: Profil belum lengkap atau tidak ada
                            statusTooltip = 'Profil dan Riwayat Kosong';
                        }

                        // Ambil data dari sumber yang benar dengan fallback yang aman.
                        const email = user.biodata?.email || 'Email tidak tersedia';
                        const userId = user.health_results?.[0]?.user_id || user.biodata?.user_id || 'N/A';
                        // Role tidak ada di JSON, jadi kita set default 'user' jika ada biodata.
                        const role = hasProfile ? 'user' : 'N/A';
                        const initial = email.charAt(0).toUpperCase();
                        
                        // Pastikan kartu HTML dibuat untuk SETIAP pengguna.
                        contentHtml += `
                            <button data-user-id="${userId}" class="user-card-btn text-left block bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-t-4 border-emerald-400 hover-lift relative">
                                <div title="${statusTooltip}" class="absolute top-4 right-4 w-3 h-3 ${statusColor} rounded-full border-2 border-white shadow-sm"></div>
                                <div class="flex items-center space-x-4">
                                    <div class="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl font-bold">${initial}</div>
                                    <div class="min-w-0">
                                        <p class="text-base font-bold text-slate-800 truncate" title="${email}">${email}</p>
                                        <p class="text-sm text-slate-500">ID: ${userId}</p>
                                        <p class="text-xs text-slate-400 mt-1">Peran: <span class="font-semibold">${role}</span></p>
                                    </div>
                                </div>
                            </button>`;
                    });
                }
                // TODO: Tambahkan rendering untuk 'profiles' dan 'results' di sini
                contentHtml += '</div>';
                contentArea.innerHTML = contentHtml;

                // Tambahkan event listener ke semua tombol kartu pengguna
                document.querySelectorAll('.user-card-btn').forEach(button => {
                    button.addEventListener('click', () => handleUserCardClick(button.dataset.userId));
                });

                // Tambahkan event listener untuk fitur pencarian
                const searchInput = document.getElementById('search-user-input');
                if (searchInput) {
                    searchInput.addEventListener('input', () => {
                        const searchTerm = searchInput.value.toLowerCase();
                        const userCards = document.querySelectorAll('.user-card-btn');
                        let visibleCount = 0;

                        userCards.forEach(card => {
                            const userEmail = card.querySelector('p[title]').textContent.toLowerCase();
                            if (userEmail.includes(searchTerm)) {
                                card.style.display = 'block';
                                visibleCount++;
                            } else {
                                card.style.display = 'none';
                            }
                        });

                        // Tampilkan pesan jika tidak ada hasil pencarian
                        let emptySearchMessage = document.getElementById('empty-search-message');
                        if (!emptySearchMessage) {
                            emptySearchMessage = document.createElement('div');
                            emptySearchMessage.id = 'empty-search-message';
                            emptySearchMessage.className = 'state-card hidden';
                            contentArea.appendChild(emptySearchMessage);
                        }
                        emptySearchMessage.innerHTML = `<p class="text-slate-600">Tidak ada pengguna yang cocok dengan pencarian "${searchInput.value}".</p>`;
                        emptySearchMessage.classList.toggle('hidden', visibleCount > 0);
                    });
                }

            } catch (error) {
                console.error('Error loading admin content:', error);
                contentArea.innerHTML = `<div class="state-card"><p class="text-red-600">Gagal memuat data. Silakan coba lagi.</p></div>`;
            }
        };

        // Event listener untuk perubahan hash dan pemuatan awal
        window.addEventListener('hashchange', loadContent);
        loadContent(); // Muat konten saat halaman pertama kali dibuka

        // Event listener untuk tombol unduh semua hasil
        const downloadAllBtn = document.getElementById('download-all-csv-btn');
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', downloadAllResultsAsCSV);
        }
    }

    // --- Fungsi untuk Modal Detail Pengguna di Halaman Admin ---
    async function handleUserCardClick(userId) {
        const modal = document.getElementById('user-detail-modal');
        const modalContentArea = document.getElementById('modal-content-area');
        const modalUserEmail = document.getElementById('modal-user-email');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const downloadCsvBtn = document.getElementById('download-csv-btn');

        // Tampilkan modal dan status loading
        modal.classList.remove('hidden');
        modalUserEmail.textContent = `ID Pengguna: ${userId}`;
        modalContentArea.innerHTML = `<div class="text-center p-8"><p class="text-slate-600">Memuat detail pengguna...</p></div>`;

        // Fungsi untuk menutup modal
        const closeModal = () => {
            modal.classList.add('hidden');
            downloadCsvBtn.classList.add('hidden'); // Sembunyikan tombol saat modal ditutup
        };
        closeModalBtn.onclick = closeModal;
        modal.onclick = (event) => {
            if (event.target === modal) {
                closeModal();
            }
        };

        try {
            // Panggil kedua endpoint secara bersamaan menggunakan Promise.all
            // Ensure userId is safely encoded to avoid malformed URLs (e.g. "20:1")
            const safeUserId = encodeURIComponent(String(userId));
            const [profileResponse, resultsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/users/admin/profile/${safeUserId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/users/admin/health-results/${safeUserId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            // Periksa apakah kedua panggilan berhasil
            if (!profileResponse.ok) {
                const text = await profileResponse.text().catch(() => profileResponse.statusText);
                throw new Error(`Gagal memuat profil: ${profileResponse.status} ${text}`);
            }
            if (!resultsResponse.ok) {
                const text = await resultsResponse.text().catch(() => resultsResponse.statusText);
                throw new Error(`Gagal memuat riwayat: ${resultsResponse.status} ${text}`);
            }

            const profileData = await profileResponse.json();
            const healthResults = await resultsResponse.json();

            // Gabungkan data untuk diteruskan ke fungsi render
            const combinedData = {
                ...profileData, // Ini akan menyertakan biodata dan biodata_completed
                health_results: healthResults,
                health_results_completed: healthResults && healthResults.length > 0
            };
            modalUserEmail.textContent = combinedData.biodata?.email || `ID Pengguna: ${userId}`;

            // Render konten ke dalam modal
            renderUserDetailModal(combinedData);
            
            // Tampilkan tombol unduh jika ada riwayat hasil
            if (combinedData.health_results_completed) {
                downloadCsvBtn.classList.remove('hidden');
                // Hapus listener lama untuk menghindari duplikasi
                downloadCsvBtn.replaceWith(downloadCsvBtn.cloneNode(true));
                document.getElementById('download-csv-btn').addEventListener('click', () => {
                    downloadResultsAsCSV(combinedData);
                });
            }

        } catch (error) {
            console.error('Error fetching user detail:', error);
            modalContentArea.innerHTML = `<div class="text-center p-8"><p class="text-red-600">Gagal memuat detail pengguna. Silakan coba lagi.</p></div>`;
        }
    }

    // --- Fungsi untuk Mengunduh SEMUA Hasil sebagai CSV ---
    async function downloadAllResultsAsCSV() {
        const downloadBtn = document.getElementById('download-all-csv-btn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `<div class="spinner !w-5 !h-5 !border-t-white"></div><span>Memproses...</span>`;

        try {
            // Panggil endpoint baru yang efisien untuk mendapatkan semua data sekaligus
            const response = await fetch(`${API_BASE_URL}/users/admin/all-results-with-biodata`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Gagal mengambil data: ${response.statusText}`);
            }

            const allResultsData = await response.json();

            if (!allResultsData || allResultsData.length === 0) {
                alert('Tidak ada data hasil kuesioner dari pengguna manapun untuk diunduh.');
                return;
            }

            // Header untuk CSV (sama seperti unduhan per pengguna)
            const headers = [
                'User ID', 'Email', 'Inisial', 'Usia', 'Jenis Kelamin', 'Pendidikan', 'Lama Bekerja (Tahun)', 'Status Pegawai', 'Jabatan', 'Unit/Ruangan', 'Status Perkawinan', 'Status Kehamilan', 'Jumlah Anak',
                'ID Hasil', 'Tanggal Pengisian',
                'WHO-5 Skor', 'WHO-5 Kategori', 'GAD-7 Skor', 'GAD-7 Kategori', 'K10 Skor', 'K10 Kategori',
                'MBI Kelelahan Emosional Skor', 'MBI Kelelahan Emosional Kategori', 'MBI Sikap Sinis Skor', 'MBI Sikap Sinis Kategori', 'MBI Pencapaian Pribadi Skor', 'MBI Pencapaian Pribadi Kategori', 'MBI Total Skor', 'MBI Total Kategori',
                'NAQ-R Perundungan Pribadi Skor', 'NAQ-R Perundungan Pekerjaan Skor', 'NAQ-R Intimidasi Skor', 'NAQ-R Total Skor', 'NAQ-R Kategori'
            ];

            let csvContent = headers.join(',') + '\r\n';
            const sanitize = (value) => (value === null || value === undefined) ? '' : (String(value).includes(',') ? `"${value}"` : String(value));

            // Perbaikan: Loop melalui setiap PENGGUNA dalam data yang diterima
            allResultsData.forEach(user => {
                const biodata = user.biodata || {};

                // Periksa apakah pengguna ini memiliki riwayat hasil (health_results adalah array)
                if (user.health_results && user.health_results.length > 0) {
                    // Loop kedua: Iterasi melalui setiap HASIL KUESIONER dari pengguna ini
                    user.health_results.forEach(result => {
                        const d = new Date(result.created_at);
                        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                        const mbiTotalScore = result.mbi_emosional_total + result.mbi_sinis_total + result.mbi_pencapaian_total;
                        const naqrTotalScore = result.naqr_pribadi_total + result.naqr_pekerjaan_total + result.naqr_intimidasi_total;

                        const row = [
                            biodata.user_id, biodata.email, biodata.inisial, biodata.usia, biodata.jenis_kelamin, biodata.pendidikan, biodata.lama_bekerja, biodata.status_pegawai, biodata.jabatan_lain || biodata.jabatan, biodata.unit_ruangan, biodata.status_perkawinan, biodata.status_kehamilan, biodata.jumlah_anak,
                            result.id, date,
                            result.who5_total, getWho5Category(result.who5_total), result.gad7_total, getGad7Category(result.gad7_total), result.k10_total, getK10Category(result.k10_total),
                            result.mbi_emosional_total, getMbiSubscaleCategory(result.mbi_emosional_total, 'emosional'), result.mbi_sinis_total, getMbiSubscaleCategory(result.mbi_sinis_total, 'sinis'), result.mbi_pencapaian_total, getMbiSubscaleCategory(result.mbi_pencapaian_total, 'pencapaian'), mbiTotalScore, getMbiTotalCategory(mbiTotalScore),
                            result.naqr_pribadi_total, result.naqr_pekerjaan_total, result.naqr_intimidasi_total, naqrTotalScore, getNaqrCategory(naqrTotalScore)
                        ].map(sanitize);
                        csvContent += row.join(',') + '\r\n';
                    });
                }
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().slice(0, 10);
            link.setAttribute('href', url); // Pastikan URL di-set sebelum atribut lain
            link.setAttribute('download', `semua_hasil_kuesioner_${timestamp}.csv`); // Nama file unduhan
            document.body.appendChild(link); // Tambahkan link ke body untuk memastikan bisa diklik
            link.click(); // Picu unduhan
            document.body.removeChild(link); // Hapus link setelah selesai
            URL.revokeObjectURL(url); // Bersihkan memori

        } catch (error) {
            console.error('Error downloading all results:', error);
            alert('Gagal mengunduh data. Silakan periksa konsol untuk detailnya.');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
        }
    }

    // --- Fungsi untuk Mengunduh Hasil sebagai CSV ---
    function downloadResultsAsCSV(userData) {
        if (!userData.health_results || userData.health_results.length === 0) {
            alert('Tidak ada data hasil kuesioner untuk diunduh.');
            return;
        }

        const biodata = userData.biodata || {};
        const results = userData.health_results;

        // Header untuk CSV
        const headers = [
            'User ID', 'Email', 'Inisial', 'Usia', 'Jenis Kelamin', 'Pendidikan', 'Lama Bekerja (Tahun)', 'Status Pegawai', 'Jabatan', 'Unit/Ruangan', 'Status Perkawinan', 'Status Kehamilan', 'Jumlah Anak',
            'ID Hasil', 'Tanggal Pengisian',
            'WHO-5 Skor', 'WHO-5 Kategori',
            'GAD-7 Skor', 'GAD-7 Kategori',
            'K10 Skor', 'K10 Kategori',
            'MBI Kelelahan Emosional Skor', 'MBI Kelelahan Emosional Kategori',
            'MBI Sikap Sinis Skor', 'MBI Sikap Sinis Kategori',
            'MBI Pencapaian Pribadi Skor', 'MBI Pencapaian Pribadi Kategori',
            'MBI Total Skor', 'MBI Total Kategori',
            'NAQ-R Perundungan Pribadi Skor', 'NAQ-R Perundungan Pekerjaan Skor', 'NAQ-R Intimidasi Skor',
            'NAQ-R Total Skor', 'NAQ-R Kategori'
        ];

        let csvContent = headers.join(',') + '\r\n';

        // Fungsi untuk membersihkan data untuk CSV (menghindari koma)
        const sanitize = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            // Jika string mengandung koma, bungkus dengan tanda kutip ganda
            if (str.includes(',')) return `"${str}"`;
            return str;
        };

        results.forEach(result => {
            const d = new Date(result.created_at);
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

            const mbiTotalScore = result.mbi_emosional_total + result.mbi_sinis_total + result.mbi_pencapaian_total;
            const naqrTotalScore = result.naqr_pribadi_total + result.naqr_pekerjaan_total + result.naqr_intimidasi_total;

            const row = [
                biodata.user_id, biodata.email, biodata.inisial, biodata.usia, biodata.jenis_kelamin, biodata.pendidikan, biodata.lama_bekerja, biodata.status_pegawai, biodata.jabatan_lain || biodata.jabatan, biodata.unit_ruangan, biodata.status_perkawinan, biodata.status_kehamilan, biodata.jumlah_anak,
                result.id, date,
                result.who5_total, getWho5Category(result.who5_total),
                result.gad7_total, getGad7Category(result.gad7_total),
                result.k10_total, getK10Category(result.k10_total),
                result.mbi_emosional_total, getMbiSubscaleCategory(result.mbi_emosional_total, 'emosional'),
                result.mbi_sinis_total, getMbiSubscaleCategory(result.mbi_sinis_total, 'sinis'),
                result.mbi_pencapaian_total, getMbiSubscaleCategory(result.mbi_pencapaian_total, 'pencapaian'),
                mbiTotalScore, getMbiTotalCategory(mbiTotalScore),
                result.naqr_pribadi_total, result.naqr_pekerjaan_total, result.naqr_intimidasi_total,
                naqrTotalScore, getNaqrCategory(naqrTotalScore)
            ].map(sanitize);

            csvContent += row.join(',') + '\r\n';
        });

        // Membuat dan mengunduh file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const userIdentifier = biodata.email || `user_${biodata.user_id}`;
            const timestamp = new Date().toISOString().slice(0, 10);
            link.setAttribute('href', url);
            link.setAttribute('download', `hasil_kuesioner_${userIdentifier}_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            alert('Browser Anda tidak mendukung fitur unduh otomatis. Silakan coba dengan browser lain.');
        }
    }

    // --- Fungsi Helper untuk Kategori Hasil ---
    function getWho5Category(score) {
        if (score <= 11) return 'Gejala Depresi Berat';
        if (score <= 13) return 'Gejala Depresi Sedang';
        if (score <= 15) return 'Gejala Depresi Ringan';
        return 'Tidak ada gejala Depresi';
    }

    function getGad7Category(score) {
        if (score <= 4) return 'Kecemasan Minimal';
        if (score <= 9) return 'Kecemasan Ringan';
        if (score <= 14) return 'Kecemasan Sedang';
        return 'Kecemasan Berat';
    }

    function getK10Category(score) {
        if (score <= 15) return 'Distres rendah';
        if (score <= 21) return 'Distres sedang';
        if (score <= 29) return 'Distres tinggi';
        return 'Distres sangat tinggi';
    }

    function getMbiSubscaleCategory(score, subscale) {
        switch (subscale) {
            case 'emosional':
                if (score < 14) return 'Rendah';
                if (score <= 23) return 'Sedang';
                return 'Tinggi';
            case 'sinis':
                if (score < 3) return 'Rendah';
                if (score <= 8) return 'Sedang';
                return 'Tinggi';
            case 'pencapaian':
                if (score < 11) return 'Rendah';
                if (score <= 18) return 'Sedang';
                return 'Tinggi';
            default:
                return 'N/A';
        }
    }

    function getMbiTotalCategory(score) {
        if (score < 32) return 'Rendah';
        if (score <= 49) return 'Sedang';
        return 'Tinggi';
    }

    function getNaqrCategory(score) {
        if (score <= 33) return 'Rendah / Tidak ada';
        if (score <= 55) return 'Sedang';
        if (score <= 77) return 'Tinggi';
        return 'Sangat tinggi';
    }

    function createHealthResultCardHTML(result, isAdminView = false) {
        const d = new Date(result.created_at);
        const datePart = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const timePart = [d.getHours(), d.getMinutes(), d.getSeconds()].map(num => String(num).padStart(2, '0')).join(':');
        const date = `${datePart}, ${timePart}`;

        const who5Category = getWho5Category(result.who5_total);
        const gad7Category = getGad7Category(result.gad7_total);
        const k10Category = getK10Category(result.k10_total);
        const mbiEmosionalCategory = getMbiSubscaleCategory(result.mbi_emosional_total, 'emosional');
        const mbiSinisCategory = getMbiSubscaleCategory(result.mbi_sinis_total, 'sinis');
        const mbiPencapaianCategory = getMbiSubscaleCategory(result.mbi_pencapaian_total, 'pencapaian');
        // Hitung total skor MBI secara manual di frontend
        const mbiTotalScore = result.mbi_emosional_total + result.mbi_sinis_total + result.mbi_pencapaian_total;
        const mbiTotalCategory = getMbiTotalCategory(mbiTotalScore);
        // Hitung total skor NAQ-R secara manual di frontend
        const naqrTotalScore = result.naqr_pribadi_total + result.naqr_pekerjaan_total + result.naqr_intimidasi_total;
        const naqrCategory = getNaqrCategory(naqrTotalScore);
        const cardId = `result-card-${result.id}`;

        const deleteButtonHTML = isAdminView ? '' : `
            <button data-result-id="${result.id}" class="delete-result-btn px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors duration-200">
                HAPUS
            </button>
        `;

        return `
            <div id="${cardId}" class="bg-white p-6 rounded-lg shadow-md border-l-4 border-emerald-500 mb-6">
                <div class="flex justify-between items-start mb-6 pb-4 border-b border-slate-200">
                    <div>
                        <p class="text-sm font-semibold text-slate-600 mb-1">Tanggal Pengisian</p>
                        <p class="text-lg font-bold text-slate-800">${date}</p>
                    </div>
                    ${deleteButtonHTML}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
                        <div class="flex items-center gap-2 mb-3"><div class="w-3 h-3 bg-emerald-500 rounded-full"></div><p class="font-bold text-slate-700 text-sm">WELL-BEING INDEX</p></div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between items-center"><span class="font-medium text-slate-600">Skor:</span><span class="font-bold text-emerald-700">${result.who5_total}/30</span></div>
                            <div class="flex justify-between items-center"><span class="font-medium text-slate-600">Kategori:</span><span class="font-semibold text-emerald-600 px-2 py-1 bg-emerald-100 rounded-full text-xs">${who5Category}</span></div>
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                        <div class="flex items-center gap-2 mb-3"><div class="w-3 h-3 bg-blue-500 rounded-full"></div><p class="font-bold text-slate-700 text-sm">GAD-7 (ANXIETY)</p></div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between items-center"><span class="font-medium text-slate-600">Skor:</span><span class="font-bold text-blue-700">${result.gad7_total}/21</span></div>
                            <div class="flex justify-between items-center"><span class="font-medium text-slate-600">Kategori:</span><span class="font-semibold text-blue-600 px-2 py-1 bg-blue-100 rounded-full text-xs">${gad7Category}</span></div>
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                        <div class="flex items-center gap-2 mb-3"><div class="w-3 h-3 bg-purple-500 rounded-full"></div><p class="font-bold text-slate-700 text-sm">KESSLER (K10)</p></div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between items-center"><span class="font-medium text-slate-600">Skor:</span><span class="font-bold text-purple-700">${result.k10_total}/50</span></div>
                            <div class="flex justify-between items-center"><span class="font-medium text-slate-600">Kategori:</span><span class="font-semibold text-purple-600 px-2 py-1 bg-purple-100 rounded-full text-xs">${k10Category}</span></div>
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200 md:col-span-2 lg:col-span-3">
                        <div class="flex items-center gap-2 mb-4"><div class="w-3 h-3 bg-orange-500 rounded-full"></div><p class="font-bold text-slate-700 text-sm">MASLACH BURNOUT INVENTORY</p></div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div class="text-center"><p class="font-medium text-slate-600 mb-2">Kelelahan Emosional</p><div class="bg-white p-3 rounded-lg border border-orange-200"><p class="text-2xl font-bold text-orange-600 mb-1">${result.mbi_emosional_total}</p><span class="font-semibold text-orange-600 text-xs bg-orange-100 px-2 py-1 rounded-full">${mbiEmosionalCategory}</span></div></div>
                            <div class="text-center"><p class="font-medium text-slate-600 mb-2">Sikap Sinis</p><div class="bg-white p-3 rounded-lg border border-orange-200"><p class="text-2xl font-bold text-orange-600 mb-1">${result.mbi_sinis_total}</p><span class="font-semibold text-orange-600 text-xs bg-orange-100 px-2 py-1 rounded-full">${mbiSinisCategory}</span></div></div>
                            <div class="text-center"><p class="font-medium text-slate-600 mb-2">Pencapaian Pribadi</p><div class="bg-white p-3 rounded-lg border border-orange-200"><p class="text-2xl font-bold text-orange-600 mb-1">${result.mbi_pencapaian_total}</p><span class="font-semibold text-orange-600 text-xs bg-orange-100 px-2 py-1 rounded-full">${mbiPencapaianCategory}</span></div></div>
                        </div>
                        <div class="mt-4 pt-3 border-t border-orange-200 text-center"><p class="font-medium text-slate-600">Total Skor: <span class="font-bold text-orange-700 text-lg">${mbiTotalScore}</span><br><span class="font-semibold text-orange-600 px-2 py-1 bg-orange-100 rounded-full text-xs">${mbiTotalCategory}</span></p></div>
                    </div>
                    <div class="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-lg border border-red-200 md:col-span-2 lg:col-span-3">
                        <div class="flex items-center gap-2 mb-4"><div class="w-3 h-3 bg-red-500 rounded-full"></div><p class="font-bold text-slate-700 text-sm">NAQ-R (PERUNDUNGAN)</p></div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div class="text-center"><p class="font-medium text-slate-600 mb-2">Perundungan Pribadi</p><div class="bg-white p-3 rounded-lg border border-red-200"><p class="text-2xl font-bold text-red-600">${result.naqr_pribadi_total}</p></div></div>
                            <div class="text-center"><p class="font-medium text-slate-600 mb-2">Perundungan Pekerjaan</p><div class="bg-white p-3 rounded-lg border border-red-200"><p class="text-2xl font-bold text-red-600">${result.naqr_pekerjaan_total}</p></div></div>
                            <div class="text-center"><p class="font-medium text-slate-600 mb-2">Intimidasi</p><div class="bg-white p-3 rounded-lg border border-red-200"><p class="text-2xl font-bold text-red-600">${result.naqr_intimidasi_total}</p></div></div>
                        </div>
                        <div class="mt-4 pt-3 border-t border-red-200 text-center"><p class="font-medium text-slate-600">Total Skor: <span class="font-bold text-red-700 text-lg">${naqrTotalScore}</span><br><span class="font-semibold text-red-600 px-2 py-1 bg-red-100 rounded-full text-xs">${naqrCategory}</span></p></div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderUserDetailModal(data) {
        const modalContentArea = document.getElementById('modal-content-area');
        const template = document.getElementById('modal-content-template');
        modalContentArea.innerHTML = template.innerHTML;

        const profileContainer = document.getElementById('modal-profile-container');
        const resultsContainer = document.getElementById('modal-results-container');

        // Render Biodata
        if (data.biodata_completed && data.biodata) {
            // Replikasi gaya dari halaman profil
            const styles = [
                { bg: 'from-emerald-50 to-blue-50', border: 'border-emerald-400', text: 'text-emerald-700' },
                { bg: 'from-blue-50 to-emerald-50', border: 'border-blue-400', text: 'text-blue-700' },
                { bg: 'from-orange-50 to-emerald-50', border: 'border-orange-400', text: 'text-orange-700' },
                { bg: 'from-emerald-50 to-orange-50', border: 'border-emerald-400', text: 'text-emerald-700' },
                { bg: 'from-blue-50 to-orange-50', border: 'border-blue-400', text: 'text-blue-700' },
                { bg: 'from-orange-50 to-blue-50', border: 'border-orange-400', text: 'text-orange-700' },
            ];
            let biodataHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
            const biodataFields = {
                "Email": data.biodata.email,
                "Inisial": data.biodata.inisial,
                "No Kontak": data.biodata.no_wa,
                "Usia": data.biodata.usia,
                "Jenis Kelamin": data.biodata.jenis_kelamin,
                "Pendidikan": data.biodata.pendidikan,
                "Lama Bekerja": data.biodata.lama_bekerja,
                "Status Pegawai": data.biodata.status_pegawai,
                "Jabatan": data.biodata.jabatan_lain || data.biodata.jabatan,
                "Unit/Ruangan": data.biodata.unit_ruangan,
                "Status Perkawinan": data.biodata.status_perkawinan,
                "Status Kehamilan": data.biodata.status_kehamilan,
                "Jumlah Anak": data.biodata.jumlah_anak,
            };
            let styleIndex = 0;
            for (const [label, value] of Object.entries(biodataFields)) {
                const style = styles[styleIndex % styles.length];
                biodataHtml += `
                    <div class="p-4 bg-gradient-to-br ${style.bg} rounded-lg border-l-4 ${style.border}">
                        <strong class="font-semibold ${style.text} block text-sm">${label}</strong>
                        <span class="text-slate-700 font-medium">${value !== null && value !== undefined ? value : 'N/A'}</span>
                    </div>
                `;
                styleIndex++;
            }
            biodataHtml += '</div>';
            profileContainer.innerHTML = biodataHtml;
        } else {
            profileContainer.innerHTML = '<p class="text-slate-500 text-center">Pengguna belum melengkapi biodata.</p>';
        }

        // Render Riwayat Hasil Kuesioner
        if (data.health_results_completed && data.health_results && data.health_results.length > 0) {
            let resultsHtml = '';
            data.health_results.forEach(result => {
                // Gunakan fungsi terpusat, isAdminView = true untuk menyembunyikan tombol hapus
                resultsHtml += createHealthResultCardHTML(result, true);
            });
            resultsContainer.innerHTML = resultsHtml;
        } else {
            resultsContainer.innerHTML = '<p class="text-slate-500 text-center">Pengguna tidak memiliki riwayat kuesioner.</p>';
        }
    }

    async function renderProfilePage() {
        // Ambil semua elemen DOM yang dibutuhkan
        const profileLoading = document.getElementById('profile-loading');
        const profileContainer = document.getElementById('profile-container');
        const profileEmpty = document.getElementById('profile-empty');
        const resultsLoading = document.getElementById('results-loading');
        const resultsContainer = document.getElementById('results-container');
        const resultsEmpty = document.getElementById('results-empty');
        const editProfileBtn = document.getElementById('edit-profile-btn');

        // Tampilkan status memuat
        profileLoading.classList.remove('hidden');
        resultsLoading.classList.remove('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/users/profile/full`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Gagal memuat data profil: ${response.statusText}`);
            }

            const data = await response.json();

            // Sembunyikan status memuat
            profileLoading.classList.add('hidden');
            resultsLoading.classList.add('hidden');

            // Render Biodata
            if (data.biodata_completed && data.biodata) {
                profileContainer.classList.remove('hidden');
                profileEmpty.classList.add('hidden');

                // Simpan data profil saat ini untuk digunakan saat mengedit
                if(editProfileBtn) {
                    editProfileBtn.addEventListener('click', () => openEditModal(data.biodata));
                }
                
                const fillText = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value !== null && value !== undefined ? value : 'N/A';
                };

                fillText('profile-email', data.biodata.email);
                fillText('profile-inisial', data.biodata.inisial);
                fillText('profile-no_wa', data.biodata.no_wa);
                fillText('profile-usia', data.biodata.usia ? `${data.biodata.usia} tahun` : 'N/A');
                fillText('profile-jenis_kelamin', data.biodata.jenis_kelamin);
                fillText('profile-pendidikan', data.biodata.pendidikan);
                fillText('profile-lama_bekerja', data.biodata.lama_bekerja ? `${data.biodata.lama_bekerja} tahun` : 'N/A');
                fillText('profile-status_pegawai', data.biodata.status_pegawai);
                fillText('profile-jabatan', data.biodata.jabatan_lain || data.biodata.jabatan);
                fillText('profile-unit_ruangan', data.biodata.unit_ruangan);
                fillText('profile-status_perkawinan', data.biodata.status_perkawinan);
                fillText('profile-status_kehamilan', data.biodata.status_kehamilan);
                fillText('profile-jumlah_anak', data.biodata.jumlah_anak);
            } else {
                profileContainer.classList.add('hidden');
                profileEmpty.classList.remove('hidden');
            }

            // Render Riwayat Hasil Kuesioner
            if (data.health_results_completed && data.health_results && data.health_results.length > 0) {
                resultsContainer.classList.remove('hidden');
                resultsEmpty.classList.add('hidden');

                let allResultCards = '';
                data.health_results.forEach(result => {
                    // Gunakan fungsi terpusat, isAdminView = false untuk menampilkan tombol hapus
                    allResultCards += createHealthResultCardHTML(result, false);
                });
                
                resultsContainer.innerHTML = allResultCards;

                // Tambahkan event listener untuk semua tombol hapus
                document.querySelectorAll('.delete-result-btn').forEach(button => {
                    button.addEventListener('click', handleDeleteResult);
                });
            } else {
                resultsContainer.classList.add('hidden');
                resultsEmpty.classList.remove('hidden');
            }

        } catch (error) {
            console.error('Error rendering profile page:', error);
            profileLoading.classList.add('hidden');
            resultsLoading.classList.add('hidden');
            profileEmpty.classList.remove('hidden');
            profileEmpty.firstElementChild.textContent = 'Gagal memuat data profil. Silakan coba lagi.';
            resultsEmpty.classList.remove('hidden');
            resultsEmpty.firstElementChild.textContent = 'Gagal memuat riwayat.';
        }

    }

    async function openEditModal(profileData) {
        const modal = document.getElementById('edit-profile-modal');
        const modalContent = document.getElementById('modal-content');
        const closeModalBtn = document.getElementById('close-modal-btn');

        modal.classList.remove('hidden');
        modalContent.innerHTML = '<p class="text-center">Memuat formulir...</p>';

        // Muat konten form dari identity_form.html
        const response = await fetch('/identity_form');
        const formHtml = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(formHtml, 'text/html');
        const formElement = doc.querySelector('#identity-form');
        
        if (formElement) {
            modalContent.innerHTML = '';
            modalContent.appendChild(formElement);

            // Isi form dengan data yang ada
            for (const key in profileData) {
                const input = formElement.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'radio') {
                        formElement.querySelector(`[name="${key}"][value="${profileData[key]}"]`).checked = true;
                    } else {
                        input.value = profileData[key];
                    }
                }
            }
            // Email tidak bisa diubah
            const emailInput = formElement.querySelector('#email');
            if(emailInput) {
                emailInput.readOnly = true;
                emailInput.classList.add('bg-slate-100');
            }

            // Ubah teks tombol submit menjadi "Simpan"
            const submitButton = formElement.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = 'Simpan';
            }

            // Tambahkan event listener untuk submit form di dalam modal
            formElement.addEventListener('submit', async (e) => {
                e.preventDefault();
                // Gunakan logika submit yang sama dengan identityForm
                const formData = new FormData(formElement);
                const data = Object.fromEntries(formData.entries());

                // Lakukan pre-processing lagi
                for (const key in data) {
                    if (data[key] === '') data[key] = null;
                    if (['usia', 'jumlah_anak', 'lama_bekerja'].includes(key) && data[key] !== null) {
                        data[key] = parseInt(data[key], 10);
                    }
                }
                if (data.status_pegawai === 'Lainnya') data.status_pegawai = formElement.querySelector('[name="status_pegawai_other"]').value;
                if (data.jabatan === 'Lainnya') data.jabatan = formElement.querySelector('[name="jabatan_other"]').value;

                const submitResponse = await fetch(`${API_BASE_URL}/users/profile`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (submitResponse.ok) {
                    alert('Profil berhasil diperbarui!');
                    modal.classList.add('hidden');
                    renderProfilePage(); // Render ulang halaman profil untuk menampilkan data baru
                } else {
                    alert('Gagal memperbarui profil.');
                }
            });
        }

        closeModalBtn.onclick = () => modal.classList.add('hidden');
        window.onclick = (event) => { if (event.target == modal) modal.classList.add('hidden'); }
    }

    async function handleDeleteResult(event) {
        const button = event.target;
        const resultId = button.dataset.resultId;

        if (confirm('Apakah Anda yakin ingin menghapus riwayat ini?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/users/profile/results/${resultId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    // Hapus kartu dari DOM
                    const cardToRemove = document.getElementById(`result-card-${resultId}`);
                    if (cardToRemove) {
                        cardToRemove.remove();
                    }
                } else {
                    alert('Gagal menghapus riwayat.');
                }
            } catch (error) {
                console.error('Error deleting result:', error);
                alert('Terjadi kesalahan saat mencoba menghapus riwayat.');
            }
        }
    }

    function startChatMode() {
        initialScreen.classList.add('hidden');
        quizFooter.classList.add('hidden');
        chatOutput.classList.remove('hidden');
        addMessageToChat('bot', 'Profil Anda sudah lengkap. Silakan ajukan pertanyaan Anda mengenai kesehatan mental dan kesejahteraan diri.');
        // Di sini Anda bisa menambahkan input untuk chat
    }

    if (startWho5Button) {
        startWho5Button.addEventListener('click', () => {
            initialScreen.classList.add('hidden');
            chatOutput.classList.remove('hidden');
            startQuestionnaire('who5');
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Apakah Anda yakin ingin mengulang kuesioner? Riwayat sebelumnya akan tetap tersimpan.')) {
                chatOutput.innerHTML = '';
                quizFooter.innerHTML = '';
                startQuestionnaire('who5');
            }
        });
    }

    async function startQuestionnaire(type) {
        questionnaireState.current = type;
        questionnaireState.currentQuestionIndex = 0;
        questionnaireState.scores[type] = [];
        
        const data = await fetchQuestionnaireData(type);
        if (data) {
            askQuestion(data);
        }
    }

    async function fetchQuestionnaireData(type) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/questionnaire/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to fetch ${type} questions`);
            return await response.json();
        } catch (error) {
            console.error(error);
            addMessageToChat('bot', 'Gagal memuat pertanyaan. Coba lagi nanti.');
            return null;
        }
    }

    function askQuestion(data) {
        const qIndex = questionnaireState.currentQuestionIndex;
        const question = data.questions[qIndex];
        
        addMessageToChat('bot', `(${qIndex + 1}/${data.questions.length}) ${question}`);
        renderOptions(data.options);
    }

    function renderOptions(options) {
        quizFooter.innerHTML = '';
        quizFooter.classList.remove('hidden');
        options.forEach(opt => {
            const button = document.createElement('button');
            button.className = "bg-emerald-100 text-emerald-800 font-medium py-2 px-4 rounded-lg hover:bg-emerald-200 transition duration-150 m-1";
            // Remove trailing parenthesized numeric score if present (e.g. "Setiap Saat (6)")
            const rawText = String(opt.text || '');
            const displayText = rawText.replace(/\s*\(\d+\)\s*$/, '').trim();
            button.textContent = displayText || rawText;
            // keep numeric score for calculation
            button.dataset.score = opt.score;
            // put the original label in title for debugging/QA if needed
            button.title = rawText;
            button.addEventListener('click', handleOptionClick);
            quizFooter.appendChild(button);
        });
    }

    async function handleOptionClick(e) {
        const score = parseInt(e.target.dataset.score, 10);
        const text = e.target.textContent;
        const currentType = questionnaireState.current;

        addMessageToChat('user', text);
        questionnaireState.scores[currentType].push(score);
        questionnaireState.currentQuestionIndex++;

        const data = await fetchQuestionnaireData(currentType);
        if (questionnaireState.currentQuestionIndex < data.questions.length) {
            askQuestion(data);
        } else {
            // Lanjut ke kuesioner berikutnya atau selesai
            await advanceQuestionnaire();
        }
    }

    async function advanceQuestionnaire() {
        const sequence = ['who5', 'gad7', 'k10', 'mbi', 'naqr'];
        const currentIndex = sequence.indexOf(questionnaireState.current);

        if (currentIndex < sequence.length - 1) {
            const nextType = sequence[currentIndex + 1];
            addMessageToChat('bot', `Terima kasih. Sekarang kita lanjut ke kuesioner ${nextType.toUpperCase()}.`);
            await startQuestionnaire(nextType);
        } else {
            // Semua kuesioner selesai
            await submitAllResults();
        }
    }

    async function submitAllResults() {
        quizFooter.classList.add('hidden');
        statusMessage.textContent = 'Menyimpan hasil Anda...';
        statusMessage.classList.remove('hidden');

        // Kalkulasi sub-skala NAQR di frontend
        // Indeks (0-based) sesuai dengan pertanyaan di profiling_service.py
        const naqr_pribadi_indices = [1, 4, 5, 6, 8, 9, 11, 14, 16, 19, 21];
        const naqr_pekerjaan_indices = [0, 2, 3, 13, 15, 18, 20];
        const naqr_intimidasi_indices = [7, 10, 12, 17];
        const naqrScores = questionnaireState.scores.naqr;

        const calculateSubscale = (indices) => indices.reduce((sum, index) => sum + (naqrScores[index] || 0), 0);

        const payload = {
            who5_total: questionnaireState.scores.who5.reduce((a, b) => a + b, 0),
            gad7_total: questionnaireState.scores.gad7.reduce((a, b) => a + b, 0),
            // Skor MBI masih dikirim sebagai array karena sub-skalanya lebih kompleks
            mbi_scores: questionnaireState.scores.mbi || [],
            // Skor NAQR sudah dipecah menjadi sub-skala
            naqr_pribadi_total: calculateSubscale(naqr_pribadi_indices),
            naqr_pekerjaan_total: calculateSubscale(naqr_pekerjaan_indices),
            naqr_intimidasi_total: calculateSubscale(naqr_intimidasi_indices),
            k10_total: questionnaireState.scores.k10.reduce((a, b) => a + b, 0),
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/users/profile/results`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save results');

            const resultSummary = await response.json();
            statusMessage.classList.add('hidden');
            
            // Tampilkan ringkasan hasil dengan format yang lebih baik (mirip Telegram)
            let summaryHtml = `
                <div class="survey-results-container bg-gradient-to-b from-emerald-50 to-blue-50 p-6 rounded-lg border-2 border-emerald-300 max-w-2xl">
                    <h2 class="text-2xl font-bold text-emerald-700 mb-6">✨ Survey Selesai!</h2>
                    <div class="space-y-4">
            `;
            
            // Iterasi melalui setiap hasil kuesioner
            for (const [key, value] of Object.entries(resultSummary.summary)) {
                // Pilih warna berdasarkan kategori / kuesioner
                let borderColor = 'border-emerald-400';
                let bgColor = 'bg-gradient-to-r from-emerald-50 to-green-50';
                let titleColor = 'text-emerald-700';
                
                if (key.includes('WHO-5') || key.includes('Well')) {
                    borderColor = 'border-emerald-400';
                    bgColor = 'bg-gradient-to-r from-emerald-50 to-green-50';
                    titleColor = 'text-emerald-700';
                } else if (key.includes('GAD') || key.includes('Anxiety')) {
                    borderColor = 'border-blue-400';
                    bgColor = 'bg-gradient-to-r from-blue-50 to-cyan-50';
                    titleColor = 'text-blue-700';
                } else if (key.includes('K10') || key.includes('Kessler')) {
                    borderColor = 'border-purple-400';
                    bgColor = 'bg-gradient-to-r from-purple-50 to-violet-50';
                    titleColor = 'text-purple-700';
                } else if (key.includes('MBI') || key.includes('Burnout')) {
                    borderColor = 'border-orange-400';
                    bgColor = 'bg-gradient-to-r from-orange-50 to-amber-50';
                    titleColor = 'text-orange-700';
                } else if (key.includes('NAQ') || key.includes('Perundungan')) {
                    borderColor = 'border-red-400';
                    bgColor = 'bg-gradient-to-r from-red-50 to-rose-50';
                    titleColor = 'text-red-700';
                }
                
                // Tentukan badge kategori berdasarkan interpretasi
                let categoryBadgeClass = 'bg-gray-100 text-gray-700';
                const interpretation = value.interpretation || '';
                if (interpretation.includes('Tinggi') || interpretation.includes('Berat') || interpretation.includes('Sangat')) {
                    categoryBadgeClass = 'bg-red-100 text-red-700 font-bold';
                } else if (interpretation.includes('Sedang')) {
                    categoryBadgeClass = 'bg-yellow-100 text-yellow-700 font-bold';
                } else if (interpretation.includes('Ringan') || interpretation.includes('Minimal') || interpretation.includes('Rendah')) {
                    categoryBadgeClass = 'bg-green-100 text-green-700 font-bold';
                }
                
                summaryHtml += `
                    <div class="${bgColor} ${borderColor} border-l-4 p-4 rounded-lg">
                        <p class="${titleColor} font-bold text-lg mb-3">${key}</p>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-gray-700 font-semibold">Skor:</span>
                            <span class="text-xl font-bold text-gray-800">${value.score}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 font-semibold">Kategori:</span>
                            <span class="px-3 py-1 rounded-full text-sm font-bold ${categoryBadgeClass}">${interpretation}</span>
                        </div>
                    </div>
                `;
            }
            
            summaryHtml += `
                    </div>
                    <div class="mt-6 pt-4 border-t-2 border-emerald-300">
                        <p class="text-center text-emerald-700 font-semibold text-lg">
                            🎯 Anda sekarang dapat memulai percakapan dengan asisten kesehatan mental kami.
                        </p>
                    </div>
                </div>
            `;
            
            addMessageToChat('bot', summaryHtml);

            // Reset state untuk chat berikutnya
            questionnaireState = { current: null, scores: {}, currentQuestionIndex: 0 };

        } catch (error) {
            console.error('Error submitting results:', error);
            statusMessage.textContent = 'Gagal menyimpan hasil.';
            addMessageToChat('bot', 'Maaf, terjadi kesalahan saat menyimpan hasil Anda. Silakan coba lagi nanti.');
        }
    }

    function addMessageToChat(sender, text) {
        const messageDiv = document.createElement('div');
        // Pastikan chat container memiliki tinggi yang tepat
        chatOutput.style.maxHeight = '400px'; // Atur sesuai kebutuhan
        chatOutput.style.overflowY = 'auto';
        messageDiv.className = `p-3 rounded-lg max-w-lg ${sender === 'user' ? 'bg-emerald-500 text-white self-end ml-auto' : 'bg-slate-200 text-slate-800 self-start'}`;
        messageDiv.innerHTML = text;
        
        if (chatOutput) {
            chatOutput.appendChild(messageDiv);
            
            // Scroll otomatis ke bawah dengan behavior smooth
            chatOutput.scrollTo({
                top: chatOutput.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
});