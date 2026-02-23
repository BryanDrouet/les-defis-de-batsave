const weeks = [
    { 
        name: "Semaine 5 - La lumière contre l'ombre",
        path: "semaine-5",
        weekNumber: 5,
        codeSource: "Semaine%205%20-%20La%20lumi%C3%A8re%20contre%20l'ombre",
        type: "jeu"
    },
];

weeks.sort((a, b) => a.weekNumber - b.weekNumber);

const summaryContainer = document.getElementById('summary');
const searchInput = document.getElementById('search');

function displayWeeks(filteredWeeks) {
    summaryContainer.innerHTML = '';
    filteredWeeks.forEach(week => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const titleContainer = document.createElement('div');
        const title = document.createElement('a');
        title.textContent = week.name;
        title.href = `https://defis-batsave.bryan.ovh/${week.path}/`; 
        titleContainer.appendChild(title);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'preview-toggle';
        
        const toggleText = document.createElement('span');
        toggleText.textContent = 'Aperçu du défi';
        
        const toggleIcon = document.createElement('i');
        toggleIcon.setAttribute('data-lucide', 'chevron-down');
        
        toggleContainer.appendChild(toggleText);
        toggleContainer.appendChild(toggleIcon);

        const iframe = document.createElement('iframe');
        iframe.src = `${week.path}/index.html`;

        const storageKey = `preview-state-week-${week.weekNumber}`;
        let isExpanded = localStorage.getItem(storageKey) === 'true';

        const updatePreviewDisplay = () => {
            if (isExpanded) {
                iframe.style.display = 'block';
                toggleContainer.classList.remove('collapsed');
            } else {
                iframe.style.display = 'none';
                toggleContainer.classList.add('collapsed');
            }
        };

        updatePreviewDisplay();

        toggleContainer.addEventListener('click', () => {
            isExpanded = !isExpanded;
            localStorage.setItem(storageKey, isExpanded);
            updatePreviewDisplay();
        });

        const linksContainer = document.createElement('div');
        linksContainer.className = 'card-links';

        const codeLink = document.createElement('a');
        codeLink.href = `https://github.com/BryanDrouet/les-defis-de-batsave/tree/main/${week.codeSource}`;
        codeLink.className = 'card-btn';
        codeLink.target = '_blank';
        
        const codeIcon = document.createElement('i');
        codeIcon.setAttribute('data-lucide', 'code');
        const codeText = document.createElement('span');
        codeText.textContent = 'Voir le code source';
        
        codeLink.appendChild(codeIcon);
        codeLink.appendChild(codeText);

        const playLink = document.createElement('a');
        playLink.href = `https://defis-batsave.bryan.ovh/${week.path}/`;
        playLink.className = 'card-btn play-btn';
        playLink.target = '_blank';
        
        const playIcon = document.createElement('i');
        const playText = document.createElement('span');
        
        let iconName = 'external-link';
        let buttonText = 'Voir le rendu';

        switch (week.type) {
            case 'jeu':
                iconName = 'gamepad-2';
                buttonText = 'Jouer au jeu';
                break;
            case 'utilitaire':
                iconName = 'wrench';
                buttonText = 'Utiliser l\'outil';
                break;
            case 'site':
                iconName = 'globe';
                buttonText = 'Visiter le site';
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
        card.appendChild(iframe);
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