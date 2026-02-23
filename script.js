const weeks = [
    { name: "Semaine 5 - La lumière contre l'ombre", path: "Semaine 5 - La lumière contre l'ombre", weekNumber: 5, codeSource : "Semaine%205%20-%20La%20lumi%C3%A8re%20contre%20l'ombre" },
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
        title.href = `${week.path}/index.html`; 
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
        codeText.textContent = 'Code Source';
        
        codeLink.appendChild(codeIcon);
        codeLink.appendChild(codeText);

        const playLink = document.createElement('a');
        playLink.href = `${week.path}/index.html`;
        playLink.className = 'card-btn play-btn';
        playLink.target = '_blank';
        
        const playIcon = document.createElement('i');
        playIcon.setAttribute('data-lucide', 'gamepad-2');
        const playText = document.createElement('span');
        playText.textContent = 'Voir le rendu';
        
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