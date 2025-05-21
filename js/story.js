console.log('Debug: hikaye.js yükleniyor');

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('story_id');
    const loadingElement = document.querySelector('.loading');

    if (loadingElement && storyId) {
        const storyData = localStorage.getItem('storyData');
        if (!storyData) {
            displayError('Hikaye verileri bulunamadı. Lütfen tekrar deneyin.');
            return;
        }

        generateStory(JSON.parse(storyData));
    } else {
        setupNewStoryButton();
    }
});

/**
 * Sends a request to generate a story and handles the response.
 * @param {Object} storyData - The story data to send to the server.
 */
async function generateStory(storyData) {

    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.textContent = 'Hikaye oluşturuluyor, lütfen bekleyin...';
    }

    try {
        const response = await fetch('/api/generate_story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storyData)
        });

        const data = await response.json();
        if (data.success) {
            window.location.href = `/story/${data.story_id}`;
        } else {
            displayError(`Hikaye oluşturulamadı: ${data.error}`);
        }
    } catch (error) {
        displayError('Hikaye oluşturulamadı. Lütfen tekrar deneyin.');
    }
}

/**
 * Displays an error message on the page.
 * @param {string} message - The error message to display.
 */
function displayError(message) {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.innerHTML = `
            <p>${message}</p>
            <button onclick="window.location.href='/'" class="primary-button">Ana Sayfaya Dön</button>
        `;
    }
}


function setupNewStoryButton() {
    const newStoryButton = document.querySelector('.story-actions .primary-button');
    if (newStoryButton) {
        newStoryButton.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
}


