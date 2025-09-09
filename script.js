'[uhu]        // Глобальные переменные
        let masterKey = '';
        let passwords = [];
        let isEditing = false;
        let editingId = null;

        // URL для хранения данных (замените на ваш GitHub репозиторий)
        const GITHUB_API_URL = 'https://api.github.com/repos/Astrante/guardian/contents/data.json';
        const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN'; // Personal Access Token

        // Инициализация
        document.addEventListener('DOMContentLoaded', function() {
            // Автофокус на поле мастер-пароля
            document.getElementById('masterPassword').focus();
            
            // Enter для входа
            document.getElementById('masterPassword').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    login();
                }
            });
        });

        // Вход в систему
        async function login() {
            const masterPassword = document.getElementById('masterPassword').value;
            
            if (!masterPassword) {
                showError('loginError', 'Введите мастер-пароль');
                return;
            }

            // Создание ключа из мастер-пароля
            masterKey = CryptoJS.PBKDF2(masterPassword, 'salt', {
                keySize: 256/32,
                iterations: 100000
            }).toString();

            try {
                // Загрузка зашифрованных данных
                await loadPasswords();
                
                // Переключение на основное приложение
                document.querySelector('.login-form').classList.remove('active');
                document.querySelector('.main-app').classList.add('active');
                
                renderPasswords();
                updateStats();
                
            } catch (error) {
                showError('loginError', 'Неверный мастер-пароль или ошибка загрузки данных');
                console.error('Login error:', error);
            }
        }

        // Выход из системы
        function logout() {
            masterKey = '';
            passwords = [];
            document.getElementById('masterPassword').value = '';
            document.querySelector('.main-app').classList.remove('active');
            document.querySelector('.login-form').classList.add('active');
            hideMessages();
        }

        // Загрузка паролей из GitHub
        async function loadPasswords() {
            try {
                // Попытка загрузки из GitHub (требует настройки)
                // Для демонстрации используем localStorage
                const encryptedData = localStorage.getItem('passwordManagerData');
                
                if (encryptedData) {
                    const decrypted = CryptoJS.AES.decrypt(encryptedData, masterKey).toString(CryptoJS.enc.Utf8);
                    passwords = JSON.parse(decrypted || '[]');
                } else {
                    passwords = [];
                }
            } catch (error) {
                console.error('Error loading passwords:', error);
                passwords = [];
            }
        }

        // Сохранение паролей
        async function savePasswords() {
            try {
                const dataToEncrypt = JSON.stringify(passwords);
                const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, masterKey).toString();
                
                // Сохранение в localStorage (для демонстрации)
                localStorage.setItem('passwordManagerData', encrypted);
                
                // Здесь можно добавить сохранение в GitHub через API
                
                showSuccess('Данные успешно сохранены');
            } catch (error) {
                showError('appError', 'Ошибка при сохранении данных');
                console.error('Save error:', error);
            }
        }

        // Добавление нового пароля
        async function addPassword() {
            const siteName = document.getElementById('siteName').value;
            const siteUrl = document.getElementById('siteUrl').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const notes = document.getElementById('notes').value;

            if (!siteName || !username || !password) {
                showError('appError', 'Заполните обязательные поля');
                return;
            }

            const passwordEntry = {
                id: isEditing ? editingId : Date.now().toString(),
                siteName,
                siteUrl,
                username,
                password,
                notes,
                createdAt: isEditing ? passwords.find(p => p.id === editingId).createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (isEditing) {
                const index = passwords.findIndex(p => p.id === editingId);
                passwords[index] = passwordEntry;
                isEditing = false;
                editingId = null;
            } else {
                passwords.push(passwordEntry);
            }

            await savePasswords();
            clearAddForm();
            toggleAddForm();
            renderPasswords();
            updateStats();
            showSuccess('Пароль успешно сохранен');
        }

        // Генерация пароля
        function generatePassword() {
            const length = 16;
            const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            
            for (let i = 0; i < length; i++) {
                password += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            
            document.getElementById('password').value = password;
        }

        // Отображение паролей
        function renderPasswords() {
            const passwordList = document.getElementById('passwordList');
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            
            const filteredPasswords = passwords.filter(p => 
                p.siteName.toLowerCase().includes(searchTerm) ||
                p.username.toLowerCase().includes(searchTerm) ||
                (p.siteUrl && p.siteUrl.toLowerCase().includes(searchTerm))
            );

            if (filteredPasswords.length === 0) {
                passwordList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">Паролей не найдено</p>';
                return;
            }

            passwordList.innerHTML = filteredPasswords.map(p => `
                <div class="password-item">
                    <h3>🌐 ${p.siteName}</h3>
                    ${p.siteUrl ? `<p><strong>URL:</strong> <a href="${p.siteUrl}" target="_blank">${p.siteUrl}</a></p>` : ''}
                    <p><strong>Логин:</strong> ${p.username}</p>
                    <p><strong>Пароль:</strong> <span style="font-family: monospace;">••••••••</span></p>
                    ${p.notes ? `<p><strong>Заметки:</strong> ${p.notes}</p>` : ''}
                    <p style="font-size: 0.9em; color: #95a5a6;"><strong>Обновлен:</strong> ${new Date(p.updatedAt).toLocaleDateString('ru-RU')}</p>
                    <div class="password-actions">
                        <button class="btn small" onclick="copyPassword('${p.id}')">📋 Копировать пароль</button>
                        <button class="btn small" onclick="showPassword('${p.id}')" id="show-${p.id}">👁 Показать</button>
                        <button class="btn small secondary" onclick="editPassword('${p.id}')">✏ Редактировать</button>
                        <button class="btn small danger" onclick="deletePassword('${p.id}')">🗑 Удалить</button>
                    </div>
                </div>
            `).join('');
        }

        // Копирование пароля
        async function copyPassword(id) {
            const password = passwords.find(p => p.id === id);
            try {
                await navigator.clipboard.writeText(password.password);
                showSuccess('Пароль скопирован в буфер обмена');
            } catch (err) {
                showError('appError', 'Не удалось скопировать пароль');
            }
        }

        // Показать/скрыть пароль
        function showPassword(id) {
            const password = passwords.find(p => p.id === id);
            const button = document.getElementById(`show-${id}`);
            const passwordSpan = button.parentElement.parentElement.querySelector('span[style*="monospace"]');
            
            if (passwordSpan.textContent === '••••••••') {
                passwordSpan.textContent = password.password;
                button.textContent = '🙈 Скрыть';
            } else {
                passwordSpan.textContent = '••••••••';
                button.textContent = '👁 Показать';
            }
        }

        // Редактирование пароля
        function editPassword(id) {
            const password = passwords.find(p => p.id === id);
            
            document.getElementById('siteName').value = password.siteName;
            document.getElementById('siteUrl').value = password.siteUrl || '';
            document.getElementById('username').value = password.username;
            document.getElementById('password').value = password.password;
            document.getElementById('notes').value = password.notes || '';
            
            isEditing = true;
            editingId = id;
            
            document.getElementById('addForm').classList.add('active');
            document.querySelector('#addForm h3').textContent = '✏ Редактировать пароль';
        }

        // Удаление пароля
        async function deletePassword(id) {
            if (confirm('Вы уверены, что хотите удалить этот пароль?')) {
                passwords = passwords.filter(p => p.id !== id);
                await savePasswords();
                renderPasswords();
                updateStats();
                showSuccess('Пароль удален');
            }
        }

        // Поиск паролей
        function searchPasswords() {
            renderPasswords();
        }

        // Переключение формы добавления
        function toggleAddForm() {
            const form = document.getElementById('addForm');
            const isVisible = form.classList.contains('active');
            
            if (isVisible) {
                form.classList.remove('active');
                clearAddForm();
            } else {
                form.classList.add('active');
                document.getElementById('siteName').focus();
            }
        }

        // Очистка формы добавления
        function clearAddForm() {
            document.getElementById('siteName').value = '';
            document.getElementById('siteUrl').value = '';
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('notes').value = '';
            isEditing = false;
            editingId = null;
            document.querySelector('#addForm h3').textContent = '➕ Добавить новый пароль';
        }

        // Обновление статистики
        function updateStats() {
            document.getElementById('totalPasswords').textContent = passwords.length;
        }

        // Экспорт данных
        function exportData() {
            const dataStr = JSON.stringify(passwords, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `passwords-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showSuccess('Данные экспортированы');
        }

        // Импорт данных
        function importData() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async function(e) {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const text = await file.text();
                        const importedPasswords = JSON.parse(text);
                        
                        if (confirm(`Импортировать ${importedPasswords.length} паролей? Это объединит их с существующими.`)) {
                            // Объединение с существующими паролями
                            importedPasswords.forEach(p => {
                                p.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                                passwords.push(p);
                            });
                            
                            await savePasswords();
                            renderPasswords();
                            updateStats();
                            showSuccess(`Импортировано ${importedPasswords.length} паролей`);
                        }
                    } catch (error) {
                        showError('appError', 'Ошибка при импорте файла');
                    }
                }
            };
            input.click();
        }

        // Показать ошибку
        function showError(elementId, message) {
            const element = document.getElementById(elementId);
            element.textContent = message;
            element.style.display = 'block';
            setTimeout(() => element.style.display = 'none', 5000);
        }

        // Показать успех
        function showSuccess(message) {
            const element = document.getElementById('appSuccess');
            element.textContent = message;
            element.style.display = 'block';
            setTimeout(() => element.style.display = 'none', 3000);
        }

        // Скрыть сообщения
        function hideMessages() {
            document.querySelectorAll('.error-message, .success-message').forEach(el => {
                el.style.display = 'none';
            });
        }