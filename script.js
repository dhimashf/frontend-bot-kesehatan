document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen UI ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
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

    // Mengatur base URL API secara dinamis.
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE_URL = isLocalhost ? 'http://localhost:8010/api/v1' : '/api/v1';
    const token = localStorage.getItem('token');

    // Token check for protected pages
    const path = window.location.pathname;
    const isAuthPage = path === '/login' || path === '/register';
    
    // --- AUTHENTICATION DISABLED FOR DEVELOPMENT ---
    // Bagian ini dinonaktifkan agar bisa melihat halaman internal tanpa login.
    // Aktifkan kembali untuk mode produksi.
    if (!isAuthPage) { // Jika ini BUKAN halaman login/register, maka ini adalah halaman yang dilindungi
        if (!token) {
            window.location.href = '/login';
            return; // Hentikan eksekusi jika tidak ada token
        }
        fetchUserProfile();
    }

    // Jalankan logika spesifik berdasarkan halaman yang sedang aktif
    if (path === '/') {
        checkProfileStatus(); // Cek apakah biodata sudah lengkap
    } else if (path === '/profile') {
        renderProfilePage(); // Render data profil dan riwayat
    } else if (path === '/identity_form') {
        // Event listener untuk form identitas sudah ada di bawah
        // Isi email pengguna saat form dimuat
        fetchUserProfile();
    } else if (loginForm) {
        // Event listener untuk form login sudah ada di bawah
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
                    window.location.href = '/';
                } else {
                    let errorMsg = 'Login failed. Please check your credentials.';
                    try {
                        // Coba parse error dari backend, jika ada
                        const errorData = await response.json();
                        errorMsg = errorData.detail || errorMsg;
                    } catch (e) {
                        // Jika response bukan JSON, tampilkan pesan umum
                        console.error("Could not parse error response:", e);
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
                const initial = user.email.charAt(0).toUpperCase();
                // Isi elemen di dalam dan di bawah lingkaran dengan inisial
                if (userInitial) userInitial.textContent = initial;
                if (userUsername) {
                    userUsername.textContent = initial;
                }
                // Jika di form identitas, isi field email dan buat read-only
                const emailInput = document.getElementById('email');
                if (emailInput && window.location.pathname === '/identity_form') {
                    emailInput.value = user.email;
                    emailInput.readOnly = true;
                    emailInput.classList.add('bg-slate-100');
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
        try {
            const response = await fetch(`${API_BASE_URL}/users/profile/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch profile status');
            }
            const status = await response.json();

            if (!status.has_identity) {
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
                const d = new Date(result.created_at);
                const datePart = d.toLocaleDateString('id-ID', {
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric'
                });
                // Format waktu secara manual untuk konsistensi HH:mm:ss
                const timePart = [d.getHours(), d.getMinutes(), d.getSeconds()].map(num => String(num).padStart(2, '0')).join(':');
                const date = `${datePart}, ${timePart}`;
                const cardId = `result-card-${result.id}`;
                
                allResultCards += `
                    <div id="${cardId}" class="bg-white p-6 rounded-lg shadow-md border-l-4 border-emerald-500 mb-6">
                        <!-- Header Kartu -->
                        <div class="flex justify-between items-start mb-6 pb-4 border-b border-slate-200">
                            <div>
                                <p class="text-sm font-semibold text-slate-600 mb-1">Tanggal Pengisian</p>
                                <p class="text-lg font-bold text-slate-800">${date}</p>
                            </div>
                            <button data-result-id="${result.id}" class="delete-result-btn px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors duration-200">
                                HAPUS
                            </button>
                        </div>

                        <!-- Grid Layout untuk Semua Tes -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            
                            <!-- WHO-5 WELL-BEING INDEX -->
                            <div class="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                    <p class="font-bold text-slate-700 text-sm">WELL-BEING INDEX</p>
                                </div>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-slate-600">Skor:</span>
                                        <span class="font-bold text-emerald-700">${result.who5_total}/30</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-slate-600">Kategori:</span>
                                        <span class="font-semibold text-emerald-600 px-2 py-1 bg-emerald-100 rounded-full text-xs">${result.who5_category}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- GAD-7 -->
                            <div class="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <p class="font-bold text-slate-700 text-sm">GAD-7 (ANXIETY)</p>
                                </div>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-slate-600">Skor:</span>
                                        <span class="font-bold text-blue-700">${result.gad7_total}/21</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-slate-600">Kategori:</span>
                                        <span class="font-semibold text-blue-600 px-2 py-1 bg-blue-100 rounded-full text-xs">${result.gad7_category}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Kessler (K10) -->
                            <div class="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
                                    <p class="font-bold text-slate-700 text-sm">KESSLER (K10)</p>
                                </div>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-slate-600">Skor:</span>
                                        <span class="font-bold text-purple-700">${result.k10_total}/50</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-slate-600">Kategori:</span>
                                        <span class="font-semibold text-purple-600 px-2 py-1 bg-purple-100 rounded-full text-xs">${result.k10_category}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Maslach Burnout Inventory -->
                            <div class="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200 md:col-span-2 lg:col-span-3">
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
                                    <p class="font-bold text-slate-700 text-sm">MASLACH BURNOUT INVENTORY</p>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div class="text-center">
                                        <p class="font-medium text-slate-600 mb-2">Kelelahan Emosional</p>
                                        <div class="bg-white p-3 rounded-lg border border-orange-200">
                                            <p class="text-2xl font-bold text-orange-600 mb-1">${result.mbi_emosional_total}</p>
                                            <span class="font-semibold text-orange-600 text-xs bg-orange-100 px-2 py-1 rounded-full">${result.mbi_emosional_category}</span>
                                        </div>
                                    </div>
                                    <div class="text-center">
                                        <p class="font-medium text-slate-600 mb-2">Sikap Sinis</p>
                                        <div class="bg-white p-3 rounded-lg border border-orange-200">
                                            <p class="text-2xl font-bold text-orange-600 mb-1">${result.mbi_sinis_total}</p>
                                            <span class="font-semibold text-orange-600 text-xs bg-orange-100 px-2 py-1 rounded-full">${result.mbi_sinis_category}</span>
                                        </div>
                                    </div>
                                    <div class="text-center">
                                        <p class="font-medium text-slate-600 mb-2">Pencapaian Pribadi</p>
                                        <div class="bg-white p-3 rounded-lg border border-orange-200">
                                            <p class="text-2xl font-bold text-orange-600 mb-1">${result.mbi_pencapaian_total}</p>
                                            <span class="font-semibold text-orange-600 text-xs bg-orange-100 px-2 py-1 rounded-full">${result.mbi_pencapaian_category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-4 pt-3 border-t border-orange-200 text-center">
                                    <p class="font-medium text-slate-600">Total Skor: <span class="font-bold text-orange-700 text-lg">${result.mbi_total}</span></p>
                                </div>
                            </div>

                            <!-- NAQ-R -->
                            <div class="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-lg border border-red-200 md:col-span-2 lg:col-span-3">
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <p class="font-bold text-slate-700 text-sm">NAQ-R (PERUNDUNGAN)</p>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div class="text-center">
                                        <p class="font-medium text-slate-600 mb-2">Perundungan Pribadi</p>
                                        <div class="bg-white p-3 rounded-lg border border-red-200">
                                            <p class="text-2xl font-bold text-red-600">${result.naqr_pribadi_total}</p>
                                        </div>
                                    </div>
                                    <div class="text-center">
                                        <p class="font-medium text-slate-600 mb-2">Perundungan Pekerjaan</p>
                                        <div class="bg-white p-3 rounded-lg border border-red-200">
                                            <p class="text-2xl font-bold text-red-600">${result.naqr_pekerjaan_total}</p>
                                        </div>
                                    </div>
                                    <div class="text-center">
                                        <p class="font-medium text-slate-600 mb-2">Intimidasi</p>
                                        <div class="bg-white p-3 rounded-lg border border-red-200">
                                            <p class="text-2xl font-bold text-red-600">${result.naqr_intimidasi_total}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-4 pt-3 border-t border-red-200 text-center">
                                    <p class="font-medium text-slate-600">Total Skor: <span class="font-bold text-red-700 text-lg">${result.naqr_total}</span></p>
                                </div>
                            </div>

                        </div>
                    </div>
                `;
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
            button.textContent = `${opt.text} (${opt.score})`;
            button.dataset.score = opt.score;
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
            
            // Tampilkan ringkasan hasil
            let summaryText = '✨ Kuesioner Selesai! Berikut adalah ringkasan hasilnya:\n\n';
            for (const [key, value] of Object.entries(resultSummary.summary)) {
                summaryText += `*${key}*\nSkor: ${value.score}\nKategori: ${value.interpretation}\n\n`;
            }
            summaryText += 'Anda sekarang dapat memulai percakapan dengan asisten.';
            addMessageToChat('bot', summaryText.replace(/\n/g, '<br>'));

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
