document.addEventListener('DOMContentLoaded', function() {
    console.log('Library page loaded');

    function deleteStory(storyId) {
        fetch(`/api/stories/${storyId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const storyCard = document.querySelector(`[data-story-id="${storyId}"]`);
                if (storyCard) {
                    storyCard.remove();
                    console.log(`Story with ID ${storyId} deleted successfully.`);
                }
            } else {
                alert(`Failed to delete story: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('Error deleting story:', error);
            alert('Failed to delete story. Please try again.');
        });
    }
    document.querySelectorAll('.delete-story-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const storyId = this.closest('.story-card').getAttribute('data-story-id');
            if (storyId) {
                if (confirm('Hikayeyi silmek istediğinizden emin misiniz?')) {
                    deleteStory(storyId);
                }
            } else {
                console.error('Story ID not found for delete button.');
            }
        });
    });
    document.querySelectorAll('.view-story-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); 
            const storyId = this.closest('.story-card').getAttribute('data-story-id');
            if (storyId) {
                window.location.href = `/story/${storyId}`;
            } else {
                console.error('Story ID not found for view button.');
            }
        });
    });
});


