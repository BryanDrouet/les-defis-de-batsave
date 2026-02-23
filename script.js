const weeks = [
    { name: "Semaine 5 - La lumière contre l'ombre", path: "Semaine 5 - La lumière contre l'ombre", weekNumber: 5, codeSource : "https://github.com/BryanDrouet/les-defis-de-batsave/tree/main/Semaine%205%20-%20La%20lumi%C3%A8re%20contre%20l%E2%80%99ombre" },
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

        const iframe = document.createElement('iframe');
        iframe.src = `${week.path}/index.html`;

        card.appendChild(titleContainer);
        card.appendChild(iframe);
        summaryContainer.appendChild(card);
    });
}

displayWeeks(weeks);

searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filteredWeeks = weeks.filter(week => week.name.toLowerCase().includes(query));
    displayWeeks(filteredWeeks);
});