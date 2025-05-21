document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            document.body.classList.toggle('light-theme');
        });
    }

    const menuToggle = document.querySelector('.menu-toggle');
    const appContainer = document.querySelector('.app-container');
    
    if (menuToggle && appContainer) {
        menuToggle.addEventListener('click', () => {
            appContainer.classList.toggle('menu-collapsed');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !e.target.closest('.side-menu') && 
                !e.target.closest('.menu-toggle') &&
                !appContainer.classList.contains('menu-collapsed')) {
                appContainer.classList.add('menu-collapsed');
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768 && !appContainer.classList.contains('menu-collapsed')) {
                appContainer.classList.add('menu-collapsed');
            }
        });

        if (window.innerWidth <= 768) {
            appContainer.classList.add('menu-collapsed');
        }
    }
});
