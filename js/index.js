let selectedGenre = '';
let selectedWritingStyle = 'varsayilan';

function updateChapterDisplay(count) {
    const chapterDisplay = document.querySelector('.chapter-counter');
    if (chapterDisplay) {
        chapterDisplay.textContent = `Bölüm Sayısı: ${count}`;
    }
}

function clearCustomInputs() {
    const input1 = document.getElementById('customInput1');
    const input2 = document.getElementById('customInput2');

    if (input1) input1.value = '';
    if (input2) input2.value = '';
}

function clearSelections() {
    selectedGenre = '';
    selectedWritingStyle = 'varsayilan';
    document.getElementById('writingStyleButton').textContent = 'Varsayılan';
    document.getElementById('writingStyleButton').setAttribute('data-value', 'varsayilan');
    document.getElementById('writing_style').value = 'varsayilan';

    document.querySelectorAll('#genreGrid .outline-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.custom-input-wrapper').forEach(wrapper => wrapper.classList.remove('selected'));
}

function clearCustomInputAndDeselect(section) {
    const customInput = section.querySelector('.custom-input');
    if (customInput) {
        customInput.value = '';
        customInput.closest('.custom-input-wrapper').classList.remove('selected');
        customInput.blur();
    }
}

function showLoadingScreen() {
    const oldLoading = document.getElementById('story-loading-overlay');
    if (oldLoading) oldLoading.remove();

    const overlay = document.createElement('div');
    overlay.id = 'story-loading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(20, 20, 20, 0.82)';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    overlay.innerHTML = `
        <div class="story-loading-spinner"></div>
        <div style="color:#fff;font-size:1.3rem;margin-top:1.2em;letter-spacing:0.5px;">Hikaye oluşturuluyor, lütfen bekleyin...</div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingScreen() {
    const overlay = document.getElementById('story-loading-overlay');
    if (overlay) overlay.remove();
}

function handleFormSubmission() {
    const form = document.getElementById('storyForm');
    if (!form) {
        console.error('Form not found');
        return;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        showLoadingScreen();
        const formData = new FormData(form);

        let writingStyle = 'varsayilan';
        const writingStyleButton = document.getElementById('writingStyleButton');
        if (writingStyleButton && writingStyleButton.hasAttribute('data-value')) {
            writingStyle = writingStyleButton.getAttribute('data-value');
        }
        if (!writingStyle || writingStyle === 'varsayilan') {
            const inputValue = formData.get('writing_style');
            if (inputValue && inputValue !== 'varsayilan') {
                writingStyle = inputValue;
            }
        }

        const data = {
            genre: selectedGenre || formData.get('customGenre'),
            plot: formData.get('plot'),
            writing_style: writingStyle,
            chapter_count: Math.max(1, Math.min(parseInt(formData.get('chapter_count')) || 1, 5))
        };

        console.log('Sending data to API:', data);

        fetch('/api/stories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(result => {
                hideLoadingScreen();
                console.log('API response:', result);

                if (!result.success) {
                    console.error('Error from API:', result.error || 'Unknown error');
                    alert(`Error: ${result.error || 'An unknown error occurred.'}`);
                    return;
                }

                if (result.id) {
                    window.location.href = `/story/${result.id}`;
                } else if (result.redirect) {
                    window.location.href = result.redirect;
                } else {
                    alert('Hikaye oluşturuldu ancak görüntüleme adresi alınamadı.');
                }
            })
            .catch(error => {
                hideLoadingScreen();
                console.error('Error during story creation:', error);
                alert('An error occurred while creating the story. Please try again.');
            });
    });
}

function handleRandomizeButton() {
    const randomizeBtn = document.getElementById('randomize');
    if (!randomizeBtn) return;

    randomizeBtn.addEventListener('click', function (e) {
        e.preventDefault();

        const genreButtons = document.querySelectorAll('#genreGrid .outline-btn');
        if (genreButtons.length > 0) {
            const randomGenreButton = genreButtons[Math.floor(Math.random() * genreButtons.length)];
            genreButtons.forEach(btn => btn.classList.remove('selected'));
            randomGenreButton.classList.add('selected');
            selectedGenre = randomGenreButton.textContent;
        }

        const writingStyleDropdown = document.getElementById('writingStyleDropdown');
        const writingStyleItems = writingStyleDropdown.querySelectorAll('.dropdown-item');
        if (writingStyleItems.length > 0) {
            const randomWritingStyleItem = writingStyleItems[Math.floor(Math.random() * writingStyleItems.length)];
            const writingStyleButton = document.getElementById('writingStyleButton');
            writingStyleButton.textContent = randomWritingStyleItem.textContent;
            writingStyleButton.setAttribute('data-value', randomWritingStyleItem.getAttribute('data-value'));
            selectedWritingStyle = randomWritingStyleItem.getAttribute('data-value');
        }

        const chapterCount = document.getElementById('chapter_count');
        if (chapterCount) {
            const randomChapters = Math.floor(Math.random() * 5) + 1;
            chapterCount.value = randomChapters;
            updateChapterDisplay(randomChapters);
        }

        const plots = [
            "Bir gizemli paket birinin kapısına gelir",
            "İki yabancı şehir genelinde elektrik kesintisi sırasında tanışır",
            "Bir zaman yolcusu yanlışlıkla tarihi değiştirir",
            "Birisi bitkilerle iletişim kurabildiğini keşfeder",
            "Eski bir harita beklenmedik bir keşfe yol açar",
            "Unutulmuş bir mektup aile sırrını ortaya çıkarır",
            "Bir çocuğun hayal ürünü arkadaşı gerçek çıkar",
            "Bir dedektif rüyalarında suçları çözer",
            "Bir yapay zeka duygular geliştirir",
            "Hiçbir yerde bir kapı belirir"
        ];

        const plotField = document.getElementById('plot');
        if (plotField) {
            plotField.value = plots[Math.floor(Math.random() * plots.length)];
            plotField.dispatchEvent(new Event('input', { bubbles: true }));
        }

        clearCustomInputs();
    });
}

function handleClearButton() {
    const clearBtn = document.getElementById('clear');
    if (!clearBtn) return;

    clearBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const form = document.getElementById('storyForm');
        form.reset();
        updateChapterDisplay(1);

        clearSelections();
        clearCustomInputs();
    });
}

function handleDropdowns() {
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('.dropdown-button');
        const content = dropdown.querySelector('.dropdown-content');

        if (button && content) {
            button.addEventListener('click', (e) => {
                const isCrossClicked = e.target.getAttribute('data-value') !== 'varsayilan' && e.offsetX > button.clientWidth - 30;
                if (isCrossClicked) {
                    button.textContent = 'Varsayılan';
                    button.setAttribute('data-value', 'varsayilan');
                    selectedWritingStyle = 'varsayilan';
                    content.classList.remove('show');
                } else {
                    content.classList.toggle('show');
                    document.querySelectorAll('.dropdown-content').forEach(otherContent => {
                        if (otherContent !== content) {
                            otherContent.classList.remove('show');
                        }
                    });
                }
            });

            content.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const value = item.getAttribute('data-value');
                    button.textContent = item.textContent;
                    button.setAttribute('data-value', value);
                    selectedWritingStyle = value;
                    content.classList.remove('show');
                });
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.classList.remove('show');
            });
        }
    });
}

function handleChapterSlider() {
    const chapterSlider = document.querySelector('#chapter_count');
    const chapterDisplay = document.querySelector('.chapter-counter');

    if (chapterSlider && chapterDisplay) {
        chapterSlider.addEventListener('input', function () {
            chapterDisplay.textContent = `Bölüm Sayısı: ${this.value}`;
        });
    }
}

function handleCustomInputs() {
    document.querySelectorAll('.custom-input').forEach(input => {
        if (input.id === 'topicInput') return;

        input.addEventListener('input', () => {
            const value = input.value.trim();
            const wrapper = input.closest('.custom-input-wrapper');
            const section = input.closest('.button-grid');

            if (value && section) {
                section.querySelectorAll('.outline-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });

                wrapper.classList.add('selected');
            } else {
                wrapper.classList.remove('selected');
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = this.value.trim();
                if (value) {
                    const section = this.closest('.button-grid');
                    if (section) {
                        section.querySelectorAll('.outline-btn').forEach(btn => {
                            btn.classList.remove('selected');
                        });

                        if (section.id === 'genreGrid') {
                            selectedGenre = value;
                        }

                        this.blur();
                    }
                }
            }
        });
    });
}

function handleButtonClicks() {
    document.querySelectorAll('.outline-btn').forEach(button => {
        button.addEventListener('click', function () {
            if (this.closest('.custom-input-wrapper')) return;

            const section = this.closest('.button-grid');
            if (!section) return;

            section.querySelectorAll('.outline-btn').forEach(btn => {
                if (btn !== this) {
                    btn.classList.remove('selected');
                }
            });

            const wasSelected = this.classList.contains('selected');
            this.classList.toggle('selected');

            if (section.id === 'genreGrid') {
                selectedGenre = wasSelected ? '' : this.textContent;
                document.getElementById('genre').value = selectedGenre;
                clearCustomInputAndDeselect(section);
            }
        });
    });
}

function handleStoryGeneration() {
    const startStoryBtn = document.querySelector('.start-story-btn');
    const storyForm = document.getElementById('storyForm');

    if (startStoryBtn && storyForm) {
        startStoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            storyForm.dispatchEvent(new Event('submit', { bubbles: true }));
        });
    } else {
        console.error('Start Story button or form not found');
    }
}

function addGlobalErrorHandling() {
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        console.error('Error:', msg);
        console.error('URL:', url);
        console.error('Line:', lineNo);
        console.error('Column:', columnNo);
        console.error('Error object:', error);
        return false;
    };
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded');
    handleFormSubmission();
    handleRandomizeButton();
    handleClearButton();
    handleDropdowns();
    handleChapterSlider();
    handleCustomInputs();
    handleButtonClicks();
    handleStoryGeneration();
    addGlobalErrorHandling();
});
