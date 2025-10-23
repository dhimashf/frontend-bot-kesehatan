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

    // --- State Aplikasi ---
    let questionnaireState = {
        current: null, // 'who5', 'gad7', 'mbi', 'naqr', 'k10'
        scores: {},
        currentQuestionIndex: 0
    };

    const API_BASE_URL = '/api/v1';
    const token = localStorage.getItem('token');

    // Token check for protected pages
    const path = window.location.pathname;
    const isAuthPage = path === '/login' || path === '/register';
    
    if (!isAuthPage) { // Jika ini BUKAN halaman login/register, maka ini adalah halaman yang dilindungi
        if (!token) {
            window.location.href = '/login';
            return; // Hentikan eksekusi jika tidak ada token
        }
        // Ambil data pengguna untuk semua halaman yang dilindungi
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
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
                    const error = await response.json();
                    errorMessage.textContent = error.detail;
                    errorMessage.classList.remove('hidden');
                }
            } catch (error) {
                errorMessage.textContent = 'An unexpected error occurred.';
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
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                if (response.ok) {
                    window.location.href = '/login';
                } else {
                    const error = await response.json();
                    errorMessage.textContent = error.detail;
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
                    const date = new Date(result.created_at).toLocaleString('id-ID', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                    const cardId = `result-card-${result.id}`;
                    allResultCards += `
                        <div id="${cardId}" class="bg-white p-6 rounded-lg shadow-md border-l-4 border-emerald-500 space-y-3">
                            <div class="flex justify-between items-start">
                                <p class="text-sm font-semibold text-slate-600">Tanggal Pengisian: ${date}</p>
                                <button data-result-id="${result.id}" class="delete-result-btn text-red-500 hover:text-red-700 text-xs font-bold">HAPUS</button>
                            </div>
                            <div class="space-y-4 text-sm">
                                <div>
                                    <p class="font-bold text-slate-700">WHO-5 WELL-BEING INDEX</p>
                                    <p>Skor: ${result.who5_total} dari 30</p>
                                    <p>Kategori: <span class="font-semibold">${result.who5_category}</span></p>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-700">GAD-7 (Generalized Anxiety Disorder)</p>
                                    <p>Skor: ${result.gad7_total} dari 21</p>
                                    <p>Kategori: <span class="font-semibold">${result.gad7_category}</span></p>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-700">Maslach Burnout Inventory (MBI)</p>
                                    <p>Kelelahan Emosional: ${result.mbi_emosional_total} (<span class="font-semibold">${result.mbi_emosional_category}</span>)</p>
                                    <p>Sikap Sinis: ${result.mbi_sinis_total} (<span class="font-semibold">${result.mbi_sinis_category}</span>)</p>
                                    <p>Pencapaian Pribadi: ${result.mbi_pencapaian_total} (<span class="font-semibold">${result.mbi_pencapaian_category}</span>)</p>
                                    <p>Total Skor: ${result.mbi_total} (N/A)</p>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-700">NAQ-R (Negative Acts Questionnaire-Revised)</p>
                                    <p>Perundungan Pribadi: ${result.naqr_pribadi_total}</p>
                                    <p>Perundungan Pekerjaan: ${result.naqr_pekerjaan_total}</p>
                                    <p>Intimidasi: ${result.naqr_intimidasi_total}</p>
                                    <p>Total Skor: ${result.naqr_total}</p>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-700">Kessler (K10) Skala Gangguan Psikososial</p>
                                    <p>Skor: ${result.k10_total} dari 50</p>
                                    <p>Kategori: <span class="font-semibold">${result.k10_category}</span></p>
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
        const sequence = ['who5', 'gad7', 'mbi', 'naqr', 'k10'];
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
            mbi_scores: questionnaireState.scores.mbi,
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
        messageDiv.className = `p-3 rounded-lg max-w-lg ${sender === 'user' ? 'bg-emerald-500 text-white self-end' : 'bg-slate-200 text-slate-800 self-start'}`;
        messageDiv.innerHTML = text; // Menggunakan innerHTML untuk render <br>
        
        if (chatOutput) {
            chatOutput.appendChild(messageDiv);
            chatOutput.scrollTop = chatOutput.scrollHeight;
        }
    }
});
