const weeks = [
    { 
        name: "Semaine 5 - La lumière contre l'ombre", 
        path: "semaine-5", 
        weekNumber: 5, 
        type: "jeu",
        display: "presentation"
    },
];

weeks.sort((a, b) => a.weekNumber - b.weekNumber);

const summaryContainer = document.getElementById('summary');
const searchInput = document.getElementById('search');

function displayWeeks(filteredWeeks) {
    summaryContainer.innerHTML = '';
    filteredWeeks.forEach(week => {
        let currentView = week.display || 'presentation';

        const card = document.createElement('div');
        card.className = 'card';
        
        const titleContainer = document.createElement('div');
        const title = document.createElement('a');
        title.textContent = week.name;
        title.href = `${week.path}/index.html`;
        title.target = '_blank';
        titleContainer.appendChild(title);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'preview-toggle';
        
        const toggleText = document.createElement('span');
        toggleText.textContent = 'Aperçu du défi';
        
        const toggleIcon = document.createElement('i');
        toggleIcon.setAttribute('data-lucide', 'chevron-down');
        
        toggleContainer.appendChild(toggleText);
        toggleContainer.appendChild(toggleIcon);

        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'preview-wrapper';
        
        const previewContent = document.createElement('div');
        previewContent.className = 'preview-content';

        const iframe = document.createElement('iframe');
        const updateIframeSource = () => {
            const fileName = currentView === 'defi' ? 'defi/defi.html' : 'index.html';
            iframe.src = `${week.path}/${fileName}`;
        };
        updateIframeSource();

        const switchBtn = document.createElement('div');
        switchBtn.className = 'switch-view-btn';
        
        const switchIcon = document.createElement('i');
        const switchText = document.createElement('span');
        
        const updateSwitchButton = () => {
            if (currentView === 'presentation') {
                switchIcon.setAttribute('data-lucide', 'gamepad-2');
                switchText.textContent = 'Voir le défi';
                switchBtn.classList.add('mode-defi');
            } else {
                switchIcon.setAttribute('data-lucide', 'file-text');
                switchText.textContent = 'Voir la présentation';
                switchBtn.classList.remove('mode-defi');
            }
            if (window.lucide) lucide.createIcons();
        };

        switchBtn.appendChild(switchIcon);
        switchBtn.appendChild(switchText);
        
        previewContent.appendChild(iframe);
        previewContent.appendChild(switchBtn);
        previewWrapper.appendChild(previewContent);

        const storageKey = `preview-state-week-${week.weekNumber}`;
        let isExpanded = localStorage.getItem(storageKey) === 'true';

        const updatePreviewDisplay = () => {
            if (isExpanded) {
                previewWrapper.classList.add('open');
                toggleContainer.classList.remove('collapsed');
            } else {
                previewWrapper.classList.remove('open');
                toggleContainer.classList.add('collapsed');
            }
        };

        updatePreviewDisplay();

        toggleContainer.addEventListener('click', () => {
            isExpanded = !isExpanded;
            localStorage.setItem(storageKey, isExpanded);
            updatePreviewDisplay();
        });

        switchBtn.addEventListener('click', () => {
            currentView = currentView === 'presentation' ? 'defi' : 'presentation';
            updateIframeSource();
            updateSwitchButton();
        });

        updateSwitchButton();

        const linksContainer = document.createElement('div');
        linksContainer.className = 'card-links';

        const codeLink = document.createElement('a');
        codeLink.href = `https://github.com/BryanDrouet/les-defis-de-batsave/tree/main/${encodeURIComponent(week.path)}`;
        codeLink.className = 'card-btn';
        codeLink.target = '_blank';
        
        const codeIcon = document.createElement('i');
        codeIcon.setAttribute('data-lucide', 'code');
        const codeText = document.createElement('span');
        codeText.textContent = 'Code Source';
        
        codeLink.appendChild(codeIcon);
        codeLink.appendChild(codeText);

        const playLink = document.createElement('a');
        playLink.href = `${week.path}/index.html`;
        playLink.className = 'card-btn play-btn';
        playLink.target = '_blank';
        
        const playIcon = document.createElement('i');
        const playText = document.createElement('span');
        
        let iconName = 'external-link';
        let buttonText = 'Lien direct';

        switch (week.type) {
            case 'jeu':
                iconName = 'gamepad-2';
                buttonText = 'Lien Jeu';
                break;
            case 'utilitaire':
                iconName = 'wrench';
                buttonText = 'Lien Outil';
                break;
            case 'site':
                iconName = 'globe';
                buttonText = 'Lien Site';
                break;
        }

        playIcon.setAttribute('data-lucide', iconName);
        playText.textContent = buttonText;
        
        playLink.appendChild(playIcon);
        playLink.appendChild(playText);

        linksContainer.appendChild(codeLink);
        linksContainer.appendChild(playLink);

        card.appendChild(titleContainer);
        card.appendChild(toggleContainer);
        card.appendChild(previewWrapper);
        card.appendChild(linksContainer);
        summaryContainer.appendChild(card);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
}

displayWeeks(weeks);

searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filteredWeeks = weeks.filter(week => week.name.toLowerCase().includes(query));
    displayWeeks(filteredWeeks);
});